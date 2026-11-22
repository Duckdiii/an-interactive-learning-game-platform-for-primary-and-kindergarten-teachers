# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2208
- `components`: dòng 2209–4279

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
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 770–834 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 837–886 |
| POST | `/media/upload` | uploadMedia | planned | 889–945 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 950–993 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 994–1035 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1040–1063 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1068–1088 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1093–1112 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1117–1137 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1142–1171 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1176–1203 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1209–1240 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1246–1293 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1296–1331 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1336–1379 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1384–1429 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1434–1481 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1486–1546 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 1551–1583 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 1588–1615 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1620–1646 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1651–1687 |
| GET | `/admin/teachers` | adminListTeachers | planned | 1690–1735 |
| POST | `/admin/teachers` | adminCreateTeacher | planned | 1736–1773 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | planned | 1778–1796 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | planned | 1797–1831 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | planned | 1836–1859 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | planned | 1864–1883 |
| GET | `/admin/audit-logs` | adminListAuditLogs | planned | 1886–1948 |
| GET | `/admin/usage` | adminGetUsage | planned | 1951–2005 |
| GET | `/admin/system-status` | adminGetSystemStatus | planned | 2008–2033 |
| GET | `/admin/ai-config` | adminGetAiConfig | planned | 2036–2069 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | planned | 2072–2100 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | planned | 2105–2135 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | planned | 2140–2159 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | planned | 2162–2178 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | planned | 2179–2207 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2211–2217 |
| securitySchemes | `participantId` | 2218–2224 |
| securitySchemes | `refreshCookie` | 2225–2238 |
| parameters | `GameId` | 2241–2247 |
| parameters | `Page` | 2248–2255 |
| parameters | `Size` | 2256–2263 |
| parameters | `TeacherId` | 2264–2270 |
| parameters | `VersionId` | 2271–2277 |
| parameters | `SessionId` | 2278–2284 |
| parameters | `ParticipantId` | 2285–2291 |
| parameters | `ShareCode` | 2292–2300 |
| parameters | `QuestionId` | 2301–2308 |
| headers | `RetryAfter` | 2311–2315 |
| headers | `SetRefreshCookie` | 2316–2321 |
| headers | `ClearRefreshCookie` | 2322–2325 |
| responses | `AuthSuccess` | 2328–2346 |
| responses | `ValidationError` | 2347–2354 |
| responses | `Unauthorized` | 2355–2362 |
| responses | `GameSuccess` | 2363–2368 |
| responses | `AdminTeacherSuccess` | 2369–2379 |
| responses | `TeacherStatusSuccess` | 2380–2397 |
| responses | `AiConfigVersionSuccess` | 2398–2408 |
| responses | `BlockedWordsSuccess` | 2409–2419 |
| responses | `SessionControlSuccess` | 2420–2437 |
| responses | `Forbidden` | 2438–2444 |
| responses | `NotFound` | 2445–2450 |
| responses | `Conflict` | 2451–2458 |
| responses | `UnprocessableContent` | 2459–2471 |
| responses | `AiTimeout` | 2472–2479 |
| responses | `RateLimited` | 2480–2488 |
| responses | `InternalError` | 2489–2494 |
| schemas | `ErrorCode` | 2497–2528 |
| schemas | `ErrorBody` | 2530–2561 |
| schemas | `ErrorResponse` | 2563–2569 |
| schemas | `Password` | 2571–2578 |
| schemas | `Role` | 2580–2582 |
| schemas | `RegisterRequest` | 2584–2607 |
| schemas | `RegisterResult` | 2609–2618 |
| schemas | `LoginRequest` | 2620–2633 |
| schemas | `TeacherInfo` | 2635–2651 |
| schemas | `AuthData` | 2653–2665 |
| schemas | `Subject` | 2667–2669 |
| schemas | `GradeLevel` | 2671–2673 |
| schemas | `GameType` | 2675–2691 |
| schemas | `GameStatus` | 2693–2695 |
| schemas | `Voice` | 2697–2708 |
| schemas | `GenerateGameRequest` | 2710–2758 |
| schemas | `UnderstandGameRequest` | 2760–2777 |
| schemas | `ReviseGameRequest` | 2779–2793 |
| schemas | `ChatTurn` | 2795–2805 |
| schemas | `GameUnderstanding` | 2807–2859 |
| schemas | `GameUnderstandingResponse` | 2861–2890 |
| schemas | `GameUnderstandingResult` | 2892–2900 |
| schemas | `GameEnvelope` | 2902–2919 |
| schemas | `CpfGameEnvelope` | 2921–2926 |
| schemas | `Question` | 2928–2942 |
| schemas | `GameResponse` | 2944–2950 |
| schemas | `CpfGameResponse` | 2952–2971 |
| schemas | `DslGameResponse` | 2973–3054 |
| schemas | `GameResult` | 3056–3062 |
| schemas | `GameSummary` | 3064–3101 |
| schemas | `CurriculumReview` | 3103–3145 |
| schemas | `PublishResult` | 3147–3163 |
| schemas | `SessionType` | 3165–3170 |
| schemas | `SessionStatus` | 3172–3174 |
| schemas | `ParticipantStatus` | 3176–3181 |
| schemas | `InteractionStatus` | 3183–3185 |
| schemas | `GroupingStrategy` | 3187–3189 |
| schemas | `TeamInfo` | 3191–3204 |
| schemas | `TeamInput` | 3206–3214 |
| schemas | `CreateSessionRequest` | 3216–3241 |
| schemas | `CreateSessionResult` | 3243–3267 |
| schemas | `SessionByCode` | 3269–3288 |
| schemas | `JoinRequest` | 3290–3302 |
| schemas | `JoinResult` | 3304–3322 |
| schemas | `TeamAssignRequest` | 3324–3330 |
| schemas | `StudentGameResponse` | 3332–3395 |
| schemas | `StudentOddOneOutImageQuestion` | 3397–3418 |
| schemas | `MatchingStudentItem` | 3420–3445 |
| schemas | `MatchingStudentQuestion` | 3447–3503 |
| schemas | `StudentVisualClozeImageQuestion` | 3505–3549 |
| schemas | `InteractionBase` | 3551–3562 |
| schemas | `InteractionRequest` | 3564–3704 |
| schemas | `InteractionResult` | 3706–3742 |
| schemas | `LeaderboardParticipant` | 3744–3761 |
| schemas | `LeaderboardTeam` | 3763–3783 |
| schemas | `Leaderboard` | 3785–3797 |
| schemas | `MyResult` | 3799–3844 |
| schemas | `SharedGameInfo` | 3846–3856 |
| schemas | `PlayRequest` | 3858–3866 |
| schemas | `PlayResult` | 3868–3887 |
| schemas | `SessionListItem` | 3889–3907 |
| schemas | `SessionDetail` | 3909–3954 |
| schemas | `SessionResults` | 3956–4013 |
| schemas | `ParticipantInteraction` | 4015–4038 |
| schemas | `PageInfo` | 4040–4055 |
| schemas | `TeacherAccountStatus` | 4057–4059 |
| schemas | `AdminTeacher` | 4061–4079 |
| schemas | `AdminCreateTeacherRequest` | 4081–4096 |
| schemas | `AuditResult` | 4098–4100 |
| schemas | `AuditLogEntry` | 4102–4125 |
| schemas | `ServiceName` | 4127–4129 |
| schemas | `ServiceUsage` | 4131–4162 |
| schemas | `UsageReport` | 4164–4194 |
| schemas | `SystemStatus` | 4196–4219 |
| schemas | `AiConfigInput` | 4221–4242 |
| schemas | `AiConfigVersion` | 4244–4269 |
| schemas | `BlockedWords` | 4271–4278 |
