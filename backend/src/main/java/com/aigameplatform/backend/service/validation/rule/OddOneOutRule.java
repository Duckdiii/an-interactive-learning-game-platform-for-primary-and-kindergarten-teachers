package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OddOneOutRule extends AbstractGameRule<OddOneOutGameDsl, OddOneOutQuestionDsl> {

    private final com.aigameplatform.backend.service.media.NotoEmojiCatalog catalog =
            new com.aigameplatform.backend.service.media.NotoEmojiCatalog();

    public OddOneOutRule() {
        super(GameType.ODD_ONE_OUT, OddOneOutGameDsl.class);
    }

    @Override
    protected List<OddOneOutQuestionDsl> questionsOf(OddOneOutGameDsl game) {
        return game.questions();
    }

    @Override
    protected void checkQuestion(OddOneOutQuestionDsl question, String path, List<ValidationError> errors) {
        String itemsPath = path + ".items";
        RuleSupport.checkPositionalIds(question.items(), TextChoiceDsl::id, itemsPath, errors);
        RuleSupport.checkUnique(question.items(), i -> RuleSupport.normalize(i.text()), itemsPath, "text", errors);

        boolean oddExists = question.items().stream().anyMatch(i -> i.id().equals(question.oddOneOutId()));
        if (!oddExists) {
            errors.add(new ValidationError(path + ".oddOneOutId",
                    "oddOneOutId \"" + question.oddOneOutId() + "\" không thuộc danh sách items"));
        }
    }

    @Override
    protected void checkQuestion(OddOneOutGameDsl game, OddOneOutQuestionDsl question, String path,
            List<ValidationError> errors) {
        checkQuestion(question, path, errors);
        if (game.effectiveMode() != com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE) return;
        var used = new java.util.HashSet<String>();
        for (int i = 0; i < question.items().size(); i++) {
            var item = question.items().get(i);
            var asset = catalog.find(item.assetId());
            if (asset.isEmpty() || !asset.get().label().equals(item.text())
                    || !asset.get().imageUrl().equals(item.imageUrl()) || !used.add(item.assetId()))
                errors.add(new ValidationError(path + ".items[" + i + "]", "Hình phải thuộc catalog và không được lặp"));
        }
        var odd = question.items().stream().filter(item -> item.id().equals(question.oddOneOutId())).findFirst();
        var commonGroups = question.items().stream().filter(item -> !item.id().equals(question.oddOneOutId()))
                .map(item -> catalog.find(item.assetId()).map(a -> a.group()).orElse(""))
                .collect(java.util.stream.Collectors.toSet());
        String oddGroup = odd.flatMap(item -> catalog.find(item.assetId())).map(a -> a.group()).orElse("");
        if (oddGroup.isBlank() || commonGroups.size() != 1 || commonGroups.contains("") || commonGroups.contains(oddGroup))
            errors.add(new ValidationError(path + ".oddOneOutId", "Cần một hình khác nhóm và các hình còn lại cùng nhóm"));
    }
}
