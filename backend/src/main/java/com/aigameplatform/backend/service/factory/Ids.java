package com.aigameplatform.backend.service.factory;

/** Cách đặt id trong DSL. */
final class Ids {

    private Ids() {
    }

    /** Id theo vị trí: 0 -> "a", 1 -> "b"... */
    static String positional(int index) {
        return String.valueOf((char) ('a' + index));
    }

    /** Id có tiền tố và số thứ tự bắt đầu từ 1: ("q", 0) -> "q1". */
    static String numbered(String prefix, int index) {
        return prefix + (index + 1);
    }
}
