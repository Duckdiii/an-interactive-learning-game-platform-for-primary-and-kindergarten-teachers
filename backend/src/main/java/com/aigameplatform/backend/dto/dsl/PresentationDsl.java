package com.aigameplatform.backend.dto.dsl;

import com.aigameplatform.backend.entity.GamePresentation;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Cách trình bày game ({@code metadata.presentation}, tùy chọn): thế giới (nền), vật mang đáp án, bố cục. AI chọn khi sinh, giáo viên đổi
 * trong trình soạn. Thiếu trường nào thì frontend tự chọn. Danh sách giá trị phải khớp enum trong schema/game-dsl/1.0.0 (có test).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PresentationDsl(String world, String carrier, String layout) {

    public static final List<String> WORLDS = List.of("farm", "ocean", "jungle", "space");
    public static final List<String> CARRIERS = List.of("balloon", "bubble", "planet", "fruit", "card", "fish", "flower");
    public static final List<String> LAYOUTS = List.of("scatter", "row", "arc");

    /** Bỏ giá trị không có trong danh sách (AI có thể viết sai); không còn gì thì trả null để không ghi trường rỗng. */
    public static PresentationDsl normalize(String world, String carrier, String layout) {
        PresentationDsl result = new PresentationDsl(allowed(WORLDS, world), allowed(CARRIERS, carrier), allowed(LAYOUTS, layout));
        return result.world() == null && result.carrier() == null && result.layout() == null ? null : result;
    }

    /** Đọc từ cột đã lưu (null khi game chưa có cách trình bày); giá trị lạ trong DB cũng bị bỏ. */
    public static PresentationDsl fromEntity(GamePresentation saved) {
        return saved == null ? null : normalize(saved.getWorld(), saved.getCarrier(), saved.getLayout());
    }

    /** Để lưu: chỉ ghi giá trị hợp lệ (null khi không còn gì). */
    public static GamePresentation toEntity(PresentationDsl dsl) {
        PresentationDsl clean = dsl == null ? null : normalize(dsl.world(), dsl.carrier(), dsl.layout());
        return clean == null ? null : new GamePresentation(clean.world(), clean.carrier(), clean.layout());
    }

    private static String allowed(List<String> values, String value) {
        if (value == null) return null;
        String key = value.strip().toLowerCase(java.util.Locale.ROOT);
        return values.contains(key) ? key : null;
    }
}
