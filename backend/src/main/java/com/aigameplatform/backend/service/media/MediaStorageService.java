package com.aigameplatform.backend.service.media;

public interface MediaStorageService {
    /**
     * Tải dữ liệu nhị phân lên storage và trả về URL công khai có thể truy cập được.
     */
    String upload(String fileName, byte[] data, String contentType);
}
