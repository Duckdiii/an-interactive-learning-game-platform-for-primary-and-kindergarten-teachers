package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.ImageChoiceDsl;
import com.aigameplatform.backend.dto.dsl.PairSideDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.entity.question.embedded.ImageChoice;
import com.aigameplatform.backend.entity.question.embedded.PairSide;
import com.aigameplatform.backend.service.factory.Ids;
import java.util.ArrayList;
import java.util.List;

/**
 * Chuyển đổi các phần nhỏ dùng chung giữa DSL và entity. Đáp án dạng lựa chọn chữ chỉ lưu vị trí trong entity; id
 * của lựa chọn luôn là id theo vị trí (a, b, c...).
 */
final class ChoiceMapping {

    private ChoiceMapping() {
    }

    static ImageChoice toEntity(ImageChoiceDsl dsl) {
        ImageChoice choice = new ImageChoice();
        choice.setVisualPrompt(dsl.visualPrompt());
        choice.setImageUrl(dsl.imageUrl());
        return choice;
    }

    static ImageChoiceDsl toDsl(ImageChoice entity) {
        return new ImageChoiceDsl(entity.getVisualPrompt(), entity.getImageUrl());
    }

    static PairSide toEntity(PairSideDsl dsl) {
        PairSide side = new PairSide();
        side.setText(dsl.text());
        side.setVisualPrompt(dsl.visualPrompt());
        side.setImageUrl(dsl.imageUrl());
        return side;
    }

    static PairSideDsl toDsl(PairSide entity) {
        return new PairSideDsl(entity.getText(), entity.getVisualPrompt(), entity.getImageUrl());
    }

    static List<String> texts(List<TextChoiceDsl> choices) {
        return choices.stream().map(TextChoiceDsl::text).toList();
    }

    /** Gán id theo vị trí cho danh sách chữ. */
    static List<TextChoiceDsl> withPositionalIds(List<String> texts) {
        List<TextChoiceDsl> result = new ArrayList<>();
        for (int i = 0; i < texts.size(); i++) {
            result.add(new TextChoiceDsl(Ids.positional(i), texts.get(i)));
        }
        return result;
    }

    /** Vị trí của lựa chọn có id đã cho; id không có trong danh sách là DSL sai. */
    static int indexOfId(List<TextChoiceDsl> choices, String id) {
        for (int i = 0; i < choices.size(); i++) {
            if (choices.get(i).id().equals(id)) {
                return i;
            }
        }
        throw new IllegalArgumentException("Đáp án đúng '" + id + "' không có trong danh sách lựa chọn");
    }
}
