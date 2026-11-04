package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class GameGenerationControllerTest {

    @Mock
    private GameGenerationService gameGenerationService;

    @Mock
    private GameRepository gameRepository;

    private MockMvc mvc;

    @BeforeEach
    void setup() {
        GameGenerationController controller = new GameGenerationController(gameGenerationService, gameRepository);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void recommendEndpointReturnsThreeBloomLevels() throws Exception {
        mvc.perform(post("/api/games/recommend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "prompt": "Toán lớp 2 phép cộng phạm vi 100",
                            "gradeLevel": "GRADE_2",
                            "subject": "MATH"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.recommendations").isArray())
                .andExpect(jsonPath("$.data.recommendations.length()").value(3))
                .andExpect(jsonPath("$.data.recommendations[0].bloomLevel").value("Nhận biết"))
                .andExpect(jsonPath("$.data.recommendations[1].bloomLevel").value("Thông hiểu"))
                .andExpect(jsonPath("$.data.recommendations[2].bloomLevel").value("Vận dụng"))
                .andExpect(jsonPath("$.data.recommendations[2].track").value("CPF"));
    }

    @Test
    void publishGameGeneratesShareCodeAndStoresPlayPayload() throws Exception {
        mvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "title": "Nông trại toán học lớp 2",
                            "gameType": "QUIZ",
                            "grade": "GRADE_2",
                            "subject": "MATH",
                            "dsl": {
                                "title": "Nông trại toán học",
                                "questions": []
                            }
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.shareCode").isString())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));
    }

    @Test
    void playEndpointReturnsGameForPredefinedOrMockShareCode() throws Exception {
        mvc.perform(get("/api/games/play/MOCK02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.shareCode").value("MOCK02"))
                .andExpect(jsonPath("$.data.title").value("Trắc Nghiệm Phép Cộng Nông Trại"));
    }

    @Test
    void generateEndpointCallsServiceAndReturnsValidationReport() throws Exception {
        var dummyDsl = new QuizGameDsl(
                "game-1",
                GameType.QUIZ,
                new GameMetadata("Nông trại toán học", Subject.MATH, GradeLevel.GRADE_2, "Phép cộng"),
                new GameplaySettings(1.0),
                List.of()
        );
        when(gameGenerationService.generate(any(), any())).thenReturn(dummyDsl);

        mvc.perform(post("/api/games/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "prompt": "Phép cộng có nhớ phạm vi 100",
                            "gradeLevel": "GRADE_2",
                            "subject": "MATH",
                            "gameType": "QUIZ"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.dsl").exists())
                .andExpect(jsonPath("$.data.valid").value(true));
    }
}
