package com.aigameplatform.backend.service.factory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.random.RandomGenerator;

/** Xáo trộn dựa trên chỉ số, để biết phần tử gốc nằm ở đâu sau khi xáo (cần cho việc tính lại đáp án đúng). */
final class ShuffleSupport {

    private static final int MAX_ATTEMPTS = 50;

    private ShuffleSupport() {
    }

    /** Hoán vị ngẫu nhiên của 0..n-1 (Fisher-Yates); phần tử thứ i là chỉ số gốc của vị trí i sau khi xáo. */
    static List<Integer> shuffledIndices(int size, RandomGenerator random) {
        List<Integer> indices = identity(size);
        for (int i = size - 1; i > 0; i--) {
            Collections.swap(indices, i, random.nextInt(i + 1));
        }
        return indices;
    }

    /** Như trên nhưng bảo đảm khác thứ tự gốc (khi có ít nhất 2 phần tử). */
    static List<Integer> shuffledNotIdentity(int size, RandomGenerator random) {
        List<Integer> identity = identity(size);
        if (size < 2) {
            return identity;
        }
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            List<Integer> candidate = shuffledIndices(size, random);
            if (!candidate.equals(identity)) {
                return candidate;
            }
        }
        // Dự phòng chắc chắn khác thứ tự gốc: dịch vòng một vị trí.
        List<Integer> rotated = new ArrayList<>(identity);
        Collections.rotate(rotated, -1);
        return rotated;
    }

    /** Xáo các giá trị, bảo đảm khác thứ tự gốc trừ khi mọi giá trị giống hệt nhau (khi đó không thể khác). */
    static <T> List<T> shuffledValuesNotEqual(List<T> values, RandomGenerator random) {
        if (values.stream().distinct().count() < 2) {
            return new ArrayList<>(values);
        }
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            List<T> candidate = pick(values, shuffledIndices(values.size(), random));
            if (!candidate.equals(values)) {
                return candidate;
            }
        }
        // Dịch vòng một vị trí luôn khác gốc khi các giá trị không giống hệt nhau.
        List<T> rotated = new ArrayList<>(values);
        Collections.rotate(rotated, -1);
        return rotated;
    }

    static <T> List<T> pick(List<T> values, List<Integer> order) {
        List<T> result = new ArrayList<>(order.size());
        for (int index : order) {
            result.add(values.get(index));
        }
        return result;
    }

    private static List<Integer> identity(int size) {
        List<Integer> identity = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            identity.add(i);
        }
        return identity;
    }
}
