package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.GamePresentation;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.request.RegenerateGameRequest;
import com.aigameplatform.backend.dto.media.SpeechVoice;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.dto.understanding.ChatTurn;
import com.aigameplatform.backend.service.generation.GenerationResult;
import java.util.List;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Phần riêng theo dạng nội dung của game: 10 loại Game JSON DSL v1.0.0 hay game ngoài danh mục CPF v2.0.0. {@code GameService}
 * chọn handler theo {@code gameType} (đa hình, không rẽ nhánh) rồi lo phần chung: chủ sở hữu, trạng thái, lưu.
 */
public interface GameContentHandler {

    /** Handler này lo được loại game nào. */
    boolean handles(GameType type);

    /**
     * Sinh nội dung bằng AI và qua đủ 3 lớp kiểm duyệt; chưa lưu. {@code request} cho môn, lớp và chế độ hình ảnh
     * (handler không hỗ trợ chế độ nào thì bỏ qua hoặc báo lỗi 400).
     */
    GeneratedContent generate(GameType type, String idea, GenerateGameRequest request);

    /** Kiểm duyệt lại đủ 3 lớp nội dung giáo viên sửa rồi áp vào game (chưa lưu). Sai thì ném lỗi 400/422. */
    void replaceContent(Game game, JsonNode body);

    /**
     * Sửa game theo yêu cầu chat bằng AI (POST /games/{gameId}/revise): nhận {@code GameResponse} hiện tại, trả nội dung đã
     * sửa cùng dạng (chưa có ba trường quản lý), đã qua đủ 3 lớp kiểm duyệt. Không đổi loại game, không lưu.
     */
    ObjectNode revise(ObjectNode current, String instruction, List<ChatTurn> history);

    ObjectNode regenerate(ObjectNode current, RegenerateGameRequest request);

    default com.aigameplatform.backend.dto.response.RegeneratedQuestionDto regenerateQuestion(ObjectNode current,
            String questionId, String feedback, SpeechVoice voice) {
        return regenerateQuestion(current, questionId, feedback);
    }

    /**
     * Làm lại đúng một câu hỏi bằng AI (POST /games/{gameId}/questions/{questionId}/regenerate): nhận {@code GameResponse}
     * hiện tại, trả câu mới cùng {@code questionId}, đã qua đủ 3 lớp kiểm duyệt. Không lưu. Mặc định báo 400: chỉ game DSL
     * có thẻ câu hỏi riêng.
     */
    default com.aigameplatform.backend.dto.response.RegeneratedQuestionDto regenerateQuestion(ObjectNode current,
            String questionId, String feedback) {
        throw new com.aigameplatform.backend.exception.ApiException(
                com.aigameplatform.backend.exception.ErrorCode.VALIDATION_ERROR,
                "Trò chơi này không có thẻ câu hỏi riêng; hãy dùng chức năng làm lại cả game");
    }

    /** Dựng {@code GameResponse} theo openapi.yaml từ game đã lưu và ba trường quản lý (gameId, status, updatedAt). */
    ObjectNode toResponse(Game game, ObjectNode management);

    /**
     * Nội dung đã sinh: tên game, phiên bản định dạng, các câu hỏi để lưu, cách trình bày (null nếu không có) và kết quả
     * đối chiếu chương trình để lưu cùng game ({@code null} với loại game không qua đối chiếu, như CPF). {@code topic} và hai
     * chế độ hình ảnh để null khi không có (game CPF, hoặc game DSL ở chế độ chữ).
     */
    record GeneratedContent(String title, String schemaVersion, List<QuestionGame> questions,
            GamePresentation presentation, GenerationResult curriculum, String topic,
            VisualClozeMode visualClozeMode, OddOneOutMode oddOneOutMode) {

        public GeneratedContent(String title, String schemaVersion, List<QuestionGame> questions, GamePresentation presentation) {
            this(title, schemaVersion, questions, presentation, null);
        }

        public GeneratedContent(String title, String schemaVersion, List<QuestionGame> questions,
                GamePresentation presentation, GenerationResult curriculum) {
            this(title, schemaVersion, questions, presentation, curriculum, null, null, null);
        }
    }
}
