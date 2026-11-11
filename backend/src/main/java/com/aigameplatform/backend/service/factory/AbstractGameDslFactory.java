package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.PresentationDsl;
import com.aigameplatform.backend.dto.dsl.QuestionDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.dto.dsl.ai.AiPresentation;
import com.aigameplatform.backend.dto.dsl.ai.AiQuestion;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;

/**
 * Factory Method: biến kết quả AI (đơn giản, chọn đáp án bằng chỉ số) thành Game DSL hoàn chỉnh. Phần chung
 * (vỏ, id câu hỏi, điểm, thời gian, hitboxScale) làm ở đây; phần riêng từng loại (id đáp án, xáo trộn, đổi chỉ số
 * thành id) do lớp con làm.
 *
 * @param <O> kết quả AI của loại game này
 * @param <A> một màn chơi do AI sinh
 * @param <Q> một màn chơi của DSL hoàn chỉnh
 * @param <G> game DSL hoàn chỉnh
 */
public abstract class AbstractGameDslFactory<O extends AiGameOutput, A extends AiQuestion, Q extends QuestionDsl, G extends GameDsl> {

    private static final int MAX_TITLE_LENGTH = 100;
    private static final int MAX_TOPIC_LENGTH = 200;

    private final GameType supportedType;
    private final Class<O> outputClass;
    protected final RandomGenerator random;
    private final GameAssetCatalog assets;

    protected AbstractGameDslFactory(GameType supportedType, Class<O> outputClass, RandomGenerator random, GameAssetCatalog assets) {
        this.supportedType = supportedType;
        this.outputClass = outputClass;
        this.random = random;
        this.assets = assets;
    }

    /** Cách trình bày AI đề xuất, chỉ giữ giá trị hợp lệ; không có gì thì null (frontend tự chọn). */
    static PresentationDsl presentationOf(AiPresentation ai) {
        return ai == null ? null : PresentationDsl.normalize(ai.world(), ai.carrier(), ai.layout());
    }

    /** Hình AI chọn từ danh mục ({@code asset}) thành {@code imageUrl}; id lạ hoặc trống thì không gán hình. */
    protected final String imageOf(String asset) {
        return assets.urlOf(asset);
    }

    public GameType supportedType() {
        return supportedType;
    }

    public final G create(AiGameOutput output, GameDslRequest request) {
        if (!outputClass.isInstance(output)) {
            throw new IllegalArgumentException("Loại game " + supportedType + " cần kết quả AI kiểu "
                    + outputClass.getSimpleName() + ", nhưng nhận được "
                    + (output == null ? "null" : output.getClass().getSimpleName()));
        }
        List<A> aiQuestions = aiQuestionsOf(outputClass.cast(output));
        int timeLimit = GameDefaults.timeLimitSeconds(supportedType, request.gradeLevel());
        int points = GameDefaults.points(supportedType);

        List<Q> questions = new ArrayList<>();
        for (int i = 0; i < aiQuestions.size(); i++) {
            questions.add(createQuestion(aiQuestions.get(i), new QuestionBase(Ids.numbered("q", i), timeLimit, points)));
        }
        GameMetadata metadata = new GameMetadata(
                titleOf(output.title(), request.topic()), request.subject(), request.gradeLevel(),
                truncate(request.topic().strip(), MAX_TOPIC_LENGTH), presentationOf(output.presentation()));
        return assemble(metadata, new GameplaySettings(GameDefaults.hitboxScale(request.gradeLevel())), questions);
    }

    protected abstract List<A> aiQuestionsOf(O output);

    protected abstract Q createQuestion(A aiQuestion, QuestionBase base);

    protected abstract G assemble(GameMetadata metadata, GameplaySettings settings, List<Q> questions);

    protected final String schemaVersion() {
        return GameDslSchemaRegistry.SUPPORTED_VERSION;
    }

    /** Tên AI đặt nếu có; không có thì lấy chủ đề, cắt ở ranh giới từ (không cắt giữa chữ) và thêm "…". */
    static String titleOf(String aiTitle, String topic) {
        if (aiTitle != null && !aiTitle.isBlank()) return truncate(nfc(aiTitle), MAX_TITLE_LENGTH);
        String text = nfc(topic);
        if (text.codePointCount(0, text.length()) <= MAX_TITLE_LENGTH) return text;
        String cut = text.substring(0, text.offsetByCodePoints(0, MAX_TITLE_LENGTH - 1));
        // Chỉ bỏ từ cuối khi bị cắt giữa chữ; bỏ dấu câu thừa trước "…".
        if (!Character.isWhitespace(text.codePointAt(cut.length())) && cut.lastIndexOf(' ') > 0) {
            cut = cut.substring(0, cut.lastIndexOf(' '));
        }
        return cut.replaceAll("[\\p{Punct}\\s]+$", "") + "…";
    }

    private static String nfc(String text) {
        return java.text.Normalizer.normalize(text.strip(), java.text.Normalizer.Form.NFC);
    }

    /** Cắt theo ký tự Unicode để không làm hỏng chữ có dấu. */
    private static String truncate(String text, int maxLength) {
        if (text.codePointCount(0, text.length()) <= maxLength) {
            return text;
        }
        return text.substring(0, text.offsetByCodePoints(0, maxLength)).strip();
    }
}
