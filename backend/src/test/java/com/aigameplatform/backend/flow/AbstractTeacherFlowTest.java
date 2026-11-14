package com.aigameplatform.backend.flow;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Các bước của luồng chính giáo viên qua HTTP thật (cổng ngẫu nhiên): register → login → understand → generate → get →
 * put → get → revise. Mỗi bước ghi request/response (đã che bí mật) vào {@code target/verify-evidence/}.
 * Lớp con chọn cổng AI: {@link TeacherFlowVerificationTest} (AI giả, chạy trên CI), {@link TeacherFlowLiveTest} (Gemini thật).
 * Bước curriculum-review tách thành test riêng đang @Disabled ở {@link TeacherFlowVerificationTest} (xem lý do ở đó).
 *
 * <p>Giới hạn: DB là H2 trong bộ nhớ, schema do Hibernate tạo từ entity (không chạy Flyway), nên KHÔNG kiểm schema
 * Supabase thật hay migration; Layer 3 chỉ dùng danh sách từ cấm (không gọi OpenAI Moderation).
 *
 * <p>Mỗi lần chỉ chạy MỘT lớp con: {@code cleanEvidence} xoá thư mục bằng chứng ở đầu mỗi lớp, và hai lớp dùng chung
 * H2 {@code aigame_context_test} với {@code create-drop}. Hiện an toàn vì bản live bị gate bằng RUN_LIVE_TEACHER_FLOW.
 */
abstract class AbstractTeacherFlowTest {

    static final Path EVIDENCE = Path.of("target", "verify-evidence");
    private static final Pattern SECRET_NAME = Pattern.compile("password|token|secret|cookie", Pattern.CASE_INSENSITIVE);
    private static final Pattern JWT = Pattern.compile("eyJ[\\w-]+\\.[\\w-]+\\.[\\w-]+");
    // Đánh số chung cho cả lớp: JUnit tạo instance mới cho mỗi test, đếm theo instance sẽ ghi đè file của test khác.
    private static final AtomicInteger STEP = new AtomicInteger();

    private final JsonMapper json = JsonMapper.builder().build();
    private final HttpClient http = HttpClient.newHttpClient();

    @LocalServerPort
    private int port;

    /** Kiểm thêm kết quả bước revise; AI giả kiểm được nội dung, AI thật thì không đoán trước được. */
    abstract void assertRevised(JsonNode revisedGame);

    @BeforeAll
    static void cleanEvidence() throws IOException {
        if (Files.exists(EVIDENCE)) {
            try (var files = Files.list(EVIDENCE)) {
                for (Path f : files.toList()) Files.delete(f);
            }
        }
        Files.createDirectories(EVIDENCE);
        STEP.set(0);
    }

    @Test
    void teacherCanGoFromLoginToRevisedGame() throws Exception {
        String token = registerAndLogin();

        Call understand = call("understand", "POST", "/api/games/understand", token,
                """
                {"subject": "MATH", "gradeLevel": "GRADE_1",
                 "messages": [{"role": "TEACHER", "text": "Trò chơi đếm con vật từ 1 đến 5"}]}""");
        assertThat(understand.status).isEqualTo(200);
        assertThat(understand.body.path("data").path("understanding").path("gameType").isString()).isTrue();

        String gameId = generateQuiz(token);

        Call get = call("get", "GET", "/api/games/" + gameId, token, null);
        assertThat(get.status).isEqualTo(200);
        assertThat(get.body.path("data").path("gameId").asString()).isEqualTo(gameId);

        ObjectNode edited = (ObjectNode) get.body.path("data").deepCopy();
        edited.remove(List.of("gameId", "status", "updatedAt"));
        ((ObjectNode) edited.get("metadata")).put("title", "Đếm con vật (đã sửa)");
        Call put = call("put", "PUT", "/api/games/" + gameId, token, json.writeValueAsString(edited));
        assertThat(put.status).isEqualTo(200);
        Call reread = call("get-after-put", "GET", "/api/games/" + gameId, token, null);
        assertThat(reread.body.path("data").path("metadata").path("title").asString())
                .as("PUT đã lưu thật, không chỉ trả lại body").isEqualTo("Đếm con vật (đã sửa)");

        Call revise = call("revise", "POST", "/api/games/" + gameId + "/revise", token,
                """
                {"instruction": "Đổi câu hỏi thứ hai sang đếm con gà"}""");
        assertThat(revise.status).isEqualTo(200);
        assertThat(revise.body.path("data").path("gameId").asString()).isEqualTo(gameId);
        assertRevised(revise.body.path("data"));
    }

