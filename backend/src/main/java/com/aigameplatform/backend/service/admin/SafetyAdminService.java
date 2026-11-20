package com.aigameplatform.backend.service.admin;

import com.aigameplatform.backend.dto.admin.BlockedWordsDto;
import com.aigameplatform.backend.entity.BlockedWordEntity;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.BlockedWordEntityRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SafetyAdminService {

    private final BlockedWordEntityRepository blockedWordEntityRepository;
    private final BlockedWordList blockedWordList;
    private final AuditLogService auditLogService;

    public SafetyAdminService(
            BlockedWordEntityRepository blockedWordEntityRepository,
            BlockedWordList blockedWordList,
            AuditLogService auditLogService) {
        this.blockedWordEntityRepository = blockedWordEntityRepository;
        this.blockedWordList = blockedWordList;
        this.auditLogService = auditLogService;
    }

    @PostConstruct
    public void init() {
        try {
            List<BlockedWordEntity> entities = blockedWordEntityRepository.findAllByOrderByWordAsc();
            if (entities.isEmpty()) {
                List<String> fileWords = blockedWordList.getWords();
                if (fileWords != null && !fileWords.isEmpty()) {
                    List<BlockedWordEntity> newEntities = new ArrayList<>();
                    for (String w : fileWords) {
                        newEntities.add(BlockedWordEntity.builder()
                                .id(UUID.randomUUID().toString())
                                .word(w)
                                .createdAt(Instant.now())
                                .build());
                    }
                    blockedWordEntityRepository.saveAll(newEntities);
                }
            } else {
                List<String> dbWords = entities.stream().map(BlockedWordEntity::getWord).toList();
                blockedWordList.reload(dbWords);
            }
        } catch (Exception e) {
            // In test environments or when DB table not yet migrated during early bean creation
        }
    }

    @Transactional(readOnly = true)
    public BlockedWordsDto getBlockedWords() {
        List<BlockedWordEntity> entities = blockedWordEntityRepository.findAllByOrderByWordAsc();
        if (entities.isEmpty()) {
            List<String> inMemory = blockedWordList.getWords();
            return new BlockedWordsDto(inMemory != null ? inMemory : List.of());
        }
        List<String> words = entities.stream().map(BlockedWordEntity::getWord).toList();
        return new BlockedWordsDto(words);
    }

    @Transactional
    public BlockedWordsDto replaceBlockedWords(BlockedWordsDto request, AuthenticatedTeacher actor, String ip) {
        if (request == null || request.words() == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Danh sách từ cấm không được null");
        }

        List<String> cleanWords = request.words().stream()
                .map(String::strip)
                .filter(w -> !w.isEmpty() && !w.startsWith("#"))
                .distinct()
                .sorted()
                .toList();

        blockedWordEntityRepository.deleteAll();

        List<BlockedWordEntity> newEntities = new ArrayList<>();
        Instant now = Instant.now();
        for (String word : cleanWords) {
            newEntities.add(BlockedWordEntity.builder()
                    .id(UUID.randomUUID().toString())
                    .word(word)
                    .createdAt(now)
                    .build());
        }
        blockedWordEntityRepository.saveAll(newEntities);

        // Hot-reload in memory
        blockedWordList.reload(cleanWords);

        String actorId = actor != null ? actor.teacherId() : "system";
        String actorRole = actor != null ? actor.role() : "ROLE_ADMIN";

        auditLogService.logAction(
                actorId,
                actorRole,
                ip,
                "REPLACE_BLOCKED_WORDS",
                AuditResult.SUCCESS,
                null,
                "Replaced blocked words list with " + cleanWords.size() + " words"
        );

        return new BlockedWordsDto(cleanWords);
    }
}
