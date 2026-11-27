package com.aigameplatform.backend.service.asset;

import java.util.List;

/**
 * Tìm hình trong danh mục theo chữ. Là interface để sau này đổi thuật toán (ví dụ thêm embedding) mà không sửa chỗ dùng.
 */
public interface AssetRetriever {

    /**
     * Các hình có từ khóa xuất hiện nguyên từ trong {@code text}, xếp theo độ khớp giảm dần (bằng nhau thì theo thứ tự trong
     * danh mục). Không có hình nào khớp thì trả danh sách rỗng, không bao giờ trả null.
     */
    List<AssetMatch> match(String text);

    /**
     * Hình {@code assetId} có được nhắc trong {@code text} không. Khác {@link #match}: không loại từ khóa ngắn mơ hồ khi chữ dài,
     * vì ở đây đã biết trước hình cần tìm nên rủi ro khớp bừa thấp. Dùng để kiểm tra một hình đã gắn có hợp với chữ không.
     */
    boolean mentions(String text, String assetId);
}
