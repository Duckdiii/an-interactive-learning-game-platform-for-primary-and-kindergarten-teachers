package com.aigameplatform.backend.service.curriculum;

import java.awt.geom.Rectangle2D;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import tools.jackson.databind.json.JsonMapper;

/** The reviewed PDF's table layout is explicit; other PDFs must be reviewed before reuse. */
public final class CurriculumPdfExtractor {
    /** A source transcription checked separately from chunk creation; never a pedagogical approval. */
    public record TextTranscription(String sourceSha256, String chunkId, int pdfPage, int printedPage,
                                    String text, String reviewedBy, String reviewedOn, String reviewType) {
        public TextTranscription {
            if (sourceSha256 == null || !sourceSha256.matches("[a-f0-9]{64}") || chunkId == null
                    || pdfPage < 1 || printedPage < 1 || text == null || text.isBlank()
                    || reviewedBy == null || reviewedBy.isBlank() || reviewedOn == null
                    || !"AI_SOURCE_TRANSCRIPTION".equals(reviewType)) {
                throw new IllegalArgumentException("A text transcription needs source, page, text and an explicit reviewer");
            }
            java.time.LocalDate.parse(reviewedOn);
        }
    }
    public record ChunkVerification(String chunkId, String subject, String gradeLevel, String topic, boolean control,
                                    String chunkTextSha256, List<Integer> sourcePdfPages,
                                    List<Integer> sourcePrintedPages, int sourceFragmentCount,
                                    boolean sourceFragmentsMatched, String sourceVerificationMethod, String semanticAtomicityReview,
                                    String pedagogicalReview) { }

    public record Verification(String sourceSha256, int verifiedChunks, int extractedPages,
                               String evaluationStatus, List<ChunkVerification> chunks) { }

    public Verification verifyAndExtract(Path pdf, CurriculumDataset dataset, Path output) throws IOException {
        return verifyAndExtract(pdf, dataset, output, CurriculumDataset.readLines(
                CurriculumDataset.RESOURCE_BASE, "text-transcriptions.jsonl", TextTranscription.class));
    }

