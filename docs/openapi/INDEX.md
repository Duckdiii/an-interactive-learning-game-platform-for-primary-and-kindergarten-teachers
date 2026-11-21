# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2154
- `components`: dòng 2155–4225

## Operation

| Method | Path | operationId | x-status | Dòng |
|---|---|---|---|---|
| POST | `/auth/register` | register | extended-pending | 74–106 |
| POST | `/auth/login` | login | extended-pending | 109–156 |
| POST | `/auth/refresh` | refreshToken | implemented | 159–185 |
| POST | `/auth/logout` | logout | implemented | 188–205 |
| POST | `/auth/forgot-password` | forgotPassword | implemented | 208–258 |
| POST | `/auth/reset-password` | resetPassword | implemented | 261–292 |
| GET | `/catalog/noto` |  | implemented | 295–323 |
| POST | `/games/generate` | generateGame | extended-pending | 326–399 |
| POST | `/games/understand` | understandGameRequest | implemented | 402–441 |
| GET | `/games` | listGames | extended-pending | 444–482 |
| GET | `/games/{gameId}` | getGame | implemented | 487–504 |
| PUT | `/games/{gameId}` | updateGame | extended-pending | 505–550 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 551–571 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 576–626 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | planned | 631–680 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 685–724 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 729–763 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | planned | 769–832 |
| POST | `/media/upload` | uploadMedia | planned | 835–891 |
| POST | `/games/{gameId}/sessions` | createSession | planned | 896–939 |
| GET | `/games/{gameId}/sessions` | listGameSessions | planned | 940–981 |
| POST | `/sessions/{sessionId}/start` | startSession | planned | 986–1009 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | planned | 1014–1034 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | planned | 1039–1058 |
| POST | `/sessions/{sessionId}/close` | closeSession | planned | 1063–1083 |
| GET | `/sessions/{sessionId}` | getSession | planned | 1088–1117 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | planned | 1122–1149 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | planned | 1155–1186 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | planned | 1192–1239 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | planned | 1242–1277 |
| POST | `/sessions/{sessionId}/join` | joinSession | planned | 1282–1325 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | planned | 1330–1375 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1380–1427 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1432–1492 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | planned | 1497–1529 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | planned | 1534–1561 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1566–1592 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1597–1633 |
| GET | `/admin/teachers` | adminListTeachers | planned | 1636–1681 |
| POST | `/admin/teachers` | adminCreateTeacher | planned | 1682–1719 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | planned | 1724–1742 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | planned | 1743–1777 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | planned | 1782–1805 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | planned | 1810–1829 |
| GET | `/admin/audit-logs` | adminListAuditLogs | planned | 1832–1894 |
| GET | `/admin/usage` | adminGetUsage | planned | 1897–1951 |
| GET | `/admin/system-status` | adminGetSystemStatus | planned | 1954–1979 |
| GET | `/admin/ai-config` | adminGetAiConfig | planned | 1982–2015 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | planned | 2018–2046 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | planned | 2051–2081 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | planned | 2086–2105 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | planned | 2108–2124 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | planned | 2125–2153 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2157–2163 |
| securitySchemes | `participantId` | 2164–2170 |
| securitySchemes | `refreshCookie` | 2171–2184 |
| parameters | `GameId` | 2187–2193 |
| parameters | `Page` | 2194–2201 |
| parameters | `Size` | 2202–2209 |
| parameters | `TeacherId` | 2210–2216 |
| parameters | `VersionId` | 2217–2223 |
| parameters | `SessionId` | 2224–2230 |
| parameters | `ParticipantId` | 2231–2237 |
| parameters | `ShareCode` | 2238–2246 |
| parameters | `QuestionId` | 2247–2254 |
| headers | `RetryAfter` | 2257–2261 |
| headers | `SetRefreshCookie` | 2262–2267 |
| headers | `ClearRefreshCookie` | 2268–2271 |
| responses | `AuthSuccess` | 2274–2292 |
| responses | `ValidationError` | 2293–2300 |
| responses | `Unauthorized` | 2301–2308 |
| responses | `GameSuccess` | 2309–2314 |
| responses | `AdminTeacherSuccess` | 2315–2325 |
| responses | `TeacherStatusSuccess` | 2326–2343 |
| responses | `AiConfigVersionSuccess` | 2344–2354 |
| responses | `BlockedWordsSuccess` | 2355–2365 |
| responses | `SessionControlSuccess` | 2366–2383 |
| responses | `Forbidden` | 2384–2390 |
| responses | `NotFound` | 2391–2396 |
| responses | `Conflict` | 2397–2404 |
| responses | `UnprocessableContent` | 2405–2417 |
| responses | `AiTimeout` | 2418–2425 |
| responses | `RateLimited` | 2426–2434 |
| responses | `InternalError` | 2435–2440 |
| schemas | `ErrorCode` | 2443–2474 |
| schemas | `ErrorBody` | 2476–2507 |
| schemas | `ErrorResponse` | 2509–2515 |
| schemas | `Password` | 2517–2524 |
| schemas | `Role` | 2526–2528 |
| schemas | `RegisterRequest` | 2530–2553 |
| schemas | `RegisterResult` | 2555–2564 |
| schemas | `LoginRequest` | 2566–2579 |
| schemas | `TeacherInfo` | 2581–2597 |
| schemas | `AuthData` | 2599–2611 |
| schemas | `Subject` | 2613–2615 |
| schemas | `GradeLevel` | 2617–2619 |
| schemas | `GameType` | 2621–2637 |
| schemas | `GameStatus` | 2639–2641 |
| schemas | `Voice` | 2643–2654 |
| schemas | `GenerateGameRequest` | 2656–2704 |
| schemas | `UnderstandGameRequest` | 2706–2723 |
| schemas | `ReviseGameRequest` | 2725–2739 |
| schemas | `ChatTurn` | 2741–2751 |
| schemas | `GameUnderstanding` | 2753–2805 |
| schemas | `GameUnderstandingResponse` | 2807–2836 |
| schemas | `GameUnderstandingResult` | 2838–2846 |
| schemas | `GameEnvelope` | 2848–2865 |
| schemas | `CpfGameEnvelope` | 2867–2872 |
| schemas | `Question` | 2874–2888 |
| schemas | `GameResponse` | 2890–2896 |
| schemas | `CpfGameResponse` | 2898–2917 |
| schemas | `DslGameResponse` | 2919–3000 |
| schemas | `GameResult` | 3002–3008 |
| schemas | `GameSummary` | 3010–3047 |
| schemas | `CurriculumReview` | 3049–3091 |
| schemas | `PublishResult` | 3093–3109 |
| schemas | `SessionType` | 3111–3116 |
| schemas | `SessionStatus` | 3118–3120 |
| schemas | `ParticipantStatus` | 3122–3127 |
| schemas | `InteractionStatus` | 3129–3131 |
| schemas | `GroupingStrategy` | 3133–3135 |
| schemas | `TeamInfo` | 3137–3150 |
| schemas | `TeamInput` | 3152–3160 |
| schemas | `CreateSessionRequest` | 3162–3187 |
| schemas | `CreateSessionResult` | 3189–3213 |
| schemas | `SessionByCode` | 3215–3234 |
| schemas | `JoinRequest` | 3236–3248 |
| schemas | `JoinResult` | 3250–3268 |
| schemas | `TeamAssignRequest` | 3270–3276 |
| schemas | `StudentGameResponse` | 3278–3341 |
| schemas | `StudentOddOneOutImageQuestion` | 3343–3364 |
| schemas | `MatchingStudentItem` | 3366–3391 |
| schemas | `MatchingStudentQuestion` | 3393–3449 |
| schemas | `StudentVisualClozeImageQuestion` | 3451–3495 |
| schemas | `InteractionBase` | 3497–3508 |
| schemas | `InteractionRequest` | 3510–3650 |
| schemas | `InteractionResult` | 3652–3688 |
| schemas | `LeaderboardParticipant` | 3690–3707 |
| schemas | `LeaderboardTeam` | 3709–3729 |
| schemas | `Leaderboard` | 3731–3743 |
| schemas | `MyResult` | 3745–3790 |
| schemas | `SharedGameInfo` | 3792–3802 |
| schemas | `PlayRequest` | 3804–3812 |
| schemas | `PlayResult` | 3814–3833 |
| schemas | `SessionListItem` | 3835–3853 |
| schemas | `SessionDetail` | 3855–3900 |
| schemas | `SessionResults` | 3902–3959 |
| schemas | `ParticipantInteraction` | 3961–3984 |
| schemas | `PageInfo` | 3986–4001 |
| schemas | `TeacherAccountStatus` | 4003–4005 |
| schemas | `AdminTeacher` | 4007–4025 |
| schemas | `AdminCreateTeacherRequest` | 4027–4042 |
| schemas | `AuditResult` | 4044–4046 |
| schemas | `AuditLogEntry` | 4048–4071 |
| schemas | `ServiceName` | 4073–4075 |
| schemas | `ServiceUsage` | 4077–4108 |
| schemas | `UsageReport` | 4110–4140 |
| schemas | `SystemStatus` | 4142–4165 |
| schemas | `AiConfigInput` | 4167–4188 |
| schemas | `AiConfigVersion` | 4190–4215 |
| schemas | `BlockedWords` | 4217–4224 |
