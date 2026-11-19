package com.aigameplatform.backend.service.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.media.PexelsImageDto;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class PexelsClientTest {

    private JsonMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = JsonMapper.builder().build();
    }

    @Test
    void testSearch_EmptyQueryReturnsEmptyList() {
        PexelsClient client = new PexelsClient("", mapper);
        List<PexelsImageDto> result = client.search("", 10);
        assertTrue(result.isEmpty());

        List<PexelsImageDto> nullResult = client.search(null, 10);
        assertTrue(nullResult.isEmpty());
    }

    @Test
    void testSearch_FallbackWhenApiKeyBlank() {
        PexelsClient client = new PexelsClient("", mapper);
        List<PexelsImageDto> result = client.search("con mèo", 4);
        assertEquals(4, result.size());
        assertTrue(result.get(0).url().contains("pexels.com"));
        assertTrue(result.get(0).alt().contains("con mèo"));
    }

    @Test
    void testSearch_SuccessFromHttp() throws Exception {
        HttpClient mockHttpClient = mock(HttpClient.class);
        HttpResponse<String> mockResponse = mock(HttpResponse.class);

        String json = """
        {
          "page": 1,
          "per_page": 2,
          "photos": [
            {
              "id": 12345,
              "alt": "Chú chó dễ thương",
              "photographer": "John Doe",
              "src": {
                "large": "https://images.pexels.com/large.jpg",
                "tiny": "https://images.pexels.com/tiny.jpg"
              }
            }
          ]
        }
        """;

        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(json);
        doReturn(mockResponse).when(mockHttpClient).send(any(), any());

        PexelsClient client = new PexelsClient("dummy-key", mapper, mockHttpClient);
        List<PexelsImageDto> result = client.search("chó", 2);

        assertEquals(1, result.size());
        PexelsImageDto first = result.get(0);
        assertEquals(12345L, first.id());
        assertEquals("https://images.pexels.com/large.jpg", first.url());
        assertEquals("https://images.pexels.com/tiny.jpg", first.thumbnailUrl());
        assertEquals("Chú chó dễ thương", first.alt());
        assertEquals("John Doe", first.photographer());
    }

    @Test
    void testSearch_FallbackOnHttpError() throws Exception {
        HttpClient mockHttpClient = mock(HttpClient.class);
        HttpResponse<String> mockResponse = mock(HttpResponse.class);

        when(mockResponse.statusCode()).thenReturn(429);
        when(mockResponse.body()).thenReturn("Rate limit exceeded");
        doReturn(mockResponse).when(mockHttpClient).send(any(), any());

        PexelsClient client = new PexelsClient("dummy-key", mapper, mockHttpClient);
        List<PexelsImageDto> result = client.search("hoa hồng", 3);

        assertEquals(3, result.size());
        assertNotNull(result.get(0).url());
    }
}
