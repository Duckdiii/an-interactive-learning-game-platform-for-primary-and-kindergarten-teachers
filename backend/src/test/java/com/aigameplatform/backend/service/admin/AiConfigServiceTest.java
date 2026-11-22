package com.aigameplatform.backend.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.aigameplatform.backend.dto.admin.AiConfigInput;
import com.aigameplatform.backend.dto.admin.AiConfigResponseDto;
import com.aigameplatform.backend.dto.admin.AiConfigVersionDto;
import com.aigameplatform.backend.dto.admin.FreezeAiConfigRequest;
import com.aigameplatform.backend.entity.AiConfigVersion;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.AiConfigVersionRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiConfigServiceTest {

    @Mock
    private AiConfigVersionRepository aiConfigVersionRepository;

    @Mock
    private AuditLogService auditLogService;

    private AiConfigService aiConfigService;

    private final AuthenticatedTeacher adminActor = new AuthenticatedTeacher(
            UUID.randomUUID().toString(),
            "admin@aigame.local",
            "session-1",
            "ROLE_ADMIN"
    );

    @BeforeEach
    void setUp() {
        aiConfigService = new AiConfigService(aiConfigVersionRepository, auditLogService);
    }

    @Test
    @DisplayName("getAiConfig: khi chưa có version nào trong DB thì tự động tạo baseline default")
    void getAiConfig_whenEmpty_initializesDefaultBaseline() {
        when(aiConfigVersionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(aiConfigVersionRepository.findFirstByActiveTrue()).thenReturn(Optional.empty());
        when(aiConfigVersionRepository.save(any(AiConfigVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiConfigResponseDto response = aiConfigService.getAiConfig();

        assertThat(response).isNotNull();
        assertThat(response.active()).isNotNull();
        assertThat(response.active().label()).isEqualTo("v1.0.0-baseline");
        assertThat(response.active().frozen()).isTrue();
        assertThat(response.active().active()).isTrue();
        assertThat(response.active().temperature()).isEqualTo(0.3);
        verify(aiConfigVersionRepository).save(any(AiConfigVersion.class));
    }

    @Test
    @DisplayName("getAiConfig: trả về danh sách phiên bản và phiên bản đang active")
    void getAiConfig_whenExisting_returnsActiveAndVersions() {
        AiConfigVersion version = AiConfigVersion.builder()
                .id("v1")
                .systemPrompt("Prompt 1")
                .temperature(0.5)
                .maxTokens(1500)
                .moderationThreshold(0.9)
                .label("v1.1")
                .frozen(false)
                .active(true)
                .sha256("hash123")
                .createdAt(Instant.now())
                .createdBy("admin")
                .build();

        when(aiConfigVersionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(version));
        when(aiConfigVersionRepository.findFirstByActiveTrue()).thenReturn(Optional.of(version));

        AiConfigResponseDto response = aiConfigService.getAiConfig();

        assertThat(response.active().versionId()).isEqualTo("v1");
        assertThat(response.versions()).hasSize(1);
        assertThat(response.versions().get(0).systemPrompt()).isEqualTo("Prompt 1");
    }

    @Test
    @DisplayName("createVersion: tạo phiên bản mới thành công, deactive phiên bản cũ và tính SHA-256")
    void createVersion_success() {
        AiConfigInput input = new AiConfigInput("Hệ thống prompt mới", 0.4, 2500, 0.8);
        when(aiConfigVersionRepository.save(any(AiConfigVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiConfigVersionDto result = aiConfigService.createVersion(input, adminActor, "127.0.0.1");

        assertThat(result).isNotNull();
        assertThat(result.systemPrompt()).isEqualTo("Hệ thống prompt mới");
        assertThat(result.temperature()).isEqualTo(0.4);
        assertThat(result.maxTokens()).isEqualTo(2500);
        assertThat(result.active()).isTrue();
        assertThat(result.frozen()).isFalse();
        assertThat(result.sha256()).isNotBlank();

        verify(aiConfigVersionRepository).deactivateAll();
        verify(aiConfigVersionRepository).save(any(AiConfigVersion.class));
        verify(auditLogService).logAction(eq(adminActor.teacherId()), eq("ROLE_ADMIN"), eq("127.0.0.1"), eq("CREATE_AI_CONFIG_VERSION"), any(), any(), any());
    }

    @Test
    @DisplayName("createVersion: ném lỗi khi tham số không hợp lệ")
    void createVersion_invalidParams_throwsException() {
        AiConfigInput emptyPrompt = new AiConfigInput("   ", 0.3, 2000, 0.85);
        assertThatThrownBy(() -> aiConfigService.createVersion(emptyPrompt, adminActor, "127.0.0.1"))
                .isInstanceOf(ApiException.class);

        AiConfigInput invalidTemp = new AiConfigInput("Valid prompt", 1.5, 2000, 0.85);
        assertThatThrownBy(() -> aiConfigService.createVersion(invalidTemp, adminActor, "127.0.0.1"))
                .isInstanceOf(ApiException.class);

        AiConfigInput invalidTokens = new AiConfigInput("Valid prompt", 0.5, 5000, 0.85);
        assertThatThrownBy(() -> aiConfigService.createVersion(invalidTokens, adminActor, "127.0.0.1"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    @DisplayName("freezeVersion: đánh dấu frozen=true và gán nhãn label")
    void freezeVersion_success() {
        AiConfigVersion version = AiConfigVersion.builder()
                .id("v-freeze")
                .systemPrompt("Prompt")
                .temperature(0.3)
                .maxTokens(2000)
                .moderationThreshold(0.85)
                .frozen(false)
                .active(true)
                .sha256("hash")
                .createdAt(Instant.now())
                .build();

        when(aiConfigVersionRepository.findById("v-freeze")).thenReturn(Optional.of(version));
        when(aiConfigVersionRepository.save(any(AiConfigVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiConfigVersionDto result = aiConfigService.freezeVersion("v-freeze", new FreezeAiConfigRequest("v2.0.0-gold"), adminActor, "127.0.0.1");

        assertThat(result.frozen()).isTrue();
        assertThat(result.label()).isEqualTo("v2.0.0-gold");
        verify(auditLogService).logAction(any(), any(), any(), eq("FREEZE_AI_CONFIG_VERSION"), any(), any(), any());
    }

    @Test
    @DisplayName("activateVersion: kích hoạt phiên bản và tắt các phiên bản khác")
    void activateVersion_success() {
        AiConfigVersion version = AiConfigVersion.builder()
                .id("v-activate")
                .systemPrompt("Prompt")
                .temperature(0.3)
                .maxTokens(2000)
                .moderationThreshold(0.85)
                .frozen(true)
                .active(false)
                .sha256("hash")
                .createdAt(Instant.now())
                .build();

        when(aiConfigVersionRepository.findById("v-activate")).thenReturn(Optional.of(version));
        when(aiConfigVersionRepository.save(any(AiConfigVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AiConfigVersionDto result = aiConfigService.activateVersion("v-activate", adminActor, "127.0.0.1");

        assertThat(result.active()).isTrue();
        verify(aiConfigVersionRepository).deactivateAll();
        verify(aiConfigVersionRepository).save(version);
        verify(auditLogService).logAction(any(), any(), any(), eq("ACTIVATE_AI_CONFIG_VERSION"), any(), any(), any());
    }
}
