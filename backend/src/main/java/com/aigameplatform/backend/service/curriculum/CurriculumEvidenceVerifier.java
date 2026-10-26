package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private static final String NUMBER_PHRASE = "(?:[0-9]+|mot tram|hai tram|ba tram|bon tram|tu tram|nam tram|sau tram|bay tram|tam tram|chin tram|mot nghin|hai nghin|ba nghin|bon nghin|tu nghin|nam nghin|sau nghin|bay nghin|tam nghin|chin nghin|mot ngan|hai ngan|ba ngan|bon ngan|tu ngan|nam ngan|sau ngan|bay ngan|tam ngan|chin ngan|muoi|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin)";
    private static final Pattern GREATER_THAN = Pattern.compile("(?:lon hon|nhieu hon|vuot qua|tren)\\s+(?:so\\s+)?(" + NUMBER_PHRASE + ")");
    private static final Pattern CURRICULUM_CAP = Pattern.compile("(?:pham vi|den|khong qua|toi da)\\s+(?:so\\s+)?(" + NUMBER_PHRASE + ")");
    private static final Pattern REQUESTED_RANGE = Pattern.compile(
            "(?:pham vi|den)\\s+(" + NUMBER_PHRASE + ")(?!\\s+phan\\b)");
    private static final Pattern TABLE_RANGE = Pattern.compile("(?:bang nhan|bang chia)\\s*2\\s+3\\s+ellipsis\\s+([0-9]+)");
    private static final Pattern MINUTE_POSITION = Pattern.compile("kim phut[^.!?]{0,48}");
    private static final Pattern FORMULA_MARKER = Pattern.compile("\\b(?:cong thuc|formula)\\b");
    private static final Set<String> FORMULA_STOP_WORDS = Set.of(
            "cong", "thuc", "formula", "bang", "theo", "dung", "su", "nhan", "voi", "va",
            "a", "an", "the", "of", "by", "using", "times", "multiply", "multiplied");
    private static final Pattern EXPLICIT_GRADE = Pattern.compile(
            "(?:lop|khoi|grade)\\s+(mot|hai|ba|bon|tu|nam|one|two|three|four|five|[1-5])");
    private static final Map<String, Integer> NUMBERS = Map.ofEntries(
            Map.entry("mot", 1), Map.entry("hai", 2), Map.entry("ba", 3), Map.entry("bon", 4),
            Map.entry("tu", 4), Map.entry("nam", 5), Map.entry("sau", 6), Map.entry("bay", 7),
            Map.entry("tam", 8), Map.entry("chin", 9), Map.entry("muoi", 10),
            Map.entry("one", 1), Map.entry("two", 2), Map.entry("three", 3),
            Map.entry("four", 4), Map.entry("five", 5));
    private static final Map<String, String> SHAPES = Map.ofEntries(
            Map.entry("hinh tron", "circle"), Map.entry("hinh tam giac", "triangle"),
            Map.entry("hinh tu giac", "quadrilateral"),
            Map.entry("hinh chu nhat", "rectangle"), Map.entry("hinh vuong", "square"),
            Map.entry("hinh ngu giac", "pentagon"), Map.entry("hinh luc giac", "hexagon"),
            Map.entry("hinh thoi", "rhombus"), Map.entry("hinh binh hanh", "parallelogram"),
            Map.entry("duong tron", "circle"));

    public record EvidenceSupport(String requestedCondition, String chunkId, String outcomeText) {}

    public record Decision(boolean supported, String reasonCode, List<String> constraints,
                           List<String> supportingChunkIds, List<EvidenceSupport> evidenceSupports) {
        public Decision {
            constraints = List.copyOf(constraints);
            supportingChunkIds = List.copyOf(supportingChunkIds);
            evidenceSupports = List.copyOf(evidenceSupports);
        }

        public Decision(boolean supported, String reasonCode, List<String> constraints,
                        List<String> supportingChunkIds) {
            this(supported, reasonCode, constraints, supportingChunkIds, List.of());
        }
    }

    public Decision verify(String query, List<CurriculumRAGService.RetrievedChunk> candidates) {
        if (query == null || query.isBlank() || candidates == null || candidates.isEmpty()) {
            return new Decision(false, "NO_CANDIDATE_EVIDENCE", List.of(), List.of());
        }
        return verify(query, Subject.MATH, candidates);
    }

    public Decision verify(String query, Subject subject,
                           List<CurriculumRAGService.RetrievedChunk> candidates) {
        return verify(query, subject, null, candidates);
    }

    public Decision verify(String query, Subject subject,
                           GradeLevel gradeLevel,
                           List<CurriculumRAGService.RetrievedChunk> candidates) {
        if (query == null || query.isBlank() || subject == null || candidates == null || candidates.isEmpty()) {
            return new Decision(false, "NO_CANDIDATE_EVIDENCE", List.of(), List.of());
        }
        String request = normalize(query);
        var conditions = splitCompoundConditions(query);
        if (conditions.size() > 1) {
            var wholeRequestMatches = candidatesSupportingWholeRequest(request, subject, gradeLevel, candidates);
            if (!wholeRequestMatches.isEmpty()) {
                var ids = wholeRequestMatches.stream().map(CurriculumRAGService.RetrievedChunk::chunkId).distinct().toList();
                return new Decision(true, "SUPPORTED_COMPOUND_REQUEST", List.of(), ids,
                        wholeRequestMatches.stream().map(candidate -> new EvidenceSupport(query.trim(),
                                candidate.chunkId(), candidate.text())).toList());
            }
            return verifyCompoundConditions(query, conditions, subject, gradeLevel, candidates);
        }

        var decisions = candidates.stream().map(candidate ->
                verifySingleOutcome(request, subject, gradeLevel, candidate)).toList();
        var supporting = decisions.stream().filter(Decision::supported).map(Decision::supportingChunkIds)
                .flatMap(List::stream).distinct().toList();
        if (!supporting.isEmpty()) {
            var evidenceSupports = candidates.stream().filter(candidate -> supporting.contains(candidate.chunkId()))
                    .map(candidate -> new EvidenceSupport(query.trim(), candidate.chunkId(), candidate.text())).toList();
            return new Decision(true, "SUPPORTED", List.of(), supporting, evidenceSupports);
        }

        var unsupported = decisions.stream().flatMap(decision -> decision.constraints().stream()).distinct().toList();
        if (candidates.size() > 1) unsupported = java.util.stream.Stream.concat(unsupported.stream(),
                java.util.stream.Stream.of("evidence-not-supported-by-single-outcome")).distinct().toList();
        String code = hasScopeMismatch(unsupported) ? "REQUESTED_SCOPE_MISMATCH" : "UNSUPPORTED_EXPLICIT_CONSTRAINT";
        return new Decision(false, code, unsupported, List.of());
    }

    private Decision verifyCompoundConditions(String query, List<String> conditions, Subject subject, GradeLevel gradeLevel,
                                              List<CurriculumRAGService.RetrievedChunk> candidates) {
        var evidenceSupports = new ArrayList<EvidenceSupport>();
        var missing = new ArrayList<String>();
        for (String condition : conditions) {
            String normalizedCondition = normalize(condition);
            var matched = candidates.stream().filter(candidate ->
                            verifySingleOutcome(normalizedCondition, subject, gradeLevel, candidate).supported()
                                    && supportsRequestedActions(normalizedCondition,
                                    normalize(candidate.topic() + " " + candidate.text()))
                                    && hasMeaningfulEvidenceOverlap(normalizedCondition,
                                    normalize(candidate.topic() + " " + candidate.text())))
                    .toList();
            if (matched.isEmpty()) {
                missing.add("compound-condition-not-supported:" + condition.trim());
            } else {
                matched.forEach(candidate -> evidenceSupports.add(
                        new EvidenceSupport(condition.trim(), candidate.chunkId(), candidate.text())));
            }
        }
        if (!missing.isEmpty()) {
            return new Decision(false, "UNSUPPORTED_COMPOUND_CONDITION", missing, List.of(), evidenceSupports);
        }
        String normalizedQuery = normalize(query);
        if (requiresSingleOutcomeSupport(normalizedQuery)) {
            var singleOutcomeSupport = candidatesSupportingWholeRequest(normalize(query), subject, gradeLevel, candidates);
            if (singleOutcomeSupport.isEmpty()) {
                return new Decision(false, "UNSUPPORTED_COMPOUND_CONDITION",
                        List.of("linked-constraints-not-supported-by-single-outcome"), List.of(), List.of());
            }
            var ids = singleOutcomeSupport.stream().map(CurriculumRAGService.RetrievedChunk::chunkId).distinct().toList();
            return new Decision(true, "SUPPORTED_COMPOUND_REQUEST", List.of(), ids,
                    singleOutcomeSupport.stream().map(candidate -> new EvidenceSupport(query.trim(),
                            candidate.chunkId(), candidate.text())).toList());
        }
        var ids = evidenceSupports.stream().map(EvidenceSupport::chunkId).distinct().toList();
        if (ids.size() == 1) {
            var single = evidenceSupports.getFirst();
            return new Decision(true, "SUPPORTED_COMPOUND_REQUEST", List.of(), ids,
                    List.of(new EvidenceSupport(query.trim(), single.chunkId(), single.outcomeText())));
        }
        return new Decision(true, "SUPPORTED_COMPOUND_REQUEST", List.of(), ids, evidenceSupports);
    }

    private static List<String> splitCompoundConditions(String query) {
        if (query == null) return List.of();
        String listExpanded = query;
        String normalized = normalize(query);
        if (normalized.contains("nhan biet") && hasMultipleShapeConcepts(normalized)) {
            listExpanded = listExpanded.replaceAll(",\\s+", " và ");
        }
        listExpanded = listExpanded.replaceAll("(?i)trong\\s+và\\s+ngoài", "trong ngoài");
        String[] parts = listExpanded.split("(?i)\\s*(?:;|\\s+(?:and|và|đồng thời)\\s+)\\s*");
        var conditions = java.util.Arrays.stream(parts)
                .map(String::trim).filter(part -> !part.isEmpty()).toList();
        return conditions.size() >= 2 ? conditions : List.of(query);
    }

    private static boolean hasMultipleShapeConcepts(String normalizedQuery) {
        return List.of("tam giac", "tu giac", "tron", "chu nhat", "ngu giac", "luc giac", "hinh thoi",
                        "binh hanh")
                .stream().filter(normalizedQuery::contains).distinct().count() > 1;
    }

    private static boolean hasCarryAndNumericRange(String normalizedQuery) {
        boolean requestsCarry = hasPositiveCarry(normalizedQuery) || hasNegativeCarry(normalizedQuery);
        boolean requestsNumericRange = firstNumber(REQUESTED_RANGE, normalizedQuery) != null
                || firstNumber(GREATER_THAN, normalizedQuery) != null;
        return requestsCarry && requestsNumericRange;
    }

    private static boolean requiresSingleOutcomeSupport(String normalizedQuery) {
        return hasCarryAndNumericRange(normalizedQuery)
                || hasDigitWidthAndNumericRange(normalizedQuery)
                || hasOperationCountAndNumericRange(normalizedQuery)
                || hasAreaAndShapeRequest(normalizedQuery)
                || hasCarryAndTurnConstraint(normalizedQuery)
                || hasRoundingAndRequestedPlace(normalizedQuery);
    }

    private static boolean hasDigitWidthAndNumericRange(String normalizedQuery) {
        return firstNumber(DIGIT_COUNT, normalizedQuery) != null
                && (firstNumber(REQUESTED_RANGE, normalizedQuery) != null
                || firstNumber(GREATER_THAN, normalizedQuery) != null);
    }

    private static boolean hasOperationCountAndNumericRange(String normalizedQuery) {
        return firstNumber(OPERATION_COUNT, normalizedQuery) != null
                && (firstNumber(REQUESTED_RANGE, normalizedQuery) != null
                || firstNumber(GREATER_THAN, normalizedQuery) != null);
    }

    private static boolean hasCarryAndTurnConstraint(String normalizedQuery) {
        boolean requestsCarry = hasPositiveCarry(normalizedQuery) || hasNegativeCarry(normalizedQuery);
        boolean requestsTurnLimit = firstNumber(COUNT_BEFORE_TURNS, normalizedQuery) != null
                || firstNumber(MAX_TURNS, normalizedQuery) != null
                || requestsConsecutiveCarryTurns(normalizedQuery);
        return requestsCarry && requestsTurnLimit;
    }

    private static boolean hasRoundingAndRequestedPlace(String normalizedQuery) {
        return requestsRounding(normalizedQuery) && List.of("hang chuc", "hang tram", "hang nghin",
                        "hang muoi nghin", "hang tram nghin", "hang trieu")
                .stream().anyMatch(normalizedQuery::contains);
    }

    private static boolean hasAreaAndShapeRequest(String normalizedQuery) {
        boolean requestsArea = normalizedQuery.contains("dien tich") || normalizedQuery.contains("area of ");
        return requestsArea && requestedShapes(normalizedQuery).size() > 1;
    }

    private static List<String> requestedShapes(String normalizedQuery) {
        var shapes = new java.util.LinkedHashSet<String>();
        SHAPES.entrySet().stream().filter(entry -> normalizedQuery.contains(entry.getKey()))
                .map(Map.Entry::getValue).forEach(shapes::add);
        if (normalizedQuery.contains("tam giac")) shapes.add("triangle");
        if (normalizedQuery.contains("tu giac")) shapes.add("quadrilateral");
        return List.copyOf(shapes);
    }

    private static boolean evidenceSupportsShape(String evidence, String shape) {
        return SHAPES.entrySet().stream().filter(entry -> entry.getValue().equals(shape))
                .anyMatch(entry -> evidence.contains(entry.getKey()))
                || (shape.equals("triangle") && evidence.contains("tam giac"))
                || (shape.equals("quadrilateral") && evidence.contains("tu giac"));
    }

    private List<CurriculumRAGService.RetrievedChunk> candidatesSupportingWholeRequest(
            String normalizedQuery, Subject subject, GradeLevel gradeLevel,
            List<CurriculumRAGService.RetrievedChunk> candidates) {
        return candidates.stream().filter(candidate ->
                verifySingleOutcome(normalizedQuery, subject, gradeLevel, candidate).supported()
                        && supportsRequestedActions(normalizedQuery,
                        normalize(candidate.topic() + " " + candidate.text()))
                        && hasMeaningfulEvidenceOverlap(normalizedQuery,
                        normalize(candidate.topic() + " " + candidate.text()))).toList();
    }

    private static boolean supportsRequestedActions(String request, String evidence) {
        return (!requestsReadAction(request) || supportsReadAction(evidence))
                && (!requestsWriteAction(request) || supportsWriteAction(evidence));
    }

    private static boolean requestsReadAction(String request) {
        String withoutIndependentWork = request.replaceAll("(?<![a-z0-9])doc lap(?![a-z0-9])", " ");
        return containsPhrase(withoutIndependentWork, "doc") || containsPhrase(withoutIndependentWork, "read");
    }

    private static boolean supportsReadAction(String evidence) {
        String withoutIndependentWork = evidence.replaceAll("(?<![a-z0-9])doc lap(?![a-z0-9])", " ");
        return containsPhrase(withoutIndependentWork, "doc") || containsPhrase(withoutIndependentWork, "read");
    }

    private static boolean requestsWriteAction(String request) {
        String withoutSubjectName = request.replaceAll("(?<![a-z0-9])tieng viet(?![a-z0-9])", " ");
        return containsPhrase(withoutSubjectName, "viet") || containsPhrase(withoutSubjectName, "writ");
    }

    private static boolean supportsWriteAction(String evidence) {
        String withoutSubjectName = evidence.replaceAll("(?<![a-z0-9])tieng viet(?![a-z0-9])", " ");
        return containsPhrase(withoutSubjectName, "viet") || containsPhrase(withoutSubjectName, "writ")
                || containsPhrase(withoutSubjectName, "ghi so") || containsPhrase(withoutSubjectName, "ghi lai");
    }

    private static boolean hasMeaningfulEvidenceOverlap(String condition, String evidence) {
        condition = canonicalizeNumbers(condition);
        evidence = canonicalizeNumbers(evidence);
        var ignored = java.util.Set.of("cac", "cua", "duoc", "cho", "den", "trong", "pham", "vi", "theo",
                "mot", "nhung", "voi", "tai", "khi", "hoc", "luyen", "hay", "hoac", "dong", "thoi",
                "and", "the", "to", "of", "for", "with", "from", "learn", "practice", "students",
                "mon", "tieng", "lop", "grade");
        var requested = java.util.Arrays.stream(condition.split("\\s+"))
                .filter(token -> (token.length() >= 3 || token.matches("[0-9]+")) && !ignored.contains(token))
                .collect(java.util.stream.Collectors.toSet());
        if (requested.isEmpty()) return false;
        var evidenced = java.util.Arrays.stream(evidence.split("\\s+")).collect(java.util.stream.Collectors.toSet());
        long overlap = requested.stream().filter(evidenced::contains).count();
        long required = requested.size() == 1 ? 1 : Math.max(2, (long) Math.ceil(requested.size() * 0.5));
        return overlap >= required;
    }

    private static String canonicalizeNumbers(String text) {
        Matcher matcher = Pattern.compile("(?<![a-z0-9])(" + NUMBER_PHRASE + ")(?![a-z0-9])").matcher(text);
        StringBuffer canonical = new StringBuffer();
        while (matcher.find()) {
            Integer number = parseNumber(matcher.group(1));
            matcher.appendReplacement(canonical, Matcher.quoteReplacement(
                    number == null ? matcher.group(1) : number.toString()));
        }
        matcher.appendTail(canonical);
        return canonical.toString();
    }

    private static boolean hasScopeMismatch(List<String> constraints) {
        return constraints.stream().anyMatch(constraint -> constraint.contains("outside-filtered-scope")
                || constraint.equals("requested-grade-outside-filtered-scope"));
    }

    private Decision verifySingleOutcome(String request, Subject subject, GradeLevel gradeLevel,
                                         CurriculumRAGService.RetrievedChunk candidate) {
        String evidence = normalize(candidate.topic() + " " + candidate.text());
        var unsupported = new ArrayList<String>();

        if (candidate.subject() != subject) unsupported.add("candidate-subject-outside-filtered-scope");
        if (gradeLevel != null && candidate.gradeLevel() != gradeLevel) {
            unsupported.add("candidate-grade-outside-filtered-scope");
        }
        if (requestsReadAction(request) && !supportsReadAction(evidence)) unsupported.add("action:read");
        if (requestsWriteAction(request) && !supportsWriteAction(evidence)) unsupported.add("action:write");

        if (requestsAnotherGrade(request, gradeLevel)) unsupported.add("requested-grade-outside-filtered-scope");
        if (requestsQuestionAboutTopic(request) && !supportsQuestionAboutTopic(request, evidence)) {
            unsupported.add("evidence-aspect:question-topic");
        }

        if (subject == Subject.MATH) {
            if ((request.contains("phan tram") || request.contains("percent") || request.contains("percentage"))
                    && !(evidence.contains("phan tram") || evidence.contains("percent")
                    || evidence.contains("percentage"))) {
                unsupported.add("math-concept:percentage");
            }
            if ((request.contains("dong dang") || request.contains("similar triangles")
                    || request.contains("similarity"))
                    && !(evidence.contains("dong dang") || evidence.contains("similar triangle")
                    || evidence.contains("similarity"))) {
                unsupported.add("math-concept:similarity");
            }
            if (requestsProof(request) && !supportsProof(evidence)) unsupported.add("skill:proof");
            if (!supportsRequestedFormula(request, evidence)) unsupported.add("method:formula-details");

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

            var requestedShapes = requestedShapes(request);
            for (String requestedShape : requestedShapes) {
                if (!evidenceSupportsShape(evidence, requestedShape)) {
                    unsupported.add("shape:" + requestedShape);
                }
            }
            if (request.contains("goc vuong") && !evidence.contains("goc vuong")) {
                unsupported.add("shape:right-angle");
            }

            if (requestsRounding(request) && !supportsRounding(evidence)) {
                unsupported.add("skill:rounding");
            }
            boolean requestsArea = request.contains("dien tich") || request.contains("area of ");
            if (requestsArea
                    && !(evidence.contains("dien tich") || evidence.contains("area of "))) {
                unsupported.add("skill:area");
            }
            boolean evidenceHasArea = evidence.contains("dien tich") || evidence.contains("area of ");
            if (requestsArea) {
                for (String requestedShape : requestedShapes) {
                    boolean evidenceHasShape = evidenceSupportsShape(evidence, requestedShape);
                    if (!evidenceHasArea || !evidenceHasShape) {
                        unsupported.add("evidence-pair:area:" + requestedShape);
                    }
                }
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
        }

        if (unsupported.isEmpty()) return new Decision(true, "SUPPORTED", List.of(), List.of(candidate.chunkId()));
        String code = unsupported.contains("requested-grade-outside-filtered-scope")
                ? "REQUESTED_SCOPE_MISMATCH" : "UNSUPPORTED_EXPLICIT_CONSTRAINT";
        return new Decision(false, code, unsupported, List.of());
    }

    private static boolean requestsAnotherGrade(String query, GradeLevel selectedGrade) {
        if (query.matches(".*\\b(lop|khoi|grade) (lien ke|ke tiep|truoc|sau|khac|next|previous|adjacent)\\b.*")
                || query.matches(".*\\bngoai (lop|khoi|pham vi lop) (dang|duoc) chon\\b.*")
                || query.matches(".*\\boutside (the )?selected grade\\b.*")
                || query.contains("khong thuoc lop") || query.contains("outside the selected grade")
                || query.contains("adjacent grade") || query.contains("next grade")) return true;
        if (selectedGrade == null) return false;
        Matcher requested = EXPLICIT_GRADE.matcher(query);
        while (requested.find()) {
            Integer number = parseNumber(requested.group(1));
            if (number != null && !selectedGrade.name().equals("GRADE_" + number)) return true;
        }
        return false;
    }

    private static boolean hasPositiveCarry(String text) {
        return (text.contains("co nho") && !text.contains("khong co nho"))
                || text.contains("with carrying") || text.contains("carrying operation");
    }

    private static boolean hasNegativeCarry(String text) {
        return text.contains("khong nho") || text.contains("khong can nho") || text.contains("khong co nho")
                || text.contains("without carrying") || text.contains("no carrying");
    }

    private static boolean requestsConsecutiveCarryTurns(String text) {
        return text.contains("luot lien tiep") || text.contains("consecutive turns");
    }

    private static boolean supportsConsecutiveCarryTurns(String evidence) {
        return (evidence.contains("lien tiep") && !evidence.contains("khong lien tiep"))
                || (evidence.contains("consecutive") && !evidence.contains("not consecutive"));
    }

    private static boolean requestsQuestionAboutTopic(String text) {
        boolean mentionsQuestions = containsPhrase(text, "cau hoi") || containsPhrase(text, "question");
        boolean mentionsTopics = containsPhrase(text, "chu de") || containsPhrase(text, "topic");
        return mentionsQuestions && mentionsTopics;
    }

    private static boolean supportsQuestionAboutTopic(String request, String evidence) {
        boolean mentionsQuestions = containsPhrase(evidence, "cau hoi") || containsPhrase(evidence, "question");
        boolean mentionsTopics = containsPhrase(evidence, "chu de") || containsPhrase(evidence, "topic");
        boolean requestsFamiliarity = containsPhrase(request, "quen thuoc") || containsPhrase(request, "familiar");
        boolean supportsFamiliarity = containsPhrase(evidence, "quen thuoc") || containsPhrase(evidence, "familiar");
        return mentionsQuestions && mentionsTopics && (!requestsFamiliarity || supportsFamiliarity);
    }

    private static boolean requestsProof(String text) {
        return containsPhrase(text, "chung minh") || containsPhrase(text, "prove")
                || containsPhrase(text, "proof") || containsPhrase(text, "justify");
    }

    private static boolean supportsProof(String text) {
        return requestsProof(text) || containsPhrase(text, "demonstrate")
                || containsPhrase(text, "derive") || containsPhrase(text, "establish");
    }

    private static boolean requestsRounding(String text) {
        return containsPhrase(text, "lam tron") || containsPhrase(text, "rounding")
                || containsPhrase(text, "round to");
    }

    private static boolean supportsRounding(String text) {
        return requestsRounding(text);
    }

    private static boolean supportsRequestedFormula(String request, String evidence) {
        Matcher marker = FORMULA_MARKER.matcher(request);
        if (!marker.find()) return true;
        Set<String> evidenceWords = java.util.Arrays.stream(evidence.split("\\s+"))
                .collect(java.util.stream.Collectors.toSet());
        var requestedTerms = java.util.Arrays.stream(request.substring(marker.end()).split("\\s+"))
                .filter(token -> token.length() > 1 && !FORMULA_STOP_WORDS.contains(token))
                .collect(java.util.stream.Collectors.toSet());
        return !requestedTerms.isEmpty() && evidenceWords.containsAll(requestedTerms);
    }

    private static boolean containsPhrase(String text, String phrase) {
        return Pattern.compile("(?<![a-z0-9])" + Pattern.quote(phrase) + "(?![a-z0-9])")
                .matcher(text).find();
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
        catch (NumberFormatException ignored) {
            // An oversized integer is still a requested bound, never an absent constraint.
            if (value.matches("[0-9]+")) return Integer.MAX_VALUE;
            Integer simple = NUMBERS.get(value);
            if (simple != null) return simple;
            String[] parts = value.split(" ");
            if (parts.length == 2 && parts[1].equals("tram")) {
                Integer multiplier = NUMBERS.get(parts[0]);
                return multiplier == null ? null : multiplier * 100;
            }
            if (parts.length == 2 && (parts[1].equals("nghin") || parts[1].equals("ngan"))) {
                Integer multiplier = NUMBERS.get(parts[0]);
                return multiplier == null ? null : multiplier * 1000;
            }
            return null;
        }
    }

    private static String normalize(String text) {
        // Join thousands before punctuation/whitespace normalization loses the numeric boundary.
        String groupedNumbers = Pattern.compile("(?<![\\p{L}\\p{N}])\\d{1,3}(?:[. \\u00a0\\u202f]\\d{3})+(?![\\p{L}\\p{N}])")
                .matcher(text).replaceAll(match -> match.group().replaceAll("[. \\u00a0\\u202f]", ""));
        String methodNormalized = groupedNumbers.toLowerCase(java.util.Locale.ROOT).replace("π", "pi")
                .replace("bán kính", "radius").replace("bình phương", "squared");
        String decomposed = Normalizer.normalize(methodNormalized, Normalizer.Form.NFD)
                .replace('đ', 'd');
        return decomposed.replaceAll("\\.{3}", " ellipsis ").replaceAll("\\p{M}+", "")
                .replaceAll("[^a-z0-9]+", " ").trim();
    }
}
