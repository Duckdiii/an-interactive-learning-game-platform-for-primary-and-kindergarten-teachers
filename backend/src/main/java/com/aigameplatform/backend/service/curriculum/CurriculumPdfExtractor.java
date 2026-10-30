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
import tools.jackson.databind.json.JsonMapper;

/** The reviewed PDF's table layout is explicit; other PDFs must be reviewed before reuse. */
public final class CurriculumPdfExtractor {
    public record Verification(String sourceSha256, int verifiedChunks, int extractedPages,
                               String datasetVersion, String curriculumVersion, String sourceDocument,
                               int verifiedOutcomes, int verifiedControls, List<CurriculumChunk> chunks) {
        public Verification { chunks = List.copyOf(chunks); }
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
        try (var document = Loader.loadPDF(pdf.toFile())) {
            if (document.getNumberOfPages() != dataset.source().pdfPageCount()) {
                throw new IllegalArgumentException("PDF page count differs from the manifest");
            }
            for (var chunk : dataset.chunks()) {
                for (var fragment : chunk.sourceFragments()) {
                    int pageNumber = fragment.pdfPage();
                    String key = pageNumber + "-" + fragment.region();
                    if (!regions.containsKey(key)) {
                        var page = document.getPage(pageNumber - 1);
                        double width = page.getCropBox().getWidth();
                        double height = page.getCropBox().getHeight();
                        var stripper = new PDFTextStripperByArea();
                        stripper.setSortByPosition(true);
                        Rectangle2D area = "RIGHT".equals(fragment.region())
                                ? new Rectangle2D.Double(width * 0.427, 45, width * 0.523, height - 90)
                                : new Rectangle2D.Double(width * 0.045, 45, width * 0.62, height - 90);
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
            }
            var stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            for (int page : pages) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                Files.writeString(output.resolve("page-" + page + ".txt"), stripper.getText(document), StandardCharsets.UTF_8);
            }
        }
        int controls = (int) dataset.chunks().stream().filter(CurriculumChunk::control).count();
        var result = new Verification(actualSha, dataset.chunks().size(), pages.size(),
                dataset.source().datasetVersion(), dataset.source().curriculumVersion(), dataset.source().sourceDocument(),
                dataset.chunks().size() - controls, controls, dataset.chunks());
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
}
