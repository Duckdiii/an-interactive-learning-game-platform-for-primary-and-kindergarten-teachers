package com.aigameplatform.backend.service.play.support;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Mã lựa chọn "mờ" gửi cho học sinh (HMAC theo salt của phiên), dùng chung để giải mã lại khi thống kê. */
public final class OpaqueIds {

    private OpaqueIds() {
    }

    public static String opaque(String salt, int index, String value) {
        return "x" + hmac(salt, index + "|" + value).substring(0, 20);
    }

    public static String hmac(String salt, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(salt.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Cannot create opaque student IDs", e);
        }
    }
}
