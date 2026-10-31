package com.aigameplatform.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import javax.sql.DataSource;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;

// Layer 3 mặc định bắt buộc OPENAI_API_KEY; bài test này không gọi OpenAI nên tắt riêng ở đây,
// không đổi mặc định của môi trường thật.
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "app.moderation.required=false")
class AigameBackendApplicationTests {
	@Autowired
	private DataSource dataSource;

	@Test
	void contextLoadsAgainstIsolatedTestDatabase() throws SQLException {
		try (var connection = dataSource.getConnection()) {
			assertThat(connection.getMetaData().getURL()).startsWith("jdbc:h2:mem:aigame_context_test");
		}
	}

}
