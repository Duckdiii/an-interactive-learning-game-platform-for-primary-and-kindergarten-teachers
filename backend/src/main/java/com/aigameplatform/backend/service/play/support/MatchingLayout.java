package com.aigameplatform.backend.service.play.support;

import com.aigameplatform.backend.entity.question.MatchingQuestion;
import com.aigameplatform.backend.entity.question.embedded.MatchingPair;
import com.aigameplatform.backend.entity.question.embedded.PairSide;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Hai cột của câu Matching khi gửi cho học sinh: mỗi cột xáo xác định theo (salt phiên, vị trí câu), id gán theo vị
 * trí sau khi xáo ({@code l1, l2...} và {@code r1, r2...}). Cột phải được dịch vòng khi cần để không cặp nào nằm cùng
 * hàng. Handler chấm và bộ gắn nhãn lỗi cùng dùng lớp này để không lệch nhau.
 */
public final class MatchingLayout {

    private final List<MatchingPair> left;
    private final List<MatchingPair> right;

    public MatchingLayout(MatchingQuestion question, String salt, int index) {
        left = sorted(question.getPairs(), salt, index, "l|");
        right = unaligned(left, sorted(question.getPairs(), salt, index, "r|"));
    }

    private static List<MatchingPair> sorted(List<MatchingPair> pairs, String salt, int index, String side) {
        List<MatchingPair> copy = new ArrayList<>(pairs);
        copy.sort(Comparator.comparing(pair -> OpaqueIds.hmac(salt, index + "|match|" + side + pair.getPairId())));
        return copy;
    }

    private static List<MatchingPair> unaligned(List<MatchingPair> left, List<MatchingPair> right) {
        int n = right.size();
        for (int shift = 0; shift < n; shift++) {
            boolean aligned = false;
            for (int i = 0; i < n && !aligned; i++) aligned = left.get(i) == right.get((i + shift) % n);
            if (!aligned) {
                List<MatchingPair> rotated = new ArrayList<>();
                for (int i = 0; i < n; i++) rotated.add(right.get((i + shift) % n));
                return rotated;
            }
        }
        return right; // chỉ xảy ra khi không có cách xếp nào tránh cùng hàng
    }

    public static String leftId(int position) {
        return "l" + (position + 1);
    }

    public static String rightId(int position) {
        return "r" + (position + 1);
    }

    public List<MatchingPair> left() {
        return left;
    }

    public List<MatchingPair> right() {
        return right;
    }

    /** Cặp đúng: id ô trái và id ô phải của cùng một cặp, theo thứ tự cột trái. */
    public List<String[]> correctMatches() {
        List<String[]> matches = new ArrayList<>();
        for (int i = 0; i < left.size(); i++)
            matches.add(new String[] {leftId(i), rightId(right.indexOf(left.get(i)))});
        return matches;
    }

    /** Cặp của ô trái có id này, hoặc null nếu id không thuộc câu. */
    public MatchingPair leftPair(String id) {
        return pairAt(left, id, "l");
    }

    public MatchingPair rightPair(String id) {
        return pairAt(right, id, "r");
    }

    private static MatchingPair pairAt(List<MatchingPair> column, String id, String prefix) {
        if (id == null || !id.startsWith(prefix)) return null;
        try {
            int position = Integer.parseInt(id.substring(1)) - 1;
            return position >= 0 && position < column.size() && id.equals(prefix + (position + 1)) ? column.get(position) : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Chữ hiển thị của một phía (chữ, nếu không có thì mô tả hình). */
    public static String describe(PairSide side) {
        if (side == null) return null;
        return side.getText() != null ? side.getText() : side.getVisualPrompt();
    }
}
