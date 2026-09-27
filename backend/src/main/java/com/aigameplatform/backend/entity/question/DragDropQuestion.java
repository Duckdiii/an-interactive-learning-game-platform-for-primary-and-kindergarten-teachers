package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "drag_drop_questions")
@Getter
@Setter
@NoArgsConstructor
public class DragDropQuestion extends QuestionGame {

    private String item;

    private String itemImageUrl;

    private String targetZone;
}
