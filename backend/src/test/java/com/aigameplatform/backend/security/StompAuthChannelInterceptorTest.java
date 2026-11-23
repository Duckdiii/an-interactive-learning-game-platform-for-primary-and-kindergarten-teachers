package com.aigameplatform.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import com.aigameplatform.backend.service.play.SessionParticipantRegistry;
import java.time.Clock;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;

class StompAuthChannelInterceptorTest {

    private static final String SECRET = "k".repeat(48);

    private final JwtService jwt = new JwtService(SECRET, 15, Clock.systemUTC());
    private SessionParticipantRegistry registry;
    private StompAuthChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        registry = new SessionParticipantRegistry();
        interceptor = new StompAuthChannelInterceptor(jwt, registry);
    }

    private Message<?> connect(String header, String value, String... more) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (header != null) accessor.addNativeHeader(header, value);
        for (int i = 0; i + 1 < more.length; i += 2) accessor.addNativeHeader(more[i], more[i + 1]);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static String user(Message<?> m) {
        return StompHeaderAccessor.wrap(m).getUser().getName();
    }

    @Test
    void teacherJwtBecomesPrincipalWithTeacherId() {
        String token = jwt.generateAccessToken("teacher-1", "a@x.vn", "s");
        Message<?> out = interceptor.preSend(connect("Authorization", "Bearer " + token), null);
        assertThat(user(out)).isEqualTo("teacher-1");
    }

    @Test
    void issuedParticipantBecomesPrincipal() {
        registry.addOrUpdate("sess", new ParticipantDto("p-1", "Bé An", true));
        Message<?> out = interceptor.preSend(connect("X-Participant-Id", "p-1", "X-Session-Id", "sess"), null);
        assertThat(user(out)).isEqualTo("p-1");
    }

    private Message<?> subscribe(String destination, String userName) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (userName != null) accessor.setUser(() -> userName);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void channelsCarryingParticipantIdsAreHostOnly() {
        registry.registerHost("sess", "teacher-1");
        registry.addOrUpdate("sess", new ParticipantDto("p-1", "Bé An", true));
        for (String topic : new String[] {"participants", "answer-status"}) {
            String destination = "/topic/session/sess/" + topic;
            assertThat(interceptor.preSend(subscribe(destination, "teacher-1"), null)).isNotNull();
            assertThatThrownBy(() -> interceptor.preSend(subscribe(destination, "p-1"), null))
                    .isInstanceOf(AccessDeniedException.class);
            assertThatThrownBy(() -> interceptor.preSend(subscribe(destination, null), null))
                    .isInstanceOf(AccessDeniedException.class);
        }
        // Mẫu đăng ký rộng và đích lạ đều bị từ chối, kể cả với giáo viên chủ phòng.
        for (String destination : new String[] {"/topic/**", "/topic/session/*/*", "/topic/session/sess/*",
                "/topic/session/sess/participants/", "/topic/session/sess/other", "/queue/anything"}) {
            assertThatThrownBy(() -> interceptor.preSend(subscribe(destination, "p-1"), null))
                    .as(destination).isInstanceOf(AccessDeniedException.class);
            assertThatThrownBy(() -> interceptor.preSend(subscribe(destination, "teacher-1"), null))
                    .as(destination).isInstanceOf(AccessDeniedException.class);
        }
        assertThat(interceptor.preSend(subscribe("/user/queue/kicked", "p-1"), null)).isNotNull();
        // Kênh không chứa id (bảng xếp hạng, câu hỏi, trạng thái) học sinh vẫn nghe được.
        assertThat(interceptor.preSend(subscribe("/topic/session/sess/leaderboard", "p-1"), null)).isNotNull();
    }

    @Test
    void rejectsBadTokenUnknownParticipantAndNoCredentials() {
        assertThatThrownBy(() -> interceptor.preSend(connect("Authorization", "Bearer rac"), null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> interceptor.preSend(connect("X-Participant-Id", "la"), null))
                .isInstanceOf(AccessDeniedException.class);
        // Có participantId nhưng thiếu hoặc sai phiên thì từ chối
        registry.addOrUpdate("sess", new ParticipantDto("p-1", "Bé An", true));
        assertThatThrownBy(() -> interceptor.preSend(connect("X-Participant-Id", "p-1"), null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> interceptor.preSend(connect("X-Participant-Id", "p-1", "X-Session-Id", "other"), null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> interceptor.preSend(connect(null, null), null))
                .isInstanceOf(AccessDeniedException.class);
    }
}
