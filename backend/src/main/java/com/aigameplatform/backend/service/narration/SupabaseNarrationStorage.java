package com.aigameplatform.backend.service.narration;

import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Server-only Supabase Storage access. The service-role key must never reach the browser. */
@Component
public class SupabaseNarrationStorage {
    private final RestClient restClient;
    private final String storageUrl;
    private final String serviceRoleKey;
    private final String bucket;

    public SupabaseNarrationStorage(RestClient.Builder builder,
            @Value("${app.narration.storage.url:}") String storageUrl,
            @Value("${app.narration.storage.service-role-key:}") String serviceRoleKey,
            @Value("${app.narration.storage.bucket:game-narration}") String bucket) {
        this.restClient = builder.build();
        this.storageUrl = storageUrl == null ? "" : storageUrl.replaceAll("/+$", "");
        this.serviceRoleKey = serviceRoleKey == null ? "" : serviceRoleKey;
        this.bucket = bucket;
    }

    public void upload(String objectPath, byte[] audio) {
        requireConfigured();
        String path = validatedPath(objectPath);
        restClient.post().uri(storageUrl + "/storage/v1/object/" + bucket + "/" + path)
                .headers(headers -> {
                    addCredentials(headers);
                    headers.set("x-upsert", "true");
                })
                .contentType(MediaType.parseMediaType("audio/mpeg"))
                .body(audio)
                .retrieve().toBodilessEntity();
    }

    public String createSignedUrl(String objectPath, int expiresInSeconds) {
        requireConfigured();
        if (expiresInSeconds < 1 || expiresInSeconds > 600)
            throw new IllegalArgumentException("Signed narration URLs may expire within 600 seconds");
        String path = validatedPath(objectPath);
        Map<?, ?> response = restClient.post()
                .uri(storageUrl + "/storage/v1/object/sign/" + bucket + "/" + path)
                .headers(headers -> addCredentials(headers))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("expiresIn", expiresInSeconds))
                .retrieve().body(Map.class);
        if (response == null || !(response.get("signedURL") instanceof String signedPath))
            throw new IllegalStateException("Supabase Storage returned no signed URL");
        if (URI.create(signedPath).isAbsolute()) return signedPath;
        String storagePath = signedPath.startsWith("/") ? signedPath.substring(1) : signedPath;
        if (!storagePath.startsWith("storage/v1/")) storagePath = "storage/v1/" + storagePath;
        return URI.create(storageUrl).resolve("/" + storagePath).toString();
    }

    public void delete(List<String> objectPaths) {
        if (objectPaths.isEmpty()) return;
        requireConfigured();
        restClient.method(org.springframework.http.HttpMethod.DELETE)
                .uri(storageUrl + "/storage/v1/object/" + bucket)
                .headers(headers -> addCredentials(headers))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("prefixes", objectPaths.stream().map(SupabaseNarrationStorage::validatedPath).toList()))
                .retrieve().toBodilessEntity();
    }

    private void addCredentials(org.springframework.http.HttpHeaders headers) {
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
    }

    private void requireConfigured() {
        if (storageUrl.isBlank() || serviceRoleKey.isBlank() || bucket.isBlank())
            throw new IllegalStateException("Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and TTS_STORAGE_BUCKET");
    }

    private static String validatedPath(String objectPath) {
        if (objectPath == null || objectPath.isBlank() || objectPath.startsWith("/")
                || objectPath.contains("..") || objectPath.contains("?"))
            throw new IllegalArgumentException("Invalid narration object path");
        return objectPath;
    }
}
