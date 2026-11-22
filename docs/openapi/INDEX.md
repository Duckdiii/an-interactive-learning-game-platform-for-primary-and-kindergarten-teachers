# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2155
- `components`: dòng 2156–4226

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
| POST | `/media/upload` | uploadMedia | planned | 836–892 |
| POST | `/games/{gameId}/sessions` | createSession | planned | 897–940 |
| GET | `/games/{gameId}/sessions` | listGameSessions | planned | 941–982 |
| POST | `/sessions/{sessionId}/start` | startSession | planned | 987–1010 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | planned | 1015–1035 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | planned | 1040–1059 |
| POST | `/sessions/{sessionId}/close` | closeSession | planned | 1064–1084 |
| GET | `/sessions/{sessionId}` | getSession | planned | 1089–1118 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | planned | 1123–1150 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | planned | 1156–1187 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | planned | 1193–1240 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | planned | 1243–1278 |
| POST | `/sessions/{sessionId}/join` | joinSession | planned | 1283–1326 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | planned | 1331–1376 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1381–1428 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1433–1493 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | planned | 1498–1530 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | planned | 1535–1562 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1567–1593 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1598–1634 |
| GET | `/admin/teachers` | adminListTeachers | planned | 1637–1682 |
| POST | `/admin/teachers` | adminCreateTeacher | planned | 1683–1720 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | planned | 1725–1743 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | planned | 1744–1778 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | planned | 1783–1806 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | planned | 1811–1830 |
| GET | `/admin/audit-logs` | adminListAuditLogs | planned | 1833–1895 |
| GET | `/admin/usage` | adminGetUsage | planned | 1898–1952 |
| GET | `/admin/system-status` | adminGetSystemStatus | planned | 1955–1980 |
| GET | `/admin/ai-config` | adminGetAiConfig | planned | 1983–2016 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | planned | 2019–2047 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | planned | 2052–2082 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | planned | 2087–2106 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | planned | 2109–2125 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | planned | 2126–2154 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2158–2164 |
| securitySchemes | `participantId` | 2165–2171 |
| securitySchemes | `refreshCookie` | 2172–2185 |
| parameters | `GameId` | 2188–2194 |
| parameters | `Page` | 2195–2202 |
| parameters | `Size` | 2203–2210 |
| parameters | `TeacherId` | 2211–2217 |
| parameters | `VersionId` | 2218–2224 |
| parameters | `SessionId` | 2225–2231 |
| parameters | `ParticipantId` | 2232–2238 |
| parameters | `ShareCode` | 2239–2247 |
| parameters | `QuestionId` | 2248–2255 |
| headers | `RetryAfter` | 2258–2262 |
| headers | `SetRefreshCookie` | 2263–2268 |
| headers | `ClearRefreshCookie` | 2269–2272 |
| responses | `AuthSuccess` | 2275–2293 |
| responses | `ValidationError` | 2294–2301 |
| responses | `Unauthorized` | 2302–2309 |
| responses | `GameSuccess` | 2310–2315 |
| responses | `AdminTeacherSuccess` | 2316–2326 |
| responses | `TeacherStatusSuccess` | 2327–2344 |
| responses | `AiConfigVersionSuccess` | 2345–2355 |
| responses | `BlockedWordsSuccess` | 2356–2366 |
| responses | `SessionControlSuccess` | 2367–2384 |
| responses | `Forbidden` | 2385–2391 |
| responses | `NotFound` | 2392–2397 |
| responses | `Conflict` | 2398–2405 |
| responses | `UnprocessableContent` | 2406–2418 |
| responses | `AiTimeout` | 2419–2426 |
| responses | `RateLimited` | 2427–2435 |
| responses | `InternalError` | 2436–2441 |
| schemas | `ErrorCode` | 2444–2475 |
| schemas | `ErrorBody` | 2477–2508 |
| schemas | `ErrorResponse` | 2510–2516 |
| schemas | `Password` | 2518–2525 |
| schemas | `Role` | 2527–2529 |
| schemas | `RegisterRequest` | 2531–2554 |
| schemas | `RegisterResult` | 2556–2565 |
| schemas | `LoginRequest` | 2567–2580 |
| schemas | `TeacherInfo` | 2582–2598 |
| schemas | `AuthData` | 2600–2612 |
| schemas | `Subject` | 2614–2616 |
| schemas | `GradeLevel` | 2618–2620 |
| schemas | `GameType` | 2622–2638 |
| schemas | `GameStatus` | 2640–2642 |
| schemas | `Voice` | 2644–2655 |
| schemas | `GenerateGameRequest` | 2657–2705 |
| schemas | `UnderstandGameRequest` | 2707–2724 |
| schemas | `ReviseGameRequest` | 2726–2740 |
| schemas | `ChatTurn` | 2742–2752 |
| schemas | `GameUnderstanding` | 2754–2806 |
| schemas | `GameUnderstandingResponse` | 2808–2837 |
| schemas | `GameUnderstandingResult` | 2839–2847 |
| schemas | `GameEnvelope` | 2849–2866 |
| schemas | `CpfGameEnvelope` | 2868–2873 |
| schemas | `Question` | 2875–2889 |
| schemas | `GameResponse` | 2891–2897 |
| schemas | `CpfGameResponse` | 2899–2918 |
| schemas | `DslGameResponse` | 2920–3001 |
| schemas | `GameResult` | 3003–3009 |
| schemas | `GameSummary` | 3011–3048 |
| schemas | `CurriculumReview` | 3050–3092 |
| schemas | `PublishResult` | 3094–3110 |
| schemas | `SessionType` | 3112–3117 |
| schemas | `SessionStatus` | 3119–3121 |
| schemas | `ParticipantStatus` | 3123–3128 |
| schemas | `InteractionStatus` | 3130–3132 |
| schemas | `GroupingStrategy` | 3134–3136 |
| schemas | `TeamInfo` | 3138–3151 |
| schemas | `TeamInput` | 3153–3161 |
| schemas | `CreateSessionRequest` | 3163–3188 |
| schemas | `CreateSessionResult` | 3190–3214 |
| schemas | `SessionByCode` | 3216–3235 |
| schemas | `JoinRequest` | 3237–3249 |
| schemas | `JoinResult` | 3251–3269 |
| schemas | `TeamAssignRequest` | 3271–3277 |
| schemas | `StudentGameResponse` | 3279–3342 |
| schemas | `StudentOddOneOutImageQuestion` | 3344–3365 |
| schemas | `MatchingStudentItem` | 3367–3392 |
| schemas | `MatchingStudentQuestion` | 3394–3450 |
| schemas | `StudentVisualClozeImageQuestion` | 3452–3496 |
| schemas | `InteractionBase` | 3498–3509 |
| schemas | `InteractionRequest` | 3511–3651 |
| schemas | `InteractionResult` | 3653–3689 |
| schemas | `LeaderboardParticipant` | 3691–3708 |
| schemas | `LeaderboardTeam` | 3710–3730 |
| schemas | `Leaderboard` | 3732–3744 |
| schemas | `MyResult` | 3746–3791 |
| schemas | `SharedGameInfo` | 3793–3803 |
| schemas | `PlayRequest` | 3805–3813 |
| schemas | `PlayResult` | 3815–3834 |
| schemas | `SessionListItem` | 3836–3854 |
| schemas | `SessionDetail` | 3856–3901 |
| schemas | `SessionResults` | 3903–3960 |
| schemas | `ParticipantInteraction` | 3962–3985 |
| schemas | `PageInfo` | 3987–4002 |
| schemas | `TeacherAccountStatus` | 4004–4006 |
| schemas | `AdminTeacher` | 4008–4026 |
| schemas | `AdminCreateTeacherRequest` | 4028–4043 |
| schemas | `AuditResult` | 4045–4047 |
| schemas | `AuditLogEntry` | 4049–4072 |
| schemas | `ServiceName` | 4074–4076 |
| schemas | `ServiceUsage` | 4078–4109 |
| schemas | `UsageReport` | 4111–4141 |
| schemas | `SystemStatus` | 4143–4166 |
| schemas | `AiConfigInput` | 4168–4189 |
| schemas | `AiConfigVersion` | 4191–4216 |
| schemas | `BlockedWords` | 4218–4225 |
