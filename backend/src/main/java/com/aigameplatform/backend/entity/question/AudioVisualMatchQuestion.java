package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "audio_visual_match_questions")
@Getter
@Setter
@NoArgsConstructor
public class AudioVisualMatchQuestion extends QuestionGame {

    private String audioUrl;

    private String imageUrl;
}
