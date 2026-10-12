package com.aigameplatform.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

// Layer 3 mặc định bắt buộc OPENAI_API_KEY; bài test này không gọi OpenAI nên tắt riêng ở đây,
// không đổi mặc định của môi trường thật.
@SpringBootTest
@TestPropertySource(properties = {
		"app.moderation.required=false",
		"app.jwt.secret=context-loads-test-key-with-at-least-thirty-two-bytes",
		"spring.datasource.url=jdbc:h2:mem:contextloads;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=none",
		"spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
		"spring.flyway.enabled=false"
})
class AigameBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
