# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2207
- `components`: dòng 2208–4278

## Operation

| Method | Path | operationId | x-status | Dòng |
|---|---|---|---|---|
| POST | `/auth/register` | register | extended-pending | 74–106 |
| POST | `/auth/login` | login | implemented | 109–157 |
| POST | `/auth/refresh` | refreshToken | implemented | 160–186 |
| POST | `/auth/logout` | logout | implemented | 189–206 |
| POST | `/auth/forgot-password` | forgotPassword | implemented | 209–259 |
| POST | `/auth/reset-password` | resetPassword | implemented | 262–293 |
| GET | `/catalog/noto` |  | implemented | 296–324 |
| POST | `/games/generate` | generateGame | extended-pending | 327–400 |
| POST | `/games/understand` | understandGameRequest | implemented | 403–442 |
| GET | `/games` | listGames | extended-pending | 445–483 |
| GET | `/games/{gameId}` | getGame | implemented | 488–505 |
| PUT | `/games/{gameId}` | updateGame | extended-pending | 506–551 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 552–572 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 577–627 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | planned | 632–681 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 686–725 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 730–764 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | planned | 770–833 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 836–885 |
| POST | `/media/upload` | uploadMedia | planned | 888–944 |
| POST | `/games/{gameId}/sessions` | createSession | planned | 949–992 |
| GET | `/games/{gameId}/sessions` | listGameSessions | planned | 993–1034 |
| POST | `/sessions/{sessionId}/start` | startSession | planned | 1039–1062 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | planned | 1067–1087 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | planned | 1092–1111 |
| POST | `/sessions/{sessionId}/close` | closeSession | planned | 1116–1136 |
| GET | `/sessions/{sessionId}` | getSession | planned | 1141–1170 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | planned | 1175–1202 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | planned | 1208–1239 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | planned | 1245–1292 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | planned | 1295–1330 |
| POST | `/sessions/{sessionId}/join` | joinSession | planned | 1335–1378 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | planned | 1383–1428 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1433–1480 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1485–1545 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | planned | 1550–1582 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | planned | 1587–1614 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1619–1645 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1650–1686 |
| GET | `/admin/teachers` | adminListTeachers | planned | 1689–1734 |
| POST | `/admin/teachers` | adminCreateTeacher | planned | 1735–1772 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | planned | 1777–1795 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | planned | 1796–1830 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | planned | 1835–1858 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | planned | 1863–1882 |
| GET | `/admin/audit-logs` | adminListAuditLogs | planned | 1885–1947 |
| GET | `/admin/usage` | adminGetUsage | planned | 1950–2004 |
| GET | `/admin/system-status` | adminGetSystemStatus | planned | 2007–2032 |
| GET | `/admin/ai-config` | adminGetAiConfig | planned | 2035–2068 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | planned | 2071–2099 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | planned | 2104–2134 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | planned | 2139–2158 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | planned | 2161–2177 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | planned | 2178–2206 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2210–2216 |
| securitySchemes | `participantId` | 2217–2223 |
| securitySchemes | `refreshCookie` | 2224–2237 |
| parameters | `GameId` | 2240–2246 |
| parameters | `Page` | 2247–2254 |
| parameters | `Size` | 2255–2262 |
| parameters | `TeacherId` | 2263–2269 |
| parameters | `VersionId` | 2270–2276 |
| parameters | `SessionId` | 2277–2283 |
| parameters | `ParticipantId` | 2284–2290 |
| parameters | `ShareCode` | 2291–2299 |
| parameters | `QuestionId` | 2300–2307 |
| headers | `RetryAfter` | 2310–2314 |
| headers | `SetRefreshCookie` | 2315–2320 |
| headers | `ClearRefreshCookie` | 2321–2324 |
| responses | `AuthSuccess` | 2327–2345 |
| responses | `ValidationError` | 2346–2353 |
| responses | `Unauthorized` | 2354–2361 |
| responses | `GameSuccess` | 2362–2367 |
| responses | `AdminTeacherSuccess` | 2368–2378 |
| responses | `TeacherStatusSuccess` | 2379–2396 |
| responses | `AiConfigVersionSuccess` | 2397–2407 |
| responses | `BlockedWordsSuccess` | 2408–2418 |
| responses | `SessionControlSuccess` | 2419–2436 |
| responses | `Forbidden` | 2437–2443 |
| responses | `NotFound` | 2444–2449 |
| responses | `Conflict` | 2450–2457 |
| responses | `UnprocessableContent` | 2458–2470 |
| responses | `AiTimeout` | 2471–2478 |
| responses | `RateLimited` | 2479–2487 |
| responses | `InternalError` | 2488–2493 |
| schemas | `ErrorCode` | 2496–2527 |
| schemas | `ErrorBody` | 2529–2560 |
| schemas | `ErrorResponse` | 2562–2568 |
| schemas | `Password` | 2570–2577 |
| schemas | `Role` | 2579–2581 |
| schemas | `RegisterRequest` | 2583–2606 |
| schemas | `RegisterResult` | 2608–2617 |
| schemas | `LoginRequest` | 2619–2632 |
| schemas | `TeacherInfo` | 2634–2650 |
| schemas | `AuthData` | 2652–2664 |
| schemas | `Subject` | 2666–2668 |
| schemas | `GradeLevel` | 2670–2672 |
| schemas | `GameType` | 2674–2690 |
| schemas | `GameStatus` | 2692–2694 |
| schemas | `Voice` | 2696–2707 |
| schemas | `GenerateGameRequest` | 2709–2757 |
| schemas | `UnderstandGameRequest` | 2759–2776 |
| schemas | `ReviseGameRequest` | 2778–2792 |
| schemas | `ChatTurn` | 2794–2804 |
| schemas | `GameUnderstanding` | 2806–2858 |
| schemas | `GameUnderstandingResponse` | 2860–2889 |
| schemas | `GameUnderstandingResult` | 2891–2899 |
| schemas | `GameEnvelope` | 2901–2918 |
| schemas | `CpfGameEnvelope` | 2920–2925 |
| schemas | `Question` | 2927–2941 |
| schemas | `GameResponse` | 2943–2949 |
| schemas | `CpfGameResponse` | 2951–2970 |
| schemas | `DslGameResponse` | 2972–3053 |
| schemas | `GameResult` | 3055–3061 |
| schemas | `GameSummary` | 3063–3100 |
| schemas | `CurriculumReview` | 3102–3144 |
| schemas | `PublishResult` | 3146–3162 |
| schemas | `SessionType` | 3164–3169 |
| schemas | `SessionStatus` | 3171–3173 |
| schemas | `ParticipantStatus` | 3175–3180 |
| schemas | `InteractionStatus` | 3182–3184 |
| schemas | `GroupingStrategy` | 3186–3188 |
| schemas | `TeamInfo` | 3190–3203 |
| schemas | `TeamInput` | 3205–3213 |
| schemas | `CreateSessionRequest` | 3215–3240 |
| schemas | `CreateSessionResult` | 3242–3266 |
| schemas | `SessionByCode` | 3268–3287 |
| schemas | `JoinRequest` | 3289–3301 |
| schemas | `JoinResult` | 3303–3321 |
| schemas | `TeamAssignRequest` | 3323–3329 |
| schemas | `StudentGameResponse` | 3331–3394 |
| schemas | `StudentOddOneOutImageQuestion` | 3396–3417 |
| schemas | `MatchingStudentItem` | 3419–3444 |
| schemas | `MatchingStudentQuestion` | 3446–3502 |
| schemas | `StudentVisualClozeImageQuestion` | 3504–3548 |
| schemas | `InteractionBase` | 3550–3561 |
| schemas | `InteractionRequest` | 3563–3703 |
| schemas | `InteractionResult` | 3705–3741 |
| schemas | `LeaderboardParticipant` | 3743–3760 |
| schemas | `LeaderboardTeam` | 3762–3782 |
| schemas | `Leaderboard` | 3784–3796 |
| schemas | `MyResult` | 3798–3843 |
| schemas | `SharedGameInfo` | 3845–3855 |
| schemas | `PlayRequest` | 3857–3865 |
| schemas | `PlayResult` | 3867–3886 |
| schemas | `SessionListItem` | 3888–3906 |
| schemas | `SessionDetail` | 3908–3953 |
| schemas | `SessionResults` | 3955–4012 |
| schemas | `ParticipantInteraction` | 4014–4037 |
| schemas | `PageInfo` | 4039–4054 |
| schemas | `TeacherAccountStatus` | 4056–4058 |
| schemas | `AdminTeacher` | 4060–4078 |
| schemas | `AdminCreateTeacherRequest` | 4080–4095 |
| schemas | `AuditResult` | 4097–4099 |
| schemas | `AuditLogEntry` | 4101–4124 |
| schemas | `ServiceName` | 4126–4128 |
| schemas | `ServiceUsage` | 4130–4161 |
| schemas | `UsageReport` | 4163–4193 |
| schemas | `SystemStatus` | 4195–4218 |
| schemas | `AiConfigInput` | 4220–4241 |
| schemas | `AiConfigVersion` | 4243–4268 |
| schemas | `BlockedWords` | 4270–4277 |
