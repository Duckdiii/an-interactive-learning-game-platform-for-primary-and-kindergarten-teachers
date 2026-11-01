package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.curriculum.CurriculumConstraints;
import com.aigameplatform.backend.service.curriculum.CurriculumTopicParser;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Conservative deterministic gate for the current Math Grade 1 QUIZ pilot.
 * Unsupported question forms remain UNVERIFIED; a model reviewer cannot promote them.
 */
public final class PilotQuizContentVerifier {
    public enum Status { VERIFIED, INVALID, UNVERIFIED }
    public record Result(Status status, List<ValidationError> errors, List<String> chunkIds) {
        public Result { errors = List.copyOf(errors); chunkIds = List.copyOf(chunkIds); }
    }

    private static final Pattern EXPRESSION = Pattern.compile(
            "(?i)(?<![\\p{L}\\p{N}])(-?\\d{1,6})\\s*([+\\-])\\s*(-?\\d{1,6})(?![\\p{L}\\p{N}])");
    private static final Pattern INTEGER = Pattern.compile("^\\s*(-?\\d+)\\s*[.!?]?\\s*$");
    private final CurriculumConstraints constraints;
    private final String approvedConstraintsSha;
    private final CurriculumTopicParser topicParser = new CurriculumTopicParser();

    public PilotQuizContentVerifier(CurriculumConstraints constraints, String approvedConstraintsSha) {
        this.constraints = constraints;
        this.approvedConstraintsSha = approvedConstraintsSha;
    }

