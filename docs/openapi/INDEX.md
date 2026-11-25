# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–75
- `paths`: dòng 76–2968
- `components`: dòng 2969–5349

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
| POST | `/games/{gameId}/narration/preview` | previewGameNarration | implemented | 638–676 |
| POST | `/games/{gameId}/narration/feedback` | getNarrationFeedback | implemented | 681–706 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 711–761 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | implemented | 766–817 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 822–861 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 866–900 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 906–978 |
| POST | `/games/validate-text` | validateGameText | implemented | 981–1037 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 1040–1089 |
| POST | `/media/upload` | uploadMedia | implemented | 1092–1159 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 1162–1193 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1198–1243 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1244–1285 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1290–1313 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1318–1338 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1343–1362 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1367–1387 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1392–1421 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1426–1453 |
| GET | `/teacher/profile` | getTeacherProfile | implemented | 1456–1480 |
| POST | `/teacher/profile` | saveTeacherProfile | implemented | 1481–1515 |
| DELETE | `/teacher/profile` | deleteTeacherProfile | implemented | 1516–1532 |
| GET | `/teacher/suggestions` | listTeacherSuggestions | implemented | 1535–1561 |
| POST | `/teacher/suggestions` | rememberTeacherSuggestion | implemented | 1562–1599 |
| DELETE | `/teacher/suggestions` | clearTeacherSuggestions | implemented | 1600–1615 |
| DELETE | `/teacher/suggestions/{suggestionId}` | deleteTeacherSuggestion | implemented | 1623–1639 |
| GET | `/classrooms` | listClassrooms | implemented | 1642–1667 |
| POST | `/classrooms` | createClassroom | implemented | 1668–1701 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1710–1747 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1748–1764 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1769–1812 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1822–1857 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1860–1898 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1904–1935 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1941–1988 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1991–2026 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 2031–2074 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 2079–2124 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 2129–2176 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 2181–2241 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 2246–2278 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 2283–2310 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 2315–2341 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 2346–2384 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2387–2432 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2433–2470 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2475–2493 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2494–2528 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2533–2556 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2561–2580 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2583–2645 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2648–2702 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2705–2730 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2733–2757 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2758–2793 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2796–2829 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2832–2860 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2865–2895 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2900–2919 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2922–2938 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2939–2967 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2971–2977 |
| securitySchemes | `participantId` | 2978–2984 |
| securitySchemes | `refreshCookie` | 2985–2998 |
| parameters | `GameId` | 3001–3007 |
| parameters | `InsightsSessionType` | 3008–3014 |
| parameters | `InsightsFrom` | 3015–3022 |
| parameters | `InsightsTo` | 3023–3030 |
| parameters | `InsightsClassroom` | 3031–3037 |
| parameters | `Page` | 3038–3045 |
| parameters | `Size` | 3046–3053 |
| parameters | `TeacherId` | 3054–3060 |
| parameters | `VersionId` | 3061–3067 |
| parameters | `SessionId` | 3068–3074 |
| parameters | `ParticipantId` | 3075–3081 |
| parameters | `ShareCode` | 3082–3090 |
| parameters | `QuestionId` | 3091–3098 |
| headers | `RetryAfter` | 3101–3105 |
| headers | `SetRefreshCookie` | 3106–3111 |
| headers | `ClearRefreshCookie` | 3112–3115 |
| responses | `AuthSuccess` | 3118–3136 |
| responses | `ValidationError` | 3137–3144 |
| responses | `Unauthorized` | 3145–3152 |
| responses | `GameSuccess` | 3153–3158 |
| responses | `AdminTeacherSuccess` | 3159–3169 |
| responses | `TeacherStatusSuccess` | 3170–3187 |
| responses | `AiConfigVersionSuccess` | 3188–3198 |
| responses | `BlockedWordsSuccess` | 3199–3209 |
| responses | `SessionControlSuccess` | 3210–3227 |
| responses | `Forbidden` | 3228–3234 |
| responses | `NotFound` | 3235–3240 |
| responses | `Conflict` | 3241–3248 |
| responses | `UnprocessableContent` | 3249–3262 |
| responses | `AiTimeout` | 3263–3270 |
| responses | `ServiceUnavailable` | 3271–3280 |
| responses | `RateLimited` | 3281–3289 |
| responses | `InternalError` | 3290–3295 |
| schemas | `ErrorCode` | 3298–3337 |
| schemas | `ErrorBody` | 3339–3370 |
| schemas | `ErrorResponse` | 3372–3378 |
| schemas | `Password` | 3380–3387 |
| schemas | `Role` | 3389–3391 |
| schemas | `RegisterRequest` | 3393–3418 |
| schemas | `RegisterResult` | 3420–3429 |
| schemas | `LoginRequest` | 3431–3444 |
| schemas | `TeacherInfo` | 3446–3462 |
| schemas | `AuthData` | 3464–3476 |
| schemas | `Subject` | 3478–3480 |
| schemas | `GradeLevel` | 3482–3484 |
| schemas | `GameType` | 3486–3502 |
| schemas | `GameStatus` | 3504–3506 |
| schemas | `Voice` | 3508–3519 |
| schemas | `GenerateGameRequest` | 3521–3595 |
| schemas | `UnderstandGameRequest` | 3597–3614 |
| schemas | `ReviseGameRequest` | 3616–3630 |
| schemas | `ChatTurn` | 3632–3642 |
| schemas | `GameUnderstanding` | 3644–3696 |
| schemas | `GameUnderstandingResponse` | 3698–3727 |
| schemas | `GameUnderstandingResult` | 3729–3737 |
| schemas | `GameEnvelope` | 3739–3756 |
| schemas | `CpfGameEnvelope` | 3758–3763 |
| schemas | `Question` | 3765–3779 |
| schemas | `GameResponse` | 3781–3787 |
| schemas | `CpfGameResponse` | 3789–3808 |
| schemas | `DslGameResponse` | 3810–3891 |
| schemas | `GameResult` | 3893–3899 |
| schemas | `GameSummary` | 3901–3938 |
| schemas | `CurriculumReview` | 3940–3982 |
| schemas | `PublishResult` | 3984–4000 |
| schemas | `SessionType` | 4002–4007 |
| schemas | `SessionStatus` | 4009–4011 |
| schemas | `ParticipantStatus` | 4013–4018 |
| schemas | `InteractionStatus` | 4020–4022 |
| schemas | `GroupingStrategy` | 4024–4026 |
| schemas | `TeamInfo` | 4028–4041 |
| schemas | `TeamInput` | 4043–4051 |
| schemas | `CreateSessionRequest` | 4053–4081 |
| schemas | `ClassroomInput` | 4083–4101 |
| schemas | `Classroom` | 4103–4116 |
| schemas | `ClassroomLearningProfile` | 4118–4132 |
| schemas | `TeacherProfile` | 4134–4147 |
| schemas | `RememberSuggestion` | 4149–4153 |
| schemas | `SavedSuggestion` | 4155–4160 |
| schemas | `CreateSessionResult` | 4162–4186 |
| schemas | `SessionByCode` | 4188–4207 |
| schemas | `JoinRequest` | 4209–4221 |
| schemas | `JoinResult` | 4223–4241 |
| schemas | `TeamAssignRequest` | 4243–4249 |
| schemas | `StudentGameResponse` | 4251–4314 |
| schemas | `StudentOddOneOutImageQuestion` | 4316–4337 |
| schemas | `MatchingStudentItem` | 4339–4364 |
| schemas | `MatchingStudentQuestion` | 4366–4422 |
| schemas | `StudentVisualClozeImageQuestion` | 4424–4469 |
| schemas | `InteractionBase` | 4471–4482 |
| schemas | `InteractionRequest` | 4484–4632 |
| schemas | `InteractionResult` | 4634–4670 |
| schemas | `LeaderboardParticipant` | 4672–4689 |
| schemas | `LeaderboardTeam` | 4691–4711 |
| schemas | `Leaderboard` | 4713–4725 |
| schemas | `MyResult` | 4727–4772 |
| schemas | `SharedGameInfo` | 4774–4784 |
| schemas | `PlayRequest` | 4786–4794 |
| schemas | `PlayResult` | 4796–4815 |
| schemas | `SessionListItem` | 4817–4835 |
| schemas | `SessionDetail` | 4837–4882 |
| schemas | `SessionResults` | 4884–4941 |
| schemas | `QuestionInsightDetail` | 4943–4982 |
| schemas | `ReviewNeeded` | 4984–5007 |
| schemas | `GameInsights` | 5009–5039 |
| schemas | `QuestionInsight` | 5041–5073 |
| schemas | `ParticipantInteraction` | 5075–5098 |
| schemas | `PageInfo` | 5100–5115 |
| schemas | `TeacherAccountStatus` | 5117–5119 |
| schemas | `AdminBudgetConfig` | 5121–5130 |
| schemas | `AdminTeacher` | 5131–5149 |
| schemas | `AdminCreateTeacherRequest` | 5151–5166 |
| schemas | `AuditResult` | 5168–5170 |
| schemas | `AuditLogEntry` | 5172–5195 |
| schemas | `ServiceName` | 5197–5199 |
| schemas | `ServiceUsage` | 5201–5232 |
| schemas | `UsageReport` | 5234–5264 |
| schemas | `SystemStatus` | 5266–5289 |
| schemas | `AiConfigInput` | 5291–5312 |
| schemas | `AiConfigVersion` | 5314–5339 |
| schemas | `BlockedWords` | 5341–5348 |
