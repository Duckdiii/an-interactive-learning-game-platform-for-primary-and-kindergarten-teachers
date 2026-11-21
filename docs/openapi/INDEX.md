# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–71
- `paths`: dòng 72–2151
- `components`: dòng 2152–4222

## Operation

| Method | Path | operationId | x-status | Dòng |
|---|---|---|---|---|
| POST | `/auth/register` | register | extended-pending | 74–106 |
| POST | `/auth/login` | login | extended-pending | 109–158 |
| POST | `/auth/refresh` | refreshToken | implemented | 161–187 |
| POST | `/auth/logout` | logout | implemented | 190–207 |
| POST | `/auth/forgot-password` | forgotPassword | planned | 210–258 |
| POST | `/auth/reset-password` | resetPassword | planned | 261–289 |
| GET | `/catalog/noto` |  | implemented | 292–320 |
| POST | `/games/generate` | generateGame | extended-pending | 323–396 |
| POST | `/games/understand` | understandGameRequest | implemented | 399–438 |
| GET | `/games` | listGames | extended-pending | 441–479 |
| GET | `/games/{gameId}` | getGame | implemented | 484–501 |
| PUT | `/games/{gameId}` | updateGame | extended-pending | 502–547 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 548–568 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 573–623 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | planned | 628–677 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 682–721 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 726–760 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | planned | 766–829 |
| POST | `/media/upload` | uploadMedia | planned | 832–888 |
| POST | `/games/{gameId}/sessions` | createSession | planned | 893–936 |
| GET | `/games/{gameId}/sessions` | listGameSessions | planned | 937–978 |
| POST | `/sessions/{sessionId}/start` | startSession | planned | 983–1006 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | planned | 1011–1031 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | planned | 1036–1055 |
| POST | `/sessions/{sessionId}/close` | closeSession | planned | 1060–1080 |
| GET | `/sessions/{sessionId}` | getSession | planned | 1085–1114 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | planned | 1119–1146 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | planned | 1152–1183 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | planned | 1189–1236 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | planned | 1239–1274 |
| POST | `/sessions/{sessionId}/join` | joinSession | planned | 1279–1322 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | planned | 1327–1372 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1377–1424 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1429–1489 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | planned | 1494–1526 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | planned | 1531–1558 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1563–1589 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1594–1630 |
| GET | `/admin/teachers` | adminListTeachers | planned | 1633–1678 |
| POST | `/admin/teachers` | adminCreateTeacher | planned | 1679–1716 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | planned | 1721–1739 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | planned | 1740–1774 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | planned | 1779–1802 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | planned | 1807–1826 |
| GET | `/admin/audit-logs` | adminListAuditLogs | planned | 1829–1891 |
| GET | `/admin/usage` | adminGetUsage | planned | 1894–1948 |
| GET | `/admin/system-status` | adminGetSystemStatus | planned | 1951–1976 |
| GET | `/admin/ai-config` | adminGetAiConfig | planned | 1979–2012 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | planned | 2015–2043 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | planned | 2048–2078 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | planned | 2083–2102 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | planned | 2105–2121 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | planned | 2122–2150 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2154–2160 |
| securitySchemes | `participantId` | 2161–2167 |
| securitySchemes | `refreshCookie` | 2168–2181 |
| parameters | `GameId` | 2184–2190 |
| parameters | `Page` | 2191–2198 |
| parameters | `Size` | 2199–2206 |
| parameters | `TeacherId` | 2207–2213 |
| parameters | `VersionId` | 2214–2220 |
| parameters | `SessionId` | 2221–2227 |
| parameters | `ParticipantId` | 2228–2234 |
| parameters | `ShareCode` | 2235–2243 |
| parameters | `QuestionId` | 2244–2251 |
| headers | `RetryAfter` | 2254–2258 |
| headers | `SetRefreshCookie` | 2259–2264 |
| headers | `ClearRefreshCookie` | 2265–2268 |
| responses | `AuthSuccess` | 2271–2289 |
| responses | `ValidationError` | 2290–2297 |
| responses | `Unauthorized` | 2298–2305 |
| responses | `GameSuccess` | 2306–2311 |
| responses | `AdminTeacherSuccess` | 2312–2322 |
| responses | `TeacherStatusSuccess` | 2323–2340 |
| responses | `AiConfigVersionSuccess` | 2341–2351 |
| responses | `BlockedWordsSuccess` | 2352–2362 |
| responses | `SessionControlSuccess` | 2363–2380 |
| responses | `Forbidden` | 2381–2387 |
| responses | `NotFound` | 2388–2393 |
| responses | `Conflict` | 2394–2401 |
| responses | `UnprocessableContent` | 2402–2414 |
| responses | `AiTimeout` | 2415–2422 |
| responses | `RateLimited` | 2423–2431 |
| responses | `InternalError` | 2432–2437 |
| schemas | `ErrorCode` | 2440–2471 |
| schemas | `ErrorBody` | 2473–2504 |
| schemas | `ErrorResponse` | 2506–2512 |
| schemas | `Password` | 2514–2521 |
| schemas | `Role` | 2523–2525 |
| schemas | `RegisterRequest` | 2527–2550 |
| schemas | `RegisterResult` | 2552–2561 |
| schemas | `LoginRequest` | 2563–2576 |
| schemas | `TeacherInfo` | 2578–2594 |
| schemas | `AuthData` | 2596–2608 |
| schemas | `Subject` | 2610–2612 |
| schemas | `GradeLevel` | 2614–2616 |
| schemas | `GameType` | 2618–2634 |
| schemas | `GameStatus` | 2636–2638 |
| schemas | `Voice` | 2640–2651 |
| schemas | `GenerateGameRequest` | 2653–2701 |
| schemas | `UnderstandGameRequest` | 2703–2720 |
| schemas | `ReviseGameRequest` | 2722–2736 |
| schemas | `ChatTurn` | 2738–2748 |
| schemas | `GameUnderstanding` | 2750–2802 |
| schemas | `GameUnderstandingResponse` | 2804–2833 |
| schemas | `GameUnderstandingResult` | 2835–2843 |
| schemas | `GameEnvelope` | 2845–2862 |
| schemas | `CpfGameEnvelope` | 2864–2869 |
| schemas | `Question` | 2871–2885 |
| schemas | `GameResponse` | 2887–2893 |
| schemas | `CpfGameResponse` | 2895–2914 |
| schemas | `DslGameResponse` | 2916–2997 |
| schemas | `GameResult` | 2999–3005 |
| schemas | `GameSummary` | 3007–3044 |
| schemas | `CurriculumReview` | 3046–3088 |
| schemas | `PublishResult` | 3090–3106 |
| schemas | `SessionType` | 3108–3113 |
| schemas | `SessionStatus` | 3115–3117 |
| schemas | `ParticipantStatus` | 3119–3124 |
| schemas | `InteractionStatus` | 3126–3128 |
| schemas | `GroupingStrategy` | 3130–3132 |
| schemas | `TeamInfo` | 3134–3147 |
| schemas | `TeamInput` | 3149–3157 |
| schemas | `CreateSessionRequest` | 3159–3184 |
| schemas | `CreateSessionResult` | 3186–3210 |
| schemas | `SessionByCode` | 3212–3231 |
| schemas | `JoinRequest` | 3233–3245 |
| schemas | `JoinResult` | 3247–3265 |
| schemas | `TeamAssignRequest` | 3267–3273 |
| schemas | `StudentGameResponse` | 3275–3338 |
| schemas | `StudentOddOneOutImageQuestion` | 3340–3361 |
| schemas | `MatchingStudentItem` | 3363–3388 |
| schemas | `MatchingStudentQuestion` | 3390–3446 |
| schemas | `StudentVisualClozeImageQuestion` | 3448–3492 |
| schemas | `InteractionBase` | 3494–3505 |
| schemas | `InteractionRequest` | 3507–3647 |
| schemas | `InteractionResult` | 3649–3685 |
| schemas | `LeaderboardParticipant` | 3687–3704 |
| schemas | `LeaderboardTeam` | 3706–3726 |
| schemas | `Leaderboard` | 3728–3740 |
| schemas | `MyResult` | 3742–3787 |
| schemas | `SharedGameInfo` | 3789–3799 |
| schemas | `PlayRequest` | 3801–3809 |
| schemas | `PlayResult` | 3811–3830 |
| schemas | `SessionListItem` | 3832–3850 |
| schemas | `SessionDetail` | 3852–3897 |
| schemas | `SessionResults` | 3899–3956 |
| schemas | `ParticipantInteraction` | 3958–3981 |
| schemas | `PageInfo` | 3983–3998 |
| schemas | `TeacherAccountStatus` | 4000–4002 |
| schemas | `AdminTeacher` | 4004–4022 |
| schemas | `AdminCreateTeacherRequest` | 4024–4039 |
| schemas | `AuditResult` | 4041–4043 |
| schemas | `AuditLogEntry` | 4045–4068 |
| schemas | `ServiceName` | 4070–4072 |
| schemas | `ServiceUsage` | 4074–4105 |
| schemas | `UsageReport` | 4107–4137 |
| schemas | `SystemStatus` | 4139–4162 |
| schemas | `AiConfigInput` | 4164–4185 |
| schemas | `AiConfigVersion` | 4187–4212 |
| schemas | `BlockedWords` | 4214–4221 |
