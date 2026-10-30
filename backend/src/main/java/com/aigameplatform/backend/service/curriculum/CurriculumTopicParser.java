package com.aigameplatform.backend.service.curriculum;

import static com.aigameplatform.backend.service.curriculum.CurriculumConstraints.*;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Deliberately bounded grammar. Unconsumed language requests clarification, never approval. */
public final class CurriculumTopicParser {
    public record Requirement(Skill skill, Long maxNumber, Carry carry, boolean mental, boolean roundTens, String unit) { }
    public record ParsedTopic(List<Requirement> requirements, boolean needsClarification) {
        public ParsedTopic { requirements = List.copyOf(requirements); }
    }
    private record Term(Skill skill, String expression) { }
    private static final List<Term> TERMS = List.of(
            new Term(Skill.CM_MEASURE, "đo độ dài|đo"), new Term(Skill.TIME_HOUR, "đọc giờ đúng|giờ đúng"),
            new Term(Skill.CALENDAR, "xem lịch|thứ ngày"), new Term(Skill.WEEK, "ngày trong tuần|các ngày trong tuần|tuần lễ"),
            new Term(Skill.CUBE, "khối lập phương"), new Term(Skill.CUBOID, "khối hộp chữ nhật"),
            new Term(Skill.SQUARE, "hình vuông|vuông"), new Term(Skill.CIRCLE, "hình tròn|tròn"),
            new Term(Skill.TRIANGLE, "hình tam giác|tam giác"), new Term(Skill.RECTANGLE, "hình chữ nhật|chữ nhật"),
            new Term(Skill.PLACE_VALUE, "chục và đơn vị|chục|đơn vị"), new Term(Skill.LENGTH_COMPARE, "dài hơn|ngắn hơn"),
            new Term(Skill.COMPARE, "so sánh|sắp xếp|xếp thứ tự"), new Term(Skill.COUNT, "đếm"),
            new Term(Skill.ADD, "cộng"), new Term(Skill.SUBTRACT, "trừ"),
            new Term(Skill.READ_NUMBER, "đọc"), new Term(Skill.WRITE_NUMBER, "viết"));
    private static final Pattern RANGE = Pattern.compile("(?:trong\\s+)?phạm vi\\s+(\\d+)|từ\\s+(\\d+)\\s+đến\\s+(\\d+)");
    private static Pattern words(String expression) { return Pattern.compile("(?<![\\p{L}\\p{N}])(?:" + expression + ")(?![\\p{L}\\p{N}])"); }

    public ParsedTopic parse(String topic) {
        if (topic == null || topic.isBlank() || topic.length() > 2000) return new ParsedTopic(List.of(), true);
        String text = Normalizer.normalize(topic, Normalizer.Form.NFC).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        // Unsupported numeric domains and negation are not silently erased as filler.
        if (Pattern.compile("\\d+[.,]\\d+|[-−]\\s*\\d|\\b(?:không|chưa|đừng)\\b(?!\\s+nhớ)").matcher(text).find())
            return new ParsedTopic(List.of(), true);
        var requirements = new ArrayList<Requirement>();
        boolean unknown = false;
        for (String clause : text.split("\\s+và\\s+|[;,.!?]")) {
            if (clause.isBlank()) continue;
            String remaining = clause;
            Long max = null;
            var range = RANGE.matcher(remaining);
            int ranges = 0;
            while (range.find()) {
                ranges++;
                try {
                    long end = Long.parseLong(range.group(1) != null ? range.group(1) : range.group(3));
                    long start = range.group(2) == null ? 0 : Long.parseLong(range.group(2));
                    if (start > end) unknown = true;
                    max = end;
                } catch (NumberFormatException e) { unknown = true; }
            }
            if (ranges > 1) unknown = true;
            remaining = range.replaceAll(" ");
            Carry carry = remaining.contains("không nhớ") ? Carry.NO_CARRY
                    : remaining.contains("có nhớ") ? Carry.WITH_CARRY : Carry.UNSPECIFIED;
            if (remaining.contains("không nhớ") && remaining.contains("có nhớ")) unknown = true;
            remaining = remaining.replace("không nhớ", " ").replace("có nhớ", " ");
            boolean mental = words("nhẩm").matcher(remaining).find();
            boolean round = words("tròn chục").matcher(remaining).find();
            remaining = words("nhẩm|tròn chục").matcher(remaining).replaceAll(" ");
            String unit = words("cm|xăng-ti-mét").matcher(remaining).find() ? "cm" : null;
            remaining = words("cm|xăng-ti-mét").matcher(remaining).replaceAll(" ");
            var skills = new LinkedHashSet<Skill>();
            for (var term : TERMS) {
                var matcher = words(term.expression()).matcher(remaining);
                if (matcher.find()) { skills.add(term.skill()); remaining = matcher.replaceAll(" "); }
            }
            remaining = words("nhận biết|nhận dạng|thực hiện|tính|phép|bé|tập|số|các|con vật|động vật|con|vật|bốn|bằng|với|về|độ dài|tên gọi|thứ tự|bài tập")
                    .matcher(remaining).replaceAll(" ").replaceAll("[()/:–—]", " ").trim();
            if (!remaining.isBlank() || skills.isEmpty()) unknown = true;
            if ((mental || round || carry != Carry.UNSPECIFIED) && skills.stream().anyMatch(s -> s != Skill.ADD && s != Skill.SUBTRACT)) unknown = true;
            if (unit != null && skills.stream().anyMatch(s -> s != Skill.CM_MEASURE && s != Skill.CM_READ)) unknown = true;
            for (var skill : skills) requirements.add(new Requirement(skill, max, carry, mental, round, unit));
        }
        return new ParsedTopic(requirements, unknown || requirements.isEmpty());
    }
}
