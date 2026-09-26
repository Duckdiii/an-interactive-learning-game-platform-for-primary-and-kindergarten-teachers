package com.aigameplatform.backend.entity.question.embedded;

import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một lựa chọn dạng hình. imageUrl được Backend điền sau khi lấy ảnh từ visualPrompt. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class ImageChoice {

    private String visualPrompt;

    private String imageUrl;
}
