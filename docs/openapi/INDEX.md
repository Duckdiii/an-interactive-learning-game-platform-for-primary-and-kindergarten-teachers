# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2080
- `components`: dòng 2081–3980

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
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | planned | 696–759 |
| POST | `/media/upload` | uploadMedia | planned | 762–818 |
| POST | `/games/{gameId}/sessions` | createSession | planned | 823–866 |
| GET | `/games/{gameId}/sessions` | listGameSessions | planned | 867–908 |
| POST | `/sessions/{sessionId}/start` | startSession | planned | 913–936 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | planned | 941–961 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | planned | 966–985 |
| POST | `/sessions/{sessionId}/close` | closeSession | planned | 990–1010 |
| GET | `/sessions/{sessionId}` | getSession | planned | 1015–1044 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | planned | 1049–1076 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | planned | 1082–1113 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | planned | 1119–1166 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | planned | 1169–1204 |
| POST | `/sessions/{sessionId}/join` | joinSession | planned | 1209–1252 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | planned | 1257–1302 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | planned | 1307–1353 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | planned | 1358–1418 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | planned | 1423–1455 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | planned | 1460–1487 |
| GET | `/games/shared/{shareCode}` | getSharedGame | planned | 1492–1518 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | planned | 1523–1559 |
| GET | `/admin/teachers` | adminListTeachers | planned | 1562–1607 |
| POST | `/admin/teachers` | adminCreateTeacher | planned | 1608–1645 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | planned | 1650–1668 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | planned | 1669–1703 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | planned | 1708–1731 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | planned | 1736–1755 |
| GET | `/admin/audit-logs` | adminListAuditLogs | planned | 1758–1820 |
| GET | `/admin/usage` | adminGetUsage | planned | 1823–1877 |
| GET | `/admin/system-status` | adminGetSystemStatus | planned | 1880–1905 |
| GET | `/admin/ai-config` | adminGetAiConfig | planned | 1908–1941 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | planned | 1944–1972 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | planned | 1977–2007 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | planned | 2012–2031 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | planned | 2034–2050 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | planned | 2051–2079 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2083–2089 |
| securitySchemes | `participantId` | 2090–2096 |
| securitySchemes | `refreshCookie` | 2097–2110 |
| parameters | `GameId` | 2113–2119 |
| parameters | `Page` | 2120–2127 |
| parameters | `Size` | 2128–2135 |
| parameters | `TeacherId` | 2136–2142 |
| parameters | `VersionId` | 2143–2149 |
| parameters | `SessionId` | 2150–2156 |
| parameters | `ParticipantId` | 2157–2163 |
| parameters | `ShareCode` | 2164–2172 |
| parameters | `QuestionId` | 2173–2180 |
| headers | `RetryAfter` | 2183–2187 |
| headers | `SetRefreshCookie` | 2188–2193 |
| headers | `ClearRefreshCookie` | 2194–2197 |
| responses | `AuthSuccess` | 2200–2218 |
| responses | `ValidationError` | 2219–2226 |
| responses | `Unauthorized` | 2227–2234 |
| responses | `GameSuccess` | 2235–2240 |
| responses | `AdminTeacherSuccess` | 2241–2251 |
| responses | `TeacherStatusSuccess` | 2252–2269 |
| responses | `AiConfigVersionSuccess` | 2270–2280 |
| responses | `BlockedWordsSuccess` | 2281–2291 |
| responses | `SessionControlSuccess` | 2292–2309 |
| responses | `Forbidden` | 2310–2316 |
| responses | `NotFound` | 2317–2322 |
| responses | `Conflict` | 2323–2330 |
| responses | `UnprocessableContent` | 2331–2343 |
| responses | `AiTimeout` | 2344–2351 |
| responses | `RateLimited` | 2352–2360 |
| responses | `InternalError` | 2361–2366 |
| schemas | `ErrorCode` | 2369–2400 |
| schemas | `ErrorBody` | 2402–2433 |
| schemas | `ErrorResponse` | 2435–2441 |
| schemas | `Password` | 2443–2450 |
| schemas | `Role` | 2452–2454 |
| schemas | `RegisterRequest` | 2456–2479 |
| schemas | `RegisterResult` | 2481–2490 |
| schemas | `LoginRequest` | 2492–2505 |
| schemas | `TeacherInfo` | 2507–2523 |
| schemas | `AuthData` | 2525–2537 |
| schemas | `Subject` | 2539–2541 |
| schemas | `GradeLevel` | 2543–2545 |
| schemas | `GameType` | 2547–2563 |
| schemas | `GameStatus` | 2565–2567 |
| schemas | `Voice` | 2569–2580 |
| schemas | `GenerateGameRequest` | 2582–2607 |
| schemas | `UnderstandGameRequest` | 2609–2626 |
| schemas | `ReviseGameRequest` | 2628–2642 |
| schemas | `ChatTurn` | 2644–2654 |
| schemas | `GameUnderstanding` | 2656–2708 |
| schemas | `GameUnderstandingResponse` | 2710–2739 |
| schemas | `GameUnderstandingResult` | 2741–2749 |
| schemas | `GameEnvelope` | 2751–2766 |
| schemas | `CpfGameEnvelope` | 2768–2773 |
| schemas | `Question` | 2775–2787 |
| schemas | `GameResponse` | 2789–2795 |
| schemas | `CpfGameResponse` | 2797–2816 |
| schemas | `DslGameResponse` | 2818–2895 |
| schemas | `GameResult` | 2897–2903 |
| schemas | `GameSummary` | 2905–2942 |
| schemas | `PublishResult` | 2944–2960 |
| schemas | `SessionType` | 2962–2967 |
| schemas | `SessionStatus` | 2969–2971 |
| schemas | `ParticipantStatus` | 2973–2978 |
| schemas | `InteractionStatus` | 2980–2982 |
| schemas | `GroupingStrategy` | 2984–2986 |
| schemas | `TeamInfo` | 2988–3001 |
| schemas | `TeamInput` | 3003–3011 |
| schemas | `CreateSessionRequest` | 3013–3038 |
| schemas | `CreateSessionResult` | 3040–3064 |
| schemas | `SessionByCode` | 3066–3085 |
| schemas | `JoinRequest` | 3087–3099 |
| schemas | `JoinResult` | 3101–3119 |
| schemas | `TeamAssignRequest` | 3121–3127 |
| schemas | `StudentGameResponse` | 3129–3184 |
| schemas | `MatchingStudentItem` | 3186–3211 |
| schemas | `MatchingStudentQuestion` | 3213–3269 |
| schemas | `InteractionBase` | 3271–3282 |
| schemas | `InteractionRequest` | 3284–3411 |
| schemas | `InteractionResult` | 3413–3443 |
| schemas | `LeaderboardParticipant` | 3445–3462 |
| schemas | `LeaderboardTeam` | 3464–3484 |
| schemas | `Leaderboard` | 3486–3498 |
| schemas | `MyResult` | 3500–3545 |
| schemas | `SharedGameInfo` | 3547–3557 |
| schemas | `PlayRequest` | 3559–3567 |
| schemas | `PlayResult` | 3569–3588 |
| schemas | `SessionListItem` | 3590–3608 |
| schemas | `SessionDetail` | 3610–3655 |
| schemas | `SessionResults` | 3657–3714 |
| schemas | `ParticipantInteraction` | 3716–3739 |
| schemas | `PageInfo` | 3741–3756 |
| schemas | `TeacherAccountStatus` | 3758–3760 |
| schemas | `AdminTeacher` | 3762–3780 |
| schemas | `AdminCreateTeacherRequest` | 3782–3797 |
| schemas | `AuditResult` | 3799–3801 |
| schemas | `AuditLogEntry` | 3803–3826 |
| schemas | `ServiceName` | 3828–3830 |
| schemas | `ServiceUsage` | 3832–3863 |
| schemas | `UsageReport` | 3865–3895 |
| schemas | `SystemStatus` | 3897–3920 |
| schemas | `AiConfigInput` | 3922–3943 |
| schemas | `AiConfigVersion` | 3945–3970 |
| schemas | `BlockedWords` | 3972–3979 |
