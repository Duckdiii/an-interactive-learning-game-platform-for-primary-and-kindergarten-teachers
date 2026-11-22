# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–73
- `paths`: dòng 74–2536
- `components`: dòng 2537–4831

## Operation

| Method | Path | operationId | x-status | Dòng |
|---|---|---|---|---|
| POST | `/auth/register` | register | extended-pending | 76–108 |
| POST | `/auth/login` | login | implemented | 111–159 |
| POST | `/auth/refresh` | refreshToken | implemented | 162–188 |
| POST | `/auth/logout` | logout | implemented | 191–208 |
| POST | `/auth/forgot-password` | forgotPassword | implemented | 211–261 |
| POST | `/auth/reset-password` | resetPassword | implemented | 264–295 |
| GET | `/catalog/noto` |  | implemented | 298–326 |
| POST | `/games/generate` | generateGame | extended-pending | 329–404 |
| POST | `/games/understand` | understandGameRequest | implemented | 407–446 |
| GET | `/games` | listGames | extended-pending | 449–487 |
| GET | `/games/{gameId}` | getGame | implemented | 492–509 |
| PUT | `/games/{gameId}` | updateGame | extended-pending | 510–555 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 556–576 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 581–631 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | planned | 636–685 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 690–729 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 734–768 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 774–838 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 841–890 |
| POST | `/media/upload` | uploadMedia | planned | 893–949 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 954–999 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1000–1041 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1046–1069 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1074–1094 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1099–1118 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1123–1143 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1148–1177 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1182–1209 |
| GET | `/classrooms` | listClassrooms | implemented | 1212–1237 |
| POST | `/classrooms` | createClassroom | implemented | 1238–1271 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1280–1315 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1316–1332 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1337–1380 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1390–1425 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1428–1466 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1472–1503 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1509–1556 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1559–1594 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1599–1642 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1647–1692 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1697–1744 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1749–1809 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 1814–1846 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 1851–1878 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1883–1909 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1914–1952 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 1955–2000 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2001–2038 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2043–2061 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2062–2096 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2101–2124 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2129–2148 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2151–2213 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2216–2270 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2273–2298 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2301–2325 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2326–2361 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2364–2397 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2400–2428 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2433–2463 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2468–2487 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2490–2506 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2507–2535 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2539–2545 |
| securitySchemes | `participantId` | 2546–2552 |
| securitySchemes | `refreshCookie` | 2553–2566 |
| parameters | `GameId` | 2569–2575 |
| parameters | `InsightsSessionType` | 2576–2582 |
| parameters | `InsightsFrom` | 2583–2590 |
| parameters | `InsightsTo` | 2591–2598 |
| parameters | `InsightsClassroom` | 2599–2605 |
| parameters | `Page` | 2606–2613 |
| parameters | `Size` | 2614–2621 |
| parameters | `TeacherId` | 2622–2628 |
| parameters | `VersionId` | 2629–2635 |
| parameters | `SessionId` | 2636–2642 |
| parameters | `ParticipantId` | 2643–2649 |
| parameters | `ShareCode` | 2650–2658 |
| parameters | `QuestionId` | 2659–2666 |
| headers | `RetryAfter` | 2669–2673 |
| headers | `SetRefreshCookie` | 2674–2679 |
| headers | `ClearRefreshCookie` | 2680–2683 |
| responses | `AuthSuccess` | 2686–2704 |
| responses | `ValidationError` | 2705–2712 |
| responses | `Unauthorized` | 2713–2720 |
| responses | `GameSuccess` | 2721–2726 |
| responses | `AdminTeacherSuccess` | 2727–2737 |
| responses | `TeacherStatusSuccess` | 2738–2755 |
| responses | `AiConfigVersionSuccess` | 2756–2766 |
| responses | `BlockedWordsSuccess` | 2767–2777 |
| responses | `SessionControlSuccess` | 2778–2795 |
| responses | `Forbidden` | 2796–2802 |
| responses | `NotFound` | 2803–2808 |
| responses | `Conflict` | 2809–2816 |
| responses | `UnprocessableContent` | 2817–2829 |
| responses | `AiTimeout` | 2830–2837 |
| responses | `RateLimited` | 2838–2846 |
| responses | `InternalError` | 2847–2852 |
| schemas | `ErrorCode` | 2855–2888 |
| schemas | `ErrorBody` | 2890–2921 |
| schemas | `ErrorResponse` | 2923–2929 |
| schemas | `Password` | 2931–2938 |
| schemas | `Role` | 2940–2942 |
| schemas | `RegisterRequest` | 2944–2967 |
| schemas | `RegisterResult` | 2969–2978 |
| schemas | `LoginRequest` | 2980–2993 |
| schemas | `TeacherInfo` | 2995–3011 |
| schemas | `AuthData` | 3013–3025 |
| schemas | `Subject` | 3027–3029 |
| schemas | `GradeLevel` | 3031–3033 |
| schemas | `GameType` | 3035–3051 |
| schemas | `GameStatus` | 3053–3055 |
| schemas | `Voice` | 3057–3068 |
| schemas | `GenerateGameRequest` | 3070–3137 |
| schemas | `UnderstandGameRequest` | 3139–3156 |
| schemas | `ReviseGameRequest` | 3158–3172 |
| schemas | `ChatTurn` | 3174–3184 |
| schemas | `GameUnderstanding` | 3186–3238 |
| schemas | `GameUnderstandingResponse` | 3240–3269 |
| schemas | `GameUnderstandingResult` | 3271–3279 |
| schemas | `GameEnvelope` | 3281–3298 |
| schemas | `CpfGameEnvelope` | 3300–3305 |
| schemas | `Question` | 3307–3321 |
| schemas | `GameResponse` | 3323–3329 |
| schemas | `CpfGameResponse` | 3331–3350 |
| schemas | `DslGameResponse` | 3352–3433 |
| schemas | `GameResult` | 3435–3441 |
| schemas | `GameSummary` | 3443–3480 |
| schemas | `CurriculumReview` | 3482–3524 |
| schemas | `PublishResult` | 3526–3542 |
| schemas | `SessionType` | 3544–3549 |
| schemas | `SessionStatus` | 3551–3553 |
| schemas | `ParticipantStatus` | 3555–3560 |
| schemas | `InteractionStatus` | 3562–3564 |
| schemas | `GroupingStrategy` | 3566–3568 |
| schemas | `TeamInfo` | 3570–3583 |
| schemas | `TeamInput` | 3585–3593 |
| schemas | `CreateSessionRequest` | 3595–3623 |
| schemas | `ClassroomInput` | 3625–3638 |
| schemas | `Classroom` | 3640–3651 |
| schemas | `CreateSessionResult` | 3653–3677 |
| schemas | `SessionByCode` | 3679–3698 |
| schemas | `JoinRequest` | 3700–3712 |
| schemas | `JoinResult` | 3714–3732 |
| schemas | `TeamAssignRequest` | 3734–3740 |
| schemas | `StudentGameResponse` | 3742–3805 |
| schemas | `StudentOddOneOutImageQuestion` | 3807–3828 |
| schemas | `MatchingStudentItem` | 3830–3855 |
| schemas | `MatchingStudentQuestion` | 3857–3913 |
| schemas | `StudentVisualClozeImageQuestion` | 3915–3959 |
| schemas | `InteractionBase` | 3961–3972 |
| schemas | `InteractionRequest` | 3974–4114 |
| schemas | `InteractionResult` | 4116–4152 |
| schemas | `LeaderboardParticipant` | 4154–4171 |
| schemas | `LeaderboardTeam` | 4173–4193 |
| schemas | `Leaderboard` | 4195–4207 |
| schemas | `MyResult` | 4209–4254 |
| schemas | `SharedGameInfo` | 4256–4266 |
| schemas | `PlayRequest` | 4268–4276 |
| schemas | `PlayResult` | 4278–4297 |
| schemas | `SessionListItem` | 4299–4317 |
| schemas | `SessionDetail` | 4319–4364 |
| schemas | `SessionResults` | 4366–4423 |
| schemas | `QuestionInsightDetail` | 4425–4464 |
| schemas | `ReviewNeeded` | 4466–4489 |
| schemas | `GameInsights` | 4491–4521 |
| schemas | `QuestionInsight` | 4523–4555 |
| schemas | `ParticipantInteraction` | 4557–4580 |
| schemas | `PageInfo` | 4582–4597 |
| schemas | `TeacherAccountStatus` | 4599–4601 |
| schemas | `AdminBudgetConfig` | 4603–4612 |
| schemas | `AdminTeacher` | 4613–4631 |
| schemas | `AdminCreateTeacherRequest` | 4633–4648 |
| schemas | `AuditResult` | 4650–4652 |
| schemas | `AuditLogEntry` | 4654–4677 |
| schemas | `ServiceName` | 4679–4681 |
| schemas | `ServiceUsage` | 4683–4714 |
| schemas | `UsageReport` | 4716–4746 |
| schemas | `SystemStatus` | 4748–4771 |
| schemas | `AiConfigInput` | 4773–4794 |
| schemas | `AiConfigVersion` | 4796–4821 |
| schemas | `BlockedWords` | 4823–4830 |
