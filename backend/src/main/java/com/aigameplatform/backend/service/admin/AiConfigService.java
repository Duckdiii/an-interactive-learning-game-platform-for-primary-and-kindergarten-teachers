package com.aigameplatform.backend.service.admin;

import com.aigameplatform.backend.dto.admin.AiConfigInput;
import com.aigameplatform.backend.dto.admin.AiConfigResponseDto;
import com.aigameplatform.backend.dto.admin.AiConfigVersionDto;
import com.aigameplatform.backend.dto.admin.FreezeAiConfigRequest;
import com.aigameplatform.backend.entity.AiConfigVersion;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.AiConfigVersionRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiConfigService {

    public static final String DEFAULT_SYSTEM_PROMPT =
            "Bạn là trợ lý AI sư phạm chuyên tạo trò chơi học tập tương tác cho học sinh tiểu học và mầm non theo Chương trình GDPT 2018.";
    public static final double DEFAULT_TEMPERATURE = 0.3;
    public static final int DEFAULT_MAX_TOKENS = 2000;
    public static final double DEFAULT_MODERATION_THRESHOLD = 0.85;

    private final AiConfigVersionRepository aiConfigVersionRepository;
    private final AuditLogService auditLogService;

    public AiConfigService(
            AiConfigVersionRepository aiConfigVersionRepository,
            AuditLogService auditLogService) {
        this.aiConfigVersionRepository = aiConfigVersionRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AiConfigResponseDto getAiConfig() {
        List<AiConfigVersion> versions = aiConfigVersionRepository.findAllByOrderByCreatedAtDesc();
        AiConfigVersion activeVersion = aiConfigVersionRepository.findFirstByActiveTrue().orElse(null);

        if (activeVersion == null) {
            activeVersion = initDefaultBaseline();
            versions = List.of(activeVersion);
        }

        AiConfigVersionDto activeDto = toDto(activeVersion);
        List<AiConfigVersionDto> versionDtos = versions.stream().map(this::toDto).toList();

        return new AiConfigResponseDto(activeDto, versionDtos);
    }

    @Transactional
    public AiConfigVersionDto createVersion(AiConfigInput input, AuthenticatedTeacher actor, String ip) {
        if (input == null || input.systemPrompt() == null || input.systemPrompt().trim().isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Giá trị cấu hình không hợp lệ. Vui lòng kiểm tra lại các tham số...");
        }
        if (input.temperature() != null && (input.temperature() < 0.0 || input.temperature() > 1.0)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Temperature phải nằm trong khoảng từ 0.0 đến 1.0");
        }
        if (input.maxTokens() != null && (input.maxTokens() < 500 || input.maxTokens() > 4000)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "maxTokens phải nằm trong khoảng từ 500 đến 4000");
        }
        if (input.moderationThreshold() != null && (input.moderationThreshold() < 0.0 || input.moderationThreshold() > 1.0)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "moderationThreshold phải nằm trong khoảng từ 0.0 đến 1.0");
        }

        String prompt = input.systemPrompt().trim();
        double temp = input.resolvedTemperature();
        int maxTok = input.resolvedMaxTokens();
        double modThresh = input.resolvedModerationThreshold();

        String sha256 = computeSha256(prompt, temp, maxTok, modThresh);

        aiConfigVersionRepository.deactivateAll();

        String actorId = actor != null ? actor.teacherId() : "system";
        String actorRole = actor != null ? actor.role() : "ROLE_ADMIN";

        AiConfigVersion newVersion = AiConfigVersion.builder()
                .id(UUID.randomUUID().toString())
                .systemPrompt(prompt)
                .temperature(temp)
                .maxTokens(maxTok)
                .moderationThreshold(modThresh)
                .label(null)
                .frozen(false)
                .active(true)
                .sha256(sha256)
                .createdAt(Instant.now())
                .createdBy(actorId)
                .build();

        AiConfigVersion saved = aiConfigVersionRepository.save(newVersion);

        auditLogService.logAction(
                actorId,
                actorRole,
                ip,
                "CREATE_AI_CONFIG_VERSION",
                AuditResult.SUCCESS,
                null,
                "Created AI config version: " + saved.getId() + " sha256=" + sha256
        );

        return toDto(saved);
    }

    @Transactional
    public AiConfigVersionDto freezeVersion(String versionId, FreezeAiConfigRequest request, AuthenticatedTeacher actor, String ip) {
        AiConfigVersion version = aiConfigVersionRepository.findById(versionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản cấu hình AI với ID: " + versionId));

        version.setFrozen(true);
        if (request != null && request.label() != null && !request.label().trim().isEmpty()) {
            version.setLabel(request.label().trim());
        }

        AiConfigVersion saved = aiConfigVersionRepository.save(version);

        String actorId = actor != null ? actor.teacherId() : "system";
        String actorRole = actor != null ? actor.role() : "ROLE_ADMIN";

        auditLogService.logAction(
                actorId,
                actorRole,
                ip,
                "FREEZE_AI_CONFIG_VERSION",
                AuditResult.SUCCESS,
                null,
                "Frozen AI config version: " + versionId + " with label: " + version.getLabel()
        );

        return toDto(saved);
    }

    @Transactional
    public AiConfigVersionDto activateVersion(String versionId, AuthenticatedTeacher actor, String ip) {
        AiConfigVersion version = aiConfigVersionRepository.findById(versionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên bản cấu hình AI với ID: " + versionId));

        aiConfigVersionRepository.deactivateAll();
        version.setActive(true);

        AiConfigVersion saved = aiConfigVersionRepository.save(version);

        String actorId = actor != null ? actor.teacherId() : "system";
        String actorRole = actor != null ? actor.role() : "ROLE_ADMIN";

        auditLogService.logAction(
                actorId,
                actorRole,
                ip,
                "ACTIVATE_AI_CONFIG_VERSION",
                AuditResult.SUCCESS,
                null,
                "Activated AI config version: " + versionId
        );

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public AiConfigVersionDto getActiveConfig() {
        return aiConfigVersionRepository.findFirstByActiveTrue()
                .map(this::toDto)
                .orElseGet(() -> new AiConfigVersionDto(
                        "baseline-default",
                        DEFAULT_SYSTEM_PROMPT,
                        DEFAULT_TEMPERATURE,
                        DEFAULT_MAX_TOKENS,
                        DEFAULT_MODERATION_THRESHOLD,
                        "v1.0.0-baseline",
                        true,
                        true,
                        computeSha256(DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_MODERATION_THRESHOLD),
                        Instant.now(),
                        "system"
                ));
    }

    private AiConfigVersion initDefaultBaseline() {
        String sha256 = computeSha256(DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_MODERATION_THRESHOLD);
        AiConfigVersion baseline = AiConfigVersion.builder()
                .id(UUID.randomUUID().toString())
                .systemPrompt(DEFAULT_SYSTEM_PROMPT)
                .temperature(DEFAULT_TEMPERATURE)
                .maxTokens(DEFAULT_MAX_TOKENS)
                .moderationThreshold(DEFAULT_MODERATION_THRESHOLD)
                .label("v1.0.0-baseline")
                .frozen(true)
                .active(true)
                .sha256(sha256)
                .createdAt(Instant.now())
                .createdBy("system")
                .build();
        return aiConfigVersionRepository.save(baseline);
    }

    private AiConfigVersionDto toDto(AiConfigVersion entity) {
        return new AiConfigVersionDto(
                entity.getId(),
                entity.getSystemPrompt(),
                entity.getTemperature(),
                entity.getMaxTokens(),
                entity.getModerationThreshold(),
                entity.getLabel(),
                entity.isFrozen(),
                entity.isActive(),
                entity.getSha256(),
                entity.getCreatedAt(),
                entity.getCreatedBy()
        );
    }

    private static String computeSha256(String prompt, double temperature, int maxTokens, double moderationThreshold) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = prompt + "|" + temperature + "|" + maxTokens + "|" + moderationThreshold;
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
