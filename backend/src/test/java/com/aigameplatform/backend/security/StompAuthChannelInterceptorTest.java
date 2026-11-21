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

    private Message<?> connect(String header, String value) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (header != null) accessor.addNativeHeader(header, value);
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
        Message<?> out = interceptor.preSend(connect("X-Participant-Id", "p-1"), null);
        assertThat(user(out)).isEqualTo("p-1");
    }

    @Test
    void rejectsBadTokenUnknownParticipantAndNoCredentials() {
        assertThatThrownBy(() -> interceptor.preSend(connect("Authorization", "Bearer rac"), null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> interceptor.preSend(connect("X-Participant-Id", "la"), null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> interceptor.preSend(connect(null, null), null))
                .isInstanceOf(AccessDeniedException.class);
    }
}
