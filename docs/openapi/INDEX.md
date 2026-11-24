# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–75
- `paths`: dòng 76–2847
- `components`: dòng 2848–5211

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
| schemas | `RegisterRequest` | 3255–3280 |
| schemas | `RegisterResult` | 3282–3291 |
| schemas | `LoginRequest` | 3293–3306 |
| schemas | `TeacherInfo` | 3308–3324 |
| schemas | `AuthData` | 3326–3338 |
| schemas | `Subject` | 3340–3342 |
| schemas | `GradeLevel` | 3344–3346 |
| schemas | `GameType` | 3348–3364 |
| schemas | `GameStatus` | 3366–3368 |
| schemas | `Voice` | 3370–3381 |
| schemas | `GenerateGameRequest` | 3383–3457 |
| schemas | `UnderstandGameRequest` | 3459–3476 |
| schemas | `ReviseGameRequest` | 3478–3492 |
| schemas | `ChatTurn` | 3494–3504 |
| schemas | `GameUnderstanding` | 3506–3558 |
| schemas | `GameUnderstandingResponse` | 3560–3589 |
| schemas | `GameUnderstandingResult` | 3591–3599 |
| schemas | `GameEnvelope` | 3601–3618 |
| schemas | `CpfGameEnvelope` | 3620–3625 |
| schemas | `Question` | 3627–3641 |
| schemas | `GameResponse` | 3643–3649 |
| schemas | `CpfGameResponse` | 3651–3670 |
| schemas | `DslGameResponse` | 3672–3753 |
| schemas | `GameResult` | 3755–3761 |
| schemas | `GameSummary` | 3763–3800 |
| schemas | `CurriculumReview` | 3802–3844 |
| schemas | `PublishResult` | 3846–3862 |
| schemas | `SessionType` | 3864–3869 |
| schemas | `SessionStatus` | 3871–3873 |
| schemas | `ParticipantStatus` | 3875–3880 |
| schemas | `InteractionStatus` | 3882–3884 |
| schemas | `GroupingStrategy` | 3886–3888 |
| schemas | `TeamInfo` | 3890–3903 |
| schemas | `TeamInput` | 3905–3913 |
| schemas | `CreateSessionRequest` | 3915–3943 |
| schemas | `ClassroomInput` | 3945–3963 |
| schemas | `Classroom` | 3965–3978 |
| schemas | `ClassroomLearningProfile` | 3980–3994 |
| schemas | `TeacherProfile` | 3996–4009 |
| schemas | `RememberSuggestion` | 4011–4015 |
| schemas | `SavedSuggestion` | 4017–4022 |
| schemas | `CreateSessionResult` | 4024–4048 |
| schemas | `SessionByCode` | 4050–4069 |
| schemas | `JoinRequest` | 4071–4083 |
| schemas | `JoinResult` | 4085–4103 |
| schemas | `TeamAssignRequest` | 4105–4111 |
| schemas | `StudentGameResponse` | 4113–4176 |
| schemas | `StudentOddOneOutImageQuestion` | 4178–4199 |
| schemas | `MatchingStudentItem` | 4201–4226 |
| schemas | `MatchingStudentQuestion` | 4228–4284 |
| schemas | `StudentVisualClozeImageQuestion` | 4286–4331 |
| schemas | `InteractionBase` | 4333–4344 |
| schemas | `InteractionRequest` | 4346–4494 |
| schemas | `InteractionResult` | 4496–4532 |
| schemas | `LeaderboardParticipant` | 4534–4551 |
| schemas | `LeaderboardTeam` | 4553–4573 |
| schemas | `Leaderboard` | 4575–4587 |
| schemas | `MyResult` | 4589–4634 |
| schemas | `SharedGameInfo` | 4636–4646 |
| schemas | `PlayRequest` | 4648–4656 |
| schemas | `PlayResult` | 4658–4677 |
| schemas | `SessionListItem` | 4679–4697 |
| schemas | `SessionDetail` | 4699–4744 |
| schemas | `SessionResults` | 4746–4803 |
| schemas | `QuestionInsightDetail` | 4805–4844 |
| schemas | `ReviewNeeded` | 4846–4869 |
| schemas | `GameInsights` | 4871–4901 |
| schemas | `QuestionInsight` | 4903–4935 |
| schemas | `ParticipantInteraction` | 4937–4960 |
| schemas | `PageInfo` | 4962–4977 |
| schemas | `TeacherAccountStatus` | 4979–4981 |
| schemas | `AdminBudgetConfig` | 4983–4992 |
| schemas | `AdminTeacher` | 4993–5011 |
| schemas | `AdminCreateTeacherRequest` | 5013–5028 |
| schemas | `AuditResult` | 5030–5032 |
| schemas | `AuditLogEntry` | 5034–5057 |
| schemas | `ServiceName` | 5059–5061 |
| schemas | `ServiceUsage` | 5063–5094 |
| schemas | `UsageReport` | 5096–5126 |
| schemas | `SystemStatus` | 5128–5151 |
| schemas | `AiConfigInput` | 5153–5174 |
| schemas | `AiConfigVersion` | 5176–5201 |
| schemas | `BlockedWords` | 5203–5210 |
