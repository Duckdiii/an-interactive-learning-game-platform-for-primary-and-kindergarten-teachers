# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2119
- `components`: dòng 2120–4063

## Operation

| Method | Path | operationId | x-status | Dòng |
|---|---|---|---|---|
| POST | `/auth/register` | register | extended-pending | 74–106 |
| POST | `/auth/login` | login | extended-pending | 109–158 |
| POST | `/auth/refresh` | refreshToken | implemented | 161–187 |
| POST | `/auth/logout` | logout | implemented | 190–207 |
| POST | `/auth/forgot-password` | forgotPassword | planned | 210–258 |
| POST | `/auth/reset-password` | resetPassword | planned | 261–289 |
| POST | `/games/generate` | generateGame | extended-pending | 292–365 |
| POST | `/games/understand` | understandGameRequest | implemented | 368–407 |
| GET | `/games` | listGames | extended-pending | 410–448 |
| GET | `/games/{gameId}` | getGame | implemented | 453–470 |
| PUT | `/games/{gameId}` | updateGame | extended-pending | 471–516 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 517–537 |
| POST | `/games/{gameId}/publish` | publishGame | planned | 542–592 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | planned | 597–646 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 651–690 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 695–729 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | planned | 735–798 |
| POST | `/media/upload` | uploadMedia | planned | 801–857 |
| POST | `/games/{gameId}/sessions` | createSession | planned | 862–905 |
| GET | `/games/{gameId}/sessions` | listGameSessions | planned | 906–947 |
| POST | `/sessions/{sessionId}/start` | startSession | planned | 952–975 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | planned | 980–1000 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | planned | 1005–1024 |
| POST | `/sessions/{sessionId}/close` | closeSession | planned | 1029–1049 |
| GET | `/sessions/{sessionId}` | getSession | planned | 1054–1083 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | planned | 1088–1115 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | planned | 1121–1152 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | planned | 1158–1205 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | planned | 1208–1243 |
| POST | `/sessions/{sessionId}/join` | joinSession | planned | 1248–1291 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | planned | 1296–1341 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | planned | 1346–1392 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | planned | 1397–1457 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | planned | 1462–1494 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | planned | 1499–1526 |
| GET | `/games/shared/{shareCode}` | getSharedGame | planned | 1531–1557 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | planned | 1562–1598 |
| GET | `/admin/teachers` | adminListTeachers | planned | 1601–1646 |
| POST | `/admin/teachers` | adminCreateTeacher | planned | 1647–1684 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | planned | 1689–1707 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | planned | 1708–1742 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | planned | 1747–1770 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | planned | 1775–1794 |
| GET | `/admin/audit-logs` | adminListAuditLogs | planned | 1797–1859 |
| GET | `/admin/usage` | adminGetUsage | planned | 1862–1916 |
| GET | `/admin/system-status` | adminGetSystemStatus | planned | 1919–1944 |
| GET | `/admin/ai-config` | adminGetAiConfig | planned | 1947–1980 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | planned | 1983–2011 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | planned | 2016–2046 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | planned | 2051–2070 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | planned | 2073–2089 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | planned | 2090–2118 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2122–2128 |
| securitySchemes | `participantId` | 2129–2135 |
| securitySchemes | `refreshCookie` | 2136–2149 |
| parameters | `GameId` | 2152–2158 |
| parameters | `Page` | 2159–2166 |
| parameters | `Size` | 2167–2174 |
| parameters | `TeacherId` | 2175–2181 |
| parameters | `VersionId` | 2182–2188 |
| parameters | `SessionId` | 2189–2195 |
| parameters | `ParticipantId` | 2196–2202 |
| parameters | `ShareCode` | 2203–2211 |
| parameters | `QuestionId` | 2212–2219 |
| headers | `RetryAfter` | 2222–2226 |
| headers | `SetRefreshCookie` | 2227–2232 |
| headers | `ClearRefreshCookie` | 2233–2236 |
| responses | `AuthSuccess` | 2239–2257 |
| responses | `ValidationError` | 2258–2265 |
| responses | `Unauthorized` | 2266–2273 |
| responses | `GameSuccess` | 2274–2279 |
| responses | `AdminTeacherSuccess` | 2280–2290 |
| responses | `TeacherStatusSuccess` | 2291–2308 |
| responses | `AiConfigVersionSuccess` | 2309–2319 |
| responses | `BlockedWordsSuccess` | 2320–2330 |
| responses | `SessionControlSuccess` | 2331–2348 |
| responses | `Forbidden` | 2349–2355 |
| responses | `NotFound` | 2356–2361 |
| responses | `Conflict` | 2362–2369 |
| responses | `UnprocessableContent` | 2370–2382 |
| responses | `AiTimeout` | 2383–2390 |
| responses | `RateLimited` | 2391–2399 |
| responses | `InternalError` | 2400–2405 |
| schemas | `ErrorCode` | 2408–2439 |
| schemas | `ErrorBody` | 2441–2472 |
| schemas | `ErrorResponse` | 2474–2480 |
| schemas | `Password` | 2482–2489 |
| schemas | `Role` | 2491–2493 |
| schemas | `RegisterRequest` | 2495–2518 |
| schemas | `RegisterResult` | 2520–2529 |
| schemas | `LoginRequest` | 2531–2544 |
| schemas | `TeacherInfo` | 2546–2562 |
| schemas | `AuthData` | 2564–2576 |
| schemas | `Subject` | 2578–2580 |
| schemas | `GradeLevel` | 2582–2584 |
| schemas | `GameType` | 2586–2602 |
| schemas | `GameStatus` | 2604–2606 |
| schemas | `Voice` | 2608–2619 |
| schemas | `GenerateGameRequest` | 2621–2646 |
| schemas | `UnderstandGameRequest` | 2648–2665 |
| schemas | `ReviseGameRequest` | 2667–2681 |
| schemas | `ChatTurn` | 2683–2693 |
| schemas | `GameUnderstanding` | 2695–2747 |
| schemas | `GameUnderstandingResponse` | 2749–2778 |
| schemas | `GameUnderstandingResult` | 2780–2788 |
| schemas | `GameEnvelope` | 2790–2805 |
| schemas | `CpfGameEnvelope` | 2807–2812 |
| schemas | `Question` | 2814–2826 |
| schemas | `GameResponse` | 2828–2834 |
| schemas | `CpfGameResponse` | 2836–2855 |
| schemas | `DslGameResponse` | 2857–2934 |
| schemas | `GameResult` | 2936–2942 |
| schemas | `GameSummary` | 2944–2981 |
| schemas | `CurriculumReview` | 2983–3025 |
| schemas | `PublishResult` | 3027–3043 |
| schemas | `SessionType` | 3045–3050 |
| schemas | `SessionStatus` | 3052–3054 |
| schemas | `ParticipantStatus` | 3056–3061 |
| schemas | `InteractionStatus` | 3063–3065 |
| schemas | `GroupingStrategy` | 3067–3069 |
| schemas | `TeamInfo` | 3071–3084 |
| schemas | `TeamInput` | 3086–3094 |
| schemas | `CreateSessionRequest` | 3096–3121 |
| schemas | `CreateSessionResult` | 3123–3147 |
| schemas | `SessionByCode` | 3149–3168 |
| schemas | `JoinRequest` | 3170–3182 |
| schemas | `JoinResult` | 3184–3202 |
| schemas | `TeamAssignRequest` | 3204–3210 |
| schemas | `StudentGameResponse` | 3212–3267 |
| schemas | `MatchingStudentItem` | 3269–3294 |
| schemas | `MatchingStudentQuestion` | 3296–3352 |
| schemas | `InteractionBase` | 3354–3365 |
| schemas | `InteractionRequest` | 3367–3494 |
| schemas | `InteractionResult` | 3496–3526 |
| schemas | `LeaderboardParticipant` | 3528–3545 |
| schemas | `LeaderboardTeam` | 3547–3567 |
| schemas | `Leaderboard` | 3569–3581 |
| schemas | `MyResult` | 3583–3628 |
| schemas | `SharedGameInfo` | 3630–3640 |
| schemas | `PlayRequest` | 3642–3650 |
| schemas | `PlayResult` | 3652–3671 |
| schemas | `SessionListItem` | 3673–3691 |
| schemas | `SessionDetail` | 3693–3738 |
| schemas | `SessionResults` | 3740–3797 |
| schemas | `ParticipantInteraction` | 3799–3822 |
| schemas | `PageInfo` | 3824–3839 |
| schemas | `TeacherAccountStatus` | 3841–3843 |
| schemas | `AdminTeacher` | 3845–3863 |
| schemas | `AdminCreateTeacherRequest` | 3865–3880 |
| schemas | `AuditResult` | 3882–3884 |
| schemas | `AuditLogEntry` | 3886–3909 |
| schemas | `ServiceName` | 3911–3913 |
| schemas | `ServiceUsage` | 3915–3946 |
| schemas | `UsageReport` | 3948–3978 |
| schemas | `SystemStatus` | 3980–4003 |
| schemas | `AiConfigInput` | 4005–4026 |
| schemas | `AiConfigVersion` | 4028–4053 |
| schemas | `BlockedWords` | 4055–4062 |
