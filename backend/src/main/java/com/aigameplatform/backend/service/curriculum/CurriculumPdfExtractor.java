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
import java.util.Map;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import tools.jackson.databind.json.JsonMapper;

/** The reviewed PDF's table layout is explicit; other PDFs must be reviewed before reuse. */
public final class CurriculumPdfExtractor {
    public record Verification(String sourceSha256, int verifiedChunks, int extractedPages) { }

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
        var result = new Verification(actualSha, dataset.chunks().size(), pages.size());
        Files.writeString(output.resolve("source-verification.json"), new JsonMapper().writeValueAsString(result), StandardCharsets.UTF_8);
        return result;
    }
}
