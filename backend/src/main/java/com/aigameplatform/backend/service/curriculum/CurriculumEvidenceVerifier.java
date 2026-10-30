package com.aigameplatform.backend.service.curriculum;

import java.util.*;

public final class CurriculumEvidenceVerifier {
    public enum Status { SUPPORTED, UNSUPPORTED, NEEDS_CLARIFICATION }
    public record VerificationDecision(Status status, String reasonCode, List<String> supportedChunkIds) {
        public VerificationDecision { supportedChunkIds = List.copyOf(supportedChunkIds); }
    }
    public VerificationDecision verify(CurriculumTopicParser.ParsedTopic topic,
            List<CurriculumRAGService.RetrievedChunk> candidates, CurriculumConstraints constraints) {
        if (topic.needsClarification()) return new VerificationDecision(Status.NEEDS_CLARIFICATION, "CLARIFY_CONSTRAINTS", List.of());
        var ids = new LinkedHashSet<String>();
        for (var request : topic.requirements()) {
            if ((request.skill() == CurriculumConstraints.Skill.CM_MEASURE || request.skill() == CurriculumConstraints.Skill.CM_READ)
                    && request.unit() == null)
                return new VerificationDecision(Status.NEEDS_CLARIFICATION, "MISSING_MEASUREMENT_UNIT", List.of());
            if (request.maxNumber() == null && !request.roundTens() && java.util.Set.of(
                    CurriculumConstraints.Skill.COUNT, CurriculumConstraints.Skill.READ_NUMBER, CurriculumConstraints.Skill.WRITE_NUMBER,
                    CurriculumConstraints.Skill.COMPARE, CurriculumConstraints.Skill.ADD, CurriculumConstraints.Skill.SUBTRACT).contains(request.skill()))
                return new VerificationDecision(Status.NEEDS_CLARIFICATION, "MISSING_NUMBER_RANGE", List.of());
            boolean[] missingCarry = {false};
            var match = candidates.stream().filter(c -> constraints.capabilities(c.chunkId()).stream().anyMatch(cap -> {
                boolean compatible =
                    cap.skill() == request.skill()
                    && (request.maxNumber() == null || (cap.maxNumber() != null && request.maxNumber() <= cap.maxNumber()))
                    && (!request.mental() || cap.mental()) && (!request.roundTens() || cap.roundTens())
                    && (!cap.roundTens() || request.roundTens())
                    && (request.unit() == null || request.unit().equals(cap.unit()));
                if (compatible && request.carry() == CurriculumConstraints.Carry.UNSPECIFIED
                        && cap.carry() != CurriculumConstraints.Carry.UNSPECIFIED) {
                    missingCarry[0] = true;
                    return false;
                }
                return compatible && (request.carry() == CurriculumConstraints.Carry.UNSPECIFIED || request.carry() == cap.carry());
            })).findFirst();
            if (match.isEmpty()) return new VerificationDecision(missingCarry[0] ? Status.NEEDS_CLARIFICATION : Status.UNSUPPORTED,
                    missingCarry[0] ? "MISSING_CARRY_CONDITION" : "MISSING_CONSTRAINT_EVIDENCE", List.of());
            ids.add(match.get().chunkId());
        }
        return new VerificationDecision(Status.SUPPORTED, "ALL_CONSTRAINTS_SUPPORTED", List.copyOf(ids));
    }
}
