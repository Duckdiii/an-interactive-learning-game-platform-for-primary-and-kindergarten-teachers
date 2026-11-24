# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–73
- `paths`: dòng 74–2700
- `components`: dòng 2701–5004

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
| POST | `/games/prepare` | prepareLessonIdea | implemented | 329–388 |
| POST | `/games/generate` | generateGame | extended-pending | 391–452 |
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
| responses | `UnprocessableContent` | 2981–2993 |
| responses | `AiTimeout` | 2994–3001 |
| responses | `RateLimited` | 3002–3010 |
| responses | `InternalError` | 3011–3016 |
| schemas | `ErrorCode` | 3019–3052 |
| schemas | `ErrorBody` | 3054–3085 |
| schemas | `ErrorResponse` | 3087–3093 |
| schemas | `Password` | 3095–3102 |
| schemas | `Role` | 3104–3106 |
| schemas | `RegisterRequest` | 3108–3131 |
| schemas | `RegisterResult` | 3133–3142 |
| schemas | `LoginRequest` | 3144–3157 |
| schemas | `TeacherInfo` | 3159–3175 |
| schemas | `AuthData` | 3177–3189 |
| schemas | `Subject` | 3191–3193 |
| schemas | `GradeLevel` | 3195–3197 |
| schemas | `GameType` | 3199–3215 |
| schemas | `GameStatus` | 3217–3219 |
| schemas | `Voice` | 3221–3232 |
| schemas | `GenerateGameRequest` | 3234–3301 |
| schemas | `UnderstandGameRequest` | 3303–3320 |
| schemas | `ReviseGameRequest` | 3322–3336 |
| schemas | `ChatTurn` | 3338–3348 |
| schemas | `GameUnderstanding` | 3350–3402 |
| schemas | `GameUnderstandingResponse` | 3404–3433 |
| schemas | `GameUnderstandingResult` | 3435–3443 |
| schemas | `GameEnvelope` | 3445–3462 |
| schemas | `CpfGameEnvelope` | 3464–3469 |
| schemas | `Question` | 3471–3485 |
| schemas | `GameResponse` | 3487–3493 |
| schemas | `CpfGameResponse` | 3495–3514 |
| schemas | `DslGameResponse` | 3516–3597 |
| schemas | `GameResult` | 3599–3605 |
| schemas | `GameSummary` | 3607–3644 |
| schemas | `CurriculumReview` | 3646–3688 |
| schemas | `PublishResult` | 3690–3706 |
| schemas | `SessionType` | 3708–3713 |
| schemas | `SessionStatus` | 3715–3717 |
| schemas | `ParticipantStatus` | 3719–3724 |
| schemas | `InteractionStatus` | 3726–3728 |
| schemas | `GroupingStrategy` | 3730–3732 |
| schemas | `TeamInfo` | 3734–3747 |
| schemas | `TeamInput` | 3749–3757 |
| schemas | `CreateSessionRequest` | 3759–3787 |
| schemas | `ClassroomInput` | 3789–3802 |
| schemas | `Classroom` | 3804–3815 |
| schemas | `CreateSessionResult` | 3817–3841 |
| schemas | `SessionByCode` | 3843–3862 |
| schemas | `JoinRequest` | 3864–3876 |
| schemas | `JoinResult` | 3878–3896 |
| schemas | `TeamAssignRequest` | 3898–3904 |
| schemas | `StudentGameResponse` | 3906–3969 |
| schemas | `StudentOddOneOutImageQuestion` | 3971–3992 |
| schemas | `MatchingStudentItem` | 3994–4019 |
| schemas | `MatchingStudentQuestion` | 4021–4077 |
| schemas | `StudentVisualClozeImageQuestion` | 4079–4124 |
| schemas | `InteractionBase` | 4126–4137 |
| schemas | `InteractionRequest` | 4139–4287 |
| schemas | `InteractionResult` | 4289–4325 |
| schemas | `LeaderboardParticipant` | 4327–4344 |
| schemas | `LeaderboardTeam` | 4346–4366 |
| schemas | `Leaderboard` | 4368–4380 |
| schemas | `MyResult` | 4382–4427 |
| schemas | `SharedGameInfo` | 4429–4439 |
| schemas | `PlayRequest` | 4441–4449 |
| schemas | `PlayResult` | 4451–4470 |
| schemas | `SessionListItem` | 4472–4490 |
| schemas | `SessionDetail` | 4492–4537 |
| schemas | `SessionResults` | 4539–4596 |
| schemas | `QuestionInsightDetail` | 4598–4637 |
| schemas | `ReviewNeeded` | 4639–4662 |
| schemas | `GameInsights` | 4664–4694 |
| schemas | `QuestionInsight` | 4696–4728 |
| schemas | `ParticipantInteraction` | 4730–4753 |
| schemas | `PageInfo` | 4755–4770 |
| schemas | `TeacherAccountStatus` | 4772–4774 |
| schemas | `AdminBudgetConfig` | 4776–4785 |
| schemas | `AdminTeacher` | 4786–4804 |
| schemas | `AdminCreateTeacherRequest` | 4806–4821 |
| schemas | `AuditResult` | 4823–4825 |
| schemas | `AuditLogEntry` | 4827–4850 |
| schemas | `ServiceName` | 4852–4854 |
| schemas | `ServiceUsage` | 4856–4887 |
| schemas | `UsageReport` | 4889–4919 |
| schemas | `SystemStatus` | 4921–4944 |
| schemas | `AiConfigInput` | 4946–4967 |
| schemas | `AiConfigVersion` | 4969–4994 |
| schemas | `BlockedWords` | 4996–5003 |
