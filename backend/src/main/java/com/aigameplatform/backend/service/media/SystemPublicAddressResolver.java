package com.aigameplatform.backend.service.media;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;

@Component
public class SystemPublicAddressResolver implements PublicAddressResolver, DisposableBean {
    private final ThreadPoolExecutor dnsExecutor = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(8), task -> {
                Thread thread = new Thread(task, "scene-image-dns-" + DnsThreadNumber.NEXT.getAndIncrement());
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());

    @Override
    public List<InetAddress> resolve(String host, long deadlineNanos) throws UnknownHostException {
        Future<InetAddress[]> lookup;
        try {
            lookup = dnsExecutor.submit(() -> InetAddress.getAllByName(host));
        } catch (RuntimeException e) {
            throw unknownHost("DNS resolver is busy", e);
        }
        try {
            long remaining = deadlineNanos - System.nanoTime();
            if (remaining <= 0) throw new TimeoutException("DNS deadline expired");
            return List.of(lookup.get(remaining, TimeUnit.NANOSECONDS));
        } catch (TimeoutException e) {
            lookup.cancel(true);
            throw unknownHost("DNS lookup timed out", e);
        } catch (InterruptedException e) {
            lookup.cancel(true);
            Thread.currentThread().interrupt();
            throw unknownHost("DNS lookup interrupted", e);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof UnknownHostException unknown) throw unknown;
            throw unknownHost("DNS lookup failed", cause);
        }
    }

    @Override
    public void destroy() {
        dnsExecutor.shutdownNow();
    }

    private static UnknownHostException unknownHost(String message, Throwable cause) {
        UnknownHostException exception = new UnknownHostException(message);
        exception.initCause(cause);
        return exception;
    }

    private static final class DnsThreadNumber {
        private static final AtomicInteger NEXT = new AtomicInteger(1);
    }
}
