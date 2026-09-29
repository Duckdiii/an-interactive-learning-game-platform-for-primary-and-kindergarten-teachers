package com.aigameplatform.backend.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.nio.charset.StandardCharsets;
import org.hibernate.Session;
import org.springframework.stereotype.Repository;

@Repository
public class RefreshTokenRepositoryImpl implements RefreshTokenRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public void lockFamily(String familyId) {
        long key = lockKeyFor(familyId);
        // doWork thao tác thẳng trên java.sql.Connection, tránh việc Hibernate/JPA phải diễn dịch kiểu trả về
        // "void" của hàm SQL này (dễ vỡ qua tầng ORM).
        entityManager.unwrap(Session.class).doWork(connection -> {
            try (var statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(?)")) {
                statement.setLong(1, key);
                statement.execute();
            }
        });
    }

    /** Băm FNV-1a 64-bit: ổn định giữa các lần gọi, không phụ thuộc familyId có phải UUID hay không. */
    static long lockKeyFor(String familyId) {
        long hash = 0xcbf29ce484222325L;
        for (byte b : familyId.getBytes(StandardCharsets.UTF_8)) {
            hash ^= (b & 0xffL);
            hash *= 0x100000001b3L;
        }
        return hash;
    }
}
