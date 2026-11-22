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

    /**
     * Đặt tổng điểm (không cộng dồn) nên gửi lại cùng một lần nộp không làm điểm tăng. Điểm của một em trong
     * phiên chỉ tăng, nên lấy giá trị lớn hơn: hai request đến sát nhau có thể gọi lệch thứ tự sau khi commit.
     */
    public void setScore(String sessionId, String participantId, String participantName, int totalScore) {
        if (sessionId == null || participantId == null) return;
        board.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>())
                .compute(participantId, (id, existing) -> {
                    ScoreEntry entry = existing != null ? existing
                            : new ScoreEntry(participantId, participantName != null ? participantName : "Học sinh", 0);
                    if (participantName != null && !participantName.isBlank()) entry.setParticipantName(participantName);
                    entry.setTotalScore(Math.max(entry.getTotalScore(), totalScore));
                    return entry;
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

        public void setTotalScore(int totalScore) {
            this.totalScore = totalScore;
        }

        public void addPoints(int points) {
            this.totalScore += points;
        }
    }
}
