package com.aigameplatform.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.media.PexelsImageDto;
import com.aigameplatform.backend.dto.media.PexelsSearchResult;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.service.media.PexelsClient;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PexelsControllerTest {

    private PexelsClient pexelsClient;
    private PexelsController controller;

    @BeforeEach
    void setUp() {
        pexelsClient = mock(PexelsClient.class);
        controller = new PexelsController(pexelsClient);
    }

    @Test
    void testSearch_Success() {
        List<PexelsImageDto> expectedImages = List.of(
            new PexelsImageDto(1L, "https://pexels.com/large.jpg", "https://pexels.com/tiny.jpg", "Mèo", "Author")
        );
        when(pexelsClient.search("con mèo", 12)).thenReturn(expectedImages);

        ApiResponse<PexelsSearchResult> response = controller.search("con mèo", 12);

        assertTrue(response.success());
        assertNotNull(response.data());
        assertEquals(1, response.data().images().size());
        assertEquals("https://pexels.com/large.jpg", response.data().images().get(0).url());
        verify(pexelsClient).search("con mèo", 12);
    }
}
