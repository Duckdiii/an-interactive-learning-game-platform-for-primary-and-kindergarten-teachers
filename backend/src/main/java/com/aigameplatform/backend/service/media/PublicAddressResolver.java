package com.aigameplatform.backend.service.media;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

@FunctionalInterface
public interface PublicAddressResolver {
    List<InetAddress> resolve(String host, long deadlineNanos) throws UnknownHostException;
}
