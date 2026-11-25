package com.aigameplatform.backend.service.lesson;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.exception.ApiException;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class LessonDocumentExtractorTest {
    private final LessonDocumentExtractor extractor = new LessonDocumentExtractor(new LessonParserProcess(15_000, 2));

    @Test void tikaPdfParserIsCompatibleWithExistingPdfBox() throws Exception {
        assertThat(LessonParserWorker.extract(pdf("Count from 1 to 5", false), "pdf")).contains("Count from 1 to 5");
        var handler = new org.apache.tika.sax.BodyContentHandler(20_000);
        var context = new org.apache.tika.parser.ParseContext();
        var config = new org.apache.tika.parser.pdf.PDFParserConfig();
        config.setOcrStrategy(org.apache.tika.parser.pdf.PDFParserConfig.OCR_STRATEGY.NO_OCR);
        context.set(org.apache.tika.parser.pdf.PDFParserConfig.class, config);
        new org.apache.tika.parser.pdf.PDFParser().parse(new java.io.ByteArrayInputStream(pdf("Count from 1 to 5", false)),
                handler, new org.apache.tika.metadata.Metadata(), context);
        assertThat(handler.toString()).contains("Count from 1 to 5");
    }

    @Test void acceptsPdfAndDocxWithText() throws Exception {
        assertThat(extractor.extract(file("lesson.pdf", pdf("Count from 1 to 5", false))).text()).contains("Count from 1 to 5");
        assertThat(extractor.extract(file("lesson.docx", docx("Học đếm từ 1 đến 5"))).text()).contains("Học đếm từ 1 đến 5");
    }

    @Test void rejectsForgedTypeCorruptEmptyAndUnsupported() {
        for (var file : new MockMultipartFile[]{file("fake.pdf", "not a pdf".getBytes()),
                file("lesson.docx", new byte[]{1, 2, 3}), file("empty.pdf", new byte[0]),
                file("lesson.txt", "Count from one to five".getBytes())}) {
            assertThatThrownBy(() -> extractor.extract(file)).isInstanceOf(ApiException.class)
                    .extracting(e -> ((ApiException)e).getErrorCode().name()).isEqualTo("FILE_TOO_LARGE_OR_INVALID_FORMAT");
        }
    }

    @Test void rejectsEncryptedAndScannedPdf() throws Exception {
        for (byte[] bytes : new byte[][] {pdf("Count", true), pdf(null, false)}) {
            assertThatThrownBy(() -> extractor.extract(file("lesson.pdf", bytes))).isInstanceOf(ApiException.class);
        }
    }

    @Test void rejectsTextOverLimitWithoutTruncation() throws Exception {
        assertThatThrownBy(() -> extractor.extract(file("long.docx", docx("count ".repeat(3400)))))
                .isInstanceOf(ApiException.class).hasMessageContaining("20.000");
    }

    @Test void rejectsOverTenMiBBeforeStartingWorker() {
        assertThatThrownBy(() -> extractor.extract(file("large.pdf", new byte[10 * 1024 * 1024 + 1])))
                .isInstanceOf(ApiException.class).hasMessageContaining("10MB");
    }

    @Test void sensitiveTextIsNotExposedByRecordToString() {
        assertThat(new ExtractedLesson("PRIVATE_SENTINEL").toString()).doesNotContain("PRIVATE_SENTINEL");
    }

    static MockMultipartFile file(String name, byte[] bytes) {
        return new MockMultipartFile("file", name, "application/octet-stream", bytes);
    }
    static byte[] pdf(String text, boolean encrypted) throws Exception {
        try (var doc = new PDDocument(); var out = new ByteArrayOutputStream()) {
            var page = new PDPage(); doc.addPage(page);
            if (text != null) try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText(); stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(40, 700); stream.showText(text); stream.endText();
            }
            if (encrypted) doc.protect(new StandardProtectionPolicy("owner", "secret", new AccessPermission()));
            doc.save(out); return out.toByteArray();
        }
    }
    static byte[] docx(String text) throws Exception {
        var out = new ByteArrayOutputStream();
        try (var zip = new ZipOutputStream(out)) {
            part(zip, "[Content_Types].xml", """
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>
                    """);
            part(zip, "_rels/.rels", """
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>
                    """);
            part(zip, "word/document.xml", "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>" + text + "</w:t></w:r></w:p></w:body></w:document>");
        }
        return out.toByteArray();
    }
    private static void part(ZipOutputStream zip, String path, String content) throws Exception {
        zip.putNextEntry(new ZipEntry(path)); zip.write(content.getBytes(StandardCharsets.UTF_8)); zip.closeEntry();
    }
}
