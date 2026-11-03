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
        var reportPath = directory.resolve("output/source-verification.json");
        var report = new tools.jackson.databind.json.JsonMapper().readTree(Files.readString(reportPath));
        assertThat(report.path("datasetVersion").asString()).isEqualTo("fixture-v1");
        assertThat(report.path("verifiedOutcomes").asInt()).isEqualTo(1);
        assertThat(report.path("verifiedControls").asInt()).isZero();
        assertThat(report.path("chunks").get(0).path("chunkId").asString()).isEqualTo("alpha");
        assertThat(report.path("chunks").get(0).path("sourceFragments").get(0).path("pdfPage").asInt()).isEqualTo(1);
        var badSource = new CurriculumSource("source.pdf", "0".repeat(64), "version", "fixture-v1", 1);
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(badSource, List.of(chunk)), directory.resolve("bad-output")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(badSource, List.of(chunk)), directory.resolve("output")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(reportPath).doesNotExist();
        var incorrect = new CurriculumChunk("wrong", Subject.MATH, GradeLevel.GRADE_1, "topic", "Wrong outcome.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Wrong outcome.")));
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(incorrect)), directory.resolve("output")))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("wrong");
        assertThat(reportPath).doesNotExist();
    }

    @Test
    void verifiesEnglishSkillsOnlyInsideTheReviewedSkillsColumn() throws Exception {
        Path pdf = directory.resolve("english-table.pdf");
        try (var doc = new PDDocument()) {
            var page = new PDPage();
            doc.addPage(page);
            try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(300, 650);
                stream.showText("Skill outcome.");
                stream.endText();
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(449, 650);
                stream.showText("Language knowledge.");
                stream.endText();
            }
            doc.save(pdf.toFile());
        }
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(pdf)));
        var source = new CurriculumSource("english.pdf", sha, "version", "english-fixture-v1", 1);
        var chunk = new CurriculumChunk("english-skill", Subject.ENGLISH, GradeLevel.GRADE_3,
                "English / Listening", "Skill outcome.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "SKILLS", "Skill outcome.")));

        assertThat(new CurriculumPdfExtractor().verifyAndExtract(pdf, new CurriculumDataset(source, List.of(chunk)),
                directory.resolve("english-output")).verifiedChunks()).isEqualTo(1);

        var adjacentColumnText = new CurriculumChunk("english-language-leak", Subject.ENGLISH, GradeLevel.GRADE_3,
                "English / Language knowledge", "Language knowledge.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "SKILLS", "Language knowledge.")));
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(adjacentColumnText)), directory.resolve("english-leak-output")))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("english-language-leak");
    }

    @Test
    void limitsTheReviewedEnglishGradeThreeSkillsRegionToItsSourcePages() {
        var source = new CurriculumSource("Thông-tư-32-2018-TT-BGDĐT.pdf", "a".repeat(64),
                "32/2018/TT-BGDDT", "english-grade3-draft-v1", 1555);

        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1275, "SKILLS")).doesNotThrowAnyException();
        assertThatThrownBy(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1278, "SKILLS"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not reviewed");
    }

    @Test
    void limitsEnglishGradeFourSkillsToItsReviewedPagesAndBands() {
        var source = new CurriculumSource("Thông-tư-32-2018-TT-BGDĐT.pdf", "a".repeat(64),
                "32/2018/TT-BGDDT", "english-grade4-draft-v1", 1555);

        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1277, "SKILLS_G4")).doesNotThrowAnyException();
        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1277, "SKILLS_G3")).doesNotThrowAnyException();
        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1278, "SKILLS_G4")).doesNotThrowAnyException();
        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1278, "SKILLS_G4")).doesNotThrowAnyException();
        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1279, "SKILLS_G4")).doesNotThrowAnyException();
        assertThatThrownBy(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1280, "SKILLS"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not reviewed");
        assertThatThrownBy(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1277, "SKILLS_G5"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not reviewed");
    }

    @Test
    void limitsEnglishGradeFiveSkillsToItsReviewedPagesAndBands() {
        var source = new CurriculumSource("Thông-tư-32-2018-TT-BGDĐT.pdf", "a".repeat(64),
                "32/2018/TT-BGDDT", "english-grade5-draft-v1", 1555);

        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1279, "SKILLS_G5")).doesNotThrowAnyException();
        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1280, "SKILLS_G5")).doesNotThrowAnyException();
        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1281, "SKILLS_G5")).doesNotThrowAnyException();
        assertThatCode(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1279, "SKILLS_G4")).doesNotThrowAnyException();
        assertThatThrownBy(() -> CurriculumPdfExtractor.validateSkillsPage(source, 1282, "SKILLS_G5"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not reviewed");
    }

    @Test
    void checksPrintedPageNumberFromTheFinalExtractedFooterLine() {
        assertThat(CurriculumPdfExtractor.matchesPrintedPageFooter("Outcome text\n2 6\n", 26)).isTrue();
        assertThat(CurriculumPdfExtractor.matchesPrintedPageFooter("Outcome text\n2 7\n", 26)).isFalse();
    }

    @Test
    void acceptsOnlyAnExplicitSourceTranscriptionWhenPdfBoxCannotReadTheSymbol() throws Exception {
        Path pdf = directory.resolve("symbol-source.pdf");
        try (var doc = new PDDocument()) {
            var page = new PDPage();
            doc.addPage(page);
            try (var stream = new PDPageContentStream(doc, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                stream.newLineAtOffset(300, 650);
                stream.showText("PDFBox unreadable symbol marker.");
                stream.endText();
            }
            doc.save(pdf.toFile());
        }
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(pdf)));
        var source = new CurriculumSource("symbol.pdf", sha, "version", "symbol-fixture-v1", 1);
        var chunk = new CurriculumChunk("symbol-outcome", Subject.MATH, GradeLevel.GRADE_3,
                "Fractions", "Outcome contains one half 1/2.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Outcome contains one half 1/2.")));
        var transcript = new CurriculumDataset.ManualTranscription("symbol-outcome", 1, 1, "RIGHT",
                "Outcome contains one half 1/2.");
        var dataset = new CurriculumDataset(source, List.of(chunk), List.of(transcript));

        var result = new CurriculumPdfExtractor().verifyAndExtract(pdf, dataset, directory.resolve("symbol-output"));

        assertThat(result.manualTranscriptionChunkIds()).containsExactly("symbol-outcome");
        assertThat(result.verifiedChunks()).isZero();
        assertThat(result.manualTranscribedOutcomes()).isEqualTo(1);
        assertThatThrownBy(() -> new CurriculumPdfExtractor().verifyAndExtract(pdf,
                new CurriculumDataset(source, List.of(chunk)), directory.resolve("symbol-without-transcription")))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("symbol-outcome");
        assertThatThrownBy(() -> new CurriculumDataset(source, List.of(chunk), List.of(
                new CurriculumDataset.ManualTranscription("symbol-outcome", 1, 1, "RIGHT", "Different text."))))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("match one declared source fragment");
    }

    @Test
    void verifiesPreschoolOutcomesAgainstTheirActualAgeColumnAndOfficialSourceHash() throws Exception {
        var dataset = CurriculumDataset.loadKindergarten();
        Path sourcePdf = Path.of("src/main/resources/curriculum/kindergarten/sources/01-VBHN-BGDĐT-2021.pdf");

        var result = new CurriculumPdfExtractor().verifyAndExtract(sourcePdf, dataset, directory.resolve("kg-output"));

        assertThat(result.sourceSha256()).isEqualTo(dataset.source().sourceSha256());
        assertThat(result.verifiedChunks()).isEqualTo(131);
        assertThat(result.extractedPages()).isEqualTo(10);
        assertThat(result.verifiedOutcomes()).isEqualTo(131);
        assertThat(result.manualTranscribedOutcomes()).isEqualTo(3);
        assertThat(dataset.chunks()).hasSize(134).noneMatch(CurriculumChunk::control);
        assertThat(dataset.chunks()).filteredOn(chunk -> "COGNITIVE".equals(chunk.domain())).hasSize(87);
        assertThat(dataset.chunks()).filteredOn(chunk -> "LANGUAGE".equals(chunk.domain())).hasSize(47);
        assertThat(dataset.chunks()).filteredOn(chunk -> "AGE_3_4".equals(chunk.ageBand())).hasSize(38);
        assertThat(dataset.chunks()).filteredOn(chunk -> "AGE_4_5".equals(chunk.ageBand())).hasSize(47);
        assertThat(dataset.chunks()).filteredOn(chunk -> "AGE_5_6".equals(chunk.ageBand())).hasSize(49);
        assertThat(dataset.chunks()).filteredOn(chunk -> chunk.subDomain().contains("SOCIAL_EXPLORATION"))
                .hasSize(25)
                .extracting(CurriculumChunk::ageBand)
                .contains("AGE_3_4", "AGE_4_5", "AGE_5_6");
        assertThat(dataset.chunks()).filteredOn(chunk -> chunk.subDomain().contains("EXPERIMENTATION"))
                .hasSize(3)
                .extracting(CurriculumChunk::ageBand)
                .containsExactly("AGE_3_4", "AGE_4_5", "AGE_5_6");
    }
}
