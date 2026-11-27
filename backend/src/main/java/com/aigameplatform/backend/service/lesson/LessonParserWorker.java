package com.aigameplatform.backend.service.lesson;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipInputStream;
import org.apache.tika.extractor.EmbeddedDocumentExtractor;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.parser.microsoft.ooxml.OOXMLParser;
import org.apache.tika.parser.pdf.PDFParser;
import org.apache.tika.parser.pdf.PDFParserConfig;
import org.apache.tika.sax.BodyContentHandler;
import org.apache.tika.exception.WriteLimitReachedException;
import org.xml.sax.ContentHandler;

/** Standalone child process. Binary stdin and UTF-8 stdout are the only document transport. */
public final class LessonParserWorker {
    private LessonParserWorker() { }

    public static void main(String[] args) {
        var output = System.out;
        // Third-party diagnostics must never mix with text or leak payloads into server logs.
        System.setOut(new PrintStream(OutputStream.nullOutputStream()));
        System.setErr(new PrintStream(OutputStream.nullOutputStream()));
        int result = 2;
        try {
            byte[] bytes = System.in.readNBytes(LessonDocumentExtractor.MAX_FILE_BYTES + 1);
            if (args.length != 1) throw new IOException("invalid arguments");
            output.write(extract(bytes, args[0]).getBytes(StandardCharsets.UTF_8)); output.flush();
            result = 0;
        } catch (Throwable failure) {
            // Only fixed status codes cross the process boundary. No provider/parser exception payloads.
            if (WriteLimitReachedException.isWriteLimitReached(failure)) result = 4;
        }
        System.exit(result);
    }

    static String extract(byte[] bytes, String type) throws Exception {
            if (bytes.length == 0 || bytes.length > LessonDocumentExtractor.MAX_FILE_BYTES)
                throw new IOException("invalid input");
            var context = new ParseContext();
            context.set(EmbeddedDocumentExtractor.class, new EmbeddedDocumentExtractor() {
                public boolean shouldParseEmbedded(Metadata metadata) { return false; }
                public void parseEmbedded(InputStream input, ContentHandler handler, Metadata metadata, boolean html) { }
            });
            var handler = new BodyContentHandler(LessonDocumentExtractor.MAX_TEXT_CHARS);
            var metadata = new Metadata();
            if ("pdf".equals(type)) {
                if (bytes.length < 5 || !new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-"))
                    throw new IOException("invalid pdf");
                var config = new PDFParserConfig();
                config.setOcrStrategy(PDFParserConfig.OCR_STRATEGY.NO_OCR);
                config.setExtractInlineImages(false);
                context.set(PDFParserConfig.class, config);
                new PDFParser().parse(new ByteArrayInputStream(bytes), handler, metadata, context);
            } else if ("docx".equals(type)) {
                validateDocx(bytes);
                new OOXMLParser().parse(new ByteArrayInputStream(bytes), handler, metadata, context);
            } else throw new IOException("invalid type");
            String text = handler.toString().strip();
            if (text.isBlank() || text.codePoints().noneMatch(Character::isLetterOrDigit))
                throw new IOException("no readable text");
            return text;
    }

    private static void validateDocx(byte[] bytes) throws IOException {
        boolean document = false, contentType = false;
        long expanded = 0; int count = 0;
        try (var zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                if (++count > 256) throw new IOException("too many entries");
                boolean types = "[Content_Types].xml".equals(entry.getName());
                var typeBytes = types ? new ByteArrayOutputStream() : null;
                byte[] buffer = new byte[8192]; int length;
                while ((length = zip.read(buffer)) != -1) {
                    expanded += length;
                    if (expanded > 20L * 1024 * 1024) throw new IOException("expanded size limit");
                    if (types) {
                        if (typeBytes.size() + length > 64 * 1024) throw new IOException("invalid content types");
                        typeBytes.write(buffer, 0, length);
                    }
                }
                if (types) contentType = typeBytes.toString(StandardCharsets.UTF_8)
                        .contains("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml");
                if ("word/document.xml".equals(entry.getName())) document = true;
            }
        }
        if (!document || !contentType) throw new IOException("not a docx document");
    }
}
