package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "classrooms")
@Getter
@Setter
@NoArgsConstructor
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String className;

    private String schoolYear;

    private String schoolName;

    @Enumerated(EnumType.STRING)
    private GradeLevel gradeLevel;

    private Integer studentCount;
    private String knowledgeScope;
    private String characteristics;
    private String favoriteTopics;
}
