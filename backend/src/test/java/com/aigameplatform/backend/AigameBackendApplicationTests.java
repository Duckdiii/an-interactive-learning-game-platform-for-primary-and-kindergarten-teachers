package com.aigameplatform.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

// Layer 3 mặc định bắt buộc OPENAI_API_KEY; bài test này không gọi OpenAI nên tắt riêng ở đây,
// không đổi mặc định của môi trường thật.
@SpringBootTest
@TestPropertySource(properties = "app.moderation.required=false")
class AigameBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
