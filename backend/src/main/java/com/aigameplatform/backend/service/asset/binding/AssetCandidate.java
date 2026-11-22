package com.aigameplatform.backend.service.asset.binding;

import java.util.Objects;

/**
 * Một hình ứng viên cho một ô. Resolver điền sẵn nhãn và họ từ danh mục, để các bước sau (khóa họ, bộ điều phối) không phải
 * tra lại danh mục.
 *
 * @param assetId id hình trong danh mục
 * @param label nhãn của hình trong danh mục; hai hình cùng nhãn là hai biến thể phong cách của cùng một khái niệm
 * @param family họ phong cách của hình (openmoji, fluent, kenney, custom), để khóa họ chọn biến thể
 * @param score điểm khớp, càng cao càng chắc (bước tra nhãn: độ dài từ khóa khớp)
 * @param keyword từ khóa hoặc khái niệm đã khớp, để ghi lý do
 */
public record AssetCandidate(String assetId, String label, String family, int score, String keyword) {

    public AssetCandidate {
        Objects.requireNonNull(assetId, "assetId");
        Objects.requireNonNull(label, "label");
        Objects.requireNonNull(family, "family");
        if (assetId.isBlank()) throw new IllegalArgumentException("assetId rỗng");
        if (score < 0) throw new IllegalArgumentException("Điểm không được âm");
    }
}
