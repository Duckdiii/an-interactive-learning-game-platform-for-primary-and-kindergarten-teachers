package com.aigameplatform.backend.service.asset.concept;

import java.util.List;
import java.util.Objects;

/**
 * Một khái niệm trong đồ thị (ví dụ "con mèo" thuộc "vật nuôi").
 *
 * @param id mã ổn định, dạng {@code nhóm.tên} (ví dụ {@code animal.cat})
 * @param labelVi tên tiếng Việt
 * @param parent id nhóm cha, null ở nút gốc
 * @param synonyms cách gọi khác, có dấu (ví dụ "mèo", "chú mèo")
 * @param confusableWith khái niệm dễ nhầm (ví dụ mèo và hổ), để không chọn hai hình quá giống nhau
 * @param assets id hình trong danh mục, gồm mọi biến thể phong cách; rỗng ở nút nhóm
 */
public record Concept(String id, String labelVi, String parent, List<String> synonyms, List<String> confusableWith,
                      List<String> assets) {

    public Concept {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(labelVi, "labelVi");
        synonyms = synonyms == null ? List.of() : List.copyOf(synonyms);
        confusableWith = confusableWith == null ? List.of() : List.copyOf(confusableWith);
        assets = assets == null ? List.of() : List.copyOf(assets);
    }
}
