package com.aigameplatform.backend.security;

import com.aigameplatform.backend.service.play.SessionParticipantRegistry;
import io.jsonwebtoken.JwtException;
import java.security.Principal;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.context.event.EventListener;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * Gán Principal thật cho phiên STOMP ở khung CONNECT: giáo viên bằng JWT (name = teacherId),
 * học sinh bằng participantId đã cấp lúc join kèm sessionId của phiên đó (name = participantId). Không hợp lệ thì từ chối.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    static final String AUTHORIZATION = "Authorization";
    static final String PARTICIPANT_ID = "X-Participant-Id";
    static final String SESSION_ID = "X-Session-Id";
    private static final String BEARER_PREFIX = "Bearer ";

    private final TeacherAccessAuthenticator authenticator;
    private final SessionParticipantRegistry participants;
    private final Map<String, AuthenticatedTeacher> teacherConnections = new ConcurrentHashMap<>();

    public StompAuthChannelInterceptor(TeacherAccessAuthenticator authenticator, SessionParticipantRegistry participants) {
        this.authenticator = authenticator;
        this.participants = participants;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            Principal user = authenticate(accessor);
            accessor.setUser(user);
            if (user instanceof AuthenticatedTeacher teacher && accessor.getSessionId() != null) {
                teacherConnections.put(accessor.getSessionId(), teacher);
            }
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) || StompCommand.SEND.equals(accessor.getCommand())) {
            if (accessor.getUser() instanceof AuthenticatedTeacher teacher) {
                try {
                    authenticator.requireActive(teacher);
                } catch (JwtException e) {
                    throw new AccessDeniedException("Phiên đăng nhập không còn hiệu lực");
                }
            }
            if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) authorizeSubscribe(accessor);
        }
        return message;
    }

    public boolean canDeliver(Message<?> message) {
        if (SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) != SimpMessageType.MESSAGE) return true;
        String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
        if (sessionId == null) return true;
        AuthenticatedTeacher teacher = teacherConnections.get(sessionId);
        if (teacher == null) return true;
        try {
            authenticator.requireActive(teacher);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        teacherConnections.remove(event.getSessionId());
    }

    // Danh sách cho phép (không phải danh sách chặn): broker cho đăng ký theo mẫu Ant (/topic/**, /topic/session/*/*), nên
    // mọi đích không nằm trong danh sách đều bị từ chối. Hai kênh có participantId (đủ để nộp bài thay bạn qua REST) chỉ
    // dành cho giáo viên chủ phòng.
    private static final Pattern SESSION_TOPIC =
            Pattern.compile("^/topic/session/([^/*?{}]+)/(state|question|leaderboard|participants|answer-status)$");
    private static final Set<String> HOST_ONLY_CHANNELS = Set.of("participants", "answer-status");

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        Principal user = accessor.getUser();
        if (destination == null || user == null) throw new AccessDeniedException("Không được đăng ký kênh này");
        if (destination.equals("/user/queue/kicked")) return;
        Matcher topic = SESSION_TOPIC.matcher(destination);
        if (!topic.matches()) throw new AccessDeniedException("Không được đăng ký kênh này");
        if (HOST_ONLY_CHANNELS.contains(topic.group(2)) && !participants.isHost(topic.group(1), user.getName())) {
            throw new AccessDeniedException("Chỉ giáo viên chủ phòng được theo dõi kênh này");
        }
    }

    private Principal authenticate(StompHeaderAccessor accessor) {
        String auth = accessor.getFirstNativeHeader(AUTHORIZATION);
        if (auth != null && auth.startsWith(BEARER_PREFIX)) {
            try {
                return authenticator.authenticate(auth.substring(BEARER_PREFIX.length()));
            } catch (JwtException | IllegalArgumentException e) {
                throw new AccessDeniedException("Token không hợp lệ");
            }
        }
        String participantId = accessor.getFirstNativeHeader(PARTICIPANT_ID);
        String sessionId = accessor.getFirstNativeHeader(SESSION_ID);
        if (participants.hasParticipant(sessionId, participantId)) {
            return () -> participantId;
        }
        throw new AccessDeniedException("Thiếu thông tin xác thực WebSocket");
    }
}
