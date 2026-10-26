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
    void neverLabelsAnUncheckedVisualFragmentAsSourceVerified() throws Exception {
        Path pdf = directory.resolve("visual-source.pdf");
        try (var doc = new PDDocument()) {
            var page = new PDPage();
            doc.addPage(page);
            try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(300, 650);
                stream.showText("Fraction symbols rendered visually.");
                stream.endText();
            }
            doc.save(pdf.toFile());
        }
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(pdf)));
        var source = new CurriculumSource("visual-source.pdf", sha, "version", "visual-v1", 1);
        var chunk = new CurriculumChunk("fraction", Subject.MATH, GradeLevel.GRADE_3, "fractions",
                "Visually transcribed fraction outcome.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "VISUAL_RIGHT",
                        "Visually transcribed fraction outcome.")));

        var verification = new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(chunk)), directory.resolve("visual-output"));

        assertThat(verification.chunks()).singleElement().satisfies(result -> {
            assertThat(result.sourceFragmentsMatched()).isFalse();
            assertThat(result.sourceVerificationMethod()).isEqualTo("TEXT_TRANSCRIPTION_PENDING");
        });
        assertThat(verification.verifiedChunks()).isZero();
        assertThat(verification.evaluationStatus()).contains("TEXT_TRANSCRIPTION_PENDING")
                .doesNotContain("VISUAL_TRANSCRIPTION_REVIEWED");
        assertThat(Files.readString(directory.resolve("visual-output/outcomes.md")))
                .contains("Visually transcribed fraction outcome.", "TEXT_TRANSCRIPTION_PENDING", "PDF 1");

        var checked = new CurriculumPdfExtractor.TextTranscription(sha, "fraction", 1, 1,
                "Visually transcribed fraction outcome.", "Fixture source reviewer", "2026-10-23", "AI_SOURCE_TRANSCRIPTION");
        var reviewed = new CurriculumPdfExtractor().verifyAndExtract(pdf, new CurriculumDataset(source, List.of(chunk)),
                directory.resolve("reviewed-output"), List.of(checked));
        assertThat(reviewed.verifiedChunks()).isEqualTo(1);
        assertThat(reviewed.chunks()).singleElement().satisfies(result -> {
            assertThat(result.sourceFragmentsMatched()).isTrue();
            assertThat(result.sourceVerificationMethod()).isEqualTo("AI_REVIEWED_TEXT_TRANSCRIPTION");
            assertThat(result.pedagogicalReview()).isEqualTo("NOT_REVIEWED");
        });
        assertThat(Files.readString(directory.resolve("reviewed-output/outcomes.md")))
                .contains("Fixture source reviewer", "2026-10-23", "Teacher review: NOT_REVIEWED");

        var changed = new CurriculumChunk("fraction", Subject.MATH, GradeLevel.GRADE_3, "fractions", "Fabricated outcome.",
                false, List.of(new CurriculumChunk.SourceFragment(1, 1, "VISUAL_RIGHT", "Fabricated outcome.")));
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(changed)), directory.resolve("tampered-output"), List.of(checked)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("differs from reviewed");
    }
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
        var verification = new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(chunk)), directory.resolve("output"));
        assertThat(verification.verifiedChunks()).isEqualTo(1);
        assertThat(Files.readString(directory.resolve("output/outcomes.md")))
                .contains("Outcome alpha.", "PDF 1", "GRADE_1", "source.pdf");
        assertThat(verification.chunks()).singleElement().satisfies(result -> {
            assertThat(result.chunkId()).isEqualTo("alpha");
            assertThat(result.sourceFragmentsMatched()).isTrue();
            assertThat(result.semanticAtomicityReview()).isEqualTo("NOT_REVIEWED");
            assertThat(result.pedagogicalReview()).isEqualTo("NOT_REVIEWED");
        });
        var badSource = new CurriculumSource("source.pdf", "0".repeat(64), "version", "fixture-v1", 1);
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(badSource, List.of(chunk)), directory.resolve("bad-output")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void verifiesOutcomeTextNearTheBottomPageMargin() throws Exception {
        Path pdf = directory.resolve("bottom-outcome.pdf");
        try (var doc = new PDDocument()) {
            var page = new PDPage();
            doc.addPage(page);
            try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(300, 15);
                stream.showText("Outcome near the page bottom.");
                stream.endText();
            }
            doc.save(pdf.toFile());
        }
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(pdf)));
        var source = new CurriculumSource("bottom-outcome.pdf", sha, "version", "bottom-v1", 1);
        var chunk = new CurriculumChunk("bottom", Subject.MATH, GradeLevel.GRADE_1, "topic",
                "Outcome near the page bottom.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Outcome near the page bottom.")));

        var verification = new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(chunk)), directory.resolve("bottom-output"));

        assertThat(verification.verifiedChunks()).isEqualTo(1);
    }

    @Test
    void includesTheFullThirdColumnWhenVerifyingCenterRightRegionOutcomes() throws Exception {
        Path pdf = directory.resolve("right-column-outcome.pdf");
        try (var doc = new PDDocument()) {
            var page = new PDPage();
            doc.addPage(page);
            try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(240, 650);
                stream.showText("Outcome begins at the third-column edge.");
                stream.endText();
            }
            doc.save(pdf.toFile());
        }
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(pdf)));
        var source = new CurriculumSource("right-column-outcome.pdf", sha, "version", "right-column-v1", 1);
        var chunk = new CurriculumChunk("right-column", Subject.ENGLISH, GradeLevel.GRADE_4, "listening",
                "Outcome begins at the third-column edge.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "CENTER_RIGHT", "Outcome begins at the third-column edge.")));

        var verification = new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(chunk)), directory.resolve("right-column-output"));

        assertThat(verification.verifiedChunks()).isEqualTo(1);
    }

    @Test
    void isolatesCenterLeftOutcomesFromAdjacentLanguageColumnText() throws Exception {
        Path pdf = directory.resolve("center-left-outcome.pdf");
        try (var doc = new PDDocument()) {
            var page = new PDPage();
            doc.addPage(page);
            try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(50, 650);
                stream.showText("Outcome from first column.");
                stream.newLineAtOffset(280, 0);
                stream.showText("Text from adjacent column.");
                stream.endText();
            }
            doc.save(pdf.toFile());
        }
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(pdf)));
        var source = new CurriculumSource("center-left-outcome.pdf", sha, "version", "center-left-v1", 1);
        var chunk = new CurriculumChunk("center-left", Subject.ENGLISH, GradeLevel.GRADE_1, "listening",
                "Outcome from first column.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "CENTER_LEFT", "Outcome from first column.")));
        Path output = directory.resolve("center-left-output");

        var verification = new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(chunk)), output);

        assertThat(verification.verifiedChunks()).isEqualTo(1);
        assertThat(Files.readString(output.resolve("page-1-center_left.txt")))
                .contains("Outcome from first column.")
                .doesNotContain("Text from adjacent column.");
    }
}
