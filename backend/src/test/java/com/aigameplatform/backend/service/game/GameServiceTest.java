package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.request.ReviseGameRequest;
import com.aigameplatform.backend.exception.RateLimitedException;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.CpfQuestion;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.classroom.ClassroomService;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.generation.GenerationResult;
import com.aigameplatform.backend.service.lesson.GameInputGuard;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.support.TransactionOperations;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class GameServiceTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final String OWNER = "teacher-1";

    private final GameRepository games = mock(GameRepository.class);
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final GameContentHandler dsl = mock(GameContentHandler.class);
    private final GameContentHandler cpf = mock(GameContentHandler.class);
    private final AiRequestRateLimiter limiter = mock(AiRequestRateLimiter.class);
    private final GameCurriculumReviewService curriculumReviews = mock(GameCurriculumReviewService.class);
    @SuppressWarnings("unchecked")
    private final org.springframework.beans.factory.ObjectProvider<com.aigameplatform.backend.service.curriculum.CurriculumCatalog> catalogs =
            mock(org.springframework.beans.factory.ObjectProvider.class);
    private final com.aigameplatform.backend.repository.GameSessionRepository sessions =
            mock(com.aigameplatform.backend.repository.GameSessionRepository.class);
    private final com.aigameplatform.backend.repository.EditLogRepository editLogs =
            mock(com.aigameplatform.backend.repository.EditLogRepository.class);
    private final ClassroomService classrooms = mock(ClassroomService.class);
    private final GameInputGuard inputGuard = mock(GameInputGuard.class);
    private GameService service;

    @BeforeEach
    void setUp() {
        when(dsl.handles(any())).thenAnswer(inv -> inv.getArgument(0) != GameType.CUSTOM);
        when(cpf.handles(any())).thenAnswer(inv -> inv.getArgument(0) == GameType.CUSTOM);
        when(dsl.toResponse(any(), any())).thenAnswer(inv -> ((ObjectNode) inv.getArgument(1)).put("kind", "DSL"));
        when(cpf.toResponse(any(), any())).thenAnswer(inv -> ((ObjectNode) inv.getArgument(1)).put("kind", "CPF"));
        when(games.saveAndFlush(any())).thenAnswer(inv -> {
            Game g = inv.getArgument(0);
            if (g.getId() == null) g.setId("game-new");
            g.setUpdatedAt(Instant.parse("2026-11-07T00:00:00Z"));
            return g;
        });
        when(teachers.getReferenceById(anyString())).thenAnswer(inv -> teacher(inv.getArgument(0)));
        when(curriculumReviews.saveEditedGame(any(), anyString())).thenAnswer(inv -> inv.getArgument(0));
        service = new GameService(games, teachers, List.of(dsl, cpf), MAPPER, limiter, TransactionOperations.withoutTransaction(),
                curriculumReviews, catalogs, new java.util.Random(7), null, sessions, null, editLogs, classrooms, inputGuard);
    }

    private static Teacher teacher(String id) {
        Teacher t = new Teacher();
        t.setId(id);
        return t;
    }

    private static Game game(String id, String authorId, GameType type) {
        Game g = new Game();
        g.setId(id);
        g.setAuthor(teacher(authorId));
        g.setGameType(type);
        g.setTitle("T");
        g.setStatus(GameStatus.DRAFT);
        g.setUpdatedAt(Instant.EPOCH);
        return g;
    }

    private static GenerateGameRequest request(String idea, Boolean random, GameType type) {
        return new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_1, idea, random, type, null);
    }

    // ---- generate ----

    @Test
    void generatedGameIsSavedAsDraftOwnedByTheTeacherViaTheMatchingHandler() {
        when(cpf.generate(eq(GameType.CUSTOM), anyString(), any())).thenReturn(
                new GameContentHandler.GeneratedContent("Hứng táo", "2.0.0", List.of(new CpfQuestion()), null));

        ObjectNode response = service.generate(OWNER, request("Bé kéo giỏ hứng táo số chẵn", null, GameType.CUSTOM));

        ArgumentCaptor<Game> saved = ArgumentCaptor.forClass(Game.class);
        verify(games).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getAuthor().getId()).isEqualTo(OWNER);
        assertThat(saved.getValue().getStatus()).isEqualTo(GameStatus.DRAFT);
        assertThat(saved.getValue().getSchemaVersion()).isEqualTo("2.0.0");
        assertThat(saved.getValue().getQuestionNum()).isEqualTo(1);
        assertThat(response.path("kind").asString()).isEqualTo("CPF");
        assertThat(response.path("gameId").asString()).isEqualTo("game-new");
        assertThat(response.path("status").asString()).isEqualTo("DRAFT");
        assertThat(response.path("updatedAt").asString()).isEqualTo("2026-11-07T00:00:00Z");
        verify(dsl, never()).generate(any(), any(), any());
    }

    @Test
    void classroomContextDoesNotReplaceTheTopicAndSelectedVoiceReachesAudio() {
        var audio = mock(com.aigameplatform.backend.service.media.GameAudioEnricher.class);
        var audioProvider = new org.springframework.beans.factory.support.StaticListableBeanFactory();
        audioProvider.addBean("testAudio", audio);
        service = new GameService(games, teachers, List.of(dsl, cpf), MAPPER, limiter, TransactionOperations.withoutTransaction(),
                curriculumReviews, catalogs, new java.util.Random(7), audioProvider.getBeanProvider(
                        com.aigameplatform.backend.service.media.GameAudioEnricher.class), sessions, null, editLogs, classrooms, inputGuard);
        var request = new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_1, "Đếm số con mèo", false, GameType.QUIZ,
                null, null, null, MAPPER.createObjectNode().put("gender", "MALE"), null, "class-1");
        String context = "Phạm vi đã học: Đếm đến 5";
        when(classrooms.generationContext(OWNER, "class-1", GradeLevel.GRADE_1)).thenReturn(context);
        when(dsl.generate(GameType.QUIZ, "Đếm số con mèo", request, context)).thenReturn(
                new GameContentHandler.GeneratedContent("Đếm mèo", "1.0.0", List.of(), null));

        service.generate(OWNER, request);

        var order = org.mockito.Mockito.inOrder(inputGuard, dsl);
        order.verify(inputGuard).requireSafe("Đếm số con mèo", null);
        order.verify(dsl).generate(GameType.QUIZ, "Đếm số con mèo", request, context);
        verify(audio).enrichAllQuestionsWithAudio(List.of(), com.aigameplatform.backend.dto.media.SpeechVoice.MALE);
    }

    @Test
    void customGameNeedsAnIdea() {
        assertThatThrownBy(() -> service.generate(OWNER, request(null, true, GameType.CUSTOM)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void unsafeTeacherIdeaIsRejectedBeforeTheGeneratorRuns() {
        String idea = "Nội dung bạo lực không phù hợp cho trẻ";
        doThrow(new ApiException(ErrorCode.UNSAFE_CONTENT, "Nội dung không an toàn"))
                .when(inputGuard).requireSafe(eq(idea), eq((String) null), any(String[].class));

        assertThatThrownBy(() -> service.generate(OWNER, request(idea, null, GameType.QUIZ)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.UNSAFE_CONTENT));

        verify(dsl, never()).generate(any(), anyString(), any());
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void inputGuardIsRequiredAtConstruction() {
        assertThatThrownBy(() -> new GameService(games, teachers, List.of(dsl, cpf), MAPPER, limiter,
                TransactionOperations.withoutTransaction(), curriculumReviews, catalogs, new java.util.Random(7),
                null, sessions, null, editLogs, classrooms, null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void randomTopicGivesTheDslHandlerAGeneratedTopic() {
        when(dsl.generate(eq(GameType.QUIZ), anyString(), any()))
                .thenReturn(new GameContentHandler.GeneratedContent("Quiz", "1.0.0", List.of(), null));

        service.generate(OWNER, request(null, true, null));

        verify(dsl).generate(eq(GameType.QUIZ), eq(GameService.RANDOM_TOPIC), any());
    }

    @Test
    void randomTopicPicksAReviewedCurriculumOutcomeWhenTheCatalogIsAvailable() {
        var catalog = mock(com.aigameplatform.backend.service.curriculum.CurriculumCatalog.class);
        var dataset = mock(com.aigameplatform.backend.service.curriculum.CurriculumDataset.class);
        var outcome = mock(com.aigameplatform.backend.service.curriculum.CurriculumChunk.class);
        when(outcome.topic()).thenReturn("Đếm đến 10");
        var control = mock(com.aigameplatform.backend.service.curriculum.CurriculumChunk.class);
        when(control.control()).thenReturn(true);
        when(control.topic()).thenReturn("Đoạn kiểm soát");
        when(catalogs.getIfAvailable()).thenReturn(catalog);
        when(catalog.requireDataset(Subject.MATH, GradeLevel.GRADE_1)).thenReturn(dataset);
        when(dataset.chunks()).thenReturn(List.of(control, outcome));
        when(dsl.generate(eq(GameType.QUIZ), anyString(), any()))
                .thenReturn(new GameContentHandler.GeneratedContent("Quiz", "1.0.0", List.of(), null));

        service.generate(OWNER, request(null, true, null));

        verify(dsl).generate(eq(GameType.QUIZ), eq("Đếm đến 10"), any());
    }

    @Test
    void neitherIdeaNorRandomTopicIsRejected() {
        assertThatThrownBy(() -> service.generate(OWNER, request(null, null, GameType.QUIZ)))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void missingTeacherIsUnauthorized() {
        assertThatThrownBy(() -> service.generate(null, request("Phép cộng trong phạm vi 10", null, GameType.QUIZ)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }

    // ---- ownership ----

    @Test
    void unknownGameIsNotFound() {
        when(games.findById("x")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(OWNER, "x"))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void anotherTeachersGameIsForbiddenForReadUpdateAndDelete() {
        Game wrongOwner = game("g", "teacher-2", GameType.QUIZ);
        when(games.findById("g")).thenReturn(Optional.of(wrongOwner));
        when(games.findByIdForUpdate("g")).thenReturn(Optional.of(wrongOwner));

        for (Runnable call : List.<Runnable>of(() -> service.get(OWNER, "g"),
                () -> service.update(OWNER, "g", MAPPER.createObjectNode()), () -> service.delete(OWNER, "g"))) {
            assertThatThrownBy(call::run)
                    .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
        }
        verify(games, never()).delete(any());
        verify(dsl, never()).replaceContent(any(), any());
    }

    @Test
    void updateGoesThroughTheHandlerOfTheStoredType() {
        Game stored = game("g", OWNER, GameType.CUSTOM);
        when(games.findByIdForUpdate("g")).thenReturn(Optional.of(stored));
        org.mockito.Mockito.doAnswer(inv -> ((ObjectNode) inv.getArgument(1)).put("title", stored.getTitle()))
                .when(cpf).toResponse(eq(stored), any());
        var body = MAPPER.createObjectNode().put("kind", "CPF");
        org.mockito.Mockito.doAnswer(inv -> {
            stored.setTitle("Updated");
            return null;
        }).when(cpf).replaceContent(stored, body);

        service.update(OWNER, "g", body);

        verify(cpf).replaceContent(stored, body);
        // Lưu qua bước của bản đối chiếu để bản đó chuyển STALE (KNOWN-GAPS #1).
        verify(curriculumReviews).saveEditedGame(stored, OWNER);
        var log = org.mockito.ArgumentCaptor.forClass(com.aigameplatform.backend.entity.EditLog.class);
        verify(editLogs).save(log.capture());
        assertThat(log.getValue().getChangedPaths()).isEqualTo("[\"/title\"]");
        assertThat(log.getValue().getEditorTeacherId()).isEqualTo(OWNER);
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void generatedGameWithCurriculumResultIsSavedTogetherWithItsReview() {
        GenerationResult result = mock(GenerationResult.class);
        when(dsl.generate(eq(GameType.QUIZ), anyString(), any()))
                .thenReturn(new GameContentHandler.GeneratedContent("Quiz", "1.0.0", List.of(), null, result));
        when(curriculumReviews.saveWithGame(any(), eq(result), eq(OWNER))).thenAnswer(inv -> {
            Game g = inv.getArgument(0);
            g.setId("game-reviewed");
            return g;
        });

        ObjectNode response = service.generate(OWNER, request("Phép cộng trong phạm vi 10", null, GameType.QUIZ));

        assertThat(response.path("gameId").asString()).isEqualTo("game-reviewed");
        verify(games, never()).saveAndFlush(any());
    }

    @Test
    void updateMovesUpdatedAtEvenWhenOnlyQuestionsChange() {
        Game stored = game("g", OWNER, GameType.QUIZ);
        when(games.findByIdForUpdate("g")).thenReturn(Optional.of(stored));
        org.mockito.Mockito.doAnswer(inv -> {
            ObjectNode response = inv.getArgument(1);
            response.putArray("questions").addObject().put("point", stored.getQuestionNum());
            return response;
        }).when(dsl).toResponse(eq(stored), any());
        org.mockito.Mockito.doAnswer(inv -> {
            stored.setQuestionNum(1);
            return null;
        }).when(dsl).replaceContent(eq(stored), any());

        service.update(OWNER, "g", MAPPER.createObjectNode());

        assertThat(stored.getUpdatedAt()).isAfter(Instant.EPOCH);
        verify(editLogs).save(org.mockito.ArgumentMatchers.argThat(log ->
                "[\"/questions/0/point\"]".equals(log.getChangedPaths())));
    }

    @Test
    void lockedGameSkipsContentChangesAndHistory() {
        Game stored = game("g", OWNER, GameType.QUIZ);
        when(games.findByIdForUpdate("g")).thenReturn(Optional.of(stored));
        when(sessions.hasUnfinishedSession(eq("g"), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.update(OWNER, "g", MAPPER.createObjectNode()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
        verify(dsl, never()).replaceContent(any(), any());
        verify(editLogs, never()).save(any());
    }

    @Test
    void unchangedContentDoesNotRecordAnEdit() {
        Game stored = game("g", OWNER, GameType.QUIZ);
        when(games.findByIdForUpdate("g")).thenReturn(Optional.of(stored));

        service.update(OWNER, "g", MAPPER.createObjectNode());

        assertThat(stored.getUpdatedAt()).isEqualTo(Instant.EPOCH);
        verify(curriculumReviews, never()).saveEditedGame(any(), anyString());
        verify(editLogs, never()).save(any());
    }

    @Test
    void deletingAGameThatStillHasSessionsIs409() {
        Game stored = game("g", OWNER, GameType.QUIZ);
        when(games.findById("g")).thenReturn(Optional.of(stored));
        org.mockito.Mockito.doThrow(new org.springframework.dao.DataIntegrityViolationException("fk")).when(games).flush();

        assertThatThrownBy(() -> service.delete(OWNER, "g"))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
    }

    @Test
    void ownerCanDelete() {
        Game stored = game("g", OWNER, GameType.QUIZ);
        when(games.findById("g")).thenReturn(Optional.of(stored));

        service.delete(OWNER, "g");

        verify(games).delete(stored);
    }

    // ---- list ----

    @Test
    void listFiltersOnlyByGivenFields() {
        Game math = game("a", OWNER, GameType.QUIZ);
        math.setSubject(Subject.MATH);
        math.setGrade(GradeLevel.GRADE_1);
        Game viet = game("b", OWNER, GameType.CUSTOM);
        viet.setSubject(Subject.VIETNAMESE);
        viet.setGrade(GradeLevel.GRADE_1);
        when(games.findByAuthor_IdOrderByUpdatedAtDesc(OWNER)).thenReturn(List.of(math, viet));

        assertThat(service.list(OWNER, null, null, null)).extracting("gameId").containsExactly("a", "b");
        assertThat(service.list(OWNER, Subject.VIETNAMESE, null, null)).singleElement()
                .satisfies(s -> assertThat(s.gameType()).isEqualTo("CUSTOM"));
        assertThat(service.list(OWNER, null, null, GameStatus.PUBLISHED)).isEmpty();
    }

    // ---- revise (sửa bằng chat) ----

    @Test
    void reviseAsksTheHandlerOfTheStoredTypeKeepsManagementFieldsAndDoesNotSave() {
        when(games.findById("g1")).thenReturn(Optional.of(game("g1", OWNER, GameType.QUIZ)));
        when(dsl.revise(any(), eq("dễ hơn"), any())).thenReturn(MAPPER.createObjectNode().put("gameType", "QUIZ").put("kind", "REVISED"));

        ObjectNode revised = service.revise(OWNER, "g1", new ReviseGameRequest("  dễ hơn ", List.of()));

        assertThat(revised.path("kind").asString()).isEqualTo("REVISED");
        assertThat(revised.path("gameId").asString()).isEqualTo("g1");
        assertThat(revised.path("status").asString()).isEqualTo("DRAFT");
        assertThat(revised.path("updatedAt").asString()).isEqualTo(Instant.EPOCH.toString());
        verify(games, never()).saveAndFlush(any());
        verify(limiter).acquire(OWNER);
    }

    @Test
    void reviseOfAnotherTeachersGameIsForbiddenWithoutCallingTheAi() {
        when(games.findById("g1")).thenReturn(Optional.of(game("g1", "someone-else", GameType.QUIZ)));

        assertThatThrownBy(() -> service.revise(OWNER, "g1", new ReviseGameRequest("dễ hơn", null)))
                .isInstanceOf(ApiException.class).extracting("errorCode").isEqualTo(ErrorCode.FORBIDDEN);
        verify(dsl, never()).revise(any(), any(), any());
        verify(limiter, never()).acquire(any());
    }

    @Test
    void reviseOverTheRateLimitDoesNotCallTheAi() {
        when(games.findById("g1")).thenReturn(Optional.of(game("g1", OWNER, GameType.CUSTOM)));
        org.mockito.Mockito.doThrow(new RateLimitedException("chậm lại", 30)).when(limiter).acquire(OWNER);

        assertThatThrownBy(() -> service.revise(OWNER, "g1", new ReviseGameRequest("dễ hơn", null)))
                .isInstanceOf(RateLimitedException.class);
        verify(cpf, never()).revise(any(), any(), any());
    }

    @Test
    void aFailedRevisionFreesTheTeachersSlotForTheNextOne() {
        var realLimiter = new AiRequestRateLimiter(java.time.Clock.systemUTC());
        var withLimiter = new GameService(games, teachers, List.of(dsl, cpf), MAPPER, realLimiter, TransactionOperations.withoutTransaction(),
                curriculumReviews, catalogs, new java.util.Random(7), null, sessions, null, editLogs, classrooms, inputGuard);
        when(games.findById("g1")).thenReturn(Optional.of(game("g1", OWNER, GameType.QUIZ)));
        when(dsl.revise(any(), any(), any())).thenThrow(new ApiException(ErrorCode.UNSAFE_CONTENT, "x"))
                .thenReturn(MAPPER.createObjectNode().put("gameType", "QUIZ"));

        assertThatThrownBy(() -> withLimiter.revise(OWNER, "g1", new ReviseGameRequest("dễ hơn", null))).isInstanceOf(ApiException.class);
        assertThat(withLimiter.revise(OWNER, "g1", new ReviseGameRequest("dễ hơn", null)).path("gameId").asString()).isEqualTo("g1");
    }
}
