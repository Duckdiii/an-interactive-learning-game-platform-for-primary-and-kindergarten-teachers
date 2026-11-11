package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
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
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class GameServiceTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final String OWNER = "teacher-1";

    private final GameRepository games = mock(GameRepository.class);
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final GameContentHandler dsl = mock(GameContentHandler.class);
    private final GameContentHandler cpf = mock(GameContentHandler.class);
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
        service = new GameService(games, teachers, List.of(dsl, cpf), MAPPER);
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
        when(cpf.generate(eq(GameType.CUSTOM), anyString(), any(), any())).thenReturn(
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
        verify(dsl, never()).generate(any(), any(), any(), any());
    }

    @Test
    void customGameNeedsAnIdea() {
        assertThatThrownBy(() -> service.generate(OWNER, request(null, true, GameType.CUSTOM)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void randomTopicGivesTheDslHandlerAGeneratedTopic() {
        when(dsl.generate(eq(GameType.QUIZ), anyString(), any(), any()))
                .thenReturn(new GameContentHandler.GeneratedContent("Quiz", "1.0.0", List.of(), null));

        service.generate(OWNER, request(null, true, null));

        verify(dsl).generate(GameType.QUIZ, GameService.RANDOM_TOPIC, Subject.MATH, GradeLevel.GRADE_1);
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
        when(games.findById("g")).thenReturn(Optional.of(game("g", "teacher-2", GameType.QUIZ)));

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
        when(games.findById("g")).thenReturn(Optional.of(stored));
        var body = MAPPER.createObjectNode().put("kind", "CPF");

        service.update(OWNER, "g", body);

        verify(cpf).replaceContent(stored, body);
        verify(games).saveAndFlush(stored);
    }

    @Test
    void updateMovesUpdatedAtEvenWhenOnlyQuestionsChange() {
        Game stored = game("g", OWNER, GameType.QUIZ);
        when(games.findById("g")).thenReturn(Optional.of(stored));
        when(games.saveAndFlush(stored)).thenAnswer(inv -> inv.getArgument(0));

        service.update(OWNER, "g", MAPPER.createObjectNode());

        assertThat(stored.getUpdatedAt()).isAfter(Instant.EPOCH);
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
}
