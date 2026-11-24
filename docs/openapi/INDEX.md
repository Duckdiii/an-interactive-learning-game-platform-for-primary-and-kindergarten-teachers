# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–73
- `paths`: dòng 74–2700
- `components`: dòng 2701–5021

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
| POST | `/games/prepare` | prepareLessonIdea | implemented | 329–386 |
| POST | `/games/generate` | generateGame | extended-pending | 389–452 |
| POST | `/games/understand` | understandGameRequest | implemented | 455–494 |
| GET | `/games` | listGames | extended-pending | 497–535 |
| GET | `/games/{gameId}` | getGame | implemented | 540–557 |
| PUT | `/games/{gameId}` | updateGame | implemented | 558–605 |
| DELETE | `/games/{gameId}` | deleteGame | extended-pending | 606–626 |
| POST | `/games/{gameId}/publish` | publishGame | implemented | 631–681 |
| POST | `/games/{gameId}/regenerate` | regenerateGame | implemented | 686–737 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 742–781 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 786–820 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 826–898 |
| POST | `/games/validate-text` | validateGameText | implemented | 901–957 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 960–1009 |
| POST | `/media/upload` | uploadMedia | implemented | 1012–1079 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 1082–1113 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1118–1163 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1164–1205 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1210–1233 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1238–1258 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1263–1282 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1287–1307 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1312–1341 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1346–1373 |
| GET | `/classrooms` | listClassrooms | implemented | 1376–1401 |
| POST | `/classrooms` | createClassroom | implemented | 1402–1435 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1444–1479 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1480–1496 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1501–1544 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1554–1589 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1592–1630 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1636–1667 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1673–1720 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1723–1758 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1763–1806 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1811–1856 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1861–1908 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1913–1973 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 1978–2010 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 2015–2042 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 2047–2073 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 2078–2116 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2119–2164 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2165–2202 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2207–2225 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2226–2260 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2265–2288 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2293–2312 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2315–2377 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2380–2434 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2437–2462 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2465–2489 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2490–2525 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2528–2561 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2564–2592 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2597–2627 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2632–2651 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2654–2670 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2671–2699 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2703–2709 |
| securitySchemes | `participantId` | 2710–2716 |
| securitySchemes | `refreshCookie` | 2717–2730 |
| parameters | `GameId` | 2733–2739 |
| parameters | `InsightsSessionType` | 2740–2746 |
| parameters | `InsightsFrom` | 2747–2754 |
| parameters | `InsightsTo` | 2755–2762 |
| parameters | `InsightsClassroom` | 2763–2769 |
| parameters | `Page` | 2770–2777 |
| parameters | `Size` | 2778–2785 |
| parameters | `TeacherId` | 2786–2792 |
| parameters | `VersionId` | 2793–2799 |
| parameters | `SessionId` | 2800–2806 |
| parameters | `ParticipantId` | 2807–2813 |
| parameters | `ShareCode` | 2814–2822 |
| parameters | `QuestionId` | 2823–2830 |
| headers | `RetryAfter` | 2833–2837 |
| headers | `SetRefreshCookie` | 2838–2843 |
| headers | `ClearRefreshCookie` | 2844–2847 |
| responses | `AuthSuccess` | 2850–2868 |
| responses | `ValidationError` | 2869–2876 |
| responses | `Unauthorized` | 2877–2884 |
| responses | `GameSuccess` | 2885–2890 |
| responses | `AdminTeacherSuccess` | 2891–2901 |
| responses | `TeacherStatusSuccess` | 2902–2919 |
| responses | `AiConfigVersionSuccess` | 2920–2930 |
| responses | `BlockedWordsSuccess` | 2931–2941 |
| responses | `SessionControlSuccess` | 2942–2959 |
| responses | `Forbidden` | 2960–2966 |
| responses | `NotFound` | 2967–2972 |
| responses | `Conflict` | 2973–2980 |
| responses | `UnprocessableContent` | 2981–2994 |
| responses | `AiTimeout` | 2995–3002 |
| responses | `ServiceUnavailable` | 3003–3012 |
| responses | `RateLimited` | 3013–3021 |
| responses | `InternalError` | 3022–3027 |
| schemas | `ErrorCode` | 3030–3069 |
| schemas | `ErrorBody` | 3071–3102 |
| schemas | `ErrorResponse` | 3104–3110 |
| schemas | `Password` | 3112–3119 |
| schemas | `Role` | 3121–3123 |
| schemas | `RegisterRequest` | 3125–3148 |
| schemas | `RegisterResult` | 3150–3159 |
| schemas | `LoginRequest` | 3161–3174 |
| schemas | `TeacherInfo` | 3176–3192 |
| schemas | `AuthData` | 3194–3206 |
| schemas | `Subject` | 3208–3210 |
| schemas | `GradeLevel` | 3212–3214 |
| schemas | `GameType` | 3216–3232 |
| schemas | `GameStatus` | 3234–3236 |
| schemas | `Voice` | 3238–3249 |
| schemas | `GenerateGameRequest` | 3251–3318 |
| schemas | `UnderstandGameRequest` | 3320–3337 |
| schemas | `ReviseGameRequest` | 3339–3353 |
| schemas | `ChatTurn` | 3355–3365 |
| schemas | `GameUnderstanding` | 3367–3419 |
| schemas | `GameUnderstandingResponse` | 3421–3450 |
| schemas | `GameUnderstandingResult` | 3452–3460 |
| schemas | `GameEnvelope` | 3462–3479 |
| schemas | `CpfGameEnvelope` | 3481–3486 |
| schemas | `Question` | 3488–3502 |
| schemas | `GameResponse` | 3504–3510 |
| schemas | `CpfGameResponse` | 3512–3531 |
| schemas | `DslGameResponse` | 3533–3614 |
| schemas | `GameResult` | 3616–3622 |
| schemas | `GameSummary` | 3624–3661 |
| schemas | `CurriculumReview` | 3663–3705 |
| schemas | `PublishResult` | 3707–3723 |
| schemas | `SessionType` | 3725–3730 |
| schemas | `SessionStatus` | 3732–3734 |
| schemas | `ParticipantStatus` | 3736–3741 |
| schemas | `InteractionStatus` | 3743–3745 |
| schemas | `GroupingStrategy` | 3747–3749 |
| schemas | `TeamInfo` | 3751–3764 |
| schemas | `TeamInput` | 3766–3774 |
| schemas | `CreateSessionRequest` | 3776–3804 |
| schemas | `ClassroomInput` | 3806–3819 |
| schemas | `Classroom` | 3821–3832 |
| schemas | `CreateSessionResult` | 3834–3858 |
| schemas | `SessionByCode` | 3860–3879 |
| schemas | `JoinRequest` | 3881–3893 |
| schemas | `JoinResult` | 3895–3913 |
| schemas | `TeamAssignRequest` | 3915–3921 |
| schemas | `StudentGameResponse` | 3923–3986 |
| schemas | `StudentOddOneOutImageQuestion` | 3988–4009 |
| schemas | `MatchingStudentItem` | 4011–4036 |
| schemas | `MatchingStudentQuestion` | 4038–4094 |
| schemas | `StudentVisualClozeImageQuestion` | 4096–4141 |
| schemas | `InteractionBase` | 4143–4154 |
| schemas | `InteractionRequest` | 4156–4304 |
| schemas | `InteractionResult` | 4306–4342 |
| schemas | `LeaderboardParticipant` | 4344–4361 |
| schemas | `LeaderboardTeam` | 4363–4383 |
| schemas | `Leaderboard` | 4385–4397 |
| schemas | `MyResult` | 4399–4444 |
| schemas | `SharedGameInfo` | 4446–4456 |
| schemas | `PlayRequest` | 4458–4466 |
| schemas | `PlayResult` | 4468–4487 |
| schemas | `SessionListItem` | 4489–4507 |
| schemas | `SessionDetail` | 4509–4554 |
| schemas | `SessionResults` | 4556–4613 |
| schemas | `QuestionInsightDetail` | 4615–4654 |
| schemas | `ReviewNeeded` | 4656–4679 |
| schemas | `GameInsights` | 4681–4711 |
| schemas | `QuestionInsight` | 4713–4745 |
| schemas | `ParticipantInteraction` | 4747–4770 |
| schemas | `PageInfo` | 4772–4787 |
| schemas | `TeacherAccountStatus` | 4789–4791 |
| schemas | `AdminBudgetConfig` | 4793–4802 |
| schemas | `AdminTeacher` | 4803–4821 |
| schemas | `AdminCreateTeacherRequest` | 4823–4838 |
| schemas | `AuditResult` | 4840–4842 |
| schemas | `AuditLogEntry` | 4844–4867 |
| schemas | `ServiceName` | 4869–4871 |
| schemas | `ServiceUsage` | 4873–4904 |
| schemas | `UsageReport` | 4906–4936 |
| schemas | `SystemStatus` | 4938–4961 |
| schemas | `AiConfigInput` | 4963–4984 |
| schemas | `AiConfigVersion` | 4986–5011 |
| schemas | `BlockedWords` | 5013–5020 |
