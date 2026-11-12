package com.aigameplatform.backend.service.asset;

/**
 * Một hình có từ khóa xuất hiện trong chữ đang xét.
 *
 * @param assetId id hình trong danh mục
 * @param keyword từ khóa (đã chuẩn hóa) dài nhất của hình này xuất hiện trong chữ
 * @param score độ khớp: số ký tự của từ khóa đó; từ khóa dài và cụ thể thắng từ khóa ngắn
 */
public record AssetMatch(String assetId, String keyword, int score) {
}
