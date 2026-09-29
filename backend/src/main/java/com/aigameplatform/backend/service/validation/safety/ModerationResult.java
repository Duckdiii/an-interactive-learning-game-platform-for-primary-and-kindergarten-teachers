package com.aigameplatform.backend.service.validation.safety;

import java.util.List;

/** Kết quả kiểm duyệt một đoạn văn: có bị gắn cờ hay không và các nhóm vi phạm. */
public record ModerationResult(boolean flagged, List<String> categories) {
}
