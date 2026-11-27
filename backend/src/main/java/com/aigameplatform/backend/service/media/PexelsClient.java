package com.aigameplatform.backend.service.media;

import com.aigameplatform.backend.dto.media.PexelsImageDto;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class PexelsClient {

    private static final Logger log = LoggerFactory.getLogger(PexelsClient.class);
    private static final String PEXELS_API_BASE_URL = "https://api.pexels.com/v1/search";

    private final String apiKey;
    private final JsonMapper mapper;
    private final HttpClient httpClient;

    @Autowired
    public PexelsClient(@Value("${app.pexels.api-key:}") String apiKey, JsonMapper mapper) {
        this(apiKey, mapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    }

    public PexelsClient(String apiKey, JsonMapper mapper, HttpClient httpClient) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.mapper = mapper;
        this.httpClient = httpClient;
    }

    public List<PexelsImageDto> search(String query, int perPage) {
        return search(query, perPage, true);
    }

    public List<PexelsImageDto> searchOnline(String query, int perPage) {
        return search(query, perPage, false);
    }

    private List<PexelsImageDto> search(String query, int perPage, boolean allowFallback) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        int limit = perPage > 0 ? Math.min(perPage, 50) : 12;

        if (apiKey.isBlank()) {
            if (!allowFallback) return List.of();
            log.info("Pexels API key not configured. Returning fallback images for query: {}", query);
            return getFallbackImages(query.trim(), limit);
        }

        try {
            String encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
            String url = PEXELS_API_BASE_URL + "?query=" + encodedQuery + "&per_page=" + limit;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(6))
                    .header("Authorization", apiKey)
                    .header("Accept", "application/json")
                    .header("User-Agent", "AI-Game-Platform")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Pexels API returned status code {}", response.statusCode());
                return allowFallback ? getFallbackImages(query.trim(), limit) : List.of();
            }

            JsonNode root = mapper.readTree(response.body());
            JsonNode photos = root.path("photos");

            List<PexelsImageDto> images = new ArrayList<>();
            if (photos.isArray()) {
                for (JsonNode photo : photos) {
                    long id = photo.path("id").asLong();
                    JsonNode src = photo.path("src");
                    String urlLarge = src.path("large").asText(src.path("medium").asText(""));
                    String urlTiny = src.path("tiny").asText(src.path("small").asText(urlLarge));
                    String alt = photo.path("alt").asText(query);
                    String photographer = photo.path("photographer").asText("");

                    if (!urlLarge.isBlank()) {
                        images.add(new PexelsImageDto(id, urlLarge, urlTiny, alt, photographer));
                    }
                }
            }

            if (images.isEmpty()) {
                return allowFallback ? getFallbackImages(query.trim(), limit) : List.of();
            }
            return images;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return List.of();
        } catch (Exception e) {
            log.error("Failed to fetch images from Pexels API ({})", e.getClass().getSimpleName());
            return allowFallback ? getFallbackImages(query.trim(), limit) : List.of();
        }
    }

    private List<PexelsImageDto> getFallbackImages(String query, int limit) {
        List<PexelsImageDto> mocks = List.of(
            new PexelsImageDto(1001L,
                    "https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg",
                    "https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=150",
                    query + " - Minh hoạ 1", "Pexels Artist"),
            new PexelsImageDto(1002L,
                    "https://images.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg",
                    "https://images.pexels.com/photos/104827/cat-pet-animal-domestic-104827.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=150",
                    query + " - Minh hoạ 2", "Pexels Artist"),
            new PexelsImageDto(1003L,
                    "https://images.pexels.com/photos/617278/pexels-photo-617278.jpeg",
                    "https://images.pexels.com/photos/617278/pexels-photo-617278.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=150",
                    query + " - Minh hoạ 3", "Pexels Artist"),
            new PexelsImageDto(1004L,
                    "https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg",
                    "https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=150",
                    query + " - Minh hoạ 4", "Pexels Artist"),
            new PexelsImageDto(1005L,
                    "https://images.pexels.com/photos/20787/pexels-photo-20787.jpeg",
                    "https://images.pexels.com/photos/20787/pexels-photo-20787.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=150",
                    query + " - Minh hoạ 5", "Pexels Artist"),
            new PexelsImageDto(1006L,
                    "https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg",
                    "https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=150",
                    query + " - Minh hoạ 6", "Pexels Artist")
        );
        return mocks.subList(0, Math.min(limit, mocks.size()));
    }
}