    Verification verifyAndExtract(Path pdf, CurriculumDataset dataset, Path output,
                                  List<TextTranscription> transcriptions) throws IOException {
        String actualSha;
        try (var input = Files.newInputStream(pdf)) {
            var digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            for (int count; (count = input.read(buffer)) != -1;) digest.update(buffer, 0, count);
            actualSha = HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
        if (!actualSha.equals(dataset.source().sourceSha256())) {
            throw new IllegalArgumentException("PDF SHA-256 differs from the reviewed source; re-audit before ingestion");
        }
        Files.createDirectories(output);
        Map<String, String> regions = new HashMap<>();
        var pages = new java.util.TreeSet<Integer>();
        var chunkResults = new ArrayList<ChunkVerification>();
        try (var document = Loader.loadPDF(pdf.toFile())) {
            if (document.getNumberOfPages() != dataset.source().pdfPageCount()) {
                throw new IllegalArgumentException("PDF page count differs from the manifest");
            }
            for (var chunk : dataset.chunks()) {
                boolean fragmentsMatched = true;
                boolean transcribed = false;
                for (var fragment : chunk.sourceFragments()) {
                    int pageNumber = fragment.pdfPage();
                    if ("VISUAL_RIGHT".equals(fragment.region())) {
                        transcribed = true;
                        var reviews = transcriptions.stream().filter(review ->
                                review.sourceSha256().equals(actualSha) && review.chunkId().equals(chunk.chunkId())
                                        && review.pdfPage() == pageNumber && review.printedPage() == fragment.printedPage())
                                .toList();
                        if (reviews.size() > 1) throw new IllegalStateException("Duplicate text transcription review");
                        if (reviews.isEmpty()) {
                            fragmentsMatched = false;
                        } else if (!CurriculumChunk.normalize(reviews.getFirst().text())
                                .equals(CurriculumChunk.normalize(fragment.text()))) {
                            throw new IllegalStateException("Chunk differs from reviewed source transcription: " + chunk.chunkId());
                        }
                        pages.add(pageNumber);
                        continue;
                    }
                    String key = pageNumber + "-" + fragment.region();
                    if (!regions.containsKey(key)) {
                        var page = document.getPage(pageNumber - 1);
                        double width = page.getCropBox().getWidth();
                        double height = page.getCropBox().getHeight();
                        var stripper = new PDFTextStripperByArea();
                        stripper.setSortByPosition(!"CENTER_RIGHT".equals(fragment.region()));
                        Rectangle2D area = switch (fragment.region()) {
                            case "RIGHT" -> new Rectangle2D.Double(width * 0.427, 0, width * 0.523, height);
                            case "CENTER_RIGHT" -> new Rectangle2D.Double(width * 0.36, 0, width * 0.38, height);
                            case "CENTER_LEFT" -> new Rectangle2D.Double(width * 0.045, 0, width * 0.46, height);
                            default -> new Rectangle2D.Double(width * 0.045, 0, width * 0.62, height);
                        };
                        stripper.addRegion("outcomes", area);
                        stripper.extractRegions(page);
                        String text = stripper.getTextForRegion("outcomes");
                        regions.put(key, text);
                        Files.writeString(output.resolve("page-" + key.toLowerCase() + ".txt"), text, StandardCharsets.UTF_8);
                    }
                    if (!CurriculumChunk.normalize(regions.get(key)).contains(CurriculumChunk.normalize(fragment.text()))) {
                        throw new IllegalStateException("Source fragment not verified: " + chunk.chunkId()
                                + " on PDF page " + pageNumber + "; inspect layout/OCR before embedding");
                    }
                    pages.add(pageNumber);
                }
                chunkResults.add(new ChunkVerification(chunk.chunkId(), chunk.subject().name(),
                        chunk.gradeLevel().name(), chunk.topic(), chunk.control(), sha256(chunk.text()),
                        chunk.sourceFragments().stream().map(CurriculumChunk.SourceFragment::pdfPage).distinct().toList(),
                        chunk.sourceFragments().stream().map(CurriculumChunk.SourceFragment::printedPage).distinct().toList(),
                        chunk.sourceFragments().size(), fragmentsMatched,
                        transcribed ? (fragmentsMatched ? "AI_REVIEWED_TEXT_TRANSCRIPTION" : "TEXT_TRANSCRIPTION_PENDING")
                                : "PDF_TEXT_LAYER", "NOT_REVIEWED", "NOT_REVIEWED"));
            }
            var stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            for (int page : pages) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                Files.writeString(output.resolve("page-" + page + ".txt"), stripper.getText(document), StandardCharsets.UTF_8);
            }
        }
        int verified = (int) chunkResults.stream().filter(ChunkVerification::sourceFragmentsMatched).count();
        String status = (verified == dataset.chunks().size() ? "SOURCE_TEXT_MATCHED" : "TEXT_TRANSCRIPTION_PENDING")
                + "; SEMANTIC_AND_PEDAGOGICAL_REVIEW_NOT_RUN";
        var result = new Verification(actualSha, verified, pages.size(), status, List.copyOf(chunkResults));
        Files.writeString(output.resolve("source-verification.json"), new JsonMapper().writeValueAsString(result), StandardCharsets.UTF_8);
        var text = new StringBuilder("# Curriculum source outcomes\n\nSource: ").append(dataset.source().sourceDocument())
                .append("\n\nSHA-256: ").append(actualSha).append("\n\nDataset: ").append(dataset.source().datasetVersion())
                .append("\n\nStatus: ").append(status).append("\n");
        for (int i = 0; i < dataset.chunks().size(); i++) {
            var chunk = dataset.chunks().get(i);
            var checked = chunkResults.get(i);
            text.append("\n## ").append(chunk.chunkId()).append(" — ").append(chunk.topic())
                    .append("\n\nSubject: ").append(chunk.subject()).append("; grade: ").append(chunk.gradeLevel())
                    .append("; control: ").append(chunk.control()).append("\n\nVerification: ")
                    .append(checked.sourceVerificationMethod()).append("\n\n").append(chunk.text()).append("\n");
            for (var fragment : chunk.sourceFragments()) {
                text.append("\nPDF ").append(fragment.pdfPage()).append("; printed page ").append(fragment.printedPage())
                        .append(": ").append(fragment.text()).append("\n");
                transcriptions.stream().filter(review -> review.sourceSha256().equals(actualSha)
                        && review.chunkId().equals(chunk.chunkId()) && review.pdfPage() == fragment.pdfPage())
                        .forEach(review -> text.append("\nSource transcription checked by ").append(review.reviewedBy())
                                .append(" on ").append(review.reviewedOn()).append(" (").append(review.reviewType())
                                .append("). Teacher review: NOT_REVIEWED.\n"));
            }
        }
        Files.writeString(output.resolve("outcomes.md"), text, StandardCharsets.UTF_8);
        return result;
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
