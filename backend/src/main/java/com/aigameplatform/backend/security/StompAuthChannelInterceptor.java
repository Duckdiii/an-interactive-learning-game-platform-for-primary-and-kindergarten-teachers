package com.aigameplatform.backend.security;

import com.aigameplatform.backend.service.play.SessionParticipantRegistry;
import io.jsonwebtoken.JwtException;
import java.security.Principal;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Gán Principal thật cho phiên STOMP ở khung CONNECT: giáo viên bằng JWT (name = teacherId),
 * học sinh bằng participantId đã cấp lúc join (name = participantId). Không hợp lệ thì từ chối.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    static final String AUTHORIZATION = "Authorization";
    static final String PARTICIPANT_ID = "X-Participant-Id";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final SessionParticipantRegistry participants;

    public StompAuthChannelInterceptor(JwtService jwtService, SessionParticipantRegistry participants) {
        this.jwtService = jwtService;
        this.participants = participants;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            accessor.setUser(authenticate(accessor));
        }
        return message;
    }

    private Principal authenticate(StompHeaderAccessor accessor) {
        String auth = accessor.getFirstNativeHeader(AUTHORIZATION);
        if (auth != null && auth.startsWith(BEARER_PREFIX)) {
            try {
                String teacherId = jwtService.parseAccessToken(auth.substring(BEARER_PREFIX.length())).teacherId();
                return () -> teacherId;
            } catch (JwtException | IllegalArgumentException e) {
                throw new AccessDeniedException("Token không hợp lệ");
            }
        }
        String participantId = accessor.getFirstNativeHeader(PARTICIPANT_ID);
        if (participantId != null && participants.hasParticipant(participantId)) {
            return () -> participantId;
        }
        throw new AccessDeniedException("Thiếu thông tin xác thực WebSocket");
    }
}
