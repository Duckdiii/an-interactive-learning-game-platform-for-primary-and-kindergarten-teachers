# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–75
- `paths`: dòng 76–2961
- `components`: dòng 2962–5325

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
| POST | `/games/prepare` | prepareLesson | implemented | 588–626 |
| POST | `/games/{gameId}/narration/preview` | previewGameNarration | implemented | 631–669 |
| POST | `/games/{gameId}/narration/feedback` | getNarrationFeedback | implemented | 674–699 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 704–754 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | implemented | 759–810 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 815–854 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 859–893 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 899–971 |
| POST | `/games/validate-text` | validateGameText | implemented | 974–1030 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 1033–1082 |
| POST | `/media/upload` | uploadMedia | implemented | 1085–1152 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 1155–1186 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1191–1236 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1237–1278 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1283–1306 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1311–1331 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1336–1355 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1360–1380 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1385–1414 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1419–1446 |
| GET | `/teacher/profile` | getTeacherProfile | implemented | 1449–1473 |
| POST | `/teacher/profile` | saveTeacherProfile | implemented | 1474–1508 |
| DELETE | `/teacher/profile` | deleteTeacherProfile | implemented | 1509–1525 |
| GET | `/teacher/suggestions` | listTeacherSuggestions | implemented | 1528–1554 |
| POST | `/teacher/suggestions` | rememberTeacherSuggestion | implemented | 1555–1592 |
| DELETE | `/teacher/suggestions` | clearTeacherSuggestions | implemented | 1593–1608 |
| DELETE | `/teacher/suggestions/{suggestionId}` | deleteTeacherSuggestion | implemented | 1616–1632 |
| GET | `/classrooms` | listClassrooms | implemented | 1635–1660 |
| POST | `/classrooms` | createClassroom | implemented | 1661–1694 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1703–1740 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1741–1757 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1762–1805 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1815–1850 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1853–1891 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1897–1928 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1934–1981 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1984–2019 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 2024–2067 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 2072–2117 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 2122–2169 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 2174–2234 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 2239–2271 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 2276–2303 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 2308–2334 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 2339–2377 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2380–2425 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2426–2463 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2468–2486 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2487–2521 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2526–2549 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2554–2573 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2576–2638 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2641–2695 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2698–2723 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2726–2750 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2751–2786 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2789–2822 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2825–2853 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2858–2888 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2893–2912 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2915–2931 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2932–2960 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2964–2970 |
| securitySchemes | `participantId` | 2971–2977 |
| securitySchemes | `refreshCookie` | 2978–2991 |
| parameters | `GameId` | 2994–3000 |
| parameters | `InsightsSessionType` | 3001–3007 |
| parameters | `InsightsFrom` | 3008–3015 |
| parameters | `InsightsTo` | 3016–3023 |
| parameters | `InsightsClassroom` | 3024–3030 |
| parameters | `Page` | 3031–3038 |
| parameters | `Size` | 3039–3046 |
| parameters | `TeacherId` | 3047–3053 |
| parameters | `VersionId` | 3054–3060 |
| parameters | `SessionId` | 3061–3067 |
| parameters | `ParticipantId` | 3068–3074 |
| parameters | `ShareCode` | 3075–3083 |
| parameters | `QuestionId` | 3084–3091 |
| headers | `RetryAfter` | 3094–3098 |
| headers | `SetRefreshCookie` | 3099–3104 |
| headers | `ClearRefreshCookie` | 3105–3108 |
| responses | `AuthSuccess` | 3111–3129 |
| responses | `ValidationError` | 3130–3137 |
| responses | `Unauthorized` | 3138–3145 |
| responses | `GameSuccess` | 3146–3151 |
| responses | `AdminTeacherSuccess` | 3152–3162 |
| responses | `TeacherStatusSuccess` | 3163–3180 |
| responses | `AiConfigVersionSuccess` | 3181–3191 |
| responses | `BlockedWordsSuccess` | 3192–3202 |
| responses | `SessionControlSuccess` | 3203–3220 |
| responses | `Forbidden` | 3221–3227 |
| responses | `NotFound` | 3228–3233 |
| responses | `Conflict` | 3234–3241 |
| responses | `UnprocessableContent` | 3242–3254 |
| responses | `AiTimeout` | 3255–3262 |
| responses | `RateLimited` | 3263–3271 |
| responses | `InternalError` | 3272–3277 |
| schemas | `ErrorCode` | 3280–3313 |
| schemas | `ErrorBody` | 3315–3346 |
| schemas | `ErrorResponse` | 3348–3354 |
| schemas | `Password` | 3356–3363 |
| schemas | `Role` | 3365–3367 |
| schemas | `RegisterRequest` | 3369–3394 |
| schemas | `RegisterResult` | 3396–3405 |
| schemas | `LoginRequest` | 3407–3420 |
| schemas | `TeacherInfo` | 3422–3438 |
| schemas | `AuthData` | 3440–3452 |
| schemas | `Subject` | 3454–3456 |
| schemas | `GradeLevel` | 3458–3460 |
| schemas | `GameType` | 3462–3478 |
| schemas | `GameStatus` | 3480–3482 |
| schemas | `Voice` | 3484–3495 |
| schemas | `GenerateGameRequest` | 3497–3571 |
| schemas | `UnderstandGameRequest` | 3573–3590 |
| schemas | `ReviseGameRequest` | 3592–3606 |
| schemas | `ChatTurn` | 3608–3618 |
| schemas | `GameUnderstanding` | 3620–3672 |
| schemas | `GameUnderstandingResponse` | 3674–3703 |
| schemas | `GameUnderstandingResult` | 3705–3713 |
| schemas | `GameEnvelope` | 3715–3732 |
| schemas | `CpfGameEnvelope` | 3734–3739 |
| schemas | `Question` | 3741–3755 |
| schemas | `GameResponse` | 3757–3763 |
| schemas | `CpfGameResponse` | 3765–3784 |
| schemas | `DslGameResponse` | 3786–3867 |
| schemas | `GameResult` | 3869–3875 |
| schemas | `GameSummary` | 3877–3914 |
| schemas | `CurriculumReview` | 3916–3958 |
| schemas | `PublishResult` | 3960–3976 |
| schemas | `SessionType` | 3978–3983 |
| schemas | `SessionStatus` | 3985–3987 |
| schemas | `ParticipantStatus` | 3989–3994 |
| schemas | `InteractionStatus` | 3996–3998 |
| schemas | `GroupingStrategy` | 4000–4002 |
| schemas | `TeamInfo` | 4004–4017 |
| schemas | `TeamInput` | 4019–4027 |
| schemas | `CreateSessionRequest` | 4029–4057 |
| schemas | `ClassroomInput` | 4059–4077 |
| schemas | `Classroom` | 4079–4092 |
| schemas | `ClassroomLearningProfile` | 4094–4108 |
| schemas | `TeacherProfile` | 4110–4123 |
| schemas | `RememberSuggestion` | 4125–4129 |
| schemas | `SavedSuggestion` | 4131–4136 |
| schemas | `CreateSessionResult` | 4138–4162 |
| schemas | `SessionByCode` | 4164–4183 |
| schemas | `JoinRequest` | 4185–4197 |
| schemas | `JoinResult` | 4199–4217 |
| schemas | `TeamAssignRequest` | 4219–4225 |
| schemas | `StudentGameResponse` | 4227–4290 |
| schemas | `StudentOddOneOutImageQuestion` | 4292–4313 |
| schemas | `MatchingStudentItem` | 4315–4340 |
| schemas | `MatchingStudentQuestion` | 4342–4398 |
| schemas | `StudentVisualClozeImageQuestion` | 4400–4445 |
| schemas | `InteractionBase` | 4447–4458 |
| schemas | `InteractionRequest` | 4460–4608 |
| schemas | `InteractionResult` | 4610–4646 |
| schemas | `LeaderboardParticipant` | 4648–4665 |
| schemas | `LeaderboardTeam` | 4667–4687 |
| schemas | `Leaderboard` | 4689–4701 |
| schemas | `MyResult` | 4703–4748 |
| schemas | `SharedGameInfo` | 4750–4760 |
| schemas | `PlayRequest` | 4762–4770 |
| schemas | `PlayResult` | 4772–4791 |
| schemas | `SessionListItem` | 4793–4811 |
| schemas | `SessionDetail` | 4813–4858 |
| schemas | `SessionResults` | 4860–4917 |
| schemas | `QuestionInsightDetail` | 4919–4958 |
| schemas | `ReviewNeeded` | 4960–4983 |
| schemas | `GameInsights` | 4985–5015 |
| schemas | `QuestionInsight` | 5017–5049 |
| schemas | `ParticipantInteraction` | 5051–5074 |
| schemas | `PageInfo` | 5076–5091 |
| schemas | `TeacherAccountStatus` | 5093–5095 |
| schemas | `AdminBudgetConfig` | 5097–5106 |
| schemas | `AdminTeacher` | 5107–5125 |
| schemas | `AdminCreateTeacherRequest` | 5127–5142 |
| schemas | `AuditResult` | 5144–5146 |
| schemas | `AuditLogEntry` | 5148–5171 |
| schemas | `ServiceName` | 5173–5175 |
| schemas | `ServiceUsage` | 5177–5208 |
| schemas | `UsageReport` | 5210–5240 |
| schemas | `SystemStatus` | 5242–5265 |
| schemas | `AiConfigInput` | 5267–5288 |
| schemas | `AiConfigVersion` | 5290–5315 |
| schemas | `BlockedWords` | 5317–5324 |
