package com.aigameplatform.backend.entity.question.embedded;

import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một phía của cặp (chữ và/hoặc hình). imageUrl được Backend điền sau khi lấy ảnh từ visualPrompt. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class PairSide {

    private String text;

    private String visualPrompt;

    private String imageUrl;
}
