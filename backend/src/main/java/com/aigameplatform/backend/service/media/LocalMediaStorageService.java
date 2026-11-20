package com.aigameplatform.backend.service.media;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LocalMediaStorageService implements MediaStorageService {
    private static final Logger log = LoggerFactory.getLogger(LocalMediaStorageService.class);

    private final Path storageDirectory;
    private final String baseUrl;

    public LocalMediaStorageService(
            @Value("${media.storage.local-dir:target/media-storage}") String localDir,
            @Value("${media.storage.base-url:http://localhost:8080/media}") String baseUrl) {
        this.storageDirectory = Paths.get(localDir);
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
        try {
            Path targetFile = storageDirectory.resolve(fileName);
            if (targetFile.getParent() != null) {
                Files.createDirectories(targetFile.getParent());
            }
            Files.write(targetFile, data);
            return baseUrl + "/" + fileName;
        } catch (IOException e) {
            log.error("Failed to write media file to disk: {}", fileName, e);
            throw new RuntimeException("Media upload failed for file: " + fileName, e);
        }
    }
}
