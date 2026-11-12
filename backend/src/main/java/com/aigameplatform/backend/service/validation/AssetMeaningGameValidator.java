package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.service.asset.AssetMatch;
import com.aigameplatform.backend.service.asset.AssetRetriever;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Layer 2 (nghĩa của hình): hình gắn vào một phần tử phải khớp với chữ mô tả chính phần tử đó. Chỉ bắt ca chắc chắn sai: chữ
 * nhắc rõ một hình khác trong danh mục mà không nhắc hình đang gắn ("Con voi" nhưng gắn hình con vịt). Chữ không nhắc hình nào
 * thì cho qua. Bật bằng {@code app.assets.meaning-check.enabled=true}, mặc định tắt vì còn thử nghiệm. Lưu ý: nằm trong chuỗi
 * chung nên cũng chạy khi giáo viên tự sửa và lưu game, không chỉ khi AI sinh.
 */
@Component
@Order(3) // sau luật nghiệp vụ (2) để lỗi cứng báo trước, trước Layer 3 an toàn (4)
@ConditionalOnProperty(name = "app.assets.meaning-check.enabled", havingValue = "true")
public class AssetMeaningGameValidator extends AbstractGameValidator {

    /** Các trường chữ mô tả một phần tử có hình. */
    private static final List<String> DESCRIBING_FIELDS = List.of("visualPrompt", "text", "label");

    private final GameAssetCatalog catalog;
    private final AssetRetriever retriever;

    public AssetMeaningGameValidator(GameAssetCatalog catalog, AssetRetriever retriever) {
        this.catalog = catalog;
        this.retriever = retriever;
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        List<ValidationError> errors = new ArrayList<>();
        walk(context.getJson(), "$", errors);
        return errors;
    }

    private void walk(JsonNode node, String path, List<ValidationError> errors) {
        if (node.isObject()) {
            checkElement(node, path, errors);
            node.properties().forEach(entry -> walk(entry.getValue(), path + "." + entry.getKey(), errors));
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) walk(node.get(i), path + "[" + i + "]", errors);
        }
    }

    private void checkElement(JsonNode element, String path, List<ValidationError> errors) {
        GameAssetCatalog.Entry asset = catalog.findByUrl(element.path("imageUrl").asString(null));
        if (asset == null) return; // không có hình, hoặc hình giáo viên tự tải lên
        StringBuilder text = new StringBuilder();
        for (String field : DESCRIBING_FIELDS) {
            if (element.path(field).isString()) text.append(element.path(field).asString()).append(" . ");
        }
        List<AssetMatch> matches = retriever.match(text.toString());
        if (matches.isEmpty() || retriever.mentions(text.toString(), asset.id())) return;
        errors.add(new ValidationError(path + ".imageUrl", "Hình \"" + asset.label() + "\" không khớp với chữ \"" + text.toString().strip()
                + "\", chữ này nói tới hình \"" + catalog.find(matches.getFirst().assetId()).label()
                + "\"; chọn đúng hình hoặc bỏ hình"));
    }
}
