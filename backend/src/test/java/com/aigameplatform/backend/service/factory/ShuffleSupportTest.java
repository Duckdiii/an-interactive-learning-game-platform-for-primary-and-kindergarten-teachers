package com.aigameplatform.backend.service.factory;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class ShuffleSupportTest {

    @Test
    void shuffledIndicesIsAlwaysAPermutation() {
        for (int seed = 0; seed < 200; seed++) {
            for (int size = 0; size <= 8; size++) {
                assertThat(ShuffleSupport.shuffledIndices(size, new Random(seed)))
                        .containsExactlyInAnyOrderElementsOf(range(size));
            }
        }
    }

    @Test
    void sameSeedGivesTheSameShuffle() {
        assertThat(ShuffleSupport.shuffledIndices(6, new Random(42)))
                .isEqualTo(ShuffleSupport.shuffledIndices(6, new Random(42)));
    }

    @Test
    void differentSeedsEventuallyGiveDifferentOrders() {
        long distinct = java.util.stream.IntStream.range(0, 100)
                .mapToObj(seed -> ShuffleSupport.shuffledIndices(5, new Random(seed))).distinct().count();

        assertThat(distinct).isGreaterThan(20);
    }

    @Test
    void notIdentityNeverReturnsTheOriginalOrder() {
        for (int seed = 0; seed < 300; seed++) {
            for (int size = 2; size <= 8; size++) {
                List<Integer> result = ShuffleSupport.shuffledNotIdentity(size, new Random(seed));

                assertThat(result).isNotEqualTo(range(size));
                assertThat(result).containsExactlyInAnyOrderElementsOf(range(size));
            }
        }
    }

    @Test
    void notIdentityOfASingleElementIsThatElement() {
        assertThat(ShuffleSupport.shuffledNotIdentity(1, new Random(1))).containsExactly(0);
    }

    @Test
    void shuffledValuesDifferFromTheOriginalWhenPossible() {
        List<String> word = List.of("B", "A", "B", "A");

        for (int seed = 0; seed < 300; seed++) {
            List<String> result = ShuffleSupport.shuffledValuesNotEqual(word, new Random(seed));

            assertThat(result).isNotEqualTo(word);
            assertThat(result).containsExactlyInAnyOrderElementsOf(word);
        }
    }

    @Test
    void identicalValuesCannotBeReordered() {
        assertThat(ShuffleSupport.shuffledValuesNotEqual(List.of("A", "A"), new Random(1))).containsExactly("A", "A");
    }

    @Test
    void pickFollowsTheGivenOrder() {
        assertThat(ShuffleSupport.pick(List.of("a", "b", "c"), List.of(2, 0, 1))).containsExactly("c", "a", "b");
    }

    private static List<Integer> range(int size) {
        return java.util.stream.IntStream.range(0, size).boxed().toList();
    }
}
