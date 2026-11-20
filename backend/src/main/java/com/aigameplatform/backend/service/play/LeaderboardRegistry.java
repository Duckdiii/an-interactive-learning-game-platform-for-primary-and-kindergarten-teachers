package com.aigameplatform.backend.service.play;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Getter;
import org.springframework.stereotype.Component;

@Component
public class LeaderboardRegistry {

    // sessionId -> (participantId -> ScoreEntry)
    private final Map<String, Map<String, ScoreEntry>> board = new ConcurrentHashMap<>();

    public void addScore(String sessionId, String participantId, String participantName, int points) {
        if (sessionId == null || participantId == null) return;
        board.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>())
                .compute(participantId, (id, existing) -> {
                    if (existing == null) {
                        return new ScoreEntry(participantId, participantName != null ? participantName : "Học sinh", points);
                    }
                    if (participantName != null && !participantName.isBlank()) {
                        existing.setParticipantName(participantName);
                    }
                    existing.addPoints(points);
                    return existing;
                });
    }

    public List<ScoreEntry> getSortedLeaderboard(String sessionId) {
        if (sessionId == null) return List.of();
        return board.getOrDefault(sessionId, Map.of()).values().stream()
                .sorted(Comparator.comparingInt(ScoreEntry::getTotalScore).reversed())
                .toList();
    }

    public void clearSession(String sessionId) {
        if (sessionId != null) {
            board.remove(sessionId);
        }
    }

    @Getter
    public static class ScoreEntry {
        private final String participantId;
        private String participantName;
        private int totalScore;

        public ScoreEntry(String participantId, String participantName, int initialScore) {
            this.participantId = participantId;
            this.participantName = participantName;
            this.totalScore = initialScore;
        }

        public void setParticipantName(String participantName) {
            this.participantName = participantName;
        }

        public void addPoints(int points) {
            this.totalScore += points;
        }
    }
}
