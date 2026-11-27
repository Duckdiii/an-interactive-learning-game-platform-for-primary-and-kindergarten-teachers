package com.aigameplatform.backend.service.play.support;

import com.aigameplatform.backend.entity.question.OrderStep;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import com.aigameplatform.backend.service.factory.Ids;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Thứ tự hiển thị các bước của câu Ordering khi gửi cho học sinh: xáo xác định theo (salt phiên, vị trí câu), id gán
 * theo vị trí sau khi xáo ({@code s1, s2...}). Handler chấm, bộ gắn nhãn lỗi và redact cùng dùng lớp này để không lệch
 * nhau.
 */
public final class OrderingLayout {

    private final List<OrderStep> byDisplay;

    public OrderingLayout(OrderingQuestion question, String salt, int index) {
        List<OrderStep> sorted = question.getSteps().stream()
                .sorted(Comparator.comparingInt(OrderStep::getCorrectPosition)).toList();
        byDisplay = new ArrayList<>(sorted);
        byDisplay.sort(Comparator.comparing(step -> OpaqueIds.hmac(salt, index + "|order|" + step.getCorrectPosition())));
        // Xáo ra đúng thứ tự thì dịch vòng một bước: hiển thị phải luôn khác thứ tự đúng (từ 2 bước trở lên).
        if (byDisplay.size() > 1 && byDisplay.equals(sorted)) byDisplay.add(byDisplay.removeFirst());
    }

    /** Các bước theo thứ tự hiển thị. */
    public List<OrderStep> byDisplay() {
        return byDisplay;
    }

    public static String displayId(int displayIndex) {
        return Ids.numbered("s", displayIndex);
    }

    public List<String> displayIds() {
        return java.util.stream.IntStream.range(0, byDisplay.size()).mapToObj(OrderingLayout::displayId).toList();
    }

    /** Id các bước theo thứ tự đúng. */
    public List<String> correctOrder() {
        return java.util.stream.IntStream.range(0, byDisplay.size()).boxed()
                .sorted(Comparator.comparingInt(i -> byDisplay.get(i).getCorrectPosition()))
                .map(OrderingLayout::displayId).toList();
    }

    /** Chữ của bước có id hiển thị này, hoặc null nếu id không thuộc câu. */
    public String textOf(String displayId) {
        int index = displayIds().indexOf(displayId);
        return index < 0 ? null : byDisplay.get(index).getText();
    }
}
