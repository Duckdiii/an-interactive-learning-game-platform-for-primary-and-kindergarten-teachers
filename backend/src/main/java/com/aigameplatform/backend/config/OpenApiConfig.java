package com.aigameplatform.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Thông tin chung của spec sinh từ code. Bản thiết kế đầy đủ (kể cả endpoint chưa cài)
 * nằm ở {@code docs/openapi/openapi.yaml}; trang này chỉ phản ánh controller đã có.
 */
@Configuration
public class OpenApiConfig {

    public static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("AI-Game Platform REST API")
                        .version("1.1.0")
                        .description("Sinh tự động từ controller đang chạy. Bản thiết kế đầy đủ: docs/openapi/openapi.yaml."))
                .components(new Components().addSecuritySchemes(BEARER_AUTH,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
