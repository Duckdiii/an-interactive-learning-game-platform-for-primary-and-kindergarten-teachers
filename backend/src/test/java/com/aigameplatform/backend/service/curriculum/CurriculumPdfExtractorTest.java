package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CurriculumPdfExtractorTest {
    @TempDir Path directory;

    @Test
    void validatesFragmentsInTheirPagesAndRejectsADifferentSource() throws Exception {
        Path pdf = directory.resolve("source.pdf");
        try (var doc = new PDDocument()) {
            var page = new PDPage();
            doc.addPage(page);
            try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(300, 650);
                stream.showText("Outcome alpha.");
                stream.endText();
            }
            doc.save(pdf.toFile());
        }
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(pdf)));
        var source = new CurriculumSource("source.pdf", sha, "version", "fixture-v1", 1);
        var chunk = new CurriculumChunk("alpha", Subject.MATH, GradeLevel.GRADE_1, "topic", "Outcome alpha.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Outcome alpha.")));
        assertThat(new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(chunk)), directory.resolve("output")).verifiedChunks()).isEqualTo(1);
        var badSource = new CurriculumSource("source.pdf", "0".repeat(64), "version", "fixture-v1", 1);
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(badSource, List.of(chunk)), directory.resolve("bad-output")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
