package com.aigameplatform.backend.service.curriculum;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Checks explicit request constraints against retrieved curriculum text before it can become generation context.
 * It is deliberately conservative: constraints it recognizes must be stated by the evidence; ordinary topical
 * requests without an explicit constraint keep the existing semantic retrieval behavior.
 */
public final class CurriculumEvidenceVerifier {
    private static final Pattern DIGIT_COUNT = Pattern.compile("(?<![a-z0-9])(" +
            "mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|[1-9])\\s+chu\\s+so(?![a-z0-9])");
    private static final Pattern COUNT_BEFORE_TURNS = Pattern.compile("(?<![a-z0-9])(" +
            "mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|[1-9])\\s+luot(?![a-z0-9])");
    private static final Pattern MAX_DIGIT_COUNT = Pattern.compile("(?:co den|khong qua|toi da|nhieu nhat)\\s+(mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|[1-9])\\s+chu so");
    private static final Pattern OPERATION_COUNT = Pattern.compile("(?<![a-z0-9])(" +
            "mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|[1-9])\\s+dau phep tinh(?![a-z0-9])");
    private static final Pattern MULTIPLICATION_TABLE = Pattern.compile("bang nhan\\s*([0-9]+)");
    private static final Pattern MAX_TURNS = Pattern.compile("(?:khong qua|toi da|nhieu nhat)\\s+(mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|[1-9])\\s+luot");
    private static final Pattern GREATER_THAN = Pattern.compile("(?:lon hon|nhieu hon|vuot qua|tren)\\s+(?:so\\s+)?([0-9]+)");
    private static final Pattern CURRICULUM_CAP = Pattern.compile("(?:pham vi|den|khong qua|toi da)\\s+(?:so\\s+)?([0-9]+)");
    private static final Pattern REQUESTED_RANGE = Pattern.compile("pham vi\\s+([0-9]+)");
    private static final Pattern TABLE_RANGE = Pattern.compile("(?:bang nhan|bang chia)\\s*2\\s+3\\s+ellipsis\\s+([0-9]+)");
    private static final Pattern MINUTE_POSITION = Pattern.compile("kim phut[^.!?]{0,48}");
    private static final Map<String, Integer> NUMBERS = Map.ofEntries(
            Map.entry("mot", 1), Map.entry("hai", 2), Map.entry("ba", 3), Map.entry("bon", 4),
            Map.entry("tu", 4), Map.entry("nam", 5), Map.entry("sau", 6), Map.entry("bay", 7),
            Map.entry("tam", 8), Map.entry("chin", 9));
    private static final Map<String, String> SHAPES = Map.ofEntries(
            Map.entry("hinh tron", "circle"), Map.entry("hinh tam giac", "triangle"),
            Map.entry("hinh tu giac", "quadrilateral"),
            Map.entry("hinh chu nhat", "rectangle"), Map.entry("hinh vuong", "square"),
            Map.entry("hinh ngu giac", "pentagon"), Map.entry("hinh luc giac", "hexagon"),
            Map.entry("hinh thoi", "rhombus"), Map.entry("hinh binh hanh", "parallelogram"));

    public record Decision(boolean supported, String reasonCode, List<String> constraints) {
        public Decision { constraints = List.copyOf(constraints); }
    }

