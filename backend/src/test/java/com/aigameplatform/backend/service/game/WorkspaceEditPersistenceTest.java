package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.db.AbstractPostgresTest;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.play.StudentPlayService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionOperations;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class WorkspaceEditPersistenceTest extends AbstractPostgresTest {
    @Autowired GameRepository games;
    @Autowired TeacherRepository teachers;
    @Autowired GameContentStrategyRegistry strategies;
    @Autowired GameService editor;
    @Autowired StudentPlayService student;
    @Autowired JsonMapper mapper;
    @Autowired JdbcTemplate db;
    @Autowired TransactionOperations transactions;

    @ParameterizedTest
    @ValueSource(strings = {"WAITING", "ACTIVE", "PAUSED"})
    void unfinishedSessionBlocksEvenAValidEdit(String status) {
        Game game = publishedQuiz();
        db.update("insert into game_sessions(id, game_id, status) values (?, ?, ?)",
                UUID.randomUUID().toString(), game.getId(), status);

        assertConflict(game);
        assertThat(historyCount(game)).isZero();
    }

    @Test
    void expiredPlayDoesNotPreventSaveAndHistorySurvivesLaterEdits() {
        Game game = publishedQuiz();
        String teacherId = game.getAuthor().getId();
        String previousQuestionId = game.getQuestions().getFirst().getId();
        var session = student.start(game.getShareCode(), "Ong");
        var board = student.questions((String) session.get("sessionId"), (String) session.get("participantId"))
                .path("questions").get(0);
        var answer = mapper.createObjectNode().put("questionId", "q1").put("timeSpentMs", 1000)
                .put("selectedOptionId", board.path("options").get(0).path("id").asString());
        student.interact((String) session.get("sessionId"), (String) session.get("participantId"), answer);
        db.update("update self_sessions set session_expires_at = current_timestamp - interval '1 hour' where id = ?",
                session.get("sessionId"));

        var body = draft(game);
        ((ObjectNode) body.path("questions").get(0)).put("questionText", "Có bao nhiêu con mèo?");
        editor.update(teacherId, game.getId(), body);
        assertThat(editor.get(teacherId, game.getId()).path("questions").get(0).path("questionText").asString())
                .isEqualTo("Có bao nhiêu con mèo?");
        editor.update(teacherId, game.getId(), draft(game));
        assertThat(historyCount(game)).isEqualTo(1);
        assertThat(db.queryForObject("select changed_paths from edit_logs where game_id = ?", String.class, game.getId()))
                .isEqualTo("[\"/questions/0/questionText\"]");
        assertThat(db.queryForObject("select editor_teacher_id from edit_logs where game_id = ?", String.class, game.getId()))
                .isEqualTo(teacherId);
        assertThat(db.queryForObject("select retired from question_games where id = ?", Boolean.class, previousQuestionId))
                .isTrue();
        assertThat(db.queryForObject("select count(*) from play_interaction_details where question_id = ?",
                Long.class, previousQuestionId)).isEqualTo(1);
    }

    @Test
    void removingFirstQuestionKeepsThePersistedIdOfTheOtherQuestion() {
        Game game = publishedQuiz();
        String previousSecondId = game.getQuestions().get(1).getId();
        ObjectNode body = draft(game);
        var questions = (tools.jackson.databind.node.ArrayNode) body.path("questions");
        questions.remove(0);
        ((ObjectNode) questions.get(0)).put("id", "q1");

        editor.update(game.getAuthor().getId(), game.getId(), body);

        assertThat(db.queryForList("select id from question_games where game_id = ? and not retired",
                String.class, game.getId())).containsExactly(previousSecondId);
    }

    @Test
    void updateWaitsForInFlightStartAndRejectsAfterTheSessionCommits() throws Exception {
        Game game = publishedQuiz();
        var roomCreated = new CountDownLatch(1);
        var mayCommit = new CountDownLatch(1);
        var editStarted = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var start = executor.submit(() -> transactions.executeWithoutResult(ignored -> {
                student.start(game.getShareCode(), "Ong");
                roomCreated.countDown();
                await(mayCommit);
            }));
            try {
                await(roomCreated);
                var update = executor.submit(() -> {
                    editStarted.countDown();
                    assertConflict(game);
                });
                await(editStarted);
                assertThatThrownBy(() -> update.get(250, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
                mayCommit.countDown();
                update.get(10, TimeUnit.SECONDS);
                start.get(10, TimeUnit.SECONDS);
            } finally {
                mayCommit.countDown();
            }
        }
        assertThat(historyCount(game)).isZero();
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AssertionError(e);
        }
    }

    private void assertConflict(Game game) {
        var body = draft(game);
        ((ObjectNode) body.path("metadata")).put("title", "Tên sau chỉnh sửa");
        assertThatThrownBy(() -> editor.update(game.getAuthor().getId(), game.getId(), body))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
    }

    private long historyCount(Game game) {
        return db.queryForObject("select count(*) from edit_logs where game_id = ?", Long.class, game.getId());
    }

    private ObjectNode draft(Game game) {
        ObjectNode body = editor.get(game.getAuthor().getId(), game.getId());
        body.remove(GameReports.MANAGEMENT_FIELDS);
        return body;
    }

    private Game publishedQuiz() {
        Teacher teacher = new Teacher();
        teacher.setEmail("workspace-" + UUID.randomUUID() + "@example.invalid");
        teacher.setFullName("Workspace fixture");
        teacher.setPasswordHash("fixture");
        teachers.saveAndFlush(teacher);
        GameDsl dsl = mapper.readValue(getClass().getResourceAsStream("/dsl-examples/quiz.json"), GameDsl.class);
        Game game = new Game();
        game.setAuthor(teacher);
        game.setTitle(dsl.metadata().title());
        game.setTopic(dsl.metadata().topic());
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSubject(dsl.metadata().subject());
        game.setGameType(dsl.gameType());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setShareCode(UUID.randomUUID().toString().substring(0, 6));
        game.replaceQuestions(strategies.get(dsl.gameType()).parseToQuestions(dsl));
        game.setStatus(GameStatus.PUBLISHED);
        return games.saveAndFlush(game);
    }
}
