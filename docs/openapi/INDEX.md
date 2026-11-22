# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2271
- `components`: dòng 2272–4354

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
| GET | `/admin/teachers` | adminListTeachers | implemented | 1690–1735 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 1736–1773 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 1778–1796 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 1797–1831 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 1836–1859 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 1864–1883 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 1886–1948 |
| GET | `/admin/usage` | adminGetUsage | implemented | 1951–2005 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2008–2033 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2036–2060 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2061–2096 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2099–2132 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2135–2163 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2168–2198 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2203–2222 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2225–2241 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2242–2270 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2274–2280 |
| securitySchemes | `participantId` | 2281–2287 |
| securitySchemes | `refreshCookie` | 2288–2301 |
| parameters | `GameId` | 2304–2310 |
| parameters | `Page` | 2311–2318 |
| parameters | `Size` | 2319–2326 |
| parameters | `TeacherId` | 2327–2333 |
| parameters | `VersionId` | 2334–2340 |
| parameters | `SessionId` | 2341–2347 |
| parameters | `ParticipantId` | 2348–2354 |
| parameters | `ShareCode` | 2355–2363 |
| parameters | `QuestionId` | 2364–2371 |
| headers | `RetryAfter` | 2374–2378 |
| headers | `SetRefreshCookie` | 2379–2384 |
| headers | `ClearRefreshCookie` | 2385–2388 |
| responses | `AuthSuccess` | 2391–2409 |
| responses | `ValidationError` | 2410–2417 |
| responses | `Unauthorized` | 2418–2425 |
| responses | `GameSuccess` | 2426–2431 |
| responses | `AdminTeacherSuccess` | 2432–2442 |
| responses | `TeacherStatusSuccess` | 2443–2460 |
| responses | `AiConfigVersionSuccess` | 2461–2471 |
| responses | `BlockedWordsSuccess` | 2472–2482 |
| responses | `SessionControlSuccess` | 2483–2500 |
| responses | `Forbidden` | 2501–2507 |
| responses | `NotFound` | 2508–2513 |
| responses | `Conflict` | 2514–2521 |
| responses | `UnprocessableContent` | 2522–2534 |
| responses | `AiTimeout` | 2535–2542 |
| responses | `RateLimited` | 2543–2551 |
| responses | `InternalError` | 2552–2557 |
| schemas | `ErrorCode` | 2560–2593 |
| schemas | `ErrorBody` | 2595–2626 |
| schemas | `ErrorResponse` | 2628–2634 |
| schemas | `Password` | 2636–2643 |
| schemas | `Role` | 2645–2647 |
| schemas | `RegisterRequest` | 2649–2672 |
| schemas | `RegisterResult` | 2674–2683 |
| schemas | `LoginRequest` | 2685–2698 |
| schemas | `TeacherInfo` | 2700–2716 |
| schemas | `AuthData` | 2718–2730 |
| schemas | `Subject` | 2732–2734 |
| schemas | `GradeLevel` | 2736–2738 |
| schemas | `GameType` | 2740–2756 |
| schemas | `GameStatus` | 2758–2760 |
| schemas | `Voice` | 2762–2773 |
| schemas | `GenerateGameRequest` | 2775–2823 |
| schemas | `UnderstandGameRequest` | 2825–2842 |
| schemas | `ReviseGameRequest` | 2844–2858 |
| schemas | `ChatTurn` | 2860–2870 |
| schemas | `GameUnderstanding` | 2872–2924 |
| schemas | `GameUnderstandingResponse` | 2926–2955 |
| schemas | `GameUnderstandingResult` | 2957–2965 |
| schemas | `GameEnvelope` | 2967–2984 |
| schemas | `CpfGameEnvelope` | 2986–2991 |
| schemas | `Question` | 2993–3007 |
| schemas | `GameResponse` | 3009–3015 |
| schemas | `CpfGameResponse` | 3017–3036 |
| schemas | `DslGameResponse` | 3038–3119 |
| schemas | `GameResult` | 3121–3127 |
| schemas | `GameSummary` | 3129–3166 |
| schemas | `CurriculumReview` | 3168–3210 |
| schemas | `PublishResult` | 3212–3228 |
| schemas | `SessionType` | 3230–3235 |
| schemas | `SessionStatus` | 3237–3239 |
| schemas | `ParticipantStatus` | 3241–3246 |
| schemas | `InteractionStatus` | 3248–3250 |
| schemas | `GroupingStrategy` | 3252–3254 |
| schemas | `TeamInfo` | 3256–3269 |
| schemas | `TeamInput` | 3271–3279 |
| schemas | `CreateSessionRequest` | 3281–3306 |
| schemas | `CreateSessionResult` | 3308–3332 |
| schemas | `SessionByCode` | 3334–3353 |
| schemas | `JoinRequest` | 3355–3367 |
| schemas | `JoinResult` | 3369–3387 |
| schemas | `TeamAssignRequest` | 3389–3395 |
| schemas | `StudentGameResponse` | 3397–3460 |
| schemas | `StudentOddOneOutImageQuestion` | 3462–3483 |
| schemas | `MatchingStudentItem` | 3485–3510 |
| schemas | `MatchingStudentQuestion` | 3512–3568 |
| schemas | `StudentVisualClozeImageQuestion` | 3570–3614 |
| schemas | `InteractionBase` | 3616–3627 |
| schemas | `InteractionRequest` | 3629–3769 |
| schemas | `InteractionResult` | 3771–3807 |
| schemas | `LeaderboardParticipant` | 3809–3826 |
| schemas | `LeaderboardTeam` | 3828–3848 |
| schemas | `Leaderboard` | 3850–3862 |
| schemas | `MyResult` | 3864–3909 |
| schemas | `SharedGameInfo` | 3911–3921 |
| schemas | `PlayRequest` | 3923–3931 |
| schemas | `PlayResult` | 3933–3952 |
| schemas | `SessionListItem` | 3954–3972 |
| schemas | `SessionDetail` | 3974–4019 |
| schemas | `SessionResults` | 4021–4078 |
| schemas | `ParticipantInteraction` | 4080–4103 |
| schemas | `PageInfo` | 4105–4120 |
| schemas | `TeacherAccountStatus` | 4122–4124 |
| schemas | `AdminBudgetConfig` | 4126–4135 |
| schemas | `AdminTeacher` | 4136–4154 |
| schemas | `AdminCreateTeacherRequest` | 4156–4171 |
| schemas | `AuditResult` | 4173–4175 |
| schemas | `AuditLogEntry` | 4177–4200 |
| schemas | `ServiceName` | 4202–4204 |
| schemas | `ServiceUsage` | 4206–4237 |
| schemas | `UsageReport` | 4239–4269 |
| schemas | `SystemStatus` | 4271–4294 |
| schemas | `AiConfigInput` | 4296–4317 |
| schemas | `AiConfigVersion` | 4319–4344 |
| schemas | `BlockedWords` | 4346–4353 |
