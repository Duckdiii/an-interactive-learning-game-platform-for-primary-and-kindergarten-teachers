package com.aigameplatform.backend.service.curriculum;

import java.awt.geom.Rectangle2D;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.AtomicMoveNotSupportedException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.apache.pdfbox.text.TextPosition;
import tools.jackson.databind.json.JsonMapper;

/** The reviewed PDF's table layout is explicit; other PDFs must be reviewed before reuse. */
public final class CurriculumPdfExtractor {
    public record Verification(String sourceSha256, int verifiedChunks, int sourceFragmentCount, int extractedPages,
                               String datasetVersion, String curriculumVersion, String sourceDocument,
                               int verifiedOutcomes, int verifiedControls, int manualTranscribedOutcomes,
                               int manualTranscribedControls, List<String> manualTranscriptionChunkIds,
                               List<CurriculumChunk> chunks) {
        public Verification {
            manualTranscriptionChunkIds = List.copyOf(manualTranscriptionChunkIds);
            chunks = List.copyOf(chunks);
        }
    }

    public Verification verifyAndExtract(Path pdf, CurriculumDataset dataset, Path output) throws IOException {
        Files.createDirectories(output);
        Path report = output.resolve("source-verification.json");
        // A failed rerun must never leave an earlier success report looking current.
        Files.deleteIfExists(report);
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
        Map<String, String> regions = new HashMap<>();
        var pages = new java.util.TreeSet<Integer>();
        var printedPageByPdfPage = new HashMap<Integer, Integer>();
        var manualTranscriptionChunkIds = new java.util.TreeSet<String>();
        try (var document = Loader.loadPDF(pdf.toFile())) {
            if (document.getNumberOfPages() != dataset.source().pdfPageCount()) {
                throw new IllegalArgumentException("PDF page count differs from the manifest");
            }
            for (var chunk : dataset.chunks()) {
                for (var fragment : chunk.sourceFragments()) {
                    int pageNumber = fragment.pdfPage();
                    validateSkillsPage(dataset.source(), pageNumber, fragment.region());
                    Integer priorPrintedPage = printedPageByPdfPage.putIfAbsent(pageNumber, fragment.printedPage());
                    if (priorPrintedPage != null && priorPrintedPage != fragment.printedPage()) {
                        throw new IllegalStateException("Conflicting printed-page labels for PDF page " + pageNumber);
                    }
                    String key = pageNumber + "-" + fragment.region();
                    if (!regions.containsKey(key)) {
                        var page = document.getPage(pageNumber - 1);
                        double width = page.getCropBox().getWidth();
                        double height = page.getCropBox().getHeight();
                        String text;
                        if (fragment.region().startsWith("AGE_")) {
                            text = extractAgeColumn(document, pageNumber, fragment.region(), width);
                        } else if (fragment.region().startsWith("SKILLS")) {
                            text = extractSkillsColumn(document, pageNumber, width, fragment.region());
                        } else {
                            var stripper = new PDFTextStripperByArea();
                            stripper.setSortByPosition(true);
                            Rectangle2D area = switch (fragment.region()) {
                                case "RIGHT" -> new Rectangle2D.Double(width * 0.427, 45, width * 0.523, height - 90);
                                case "LEFT" -> new Rectangle2D.Double(width * 0.045, 45, width * 0.62, height - 90);
                                case "FULL" -> new Rectangle2D.Double(width * 0.04, 45, width * 0.92, height - 90);
                                default -> throwUnsupportedRegion(fragment.region());
                            };
                            stripper.addRegion("outcomes", area);
                            stripper.extractRegions(page);
                            text = stripper.getTextForRegion("outcomes");
                        }
                        regions.put(key, text);
                        Files.writeString(output.resolve("page-" + key.toLowerCase() + ".txt"), text, StandardCharsets.UTF_8);
                    }
                    if (!CurriculumChunk.normalize(regions.get(key)).contains(CurriculumChunk.normalize(fragment.text()))) {
                        boolean transcribed = dataset.manualTranscriptions().stream().anyMatch(transcription ->
                                transcription.chunkId().equals(chunk.chunkId())
                                        && transcription.pdfPage() == fragment.pdfPage()
                                        && transcription.printedPage() == fragment.printedPage()
                                        && transcription.region().equals(fragment.region())
                                        && CurriculumChunk.normalize(transcription.text())
                                                .equals(CurriculumChunk.normalize(fragment.text())));
                        if (transcribed) {
                            manualTranscriptionChunkIds.add(chunk.chunkId());
                            pages.add(pageNumber);
                            continue;
                        }
                        throw new IllegalStateException("Source fragment not verified: " + chunk.chunkId()
                                + " on PDF page " + pageNumber + "; inspect layout/OCR before embedding");
                    }
                    pages.add(pageNumber);
                }
            }
            var stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            for (int page : pages) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String pageText = stripper.getText(document);
                Integer expectedPrintedPage = printedPageByPdfPage.get(page);
                if (expectedPrintedPage != null
                        && "Thông-tư-32-2018-TT-BGDĐT.pdf".equals(dataset.source().sourceDocument())
                        && !matchesPrintedPageFooter(pageText, expectedPrintedPage)) {
                    String footer = java.util.Arrays.stream(pageText.split("\\R"))
                            .map(String::trim).filter(line -> !line.isEmpty()).reduce((first, second) -> second).orElse("");
                    throw new IllegalStateException("Printed page label mismatch on PDF page " + page
                            + "; expected " + expectedPrintedPage + " but footer reads " + footer.replaceAll("\\D", ""));
                }
                Files.writeString(output.resolve("page-" + page + ".txt"), pageText, StandardCharsets.UTF_8);
            }
        }
        int controls = (int) dataset.chunks().stream().filter(CurriculumChunk::control).count();
        int manualControls = (int) dataset.chunks().stream()
                .filter(chunk -> chunk.control() && manualTranscriptionChunkIds.contains(chunk.chunkId())).count();
        int manualOutcomes = (int) dataset.chunks().stream()
                .filter(chunk -> !chunk.control() && manualTranscriptionChunkIds.contains(chunk.chunkId())).count();
        int sourceFragmentCount = dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum();
        var result = new Verification(actualSha, dataset.chunks().size() - manualTranscriptionChunkIds.size(),
                sourceFragmentCount, pages.size(),
                dataset.source().datasetVersion(), dataset.source().curriculumVersion(), dataset.source().sourceDocument(),
                dataset.chunks().size() - controls - manualOutcomes, controls - manualControls,
                manualOutcomes, manualControls, List.copyOf(manualTranscriptionChunkIds), dataset.chunks());
        Path temporary = Files.createTempFile(output, "source-verification-", ".tmp");
        try {
            Files.writeString(temporary, new JsonMapper().writerWithDefaultPrettyPrinter().writeValueAsString(result), StandardCharsets.UTF_8);
            try {
                Files.move(temporary, report, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, report, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
        return result;
    }

    private static Rectangle2D throwUnsupportedRegion(String region) {
        throw new IllegalArgumentException("Unsupported PDF text region: " + region);
    }

    static void validateSkillsPage(CurriculumSource source, int pageNumber, String region) {
        if (!region.startsWith("SKILLS") || !"Thông-tư-32-2018-TT-BGDĐT.pdf".equals(source.sourceDocument())) return;
        if ("english-grade3-draft-v1".equals(source.datasetVersion())) {
            boolean allowed = "SKILLS".equals(region) && pageNumber >= 1275 && pageNumber <= 1277
                    || "SKILLS_CONTROL".equals(region) && pageNumber == 1277;
            if (!allowed) throw new IllegalArgumentException("English skills region is not reviewed for PDF page " + pageNumber);
        } else if ("english-grade4-draft-v1".equals(source.datasetVersion())) {
            boolean allowed = "SKILLS_G3".equals(region) && pageNumber == 1277
                    || "SKILLS_G4".equals(region) && pageNumber >= 1277 && pageNumber <= 1279;
            if (!allowed) throw new IllegalArgumentException("English skills region is not reviewed for PDF page " + pageNumber);
        } else if ("english-grade5-draft-v1".equals(source.datasetVersion())) {
            boolean allowed = "SKILLS_G4".equals(region) && (pageNumber == 1278 || pageNumber == 1279)
                    || "SKILLS_G5".equals(region) && pageNumber >= 1279 && pageNumber <= 1281;
            if (!allowed) throw new IllegalArgumentException("English skills region is not reviewed for PDF page " + pageNumber);
        }
    }

    static boolean matchesPrintedPageFooter(String pageText, int expectedPrintedPage) {
        String footer = java.util.Arrays.stream(pageText.split("\\R"))
                .map(String::trim).filter(line -> !line.isEmpty()).reduce((first, second) -> second).orElse("");
        return footer.replaceAll("\\D", "").equals(Integer.toString(expectedPrintedPage));
    }

    static String extractAgeColumn(org.apache.pdfbox.pdmodel.PDDocument document, int pageNumber,
                                   String region, double pageWidth) throws IOException {
        double[] boundaries = switch (pageNumber) {
            // Science exploration tables (printed pages 73-75) have a narrower first age column.
            case 61, 62, 63 -> new double[]{pageWidth * 0.22, pageWidth * 0.42,
                    pageWidth * 0.635, pageWidth * 0.90};
            // Mathematical concepts and language tables (printed pages 76-84) share the same layout.
            case 64, 65, 66, 67, 68, 69, 70, 71, 72 -> new double[]{pageWidth * 0.247, pageWidth * 0.458,
                    pageWidth * 0.67, pageWidth * 0.90};
            default -> throw new IllegalArgumentException("No reviewed age-column layout for PDF page " + pageNumber);
        };
        double start = switch (region) {
            case "AGE_3_4" -> boundaries[0];
            case "AGE_4_5" -> boundaries[1];
            case "AGE_5_6" -> boundaries[2];
            default -> throw new IllegalArgumentException("Unsupported age-band region: " + region);
        };
        double end = switch (region) {
            case "AGE_3_4" -> boundaries[1];
            case "AGE_4_5" -> boundaries[2];
            case "AGE_5_6" -> boundaries[3];
            default -> throw new IllegalArgumentException("Unsupported age-band region: " + region);
        };
        var regionText = new StringBuilder();
        var stripper = new PDFTextStripper() {
            @Override protected void writeString(String text, List<TextPosition> positions) throws IOException {
                var selected = new StringBuilder();
                for (var position : positions) {
                    double x = position.getXDirAdj() + position.getWidthDirAdj() / 2.0;
                    if (x >= start && x < end) selected.append(position.getUnicode());
                }
                if (!selected.isEmpty()) regionText.append(selected).append('\n');
            }
        };
        stripper.setSortByPosition(true);
        stripper.setStartPage(pageNumber);
        stripper.setEndPage(pageNumber);
        stripper.getText(document);
        return regionText.toString();
    }

    static String extractSkillsColumn(org.apache.pdfbox.pdmodel.PDDocument document, int pageNumber,
                                      double pageWidth, String region) throws IOException {
        // The English table shares pages with surrounding prose and the next grade.
        // Keep the reviewed skill-column coordinates and vertical table bands explicit.
        double start = pageWidth * 0.375;
        double end = pageWidth * 0.69;
        double[] yBounds = switch (pageNumber + "|" + region) {
            case "1275|SKILLS" -> new double[]{275, 520};
            case "1276|SKILLS" -> new double[]{0, 540};
            case "1277|SKILLS" -> new double[]{0, 260};
            case "1277|SKILLS_CONTROL" -> new double[]{290, 545};
            case "1277|SKILLS_G3" -> new double[]{0, 260};
            case "1277|SKILLS_G4" -> new double[]{290, 545};
            case "1279|SKILLS_G4" -> new double[]{0, 175};
            case "1279|SKILLS_G5" -> new double[]{175, 570};
            case "1281|SKILLS_G5" -> new double[]{0, 275};
            default -> new double[]{0, Double.MAX_VALUE};
        };
        double minY = yBounds[0];
        double maxY = yBounds[1];
        var regionText = new StringBuilder();
        var stripper = new PDFTextStripper() {
            @Override protected void writeString(String text, List<TextPosition> positions) throws IOException {
                var selected = new StringBuilder();
                for (var position : positions) {
                    double x = position.getXDirAdj() + position.getWidthDirAdj() / 2.0;
                    double y = position.getYDirAdj();
                    if (x >= start && x < end && y >= minY && y < maxY) selected.append(position.getUnicode());
                }
                if (!selected.isEmpty()) regionText.append(selected).append('\n');
            }
        };
        stripper.setSortByPosition(true);
        stripper.setStartPage(pageNumber);
        stripper.setEndPage(pageNumber);
        stripper.getText(document);
        return regionText.toString();
    }
}
