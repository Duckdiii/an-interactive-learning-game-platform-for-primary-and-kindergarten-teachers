# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–75
- `paths`: dòng 76–2847
- `components`: dòng 2848–5205

## Operation

| Method | Path | operationId | x-status | Dòng |
|---|---|---|---|---|
| POST | `/auth/register` | register | extended-pending | 78–113 |
| POST | `/auth/login` | login | implemented | 116–164 |
| POST | `/auth/refresh` | refreshToken | implemented | 167–193 |
| POST | `/auth/logout` | logout | implemented | 196–213 |
| POST | `/auth/forgot-password` | forgotPassword | implemented | 216–266 |
| POST | `/auth/reset-password` | resetPassword | implemented | 269–300 |
| GET | `/catalog/noto` |  | implemented | 303–331 |
| POST | `/games/generate` | generateGame | extended-pending | 334–411 |
| POST | `/games/understand` | understandGameRequest | implemented | 414–453 |
| GET | `/games` | listGames | extended-pending | 456–494 |
| GET | `/games/{gameId}` | getGame | implemented | 499–516 |
| PUT | `/games/{gameId}` | updateGame | implemented | 517–564 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 565–585 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 590–640 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | implemented | 645–696 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 701–740 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 745–779 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 785–857 |
| POST | `/games/validate-text` | validateGameText | implemented | 860–916 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 919–968 |
| POST | `/media/upload` | uploadMedia | implemented | 971–1038 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 1041–1072 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1077–1122 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1123–1164 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1169–1192 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1197–1217 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1222–1241 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1246–1266 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1271–1300 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1305–1332 |
| GET | `/teacher/profile` | getTeacherProfile | implemented | 1335–1359 |
| POST | `/teacher/profile` | saveTeacherProfile | implemented | 1360–1394 |
| DELETE | `/teacher/profile` | deleteTeacherProfile | implemented | 1395–1411 |
| GET | `/teacher/suggestions` | listTeacherSuggestions | implemented | 1414–1440 |
| POST | `/teacher/suggestions` | rememberTeacherSuggestion | implemented | 1441–1478 |
| DELETE | `/teacher/suggestions` | clearTeacherSuggestions | implemented | 1479–1494 |
| DELETE | `/teacher/suggestions/{suggestionId}` | deleteTeacherSuggestion | implemented | 1502–1518 |
| GET | `/classrooms` | listClassrooms | implemented | 1521–1546 |
| POST | `/classrooms` | createClassroom | implemented | 1547–1580 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1589–1626 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1627–1643 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1648–1691 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1701–1736 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1739–1777 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1783–1814 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1820–1867 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1870–1905 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1910–1953 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1958–2003 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 2008–2055 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 2060–2120 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 2125–2157 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 2162–2189 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 2194–2220 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 2225–2263 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2266–2311 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2312–2349 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2354–2372 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2373–2407 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2412–2435 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2440–2459 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2462–2524 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2527–2581 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2584–2609 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2612–2636 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2637–2672 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2675–2708 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2711–2739 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2744–2774 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2779–2798 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2801–2817 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2818–2846 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2850–2856 |
| securitySchemes | `participantId` | 2857–2863 |
| securitySchemes | `refreshCookie` | 2864–2877 |
| parameters | `GameId` | 2880–2886 |
| parameters | `InsightsSessionType` | 2887–2893 |
| parameters | `InsightsFrom` | 2894–2901 |
| parameters | `InsightsTo` | 2902–2909 |
| parameters | `InsightsClassroom` | 2910–2916 |
| parameters | `Page` | 2917–2924 |
| parameters | `Size` | 2925–2932 |
| parameters | `TeacherId` | 2933–2939 |
| parameters | `VersionId` | 2940–2946 |
| parameters | `SessionId` | 2947–2953 |
| parameters | `ParticipantId` | 2954–2960 |
| parameters | `ShareCode` | 2961–2969 |
| parameters | `QuestionId` | 2970–2977 |
| headers | `RetryAfter` | 2980–2984 |
| headers | `SetRefreshCookie` | 2985–2990 |
| headers | `ClearRefreshCookie` | 2991–2994 |
| responses | `AuthSuccess` | 2997–3015 |
| responses | `ValidationError` | 3016–3023 |
| responses | `Unauthorized` | 3024–3031 |
| responses | `GameSuccess` | 3032–3037 |
| responses | `AdminTeacherSuccess` | 3038–3048 |
| responses | `TeacherStatusSuccess` | 3049–3066 |
| responses | `AiConfigVersionSuccess` | 3067–3077 |
| responses | `BlockedWordsSuccess` | 3078–3088 |
| responses | `SessionControlSuccess` | 3089–3106 |
| responses | `Forbidden` | 3107–3113 |
| responses | `NotFound` | 3114–3119 |
| responses | `Conflict` | 3120–3127 |
| responses | `UnprocessableContent` | 3128–3140 |
| responses | `AiTimeout` | 3141–3148 |
| responses | `RateLimited` | 3149–3157 |
| responses | `InternalError` | 3158–3163 |
| schemas | `ErrorCode` | 3166–3199 |
| schemas | `ErrorBody` | 3201–3232 |
| schemas | `ErrorResponse` | 3234–3240 |
| schemas | `Password` | 3242–3249 |
| schemas | `Role` | 3251–3253 |
| schemas | `RegisterRequest` | 3255–3278 |
| schemas | `RegisterResult` | 3280–3289 |
| schemas | `LoginRequest` | 3291–3304 |
| schemas | `TeacherInfo` | 3306–3322 |
| schemas | `AuthData` | 3324–3336 |
| schemas | `Subject` | 3338–3340 |
| schemas | `GradeLevel` | 3342–3344 |
| schemas | `GameType` | 3346–3362 |
| schemas | `GameStatus` | 3364–3366 |
| schemas | `Voice` | 3368–3379 |
| schemas | `GenerateGameRequest` | 3381–3452 |
| schemas | `UnderstandGameRequest` | 3454–3471 |
| schemas | `ReviseGameRequest` | 3473–3487 |
| schemas | `ChatTurn` | 3489–3499 |
| schemas | `GameUnderstanding` | 3501–3553 |
| schemas | `GameUnderstandingResponse` | 3555–3584 |
| schemas | `GameUnderstandingResult` | 3586–3594 |
| schemas | `GameEnvelope` | 3596–3613 |
| schemas | `CpfGameEnvelope` | 3615–3620 |
| schemas | `Question` | 3622–3636 |
| schemas | `GameResponse` | 3638–3644 |
| schemas | `CpfGameResponse` | 3646–3665 |
| schemas | `DslGameResponse` | 3667–3748 |
| schemas | `GameResult` | 3750–3756 |
| schemas | `GameSummary` | 3758–3795 |
| schemas | `CurriculumReview` | 3797–3839 |
| schemas | `PublishResult` | 3841–3857 |
| schemas | `SessionType` | 3859–3864 |
| schemas | `SessionStatus` | 3866–3868 |
| schemas | `ParticipantStatus` | 3870–3875 |
| schemas | `InteractionStatus` | 3877–3879 |
| schemas | `GroupingStrategy` | 3881–3883 |
| schemas | `TeamInfo` | 3885–3898 |
| schemas | `TeamInput` | 3900–3908 |
| schemas | `CreateSessionRequest` | 3910–3938 |
| schemas | `ClassroomInput` | 3940–3957 |
| schemas | `Classroom` | 3959–3972 |
| schemas | `ClassroomLearningProfile` | 3974–3988 |
| schemas | `TeacherProfile` | 3990–4003 |
| schemas | `RememberSuggestion` | 4005–4009 |
| schemas | `SavedSuggestion` | 4011–4016 |
| schemas | `CreateSessionResult` | 4018–4042 |
| schemas | `SessionByCode` | 4044–4063 |
| schemas | `JoinRequest` | 4065–4077 |
| schemas | `JoinResult` | 4079–4097 |
| schemas | `TeamAssignRequest` | 4099–4105 |
| schemas | `StudentGameResponse` | 4107–4170 |
| schemas | `StudentOddOneOutImageQuestion` | 4172–4193 |
| schemas | `MatchingStudentItem` | 4195–4220 |
| schemas | `MatchingStudentQuestion` | 4222–4278 |
| schemas | `StudentVisualClozeImageQuestion` | 4280–4325 |
| schemas | `InteractionBase` | 4327–4338 |
| schemas | `InteractionRequest` | 4340–4488 |
| schemas | `InteractionResult` | 4490–4526 |
| schemas | `LeaderboardParticipant` | 4528–4545 |
| schemas | `LeaderboardTeam` | 4547–4567 |
| schemas | `Leaderboard` | 4569–4581 |
| schemas | `MyResult` | 4583–4628 |
| schemas | `SharedGameInfo` | 4630–4640 |
| schemas | `PlayRequest` | 4642–4650 |
| schemas | `PlayResult` | 4652–4671 |
| schemas | `SessionListItem` | 4673–4691 |
| schemas | `SessionDetail` | 4693–4738 |
| schemas | `SessionResults` | 4740–4797 |
| schemas | `QuestionInsightDetail` | 4799–4838 |
| schemas | `ReviewNeeded` | 4840–4863 |
| schemas | `GameInsights` | 4865–4895 |
| schemas | `QuestionInsight` | 4897–4929 |
| schemas | `ParticipantInteraction` | 4931–4954 |
| schemas | `PageInfo` | 4956–4971 |
| schemas | `TeacherAccountStatus` | 4973–4975 |
| schemas | `AdminBudgetConfig` | 4977–4986 |
| schemas | `AdminTeacher` | 4987–5005 |
| schemas | `AdminCreateTeacherRequest` | 5007–5022 |
| schemas | `AuditResult` | 5024–5026 |
| schemas | `AuditLogEntry` | 5028–5051 |
| schemas | `ServiceName` | 5053–5055 |
| schemas | `ServiceUsage` | 5057–5088 |
| schemas | `UsageReport` | 5090–5120 |
| schemas | `SystemStatus` | 5122–5145 |
| schemas | `AiConfigInput` | 5147–5168 |
| schemas | `AiConfigVersion` | 5170–5195 |
| schemas | `BlockedWords` | 5197–5204 |
