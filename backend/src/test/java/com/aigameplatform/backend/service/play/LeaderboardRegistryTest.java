package com.aigameplatform.backend.service.play;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LeaderboardRegistryTest {

    private LeaderboardRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new LeaderboardRegistry();
    }

    @Test
    @DisplayName("Cộng dồn điểm số chính xác và sắp xếp bảng xếp hạng giảm dần")
    void testAddScoreAndGetSortedLeaderboard() {
        String sessionId = "sess-1";

        registry.addScore(sessionId, "p1", "Bé An", 500);
        registry.addScore(sessionId, "p2", "Bé Bình", 800);
        registry.addScore(sessionId, "p3", "Bé Cúc", 600);

        // Bé An trả lời thêm câu tiếp theo được 400 điểm
        registry.addScore(sessionId, "p1", "Bé An", 400);

        List<LeaderboardRegistry.ScoreEntry> sorted = registry.getSortedLeaderboard(sessionId);
        assertThat(sorted).hasSize(3);

        // Thứ tự: Bé An (900) > Bé Bình (800) > Bé Cúc (600)
        assertThat(sorted.get(0).getParticipantId()).isEqualTo("p1");
        assertThat(sorted.get(0).getTotalScore()).isEqualTo(900);

        assertThat(sorted.get(1).getParticipantId()).isEqualTo("p2");
        assertThat(sorted.get(1).getTotalScore()).isEqualTo(800);

        assertThat(sorted.get(2).getParticipantId()).isEqualTo("p3");
        assertThat(sorted.get(2).getTotalScore()).isEqualTo(600);
    }

    @Test
    @DisplayName("Dọn sạch bộ nhớ theo session mà không ảnh hưởng tới session khác")
    void testClearSession() {
        registry.addScore("sess-A", "p1", "Bé An", 100);
        registry.addScore("sess-B", "p2", "Bé Bình", 200);

        registry.clearSession("sess-A");

        assertThat(registry.getSortedLeaderboard("sess-A")).isEmpty();
        assertThat(registry.getSortedLeaderboard("sess-B")).hasSize(1);
    }

    @Test
    @DisplayName("Kiểm tra race condition: 100 luồng nộp bài đồng thời không bị mất điểm hoặc ghi đè sai")
    void testConcurrentScoreUpdates() throws InterruptedException {
        String sessionId = "sess-race";
        int threadCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(16);
        CountDownLatch latch = new CountDownLatch(threadCount);

        // 50 luồng cộng 100 điểm cho p1, 50 luồng cộng 200 điểm cho p2
        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    if (index % 2 == 0) {
                        registry.addScore(sessionId, "p1", "Bé An", 100);
                    } else {
                        registry.addScore(sessionId, "p2", "Bé Bình", 200);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean completed = latch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();

        List<LeaderboardRegistry.ScoreEntry> sorted = registry.getSortedLeaderboard(sessionId);
        assertThat(sorted).hasSize(2);

        // 50 lần * 100 điểm = 5000 điểm cho p1
        // 50 lần * 200 điểm = 10000 điểm cho p2
        LeaderboardRegistry.ScoreEntry p2 = sorted.stream()
                .filter(e -> e.getParticipantId().equals("p2"))
                .findFirst()
                .orElseThrow();
        LeaderboardRegistry.ScoreEntry p1 = sorted.stream()
                .filter(e -> e.getParticipantId().equals("p1"))
                .findFirst()
                .orElseThrow();

        assertThat(p2.getTotalScore()).isEqualTo(10_000);
        assertThat(p1.getTotalScore()).isEqualTo(5_000);
    }

    @Test
    @DisplayName("setScore không bao giờ hạ điểm khi hai request đến lệch thứ tự")
    void setScoreNeverLowersTheScore() {
        LeaderboardRegistry registry = new LeaderboardRegistry();

        registry.setScore("s", "p1", "Lan", 200);
        registry.setScore("s", "p1", "Lan", 100);

        assertThat(registry.getSortedLeaderboard("s").get(0).getTotalScore()).isEqualTo(200);
    }

    @Test
    @DisplayName("setScore đặt tổng điểm, gọi lại cùng giá trị không làm điểm tăng")
    void setScoreIsIdempotent() {
        LeaderboardRegistry registry = new LeaderboardRegistry();

        registry.setScore("s", "p1", "Lan", 150);
        registry.setScore("s", "p1", "Lan", 150);
        registry.setScore("s", "p2", "Minh", 90);

        var sorted = registry.getSortedLeaderboard("s");
        assertThat(sorted).extracting(LeaderboardRegistry.ScoreEntry::getParticipantId).containsExactly("p1", "p2");
        assertThat(sorted.get(0).getTotalScore()).isEqualTo(150);
    }
}
