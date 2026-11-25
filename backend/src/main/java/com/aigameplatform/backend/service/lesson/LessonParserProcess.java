package com.aigameplatform.backend.service.lesson;

import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.system.ApplicationHome;
import org.springframework.stereotype.Component;

@Component
public class LessonParserProcess {
    @FunctionalInterface interface Starter { Process start(Path directory, String type) throws IOException; }
    private final long timeoutMillis;
    private final Semaphore slots;
    private final Starter starter;
    private final Path temporaryRoot;

    @Autowired
    public LessonParserProcess(@Value("${app.lesson.parser-timeout-ms:5000}") long timeoutMillis,
            @Value("${app.lesson.parser-workers:2}") int workers) {
        this(timeoutMillis, workers, LessonParserProcess::startWorker, Path.of(System.getProperty("java.io.tmpdir")));
    }
    LessonParserProcess(long timeoutMillis, int workers, Starter starter, Path root) {
        if (timeoutMillis <= 0 || workers <= 0) throw new IllegalArgumentException("Parser limits must be positive");
        this.timeoutMillis = timeoutMillis; this.slots = new Semaphore(workers);
        this.starter = starter; this.temporaryRoot = root;
    }

    public String parse(byte[] bytes, String type) {
        if (!slots.tryAcquire()) throw unavailable("Hệ thống đọc giáo án đang bận. Vui lòng thử lại sau.");
        Path directory = null; Process child = null;
        var io = Executors.newVirtualThreadPerTaskExecutor();
        try {
            directory = Files.createTempDirectory(temporaryRoot, "lesson-parser-");
            child = starter.start(directory, type);
            Process running = child;
            Future<?> write = io.submit(() -> {
                try (var stdin = running.getOutputStream()) { stdin.write(bytes); }
                catch (IOException e) { /* Child status remains authoritative. */ }
            });
            Future<byte[]> read = io.submit(() -> {
                try (var stdout = running.getInputStream()) {
                    return stdout.readNBytes(LessonDocumentExtractor.MAX_TEXT_CHARS * 4 + 1);
                }
            });
            if (!child.waitFor(timeoutMillis, TimeUnit.MILLISECONDS)) {
                stop(child);
                throw unavailable("Đọc giáo án vượt thời gian xử lý. Hãy thử lại hoặc chọn phần bài học ngắn hơn.");
            }
            write.get(1, TimeUnit.SECONDS);
            byte[] text = read.get(1, TimeUnit.SECONDS);
            if (child.exitValue() == 4) throw LessonDocumentExtractor.invalid("Nội dung giáo án vượt giới hạn 20.000 ký tự. Vui lòng chọn phần bài học cần dùng.");
            if (child.exitValue() != 0) throw LessonDocumentExtractor.invalid(
                    "Không đọc được văn bản giáo án. Tệp có thể hỏng, được mã hóa hoặc chỉ có ảnh. Vui lòng gửi file docx hoặc pdf có văn bản.");
            String value = new String(text, StandardCharsets.UTF_8).strip();
            if (value.isBlank() || value.length() > LessonDocumentExtractor.MAX_TEXT_CHARS)
                throw LessonDocumentExtractor.invalid("Giáo án không có văn bản hợp lệ hoặc vượt giới hạn 20.000 ký tự.");
            return value;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); throw unavailable("Đã dừng đọc giáo án. Vui lòng thử lại.");
        } catch (IOException | ExecutionException | TimeoutException e) {
            throw unavailable("Dịch vụ đọc giáo án chưa sẵn sàng. Vui lòng thử lại sau.");
        } finally {
            if (child != null) stop(child);
            io.shutdownNow();
            io.close();
            if (directory != null) cleanup(directory);
            slots.release();
        }
    }

    private static Process startWorker(Path directory, String type) throws IOException {
        var source = new ApplicationHome(LessonParserWorker.class).getSource();
        var args = new ArrayList<String>();
        args.add("-Xmx192m"); args.add("-XX:-UsePerfData");
        args.add("-Djava.io.tmpdir=" + directory.toAbsolutePath());
        if (source != null && source.isFile() && source.getName().endsWith(".jar")) {
            args.add("-Dloader.main=" + LessonParserWorker.class.getName());
            args.add("-cp");
            args.add(source.getAbsolutePath());
            args.add("org.springframework.boot.loader.launch.PropertiesLauncher");
            args.add(type);
        } else {
            args.add("-cp");
            args.add(System.getProperty("java.class.path")); args.add(LessonParserWorker.class.getName());
            args.add(type);
        }
        // Only JVM metadata is on disk. The document itself travels over stdin.
        Path argfile = directory.resolve("java.args");
        Files.writeString(argfile, args.stream().map(LessonParserProcess::quoteArg).collect(java.util.stream.Collectors.joining("\n")), StandardCharsets.UTF_8);
        return new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(), "@" + argfile)
                .redirectError(ProcessBuilder.Redirect.DISCARD).start();
    }
    private static String quoteArg(String value) { return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""; }
    private static void stop(Process process) {
        process.descendants().forEach(ProcessHandle::destroyForcibly);
        boolean interrupted = Thread.interrupted();
        if (process.isAlive()) {
            process.destroyForcibly();
            try { process.waitFor(1, TimeUnit.SECONDS); } catch (InterruptedException e) { interrupted = true; }
        }
        if (interrupted) Thread.currentThread().interrupt();
    }
    private static void cleanup(Path directory) {
        // The directory was created by us directly under temporaryRoot. Never traverse symbolic links.
        try (var paths = Files.walk(directory)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> { try { Files.deleteIfExists(path); } catch (IOException ignored) { path.toFile().deleteOnExit(); } });
        } catch (IOException ignored) { directory.toFile().deleteOnExit(); }
    }
    private static ApiException unavailable(String message) { return new ApiException(ErrorCode.LESSON_PROCESSING_UNAVAILABLE, message); }
}
