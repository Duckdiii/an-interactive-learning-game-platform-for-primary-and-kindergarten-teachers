package com.aigameplatform.backend.service.asset.binding;

import java.util.Optional;

/**
 * Một bước trong chuỗi tìm hình cho một ô (Chain of Responsibility). Mỗi bước là một class, Spring sắp theo {@code @Order};
 * thêm bước mới (vector, hỏi Gemini) là thêm class, không sửa bước cũ.
 * <p>
 * Quy ước chung cho mọi bước: không đoán khi mơ hồ. Chữ nhắc hai khái niệm ngang nhau, hoặc chỉ khớp một nhóm không có hình,
 * thì trả rỗng để bước sau (hoặc bộ điều phối) quyết định, không chọn đại một bên.
 */
public interface AssetResolver {

    /**
     * @return quyết định nếu bước này đủ chắc (kể cả quyết định "không có hình"); rỗng để nhường bước sau
     */
    Optional<AssetDecision> resolve(CellContext cell);
}
