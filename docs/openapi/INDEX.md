# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–73
- `paths`: dòng 74–2584
- `components`: dòng 2585–4887

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
| PUT | `/games/{gameId}` | updateGame | implemented | 510–557 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 558–578 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 583–633 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | planned | 638–687 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 692–731 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 736–770 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 776–841 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 844–893 |
| POST | `/media/upload` | uploadMedia | implemented | 896–963 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 966–997 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1002–1047 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1048–1089 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1094–1117 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1122–1142 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1147–1166 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1171–1191 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1196–1225 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1230–1257 |
| GET | `/classrooms` | listClassrooms | implemented | 1260–1285 |
| POST | `/classrooms` | createClassroom | implemented | 1286–1319 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1328–1363 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1364–1380 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1385–1428 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1438–1473 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1476–1514 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1520–1551 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1557–1604 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1607–1642 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1647–1690 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1695–1740 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1745–1792 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1797–1857 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 1862–1894 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 1899–1926 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1931–1957 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 1962–2000 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2003–2048 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2049–2086 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2091–2109 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2110–2144 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2149–2172 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2177–2196 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2199–2261 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2264–2318 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2321–2346 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2349–2373 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2374–2409 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2412–2445 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2448–2476 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2481–2511 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2516–2535 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2538–2554 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2555–2583 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2587–2593 |
| securitySchemes | `participantId` | 2594–2600 |
| securitySchemes | `refreshCookie` | 2601–2614 |
| parameters | `GameId` | 2617–2623 |
| parameters | `InsightsSessionType` | 2624–2630 |
| parameters | `InsightsFrom` | 2631–2638 |
| parameters | `InsightsTo` | 2639–2646 |
| parameters | `InsightsClassroom` | 2647–2653 |
| parameters | `Page` | 2654–2661 |
| parameters | `Size` | 2662–2669 |
| parameters | `TeacherId` | 2670–2676 |
| parameters | `VersionId` | 2677–2683 |
| parameters | `SessionId` | 2684–2690 |
| parameters | `ParticipantId` | 2691–2697 |
| parameters | `ShareCode` | 2698–2706 |
| parameters | `QuestionId` | 2707–2714 |
| headers | `RetryAfter` | 2717–2721 |
| headers | `SetRefreshCookie` | 2722–2727 |
| headers | `ClearRefreshCookie` | 2728–2731 |
| responses | `AuthSuccess` | 2734–2752 |
| responses | `ValidationError` | 2753–2760 |
| responses | `Unauthorized` | 2761–2768 |
| responses | `GameSuccess` | 2769–2774 |
| responses | `AdminTeacherSuccess` | 2775–2785 |
| responses | `TeacherStatusSuccess` | 2786–2803 |
| responses | `AiConfigVersionSuccess` | 2804–2814 |
| responses | `BlockedWordsSuccess` | 2815–2825 |
| responses | `SessionControlSuccess` | 2826–2843 |
| responses | `Forbidden` | 2844–2850 |
| responses | `NotFound` | 2851–2856 |
| responses | `Conflict` | 2857–2864 |
| responses | `UnprocessableContent` | 2865–2877 |
| responses | `AiTimeout` | 2878–2885 |
| responses | `RateLimited` | 2886–2894 |
| responses | `InternalError` | 2895–2900 |
| schemas | `ErrorCode` | 2903–2936 |
| schemas | `ErrorBody` | 2938–2969 |
| schemas | `ErrorResponse` | 2971–2977 |
| schemas | `Password` | 2979–2986 |
| schemas | `Role` | 2988–2990 |
| schemas | `RegisterRequest` | 2992–3015 |
| schemas | `RegisterResult` | 3017–3026 |
| schemas | `LoginRequest` | 3028–3041 |
| schemas | `TeacherInfo` | 3043–3059 |
| schemas | `AuthData` | 3061–3073 |
| schemas | `Subject` | 3075–3077 |
| schemas | `GradeLevel` | 3079–3081 |
| schemas | `GameType` | 3083–3099 |
| schemas | `GameStatus` | 3101–3103 |
| schemas | `Voice` | 3105–3116 |
| schemas | `GenerateGameRequest` | 3118–3185 |
| schemas | `UnderstandGameRequest` | 3187–3204 |
| schemas | `ReviseGameRequest` | 3206–3220 |
| schemas | `ChatTurn` | 3222–3232 |
| schemas | `GameUnderstanding` | 3234–3286 |
| schemas | `GameUnderstandingResponse` | 3288–3317 |
| schemas | `GameUnderstandingResult` | 3319–3327 |
| schemas | `GameEnvelope` | 3329–3346 |
| schemas | `CpfGameEnvelope` | 3348–3353 |
| schemas | `Question` | 3355–3369 |
| schemas | `GameResponse` | 3371–3377 |
| schemas | `CpfGameResponse` | 3379–3398 |
| schemas | `DslGameResponse` | 3400–3481 |
| schemas | `GameResult` | 3483–3489 |
| schemas | `GameSummary` | 3491–3528 |
| schemas | `CurriculumReview` | 3530–3572 |
| schemas | `PublishResult` | 3574–3590 |
| schemas | `SessionType` | 3592–3597 |
| schemas | `SessionStatus` | 3599–3601 |
| schemas | `ParticipantStatus` | 3603–3608 |
| schemas | `InteractionStatus` | 3610–3612 |
| schemas | `GroupingStrategy` | 3614–3616 |
| schemas | `TeamInfo` | 3618–3631 |
| schemas | `TeamInput` | 3633–3641 |
| schemas | `CreateSessionRequest` | 3643–3671 |
| schemas | `ClassroomInput` | 3673–3686 |
| schemas | `Classroom` | 3688–3699 |
| schemas | `CreateSessionResult` | 3701–3725 |
| schemas | `SessionByCode` | 3727–3746 |
| schemas | `JoinRequest` | 3748–3760 |
| schemas | `JoinResult` | 3762–3780 |
| schemas | `TeamAssignRequest` | 3782–3788 |
| schemas | `StudentGameResponse` | 3790–3853 |
| schemas | `StudentOddOneOutImageQuestion` | 3855–3876 |
| schemas | `MatchingStudentItem` | 3878–3903 |
| schemas | `MatchingStudentQuestion` | 3905–3961 |
| schemas | `StudentVisualClozeImageQuestion` | 3963–4007 |
| schemas | `InteractionBase` | 4009–4020 |
| schemas | `InteractionRequest` | 4022–4170 |
| schemas | `InteractionResult` | 4172–4208 |
| schemas | `LeaderboardParticipant` | 4210–4227 |
| schemas | `LeaderboardTeam` | 4229–4249 |
| schemas | `Leaderboard` | 4251–4263 |
| schemas | `MyResult` | 4265–4310 |
| schemas | `SharedGameInfo` | 4312–4322 |
| schemas | `PlayRequest` | 4324–4332 |
| schemas | `PlayResult` | 4334–4353 |
| schemas | `SessionListItem` | 4355–4373 |
| schemas | `SessionDetail` | 4375–4420 |
| schemas | `SessionResults` | 4422–4479 |
| schemas | `QuestionInsightDetail` | 4481–4520 |
| schemas | `ReviewNeeded` | 4522–4545 |
| schemas | `GameInsights` | 4547–4577 |
| schemas | `QuestionInsight` | 4579–4611 |
| schemas | `ParticipantInteraction` | 4613–4636 |
| schemas | `PageInfo` | 4638–4653 |
| schemas | `TeacherAccountStatus` | 4655–4657 |
| schemas | `AdminBudgetConfig` | 4659–4668 |
| schemas | `AdminTeacher` | 4669–4687 |
| schemas | `AdminCreateTeacherRequest` | 4689–4704 |
| schemas | `AuditResult` | 4706–4708 |
| schemas | `AuditLogEntry` | 4710–4733 |
| schemas | `ServiceName` | 4735–4737 |
| schemas | `ServiceUsage` | 4739–4770 |
| schemas | `UsageReport` | 4772–4802 |
| schemas | `SystemStatus` | 4804–4827 |
| schemas | `AiConfigInput` | 4829–4850 |
| schemas | `AiConfigVersion` | 4852–4877 |
| schemas | `BlockedWords` | 4879–4886 |
