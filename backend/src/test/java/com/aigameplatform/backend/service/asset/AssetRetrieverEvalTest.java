package com.aigameplatform.backend.service.asset;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Đo bộ khớp hình trên bộ chữ thật (resources/assets/retrieval-eval.csv): mỗi dòng "chữ;id đúng;ghi chú", id "-" nghĩa là
 * không được ra hình nào. In báo cáo các ca sai để chỉnh từ khóa, và chặn tụt dưới ngưỡng.
 */
class AssetRetrieverEvalTest {

    private record Case(String text, String expected, String note) {
    }

    private final AssetRetriever retriever = new KeywordAssetRetriever(GameAssetCatalogFixture.ASSETS);

    private static List<Case> load() throws IOException {
        List<Case> cases = new ArrayList<>();
        try (InputStream in = AssetRetrieverEvalTest.class.getResourceAsStream("/assets/retrieval-eval.csv");
             BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            for (String line = reader.readLine(); line != null; line = reader.readLine()) {
                if (line.isBlank() || line.startsWith("#")) continue;
                String[] parts = line.split(";", -1);
                cases.add(new Case(parts[0], parts[1], parts.length > 2 ? parts[2] : ""));
            }
        }
        return cases;
    }

    @Test
    void reportsHowWellTextFindsItsPicture() throws IOException {
        List<Case> cases = load();
        int positives = 0, hits = 0, negatives = 0, clean = 0;
        List<String> problems = new ArrayList<>();
        for (Case c : cases) {
            List<String> ids = retriever.match(c.text()).stream().map(AssetMatch::assetId).toList();
            if (c.expected().equals("~")) { if (!ids.isEmpty()) System.out.println("GIỚI HẠN \"" + c.text() + "\" -> " + ids); }
            else if (c.expected().equals("-")) {
                negatives++;
                if (ids.isEmpty()) clean++;
                else problems.add("GIẢ     \"" + c.text() + "\" -> " + ids);
            } else {
                positives++;
                if (!ids.isEmpty() && ids.getFirst().equals(c.expected())) hits++;
                else problems.add("SAI/THIẾU \"" + c.text() + "\" cần " + c.expected() + ", ra " + ids);
            }
        }
        System.out.printf("== Đo bộ khớp hình: đúng %d/%d (%.0f%%), sạch %d/%d (%.0f%%)%n", hits, positives,
                100.0 * hits / positives, clean, negatives, 100.0 * clean / negatives);
        problems.forEach(System.out::println);

        assertThat((double) hits / positives).as("tỉ lệ ra đúng hình").isGreaterThanOrEqualTo(0.9);
        assertThat((double) clean / negatives).as("tỉ lệ câu thường không ra hình giả").isGreaterThanOrEqualTo(0.9);
    }
}