    public Result verify(GameDsl game, String topic, CurriculumEvidence evidence) {
        if (!(game instanceof QuizGameDsl quiz) || game.metadata().subject() != Subject.MATH
                || game.metadata().gradeLevel() != GradeLevel.GRADE_1) {
            return unverified("SCOPE_NOT_COVERED_BY_PILOT");
        }
        try {
            constraints.requireApproved(approvedConstraintsSha);
        } catch (RuntimeException unapproved) {
            return unverified("CURRICULUM_CAPABILITIES_NOT_APPROVED");
        }
        var parsed = topicParser.parse(topic);
        if (parsed.needsClarification() || parsed.requirements().isEmpty())
            return unverified("REQUEST_NOT_MACHINE_CHECKABLE");
        if (parsed.requirements().stream().collect(java.util.stream.Collectors.groupingBy(
                        CurriculumTopicParser.Requirement::skill, java.util.stream.Collectors.counting()))
                .values().stream().anyMatch(count -> count > 1))
            return unverified("MULTIPLE_CONSTRAINTS_FOR_SAME_SKILL_NOT_SUPPORTED");

        var usedChunks = new java.util.LinkedHashSet<String>();
        var generatedSkills = new java.util.LinkedHashSet<CurriculumConstraints.Skill>();
        var errors = new java.util.ArrayList<ValidationError>();
        var retrieved = evidence.chunks().stream().map(c -> c.chunkId()).collect(java.util.stream.Collectors.toSet());
        for (int index = 0; index < quiz.questions().size(); index++) {
            QuizQuestionDsl question = quiz.questions().get(index);
            Matcher matcher = EXPRESSION.matcher(question.questionText());
            if (!matcher.find()) return unverified("QUESTION_NOT_MACHINE_CHECKABLE");
            String rest = question.questionText().substring(matcher.end());
            String leftToken = matcher.group(1);
            String operator = matcher.group(2);
            String rightToken = matcher.group(3);
            if (EXPRESSION.matcher(question.questionText()).results().count() != 1
                    || rest.matches("(?s).*\\b[+\\-]\\s*\\d+.*"))
                return unverified("QUESTION_HAS_AMBIGUOUS_ARITHMETIC");
            long left, right, answer;
            try {
                left = Long.parseLong(leftToken);
                right = Long.parseLong(rightToken);
                answer = operator.equals("+") ? Math.addExact(left, right) : Math.subtractExact(left, right);
            } catch (ArithmeticException | NumberFormatException invalid) {
                errors.add(error(index, "QUESTION_ARITHMETIC_INVALID"));
                continue;
            }
            if (left < 0 || right < 0 || answer < 0) {
                errors.add(error(index, "QUESTION_ARITHMETIC_OUTSIDE_PRIMARY_NUMBER_DOMAIN"));
                continue;
            }
            Matcher assertedAnswer = Pattern.compile("^\\s*=\\s*(-?\\d+)\\b").matcher(rest);
            if (assertedAnswer.find()) {
                try {
                    if (Long.parseLong(assertedAnswer.group(1)) != answer) {
                        errors.add(error(index, "QUESTION_STATES_AN_INCORRECT_ARITHMETIC_RESULT"));
                        continue;
                    }
                } catch (NumberFormatException invalidAssertion) {
                    return unverified("QUESTION_ASSERTED_RESULT_NOT_MACHINE_CHECKABLE");
                }
            }
            var skill = operator.equals("+") ? CurriculumConstraints.Skill.ADD : CurriculumConstraints.Skill.SUBTRACT;
            generatedSkills.add(skill);
            var requirement = parsed.requirements().stream().filter(r -> r.skill() == skill).findFirst();
            if (requirement.isEmpty()) return unverified("QUESTION_EXCEEDS_REQUESTED_SKILL");
            if (requirement.get().maxNumber() != null && (Math.abs(left) > requirement.get().maxNumber()
                    || Math.abs(right) > requirement.get().maxNumber() || Math.abs(answer) > requirement.get().maxNumber())) {
                errors.add(error(index, "QUESTION_EXCEEDS_REQUESTED_NUMBER_RANGE"));
                continue;
            }
            if (requirement.get().roundTens() && (left % 10 != 0 || right % 10 != 0)) {
                errors.add(error(index, "QUESTION_EXCEEDS_REQUESTED_ROUND_TENS_CONSTRAINT"));
                continue;
            }
            if (requirement.get().mental() && !question.questionText().toLowerCase(java.util.Locale.ROOT).contains("nhẩm"))
                return unverified("MENTAL_ARITHMETIC_NOT_EXPLICIT_IN_QUESTION");
            boolean hasCarry = skill == CurriculumConstraints.Skill.ADD ? hasCarry(left, right) : hasBorrow(left, right);
            if (requirement.get().carry() != CurriculumConstraints.Carry.UNSPECIFIED
                    && hasCarry != (requirement.get().carry() == CurriculumConstraints.Carry.WITH_CARRY)) {
                errors.add(error(index, "QUESTION_EXCEEDS_REQUESTED_CARRY_CONSTRAINT"));
                continue;
            }
            var support = retrieved.stream().filter(id -> constraints.capabilities(id).stream().anyMatch(cap ->
                    cap.skill() == skill && cap.maxNumber() != null
                            && Math.abs(left) <= cap.maxNumber() && Math.abs(right) <= cap.maxNumber()
                            && Math.abs(answer) <= cap.maxNumber()
                            && (requirement.get().maxNumber() == null || requirement.get().maxNumber() <= cap.maxNumber())
                            && (requirement.get().carry() == CurriculumConstraints.Carry.UNSPECIFIED
                                || requirement.get().carry() == cap.carry())
                            && (cap.carry() == CurriculumConstraints.Carry.UNSPECIFIED
                                || (hasCarry == (cap.carry() == CurriculumConstraints.Carry.WITH_CARRY)))
                            && (!requirement.get().mental() || cap.mental())
                            && (!requirement.get().roundTens() || cap.roundTens())
                            && (!cap.roundTens() || requirement.get().roundTens())))
                    .findFirst();
            if (support.isEmpty()) {
                errors.add(error(index, "QUESTION_OUTSIDE_RETRIEVED_YCCĐ_CAPABILITY"));
                continue;
            }
            long maximum = constraints.capabilities(support.get()).stream()
                    .filter(cap -> cap.skill() == skill && cap.maxNumber() != null
                            && (requirement.get().maxNumber() == null || requirement.get().maxNumber() <= cap.maxNumber()))
                    .mapToLong(CurriculumConstraints.Capability::maxNumber).min().orElseThrow();
            Long requestedMaximum = requirement.get().maxNumber();
            long allowedMaximum = requestedMaximum == null ? maximum : Math.min(maximum, requestedMaximum);
            var visibleText = new java.util.ArrayList<String>();
            visibleText.add(question.questionText());
            if (question.audioText() != null) visibleText.add(question.audioText());
            if (question.visualPrompt() != null) visibleText.add(question.visualPrompt());
            question.options().forEach(option -> visibleText.add(option.text()));
            boolean numericContentOutOfRange = visibleText.stream().flatMap(text -> {
                var numericMatcher = Pattern.compile("(?<![\\p{L}\\p{N}])-?\\d+").matcher(text);
                var numbers = new java.util.ArrayList<Long>();
                while (numericMatcher.find()) {
                    try {
                        long parsedNumber = Long.parseLong(numericMatcher.group());
                        numbers.add(parsedNumber == Long.MIN_VALUE ? Long.MAX_VALUE : Math.abs(parsedNumber));
                    }
                    catch (NumberFormatException overflow) { numbers.add(Long.MAX_VALUE); }
                }
                return numbers.stream();
            }).anyMatch(number -> number > allowedMaximum);
            if (numericContentOutOfRange) {
                errors.add(error(index, "QUESTION_CONTENT_EXCEEDS_YCCĐ_NUMBER_RANGE"));
                continue;
            }
            usedChunks.add(support.get());
            if (question.options().stream().anyMatch(o -> integer(o.text()) == null))
                return unverified("ANSWER_OPTIONS_NOT_MACHINE_CHECKABLE");
            long matchingAnswers = question.options().stream().map(o -> integer(o.text()))
                    .filter(value -> value != null && value == answer).count();
            Long selected = question.options().stream().filter(o -> o.id().equals(question.correctOptionId()))
                    .map(o -> integer(o.text())).findFirst().orElse(null);
            if (matchingAnswers != 1) errors.add(error(index, "QUESTION_DOES_NOT_HAVE_EXACTLY_ONE_CORRECT_OPTION"));
            if (selected == null || selected != answer) errors.add(error(index, "SELECTED_ANSWER_IS_INCORRECT"));
        }
        if (!errors.isEmpty()) return new Result(Status.INVALID, errors, List.copyOf(usedChunks));
        if (!generatedSkills.containsAll(parsed.requirements().stream().map(CurriculumTopicParser.Requirement::skill).toList()))
            return unverified("OUTPUT_DOES_NOT_COVER_REQUESTED_SKILLS");
        return new Result(Status.VERIFIED, List.of(), List.copyOf(usedChunks));
    }

