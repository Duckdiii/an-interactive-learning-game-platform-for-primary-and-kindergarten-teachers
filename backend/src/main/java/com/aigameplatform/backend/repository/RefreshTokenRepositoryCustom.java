package com.aigameplatform.backend.repository;

/**
 * Phần tự viết của {@link RefreshTokenRepository} (không diễn đạt được bằng phương thức suy ra tên hay
 * {@code @Query}), tách riêng theo quy ước "repository fragment" của Spring Data JPA.
 */
public interface RefreshTokenRepositoryCustom {

    /**
     * Khóa toàn bộ family trong suốt giao dịch hiện tại (Postgres advisory lock, tự nhả khi commit/rollback).
     * Gọi trước khi đọc/sửa bất kỳ token nào của family, cho cả nhánh xoay vòng hợp lệ lẫn nhánh phát hiện dùng
     * lại: nếu không, một giao dịch có thể chèn token mới cho family này ngay sau khi một giao dịch khác vừa
     * quét xong {@code revokeFamily}, khiến token mới đó không bị thu hồi dù family đã bị coi là lộ.
     */
    void lockFamily(String familyId);
}
