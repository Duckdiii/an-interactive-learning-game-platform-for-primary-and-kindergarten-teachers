package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.QuestionGame;
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

    /** Sinh nội dung bằng AI và qua đủ 3 lớp kiểm duyệt; chưa lưu. */
    GeneratedContent generate(GameType type, String idea, Subject subject, GradeLevel gradeLevel);

    /** Kiểm duyệt lại đủ 3 lớp nội dung giáo viên sửa rồi áp vào game (chưa lưu). Sai thì ném lỗi 400/422. */
    void replaceContent(Game game, JsonNode body);

    /** Dựng {@code GameResponse} theo openapi.yaml từ game đã lưu và ba trường quản lý (gameId, status, updatedAt). */
    ObjectNode toResponse(Game game, ObjectNode management);

    /** Nội dung đã sinh: tên game, phiên bản định dạng và các câu hỏi để lưu. */
    record GeneratedContent(String title, String schemaVersion, List<QuestionGame> questions) {
    }
}
