package com.aigameplatform.backend.entity.question;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Game ngoài danh mục (gameType CUSTOM): một câu hỏi duy nhất giữ nguyên game CPF Game v2.0.0 đã kiểm duyệt
 * (docs/cpf-game-v2.0.0.md mục 7). Entity không tự kiểm JSON; kiểm duyệt nằm ở chuỗi validator.
 */
@Entity
@Table(name = "cpf_questions")
@Getter
@Setter
@NoArgsConstructor
public class CpfQuestion extends QuestionGame {

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;
}
