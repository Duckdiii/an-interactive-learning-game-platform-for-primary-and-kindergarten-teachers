package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.asset.KeywordAssetRetriever;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AssetMeaningGameValidatorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final String DUCK = "/assets/animals/duck.svg";

    private final AssetMeaningGameValidator validator = new AssetMeaningGameValidator(GameAssetCatalogFixture.ASSETS,
            new KeywordAssetRetriever(GameAssetCatalogFixture.ASSETS));

    private List<ValidationError> check(String json) {
        return validator.check(new GameValidationContext(MAPPER.readTree(json)));
    }

    @Test
    void passesWhenTheTextNamesThePictureThatIsAttached() {
        assertThat(check("{\"questions\":[{\"visualPrompt\":\"Ba con vịt\",\"imageUrl\":\"" + DUCK + "\"}]}")).isEmpty();
    }

    @Test
    void failsWhenTheTextNamesADifferentPicture() {
        List<ValidationError> errors = check("{\"questions\":[{\"visualPrompt\":\"Con voi\",\"imageUrl\":\"" + DUCK + "\"}]}");
        assertThat(errors).hasSize(1);
        assertThat(errors.getFirst().path()).isEqualTo("$.questions[0].imageUrl");
        assertThat(errors.getFirst().message()).contains("Con vịt").contains("Con voi");
    }

    @Test
    void passesWhenTheTextNamesNoKnownPictureOrThePictureIsNotFromTheCatalog() {
        assertThat(check("{\"items\":[{\"text\":\"Một vật rất lạ\",\"imageUrl\":\"" + DUCK + "\"}]}")).isEmpty();
        assertThat(check("{\"items\":[{\"text\":\"Con voi\",\"imageUrl\":\"/uploads/teacher-photo.png\"}]}")).isEmpty();
        assertThat(check("{\"items\":[{\"text\":\"Con voi\"}]}")).isEmpty();
    }

    @Test
    void aLongTextThatMentionsTheAttachedPictureAlongsideAnotherOneStillPasses() {
        // Chữ dài: từ khóa ngắn "vit" vẫn phải được tính là đã nhắc hình vịt dù câu có cả con voi.
        assertThat(check("{\"questions\":[{\"visualPrompt\":\"Một con voi đứng cạnh vịt vàng ở bờ sông lớn\",\"imageUrl\":\""
                + DUCK + "\"}]}")).isEmpty();
    }

    @Test
    void runsAfterTheBusinessRulesAndBeforeTheSafetyLayer() {
        int business = BusinessRuleGameValidator.class.getAnnotation(org.springframework.core.annotation.Order.class).value();
        int meaning = AssetMeaningGameValidator.class.getAnnotation(org.springframework.core.annotation.Order.class).value();
        int safety = SafetyGameValidator.class.getAnnotation(org.springframework.core.annotation.Order.class).value();
        assertThat(business).isLessThan(meaning);
        assertThat(meaning).isLessThan(safety);
    }

    @Test
    void readsPairSidesAndNestedChoices() {
        assertThat(check("{\"pairs\":[{\"left\":{\"text\":\"Con voi\",\"imageUrl\":\"" + DUCK + "\"}}]}")).hasSize(1);
    }
}
