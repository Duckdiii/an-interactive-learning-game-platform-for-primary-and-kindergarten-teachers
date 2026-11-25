package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import jakarta.persistence.EntityManager;
import java.io.InputStream;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:fr08_ordering_persistence;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.moderation.required=false",
        "app.curriculum-rag.enabled=false",
        "app.ai.gemini.game-generation.enabled=false"
})
@ActiveProfiles("test")
@TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
class OrderingQuestionPersistenceTest {
    @Autowired private GameRepository games;
    @Autowired private TeacherRepository teachers;
    @Autowired private GameContentStrategyRegistry strategies;
    @Autowired private EntityManager entityManager;
    @Autowired private JsonMapper mapper;

    @Test
    @Transactional
    void savingOrderingGamePersistsItsStepsAndCanReloadThePublishedQuestion() throws Exception {
        Teacher teacher = new Teacher();
        teacher.setEmail("fr08-ordering-" + UUID.randomUUID() + "@example.invalid");
        teacher.setFullName("FR-08 ordering persistence fixture");
        teacher.setPasswordHash("not-a-login-credential");
        teacher = teachers.saveAndFlush(teacher);

        GameDsl dsl;
        try (InputStream input = getClass().getResourceAsStream("/dsl-examples/ordering.json")) {
            dsl = mapper.readValue(input, GameDsl.class);
        }
        Game game = new Game();
        game.setAuthor(teacher);
        game.setTitle("FR-08 ordering persistence fixture");
        game.setTopic("Synthetic persistence test");
        game.setGameType(GameType.ORDERING);
        game.setGrade(GradeLevel.GRADE_1);
        game.setSubject(Subject.MATH);
        game.setSchemaVersion(dsl.schemaVersion());
        game.setQuestionNum(dsl.questions().size());
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestions(strategies.get(GameType.ORDERING).parseToQuestions(dsl));
        game = games.saveAndFlush(game);
        String gameId = game.getId();

        entityManager.clear();
        Game reloaded = games.findById(gameId).orElseThrow();
        OrderingQuestion firstQuestion = (OrderingQuestion) reloaded.getQuestions().get(0);

        assertThat(firstQuestion.getSteps()).hasSize(3);
        assertThat(firstQuestion.getSteps()).extracting(step -> step.getCorrectPosition()).containsExactly(1, 2, 3);
        assertThat(strategies.get(GameType.ORDERING).toGameDsl(reloaded).questions()).hasSize(dsl.questions().size());
    }
}
