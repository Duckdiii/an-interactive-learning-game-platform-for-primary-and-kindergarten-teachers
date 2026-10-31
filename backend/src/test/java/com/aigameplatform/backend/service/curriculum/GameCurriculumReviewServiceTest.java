package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.*;
import com.aigameplatform.backend.service.curriculum.review.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GameCurriculumReviewServiceTest {
    @Test void anotherTeacherCannotReadOrInvalidateAReview() {
        var games = mock(GameRepository.class);
        var reviews = mock(GameCurriculumReviewRepository.class);
        var service = new GameCurriculumReviewService(games, reviews, new JsonMapper());
        when(reviews.findByGame_IdAndGame_Author_Id("game", "other")).thenReturn(Optional.empty());
        when(games.findByIdAndAuthor_Id("game", "other")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getForTeacher("game", "other")).isInstanceOf(ApiException.class);
        var edited = new Game(); edited.setId("game");
        assertThatThrownBy(() -> service.saveEditedGame(edited, "other")).isInstanceOf(ApiException.class);
        verify(reviews, never()).saveAndFlush(any());
        verify(games, never()).saveAndFlush(any());
    }
}
