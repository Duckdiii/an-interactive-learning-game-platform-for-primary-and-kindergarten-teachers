package com.aigameplatform.backend.service.lesson;

import static org.assertj.core.api.Assertions.*;
import java.nio.file.Files;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;

class LessonParserProcessTest {
    @Test void childJvmCanReadSyntheticPdfWithResolvedDependencies() throws Exception {
        var command = new java.util.ArrayList<>(javaCommand(LessonParserWorker.class)); command.add("pdf");
        Process child = new ProcessBuilder(command).redirectError(ProcessBuilder.Redirect.INHERIT).start();
        try (var input = child.getOutputStream()) { input.write(LessonDocumentExtractorTest.pdf("Count from 1 to 5", false)); }
        String output = new String(child.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(child.waitFor()).isZero();
        assertThat(output).contains("Count from 1 to 5");
    }
    public static class ParserProbe {
        public static void main(String[] args) throws Exception {
            System.out.print(LessonParserWorker.extract(System.in.readAllBytes(), args[0]));
        }
    }
    @Test void interruptionKillsChildAndReturnsPromptly() throws Exception {
        var temp = Files.createTempDirectory("lesson-interrupt-test-");
        var started = new CountDownLatch(1);
        var child = new java.util.concurrent.atomic.AtomicReference<Process>();
        var runner = new LessonParserProcess(60_000, 1, (dir, type) -> {
            Process process = new ProcessBuilder(javaCommand(Sleeper.class)).start();
            child.set(process); started.countDown(); return process;
        }, temp);
        Thread caller = Thread.ofVirtual().start(() -> {
            assertThatThrownBy(() -> runner.parse(new byte[]{1}, "pdf")).isInstanceOf(com.aigameplatform.backend.exception.ApiException.class);
        });
        try {
            assertThat(started.await(2, TimeUnit.SECONDS)).isTrue();
            caller.interrupt(); caller.join(2000);
            assertThat(caller.isAlive()).isFalse();
            assertThat(child.get().isAlive()).isFalse();
        } finally {
            if (child.get() != null) child.get().destroyForcibly();
            caller.join(2000);
            try (var paths = Files.walk(temp)) { for (var p : paths.sorted(java.util.Comparator.reverseOrder()).toList()) Files.deleteIfExists(p); }
        }
    }
    @Test void killsTimedOutProcessAndDeletesTemporaryDirectory() throws Exception {
        var temp = Files.createTempDirectory("lesson-test-");
        var runner = new LessonParserProcess(150, 2, (dir, type) -> {
            assertThat(dir).startsWith(temp);
            return new ProcessBuilder(javaCommand(Sleeper.class)).redirectError(ProcessBuilder.Redirect.DISCARD).start();
        }, temp);
        assertTimeoutPreemptively(Duration.ofSeconds(5), () ->
            assertThatThrownBy(() -> runner.parse(new byte[]{1}, "pdf"))
                    .isInstanceOfSatisfying(com.aigameplatform.backend.exception.ApiException.class,
                            error -> assertThat(error.getErrorCode()).isEqualTo(
                                    com.aigameplatform.backend.exception.ErrorCode.LESSON_PROCESSING_UNAVAILABLE)));
        try (var entries = Files.list(temp)) { assertThat(entries.toList()).isEmpty(); }
        Files.delete(temp);
    }

    @Test void rejectsConcurrentWorkerAndReleasesSlotOnFailure() throws Exception {
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        var temp = Files.createTempDirectory("lesson-slot-test-");
        var runner = new LessonParserProcess(1000, 1, (dir, type) -> {
            entered.countDown();
            try { release.await(); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            throw new java.io.IOException("PRIVATE_PROVIDER_SENTINEL");
        }, temp);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<?> first = executor.submit(() -> assertThatThrownBy(() -> runner.parse(new byte[]{1}, "pdf"))
                    .hasMessageNotContaining("PRIVATE_PROVIDER_SENTINEL"));
            assertThat(entered.await(2, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> runner.parse(new byte[]{1}, "pdf")).hasMessageContaining("bận");
            release.countDown(); first.get(3, TimeUnit.SECONDS);
            assertThatThrownBy(() -> runner.parse(new byte[]{1}, "pdf")).hasMessageNotContaining("bận");
        } finally { release.countDown(); Files.delete(temp); }
    }

    @Test void extractorRejectsBeforeBufferingWhenAllParserSlotsAreBusy() throws Exception {
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        var temp = Files.createTempDirectory("lesson-upload-slot-test-");
        var runner = new LessonParserProcess(1000, 1, (dir, type) -> {
            entered.countDown();
            try { release.await(); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            throw new java.io.IOException("stop");
        }, temp);
        var extractor = new LessonDocumentExtractor(runner);
        var reads = new java.util.concurrent.atomic.AtomicInteger();
        var uploadBytes = new byte[]{1, 2, 3};
        var upload = new org.springframework.mock.web.MockMultipartFile("file", "lesson.pdf", "application/pdf", new byte[]{1, 2, 3}) {
            @Override public java.io.InputStream getInputStream() {
                return new java.io.FilterInputStream(new java.io.ByteArrayInputStream(uploadBytes)) {
                    @Override public int read() throws java.io.IOException { reads.incrementAndGet(); return super.read(); }
                    @Override public int read(byte[] bytes, int offset, int length) throws java.io.IOException {
                        reads.incrementAndGet(); return super.read(bytes, offset, length);
                    }
                };
            }
        };
        Thread first = Thread.ofVirtual().start(() -> assertThatThrownBy(() -> runner.parse(new byte[]{1}, "pdf"))
                .isInstanceOf(com.aigameplatform.backend.exception.ApiException.class));
        try {
            assertThat(entered.await(2, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> extractor.extract(upload))
                    .isInstanceOfSatisfying(com.aigameplatform.backend.exception.ApiException.class,
                            error -> assertThat(error.getErrorCode()).isEqualTo(
                                    com.aigameplatform.backend.exception.ErrorCode.LESSON_PROCESSING_UNAVAILABLE));
            assertThat(reads.get()).as("upload bytes are not buffered without a reserved parser slot").isZero();
        } finally {
            release.countDown(); first.join(2000);
            try (var paths = Files.walk(temp)) { for (var p : paths.sorted(java.util.Comparator.reverseOrder()).toList()) Files.deleteIfExists(p); }
        }
    }

    static List<String> javaCommand(Class<?> main) {
        return List.of(System.getProperty("java.home") + "/bin/java", "-cp", System.getProperty("java.class.path"), main.getName());
    }
    public static class Sleeper { public static void main(String[] args) throws Exception { Thread.sleep(60_000); } }
    private static void assertTimeoutPreemptively(Duration duration, org.junit.jupiter.api.function.Executable action) {
        org.junit.jupiter.api.Assertions.assertTimeoutPreemptively(duration, action);
    }
}
