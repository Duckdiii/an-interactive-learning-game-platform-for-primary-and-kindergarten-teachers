package com.aigameplatform.backend.service.testsupport;

import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import tools.jackson.databind.json.JsonMapper;

/** Danh mục hình thật (đọc từ resources) dùng chung cho test dựng factory/generator. */
public final class GameAssetCatalogFixture {

    public static final GameAssetCatalog ASSETS = new GameAssetCatalog(JsonMapper.builder().build());

    private GameAssetCatalogFixture() {
    }
}
