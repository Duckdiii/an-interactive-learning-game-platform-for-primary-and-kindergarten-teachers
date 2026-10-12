package com.aigameplatform.backend.service.curriculum;

import java.awt.geom.Rectangle2D;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.charset.Charset;
import java.nio.CharBuffer;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.CharacterCodingException;
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
    public record ChunkVerification(String chunkId, String subject, String gradeLevel, String topic, boolean control,
                                    String chunkTextSha256, List<Integer> sourcePdfPages,
                                    List<Integer> sourcePrintedPages, int sourceFragmentCount,
                                    boolean sourceFragmentsMatched, String sourceVerificationMethod, String semanticAtomicityReview,
                                    String pedagogicalReview) { }

    public record Verification(String sourceSha256, int verifiedChunks, int extractedPages,
                               String evaluationStatus, List<ChunkVerification> chunks) { }

    public Verification verifyAndExtract(Path pdf, CurriculumDataset dataset, Path output) throws IOException {
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
                for (var fragment : chunk.sourceFragments()) {
                    int pageNumber = fragment.pdfPage();
                    if ("VISUAL_RIGHT".equals(fragment.region())) {
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
                        chunk.sourceFragments().size(), true,
                        chunk.sourceFragments().stream().anyMatch(f -> "VISUAL_RIGHT".equals(f.region()))
                                ? "VISUAL_TRANSCRIPTION" : "PDF_TEXT_LAYER", "NOT_REVIEWED", "NOT_REVIEWED"));
            }
            var stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            for (int page : pages) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                Files.writeString(output.resolve("page-" + page + ".txt"), stripper.getText(document), StandardCharsets.UTF_8);
            }
        }
        boolean visualTranscription = dataset.chunks().stream().flatMap(c -> c.sourceFragments().stream())
                .anyMatch(f -> "VISUAL_RIGHT".equals(f.region()));
        String status = visualTranscription
                ? "SOURCE_TEXT_MATCHED; VISUAL_TRANSCRIPTION_REVIEWED; SEMANTIC_AND_PEDAGOGICAL_REVIEW_NOT_RUN"
                : "SOURCE_TEXT_MATCHED; SEMANTIC_AND_PEDAGOGICAL_REVIEW_NOT_RUN";
        var result = new Verification(actualSha, dataset.chunks().size(), pages.size(), status, List.copyOf(chunkResults));
        Files.writeString(output.resolve("source-verification.json"), new JsonMapper().writeValueAsString(result), StandardCharsets.UTF_8);
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
