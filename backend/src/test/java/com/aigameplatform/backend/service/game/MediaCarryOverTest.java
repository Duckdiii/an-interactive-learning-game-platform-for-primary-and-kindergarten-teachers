package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class MediaCarryOverTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static ObjectNode json(String text) {
        return (ObjectNode) MAPPER.readTree(text);
    }

    @Test
    void unchangedItemsGetTheirImageAndSoundBack() {
        ObjectNode revised = json("{\"questions\":[{\"visualPrompt\":\"con mèo\",\"audioText\":\"Đây là gì?\"}]}");

        MediaCarryOver.restore(json("{\"questions\":[{\"visualPrompt\":\"con mèo\",\"imageUrl\":\"/a.png\",\"audioText\":\"Đây là gì?\",\"audioUrl\":\"/a.wav\"}]}"), revised);

        assertThat(revised.path("questions").get(0).path("imageUrl").asString()).isEqualTo("/a.png");
        assertThat(revised.path("questions").get(0).path("audioUrl").asString()).isEqualTo("/a.wav");
    }

    @Test
    void aNewImageIsKeptAndAChangedDescriptionDoesNotGetTheOldImage() {
        ObjectNode revised = json("{\"items\":[{\"visualPrompt\":\"con mèo\",\"imageUrl\":\"/new.png\"},{\"visualPrompt\":\"con chó\"}]}");

        MediaCarryOver.restore(json("{\"items\":[{\"visualPrompt\":\"con mèo\",\"imageUrl\":\"/old.png\"},{\"visualPrompt\":\"con gà\",\"imageUrl\":\"/ga.png\"}]}"), revised);

        assertThat(revised.path("items").get(0).path("imageUrl").asString()).isEqualTo("/new.png");
        assertThat(revised.path("items").get(1).has("imageUrl")).isFalse();
    }
}
