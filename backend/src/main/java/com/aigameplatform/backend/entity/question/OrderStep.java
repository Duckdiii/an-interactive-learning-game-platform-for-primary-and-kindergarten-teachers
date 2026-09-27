package com.aigameplatform.backend.entity.question;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "order_steps")
@Getter
@Setter
@NoArgsConstructor
public class OrderStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String stepId;

    private String text;

    private int correctPosition;
}