    /** Đăng ký giáo viên mới rồi đăng nhập; trả access token. */
    String registerAndLogin() throws Exception {
        String email = "flow-" + UUID.randomUUID() + "@example.test";
        String password = "Flow-test-1";
        Call register = call("register", "POST", "/api/auth/register", null,
                """
                {"fullName": "Giáo viên thử luồng", "email": "%s", "password": "%s", "acceptedPolicy": true}"""
                        .formatted(email, password));
        assertThat(register.status).isEqualTo(201);

        Call login = call("login", "POST", "/api/auth/login", null,
                """
                {"email": "%s", "password": "%s"}""".formatted(email, password));
        assertThat(login.status).isEqualTo(200);
        String token = login.body.path("data").path("accessToken").asString();
        assertThat(token).isNotBlank();
        // So boolean để khi fail AssertJ không in nguyên Set-Cookie (chứa refresh token) ra log CI.
        assertThat(login.setCookie.contains("HttpOnly")).as("refresh token đi bằng cookie HttpOnly").isTrue();
        assertThat(login.body.path("data").has("refreshToken")).as("refresh token không nằm trong body").isFalse();
        return token;
    }

    /** Sinh game QUIZ; trả gameId. */
    String generateQuiz(String token) throws Exception {
        Call generate = call("generate", "POST", "/api/games/generate", token,
                """
                {"subject": "MATH", "gradeLevel": "GRADE_1", "gameType": "QUIZ",
                 "idea": "Trò chơi đếm con vật từ 1 đến 5"}""");
        assertThat(generate.status).isEqualTo(200);
        JsonNode generated = generate.body.path("data");
        String gameId = generated.path("gameId").asString();
        assertThat(gameId).isNotBlank();
        assertThat(generated.path("status").asString()).isEqualTo("DRAFT");
        assertThat(generated.path("gameType").asString()).isEqualTo("QUIZ");
        assertThat(generated.path("questions").size()).isPositive();
        return gameId;
    }

    record Call(int status, JsonNode body, String setCookie) {
    }

    Call call(String name, String method, String path, String token, String body) throws Exception {
        HttpRequest.Builder req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        if (token != null) req.header("Authorization", "Bearer " + token);
        HttpResponse<String> res = http.send(req.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        JsonNode parsed = res.body().isBlank() ? json.createObjectNode() : json.readTree(res.body());
        writeEvidence(name, method, path, body, res.statusCode(), parsed);
        return new Call(res.statusCode(), parsed, res.headers().firstValue("Set-Cookie").orElse(""));
    }

    // Header (Authorization, Set-Cookie) không bao giờ được ghi; chỉ ghi method, path, body đã che và status.
    private void writeEvidence(String name, String method, String path, String body, int status, JsonNode response)
            throws IOException {
        ObjectNode record = json.createObjectNode();
        record.put("step", name);
        ObjectNode request = record.putObject("request");
        request.put("method", method);
        request.put("path", path);
        if (body != null) request.set("body", redact(json.readTree(body)));
        record.put("status", status);
        record.set("response", redact(response));
        String file = "%02d-%s.json".formatted(STEP.incrementAndGet(), name);
        Files.writeString(EVIDENCE.resolve(file), json.writerWithDefaultPrettyPrinter().writeValueAsString(record));
    }

    private JsonNode redact(JsonNode node) {
        JsonNode copy = node.deepCopy();
        redactInPlace(copy);
        return copy;
    }

    // Che theo tên trường và theo chuỗi có chứa JWT (kể cả phần tử mảng, kể cả "Bearer eyJ..."). shortcut: token mờ
    // (không phải JWT) nằm ở trường có tên không gợi ý bí mật thì không che được; chỉ dữ liệu giả đi qua đây.
    private void redactInPlace(JsonNode node) {
        if (node instanceof ObjectNode obj) {
            for (String field : List.copyOf(obj.propertyNames())) {
                JsonNode value = obj.get(field);
                if (SECRET_NAME.matcher(field).find() || isJwtText(value)) obj.put(field, "***");
                else redactInPlace(value);
            }
        } else if (node instanceof ArrayNode array) {
            for (int i = 0; i < array.size(); i++) {
                if (isJwtText(array.get(i))) array.set(i, json.getNodeFactory().stringNode("***"));
                else redactInPlace(array.get(i));
            }
        }
    }

    private static boolean isJwtText(JsonNode value) {
        return value.isString() && JWT.matcher(value.asString()).find();
    }
}
