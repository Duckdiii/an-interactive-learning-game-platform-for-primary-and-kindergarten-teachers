package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.response.GameUnderstandingResponse;
import com.aigameplatform.backend.dto.understanding.GameUnderstanding;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.service.understanding.GameUnderstandingService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

@ExtendWith(MockitoExtension.class)
class GameUnderstandingControllerTest {

    @Mock private GameUnderstandingService understanding;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new GameUnderstandingController(understanding))
                .setControllerAdvice(new GlobalExceptionHandler()).setValidator(validator).build();
    }

    @Test
    void returnsTheUnderstandingInTheSuccessEnvelope() throws Exception {
        var card = new GameUnderstanding("So sánh số", "Chọn dấu", List.of("3 ... 5"), "Bầu trời", GameType.CUSTOM,
                List.of(GameType.QUIZ), List.of(), List.of());
        when(understanding.understand(any())).thenReturn(new GameUnderstandingResponse("Em hiểu rồi", null, card, true));

        mvc.perform(post("/api/games/understand").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"messages\":[{\"role\":\"TEACHER\",\"text\":\"So sánh số\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.ready").value(true))
                .andExpect(jsonPath("$.data.question").doesNotExist())
                .andExpect(jsonPath("$.data.understanding.gameType").value("CUSTOM"));
    }

    @Test
    void emptyMessagesOrAnOverlongMessageIs400WithoutCallingTheAi() throws Exception {
        mvc.perform(post("/api/games/understand").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"messages\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
        mvc.perform(post("/api/games/understand").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"messages\":[{\"role\":\"TEACHER\",\"text\":\""
                                + "a".repeat(2001) + "\"}]}"))
                .andExpect(status().isBadRequest());
        // Thẻ thiếu trường bắt buộc theo openapi GameUnderstanding.
        mvc.perform(post("/api/games/understand").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subject\":\"MATH\",\"gradeLevel\":\"GRADE_1\",\"messages\":[{\"role\":\"TEACHER\",\"text\":\"So sánh\"}],"
                                + "\"understanding\":{\"learningGoal\":\"x\"}}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(understanding);
    }
}