    public Decision verify(String query, List<CurriculumRAGService.RetrievedChunk> candidates) {
        if (query == null || query.isBlank() || candidates == null || candidates.isEmpty()) {
            return new Decision(false, "NO_CANDIDATE_EVIDENCE", List.of());
        }
        String request = normalize(query);
        String evidence = normalize(candidates.stream().map(chunk -> chunk.topic() + " " + chunk.text())
                .reduce((first, second) -> first + " " + second).orElse(""));
        var unsupported = new ArrayList<String>();

        if (requestsAnotherGrade(request)) unsupported.add("requested-grade-outside-filtered-scope");

        Integer requestedDigits = firstNumber(DIGIT_COUNT, request);
        Integer evidenceMaxDigits = firstNumber(MAX_DIGIT_COUNT, evidence);
        if (requestedDigits != null && (!containsNumber(DIGIT_COUNT, evidence, requestedDigits)
                && evidenceMaxDigits == null || evidenceMaxDigits != null && requestedDigits > evidenceMaxDigits)) {
            unsupported.add("digit-count:" + requestedDigits);
        }

        Integer requestedOperations = firstNumber(OPERATION_COUNT, request);
        Integer evidenceOperations = firstNumber(OPERATION_COUNT, evidence);
        if (requestedOperations != null && (evidenceOperations == null || requestedOperations > evidenceOperations)) {
            unsupported.add("operation-count:" + requestedOperations + ">" +
                    (evidenceOperations == null ? "unstated" : evidenceOperations));
        }

        boolean requestsCarry = hasPositiveCarry(request);
        boolean requestsNoCarry = hasNegativeCarry(request);
        if (requestsCarry && !hasPositiveCarry(evidence)) unsupported.add("carry:true");
        if (requestsNoCarry && !hasNegativeCarry(evidence)) unsupported.add("carry:false");

        Integer requestedTurnCount = firstNumber(COUNT_BEFORE_TURNS, request);
        Integer evidenceMaximumTurns = firstNumber(MAX_TURNS, evidence);
        if (requestedTurnCount != null && (evidenceMaximumTurns == null
                || requestedTurnCount > evidenceMaximumTurns)) {
            unsupported.add("carry-turn-limit:" + requestedTurnCount + ">"
                    + (evidenceMaximumTurns == null ? "unstated" : evidenceMaximumTurns));
        }
        if (requestsConsecutiveCarryTurns(request) && !supportsConsecutiveCarryTurns(evidence)) {
            unsupported.add("carry-turn-sequence:consecutive-not-supported");
        }

        Integer requestedUpperBoundary = firstNumber(GREATER_THAN, request);
        Integer evidenceUpperBoundary = maxNumber(CURRICULUM_CAP, evidence);
        Integer requestedRange = firstNumber(REQUESTED_RANGE, request);
        if (requestedRange != null && (evidenceUpperBoundary == null || requestedRange > evidenceUpperBoundary)) {
            unsupported.add("numeric-boundary:range-" + requestedRange);
        }
        if (requestedUpperBoundary != null && (evidenceUpperBoundary == null
                || requestedUpperBoundary >= evidenceUpperBoundary)) {
            unsupported.add("numeric-boundary:greater-than-" + requestedUpperBoundary);
        }

        Integer requestedMinutePosition = minutePosition(request);
        if (requestedMinutePosition != null && !supportsMinutePosition(evidence, requestedMinutePosition)) {
            unsupported.add("minute-position:" + requestedMinutePosition);
        }

        String requestedShape = SHAPES.entrySet().stream().filter(entry -> request.contains(entry.getKey()))
                .map(Map.Entry::getValue).findFirst().orElse(null);
        if (requestedShape != null && SHAPES.entrySet().stream()
                .filter(entry -> entry.getValue().equals(requestedShape))
                .noneMatch(entry -> evidence.contains(entry.getKey()))) {
            unsupported.add("shape:" + requestedShape);
        }

        if ((request.contains("lam tron") || request.contains("rounding") || request.contains("round to "))
                && !(evidence.contains("lam tron") || evidence.contains("rounding") || evidence.contains("round to "))) {
            unsupported.add("skill:rounding");
        }
        boolean requestsArea = request.contains("dien tich") || request.contains("area of ");
        if (requestsArea
                && !(evidence.contains("dien tich") || evidence.contains("area of "))) {
            unsupported.add("skill:area");
        }
        if (requestsArea && requestedShape != null && candidates.stream().noneMatch(candidate -> {
            String candidateEvidence = normalize(candidate.topic() + " " + candidate.text());
            return candidateEvidence.contains("dien tich") || candidateEvidence.contains("area of ")
                    ? SHAPES.entrySet().stream().anyMatch(entry -> entry.getValue().equals(requestedShape)
                    && candidateEvidence.contains(entry.getKey())) : false;
        })) {
            unsupported.add("evidence-pair:area:" + requestedShape);
        }
        Matcher requestedTable = MULTIPLICATION_TABLE.matcher(request);
        if (requestedTable.find() && !supportsMultiplicationTable(evidence, requestedTable.group(1))) {
            unsupported.add("multiplication-table:" + requestedTable.group(1));
        }
        for (var place : List.of("hang chuc", "hang tram", "hang nghin", "hang muoi nghin",
                "hang tram nghin", "hang trieu")) {
            if (request.contains(place) && !evidence.contains(place) && !supportsRoundedPlace(evidence, place)) {
                unsupported.add("place-value:" + place.replace(" ", "-"));
            }
        }

        if (unsupported.isEmpty()) return new Decision(true, "SUPPORTED", List.of());
        String code = unsupported.contains("requested-grade-outside-filtered-scope")
                ? "REQUESTED_SCOPE_MISMATCH" : "UNSUPPORTED_EXPLICIT_CONSTRAINT";
        return new Decision(false, code, unsupported);
    }

