# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–75
- `paths`: dòng 76–2895
- `components`: dòng 2896–5276

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
| POST | `/games/prepare` | prepareLessonIdea | implemented | 334–391 |
| POST | `/games/generate` | generateGame | extended-pending | 394–459 |
| POST | `/games/understand` | understandGameRequest | implemented | 462–501 |
| GET | `/games` | listGames | extended-pending | 504–542 |
| GET | `/games/{gameId}` | getGame | implemented | 547–564 |
| PUT | `/games/{gameId}` | updateGame | implemented | 565–612 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 613–633 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 638–688 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | implemented | 693–744 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 749–788 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 793–827 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 833–905 |
| POST | `/games/validate-text` | validateGameText | implemented | 908–964 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 967–1016 |
| POST | `/media/upload` | uploadMedia | implemented | 1019–1086 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 1089–1120 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1125–1170 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1171–1212 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1217–1240 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1245–1265 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1270–1289 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1294–1314 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1319–1348 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1353–1380 |
| GET | `/teacher/profile` | getTeacherProfile | implemented | 1383–1407 |
| POST | `/teacher/profile` | saveTeacherProfile | implemented | 1408–1442 |
| DELETE | `/teacher/profile` | deleteTeacherProfile | implemented | 1443–1459 |
| GET | `/teacher/suggestions` | listTeacherSuggestions | implemented | 1462–1488 |
| POST | `/teacher/suggestions` | rememberTeacherSuggestion | implemented | 1489–1526 |
| DELETE | `/teacher/suggestions` | clearTeacherSuggestions | implemented | 1527–1542 |
| DELETE | `/teacher/suggestions/{suggestionId}` | deleteTeacherSuggestion | implemented | 1550–1566 |
| GET | `/classrooms` | listClassrooms | implemented | 1569–1594 |
| POST | `/classrooms` | createClassroom | implemented | 1595–1628 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1637–1674 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1675–1691 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1696–1739 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1749–1784 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1787–1825 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1831–1862 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1868–1915 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1918–1953 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1958–2001 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 2006–2051 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 2056–2103 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 2108–2168 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 2173–2205 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 2210–2237 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 2242–2268 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 2273–2311 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2314–2359 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2360–2397 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2402–2420 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2421–2455 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2460–2483 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2488–2507 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2510–2572 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2575–2629 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2632–2657 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2660–2684 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2685–2720 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2723–2756 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2759–2787 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2792–2822 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2827–2846 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2849–2865 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2866–2894 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2898–2904 |
| securitySchemes | `participantId` | 2905–2911 |
| securitySchemes | `refreshCookie` | 2912–2925 |
| parameters | `GameId` | 2928–2934 |
| parameters | `InsightsSessionType` | 2935–2941 |
| parameters | `InsightsFrom` | 2942–2949 |
| parameters | `InsightsTo` | 2950–2957 |
| parameters | `InsightsClassroom` | 2958–2964 |
| parameters | `Page` | 2965–2972 |
| parameters | `Size` | 2973–2980 |
| parameters | `TeacherId` | 2981–2987 |
| parameters | `VersionId` | 2988–2994 |
| parameters | `SessionId` | 2995–3001 |
| parameters | `ParticipantId` | 3002–3008 |
| parameters | `ShareCode` | 3009–3017 |
| parameters | `QuestionId` | 3018–3025 |
| headers | `RetryAfter` | 3028–3032 |
| headers | `SetRefreshCookie` | 3033–3038 |
| headers | `ClearRefreshCookie` | 3039–3042 |
| responses | `AuthSuccess` | 3045–3063 |
| responses | `ValidationError` | 3064–3071 |
| responses | `Unauthorized` | 3072–3079 |
| responses | `GameSuccess` | 3080–3085 |
| responses | `AdminTeacherSuccess` | 3086–3096 |
| responses | `TeacherStatusSuccess` | 3097–3114 |
| responses | `AiConfigVersionSuccess` | 3115–3125 |
| responses | `BlockedWordsSuccess` | 3126–3136 |
| responses | `SessionControlSuccess` | 3137–3154 |
| responses | `Forbidden` | 3155–3161 |
| responses | `NotFound` | 3162–3167 |
| responses | `Conflict` | 3168–3175 |
| responses | `UnprocessableContent` | 3176–3189 |
| responses | `AiTimeout` | 3190–3197 |
| responses | `ServiceUnavailable` | 3198–3207 |
| responses | `RateLimited` | 3208–3216 |
| responses | `InternalError` | 3217–3222 |
| schemas | `ErrorCode` | 3225–3264 |
| schemas | `ErrorBody` | 3266–3297 |
| schemas | `ErrorResponse` | 3299–3305 |
| schemas | `Password` | 3307–3314 |
| schemas | `Role` | 3316–3318 |
| schemas | `RegisterRequest` | 3320–3345 |
| schemas | `RegisterResult` | 3347–3356 |
| schemas | `LoginRequest` | 3358–3371 |
| schemas | `TeacherInfo` | 3373–3389 |
| schemas | `AuthData` | 3391–3403 |
| schemas | `Subject` | 3405–3407 |
| schemas | `GradeLevel` | 3409–3411 |
| schemas | `GameType` | 3413–3429 |
| schemas | `GameStatus` | 3431–3433 |
| schemas | `Voice` | 3435–3446 |
| schemas | `GenerateGameRequest` | 3448–3522 |
| schemas | `UnderstandGameRequest` | 3524–3541 |
| schemas | `ReviseGameRequest` | 3543–3557 |
| schemas | `ChatTurn` | 3559–3569 |
| schemas | `GameUnderstanding` | 3571–3623 |
| schemas | `GameUnderstandingResponse` | 3625–3654 |
| schemas | `GameUnderstandingResult` | 3656–3664 |
| schemas | `GameEnvelope` | 3666–3683 |
| schemas | `CpfGameEnvelope` | 3685–3690 |
| schemas | `Question` | 3692–3706 |
| schemas | `GameResponse` | 3708–3714 |
| schemas | `CpfGameResponse` | 3716–3735 |
| schemas | `DslGameResponse` | 3737–3818 |
| schemas | `GameResult` | 3820–3826 |
| schemas | `GameSummary` | 3828–3865 |
| schemas | `CurriculumReview` | 3867–3909 |
| schemas | `PublishResult` | 3911–3927 |
| schemas | `SessionType` | 3929–3934 |
| schemas | `SessionStatus` | 3936–3938 |
| schemas | `ParticipantStatus` | 3940–3945 |
| schemas | `InteractionStatus` | 3947–3949 |
| schemas | `GroupingStrategy` | 3951–3953 |
| schemas | `TeamInfo` | 3955–3968 |
| schemas | `TeamInput` | 3970–3978 |
| schemas | `CreateSessionRequest` | 3980–4008 |
| schemas | `ClassroomInput` | 4010–4028 |
| schemas | `Classroom` | 4030–4043 |
| schemas | `ClassroomLearningProfile` | 4045–4059 |
| schemas | `TeacherProfile` | 4061–4074 |
| schemas | `RememberSuggestion` | 4076–4080 |
| schemas | `SavedSuggestion` | 4082–4087 |
| schemas | `CreateSessionResult` | 4089–4113 |
| schemas | `SessionByCode` | 4115–4134 |
| schemas | `JoinRequest` | 4136–4148 |
| schemas | `JoinResult` | 4150–4168 |
| schemas | `TeamAssignRequest` | 4170–4176 |
| schemas | `StudentGameResponse` | 4178–4241 |
| schemas | `StudentOddOneOutImageQuestion` | 4243–4264 |
| schemas | `MatchingStudentItem` | 4266–4291 |
| schemas | `MatchingStudentQuestion` | 4293–4349 |
| schemas | `StudentVisualClozeImageQuestion` | 4351–4396 |
| schemas | `InteractionBase` | 4398–4409 |
| schemas | `InteractionRequest` | 4411–4559 |
| schemas | `InteractionResult` | 4561–4597 |
| schemas | `LeaderboardParticipant` | 4599–4616 |
| schemas | `LeaderboardTeam` | 4618–4638 |
| schemas | `Leaderboard` | 4640–4652 |
| schemas | `MyResult` | 4654–4699 |
| schemas | `SharedGameInfo` | 4701–4711 |
| schemas | `PlayRequest` | 4713–4721 |
| schemas | `PlayResult` | 4723–4742 |
| schemas | `SessionListItem` | 4744–4762 |
| schemas | `SessionDetail` | 4764–4809 |
| schemas | `SessionResults` | 4811–4868 |
| schemas | `QuestionInsightDetail` | 4870–4909 |
| schemas | `ReviewNeeded` | 4911–4934 |
| schemas | `GameInsights` | 4936–4966 |
| schemas | `QuestionInsight` | 4968–5000 |
| schemas | `ParticipantInteraction` | 5002–5025 |
| schemas | `PageInfo` | 5027–5042 |
| schemas | `TeacherAccountStatus` | 5044–5046 |
| schemas | `AdminBudgetConfig` | 5048–5057 |
| schemas | `AdminTeacher` | 5058–5076 |
| schemas | `AdminCreateTeacherRequest` | 5078–5093 |
| schemas | `AuditResult` | 5095–5097 |
| schemas | `AuditLogEntry` | 5099–5122 |
| schemas | `ServiceName` | 5124–5126 |
| schemas | `ServiceUsage` | 5128–5159 |
| schemas | `UsageReport` | 5161–5191 |
| schemas | `SystemStatus` | 5193–5216 |
| schemas | `AiConfigInput` | 5218–5239 |
| schemas | `AiConfigVersion` | 5241–5266 |
| schemas | `BlockedWords` | 5268–5275 |
