# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2156
- `components`: dòng 2157–4229

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
| POST | `/media/upload` | uploadMedia | planned | 837–893 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 898–941 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 942–983 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 988–1011 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1016–1036 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1041–1060 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1065–1085 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1090–1119 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1124–1151 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1157–1188 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1194–1241 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1244–1279 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1284–1327 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1332–1377 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1382–1429 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1434–1494 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 1499–1531 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 1536–1563 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1568–1594 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1599–1635 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 1638–1683 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 1684–1721 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 1726–1744 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 1745–1779 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 1784–1807 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 1812–1831 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 1834–1896 |
| GET | `/admin/usage` | adminGetUsage | implemented | 1899–1953 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 1956–1981 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 1984–2017 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2020–2048 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2053–2083 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2088–2107 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2110–2126 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2127–2155 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2159–2165 |
| securitySchemes | `participantId` | 2166–2172 |
| securitySchemes | `refreshCookie` | 2173–2186 |
| parameters | `GameId` | 2189–2195 |
| parameters | `Page` | 2196–2203 |
| parameters | `Size` | 2204–2211 |
| parameters | `TeacherId` | 2212–2218 |
| parameters | `VersionId` | 2219–2225 |
| parameters | `SessionId` | 2226–2232 |
| parameters | `ParticipantId` | 2233–2239 |
| parameters | `ShareCode` | 2240–2248 |
| parameters | `QuestionId` | 2249–2256 |
| headers | `RetryAfter` | 2259–2263 |
| headers | `SetRefreshCookie` | 2264–2269 |
| headers | `ClearRefreshCookie` | 2270–2273 |
| responses | `AuthSuccess` | 2276–2294 |
| responses | `ValidationError` | 2295–2302 |
| responses | `Unauthorized` | 2303–2310 |
| responses | `GameSuccess` | 2311–2316 |
| responses | `AdminTeacherSuccess` | 2317–2327 |
| responses | `TeacherStatusSuccess` | 2328–2345 |
| responses | `AiConfigVersionSuccess` | 2346–2356 |
| responses | `BlockedWordsSuccess` | 2357–2367 |
| responses | `SessionControlSuccess` | 2368–2385 |
| responses | `Forbidden` | 2386–2392 |
| responses | `NotFound` | 2393–2398 |
| responses | `Conflict` | 2399–2406 |
| responses | `UnprocessableContent` | 2407–2419 |
| responses | `AiTimeout` | 2420–2427 |
| responses | `RateLimited` | 2428–2436 |
| responses | `InternalError` | 2437–2442 |
| schemas | `ErrorCode` | 2445–2478 |
| schemas | `ErrorBody` | 2480–2511 |
| schemas | `ErrorResponse` | 2513–2519 |
| schemas | `Password` | 2521–2528 |
| schemas | `Role` | 2530–2532 |
| schemas | `RegisterRequest` | 2534–2557 |
| schemas | `RegisterResult` | 2559–2568 |
| schemas | `LoginRequest` | 2570–2583 |
| schemas | `TeacherInfo` | 2585–2601 |
| schemas | `AuthData` | 2603–2615 |
| schemas | `Subject` | 2617–2619 |
| schemas | `GradeLevel` | 2621–2623 |
| schemas | `GameType` | 2625–2641 |
| schemas | `GameStatus` | 2643–2645 |
| schemas | `Voice` | 2647–2658 |
| schemas | `GenerateGameRequest` | 2660–2708 |
| schemas | `UnderstandGameRequest` | 2710–2727 |
| schemas | `ReviseGameRequest` | 2729–2743 |
| schemas | `ChatTurn` | 2745–2755 |
| schemas | `GameUnderstanding` | 2757–2809 |
| schemas | `GameUnderstandingResponse` | 2811–2840 |
| schemas | `GameUnderstandingResult` | 2842–2850 |
| schemas | `GameEnvelope` | 2852–2869 |
| schemas | `CpfGameEnvelope` | 2871–2876 |
| schemas | `Question` | 2878–2892 |
| schemas | `GameResponse` | 2894–2900 |
| schemas | `CpfGameResponse` | 2902–2921 |
| schemas | `DslGameResponse` | 2923–3004 |
| schemas | `GameResult` | 3006–3012 |
| schemas | `GameSummary` | 3014–3051 |
| schemas | `CurriculumReview` | 3053–3095 |
| schemas | `PublishResult` | 3097–3113 |
| schemas | `SessionType` | 3115–3120 |
| schemas | `SessionStatus` | 3122–3124 |
| schemas | `ParticipantStatus` | 3126–3131 |
| schemas | `InteractionStatus` | 3133–3135 |
| schemas | `GroupingStrategy` | 3137–3139 |
| schemas | `TeamInfo` | 3141–3154 |
| schemas | `TeamInput` | 3156–3164 |
| schemas | `CreateSessionRequest` | 3166–3191 |
| schemas | `CreateSessionResult` | 3193–3217 |
| schemas | `SessionByCode` | 3219–3238 |
| schemas | `JoinRequest` | 3240–3252 |
| schemas | `JoinResult` | 3254–3272 |
| schemas | `TeamAssignRequest` | 3274–3280 |
| schemas | `StudentGameResponse` | 3282–3345 |
| schemas | `StudentOddOneOutImageQuestion` | 3347–3368 |
| schemas | `MatchingStudentItem` | 3370–3395 |
| schemas | `MatchingStudentQuestion` | 3397–3453 |
| schemas | `StudentVisualClozeImageQuestion` | 3455–3499 |
| schemas | `InteractionBase` | 3501–3512 |
| schemas | `InteractionRequest` | 3514–3654 |
| schemas | `InteractionResult` | 3656–3692 |
| schemas | `LeaderboardParticipant` | 3694–3711 |
| schemas | `LeaderboardTeam` | 3713–3733 |
| schemas | `Leaderboard` | 3735–3747 |
| schemas | `MyResult` | 3749–3794 |
| schemas | `SharedGameInfo` | 3796–3806 |
| schemas | `PlayRequest` | 3808–3816 |
| schemas | `PlayResult` | 3818–3837 |
| schemas | `SessionListItem` | 3839–3857 |
| schemas | `SessionDetail` | 3859–3904 |
| schemas | `SessionResults` | 3906–3963 |
| schemas | `ParticipantInteraction` | 3965–3988 |
| schemas | `PageInfo` | 3990–4005 |
| schemas | `TeacherAccountStatus` | 4007–4009 |
| schemas | `AdminTeacher` | 4011–4029 |
| schemas | `AdminCreateTeacherRequest` | 4031–4046 |
| schemas | `AuditResult` | 4048–4050 |
| schemas | `AuditLogEntry` | 4052–4075 |
| schemas | `ServiceName` | 4077–4079 |
| schemas | `ServiceUsage` | 4081–4112 |
| schemas | `UsageReport` | 4114–4144 |
| schemas | `SystemStatus` | 4146–4169 |
| schemas | `AiConfigInput` | 4171–4192 |
| schemas | `AiConfigVersion` | 4194–4219 |
| schemas | `BlockedWords` | 4221–4228 |
