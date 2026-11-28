package com.aigameplatform.backend.service.media;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class LocalMediaStorageService implements MediaStorageService {
    private static final Logger log = LoggerFactory.getLogger(LocalMediaStorageService.class);
    private static final Pattern PUBLIC_FILENAME = Pattern.compile(
            "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](png|jpg|mp3)");

    private final Path storageDirectory;
    private final String baseUrl;

    public LocalMediaStorageService(
            @Value("${media.storage.local-dir:target/media-storage}") String localDir,
            @Value("${media.storage.base-url:http://localhost:8080/media}") String baseUrl) {
        this.storageDirectory = Paths.get(localDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        try {
            Files.createDirectories(this.storageDirectory);
        } catch (IOException e) {
            log.warn("Could not create local media storage directory: {}", localDir, e);
        }
    }

    @Override
    public String upload(String fileName, byte[] data, String contentType) {
        if (fileName == null || data == null) {
            throw new IllegalArgumentException("fileName and data must not be null");
        }
        Path target = storageDirectory.resolve(fileName).normalize();
        if (!target.startsWith(storageDirectory) || target.equals(storageDirectory)) {
            throw new IllegalArgumentException("Media path must stay inside the storage directory");
        }
        try {
            Files.createDirectories(target.getParent());
            Path temporary = Files.createTempFile(target.getParent(), ".media-", ".tmp");
            try {
                Files.write(temporary, data);
                Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temporary);
            }
            return baseUrl + "/" + fileName;
        } catch (IOException e) {
            log.error("Failed to write media file to disk: {}", fileName, e);
            throw new RuntimeException("Media upload failed for file: " + fileName, e);
        }
    }

    public Optional<StoredMedia> getPublicMedia(String group, String fileName) {
        Path groupDirectory = switch (group) {
            case "uploads" -> storageDirectory.resolve("uploads");
            case "tts" -> storageDirectory.resolve("tts");
            default -> null;
        };
        if (groupDirectory == null) return Optional.empty();

        var match = PUBLIC_FILENAME.matcher(fileName);
        if (!match.matches() || group.equals("tts") && !match.group(1).equals("mp3")) return Optional.empty();

        Path file = groupDirectory.resolve(fileName).normalize();
        if (!file.startsWith(groupDirectory) || Files.isSymbolicLink(groupDirectory)
                || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)) {
            return Optional.empty();
        }
        String type = switch (match.group(1)) {
            case "png" -> "image/png";
            case "jpg" -> "image/jpeg";
            default -> "audio/mpeg";
        };
        return Optional.of(new StoredMedia(new FileSystemResource(file), type));
    }

    Optional<StoredMedia> ownUploadedImage(URI uri) {
        String prefix = baseUrl + "/uploads/";
        String source = uri.toString();
        if (!source.startsWith(prefix)) return Optional.empty();

        return Optional.of(getPublicMedia("uploads", source.substring(prefix.length()))
                .filter(media -> media.contentType().startsWith("image/"))
                .orElseThrow(() -> new InvalidSceneImageException("Uploaded image could not be found")));
    }

    public record StoredMedia(Resource resource, String contentType) {}
}