    private static boolean requestsAnotherGrade(String query) {
        return query.matches(".*\\b(lop|khoi) (lien ke|ke tiep|truoc|sau|khac)\\b.*")
                || query.matches(".*\\bngoai (lop|khoi|pham vi lop)\\b.*")
                || query.contains("khong thuoc lop") || query.contains("outside the selected grade")
                || query.contains("adjacent grade") || query.contains("next grade");
    }

    private static boolean hasPositiveCarry(String text) {
        return (text.contains("co nho") && !text.contains("khong co nho"))
                || text.contains("with carrying") || text.contains("carrying operation");
    }

    private static boolean hasNegativeCarry(String text) {
        return text.contains("khong nho") || text.contains("khong co nho")
                || text.contains("without carrying") || text.contains("no carrying");
    }

    private static boolean requestsConsecutiveCarryTurns(String text) {
        return text.contains("luot lien tiep") || text.contains("consecutive turns");
    }

    private static boolean supportsConsecutiveCarryTurns(String evidence) {
        return (evidence.contains("lien tiep") && !evidence.contains("khong lien tiep"))
                || (evidence.contains("consecutive") && !evidence.contains("not consecutive"));
    }

    private static boolean supportsMinutePosition(String evidence, int requestedPosition) {
        Matcher matcher = Pattern.compile("(?:kim phut|minute hand)[^.!?]{0,48}").matcher(evidence);
        while (matcher.find()) {
            Matcher numbers = Pattern.compile("[0-9]+").matcher(matcher.group());
            while (numbers.find()) if (Integer.parseInt(numbers.group()) == requestedPosition) return true;
            String tail = evidence.substring(matcher.start(), Math.min(evidence.length(), matcher.start() + 60));
            if (containsNumber(Pattern.compile("(?<![a-z0-9])([1-9])"), tail, requestedPosition)) return true;
        }
        return false;
    }

    private static boolean supportsRoundedPlace(String evidence, String requestedPlace) {
        return switch (requestedPlace) {
            case "hang chuc" -> evidence.contains("tron chuc");
            case "hang tram" -> evidence.contains("tron tram");
            case "hang nghin" -> evidence.contains("tron nghin");
            case "hang muoi nghin" -> evidence.contains("tron muoi nghin");
            case "hang tram nghin" -> evidence.contains("tron tram nghin");
            default -> false;
        };
    }

    private static boolean supportsMultiplicationTable(String evidence, String requestedTable) {
        if (Pattern.compile("bang nhan\\s*" + Pattern.quote(requestedTable) + "(?![0-9])")
                .matcher(evidence).find()) return true;
        Matcher range = TABLE_RANGE.matcher(evidence);
        if (!range.find()) return false;
        int value = Integer.parseInt(requestedTable);
        return value >= 2 && value <= Integer.parseInt(range.group(1));
    }

    private static Integer minutePosition(String query) {
        Matcher matcher = Pattern.compile("(?:kim phut|minute hand)[^.!?]{0,48}").matcher(query);
        if (!matcher.find()) return null;
        Matcher number = Pattern.compile("[0-9]+").matcher(matcher.group());
        Integer result = null;
        while (number.find()) result = Integer.parseInt(number.group());
        return result;
    }

    private static Integer firstNumber(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) return null;
        return parseNumber(matcher.group(1));
    }

    private static Integer maxNumber(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        Integer maximum = null;
        while (matcher.find()) {
            Integer number = parseNumber(matcher.group(1));
            if (number != null && (maximum == null || number > maximum)) maximum = number;
        }
        return maximum;
    }

    private static boolean containsNumber(Pattern pattern, String text, int expected) {
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) if (parseNumber(matcher.group(1)) == expected) return true;
        return false;
    }

    private static Integer parseNumber(String value) {
        try { return Integer.valueOf(value); }
        catch (NumberFormatException ignored) { return NUMBERS.get(value); }
    }

    private static String normalize(String text) {
        String decomposed = Normalizer.normalize(text.toLowerCase(java.util.Locale.ROOT), Normalizer.Form.NFD)
                .replace('đ', 'd');
        return decomposed.replaceAll("\\.{3}", " ellipsis ").replaceAll("\\p{M}+", "")
                .replaceAll("[^a-z0-9]+", " ").trim();
    }
}