    private static Result unverified(String reason) {
        return new Result(Status.UNVERIFIED, List.of(new ValidationError("$", reason)), List.of());
    }

    private static ValidationError error(int index, String reason) {
        return new ValidationError("$.questions[" + index + "]", reason);
    }

    private static Long integer(String text) {
        if (text == null) return null;
        Matcher matcher = INTEGER.matcher(text);
        if (!matcher.matches()) return null;
        try { return Long.parseLong(matcher.group(1)); }
        catch (NumberFormatException invalid) { return null; }
    }

    private static boolean hasCarry(long left, long right) {
        if (left < 0 || right < 0) return true;
        while (left > 0 || right > 0) {
            if (left % 10 + right % 10 >= 10) return true;
            left /= 10;
            right /= 10;
        }
        return false;
    }

    private static boolean hasBorrow(long left, long right) {
        if (left < right || left < 0 || right < 0) return true;
        int borrow = 0;
        boolean borrowOccurred = false;
        while (left > 0 || right > 0) {
            long digitLeft = left % 10 - borrow;
            long digitRight = right % 10;
            if (digitLeft < digitRight) { borrow = 1; borrowOccurred = true; }
            else borrow = 0;
            left /= 10;
            right /= 10;
        }
        return borrowOccurred;
    }
}
