package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "spot_the_target_questions")
@Getter
@Setter
@NoArgsConstructor
public class SpotTheTargetQuestion extends QuestionGame {

    private String backgroundImageUrl;

    private int hitRegionX;

    private int hitRegionY;

    private int hitRegionRadius;
}
