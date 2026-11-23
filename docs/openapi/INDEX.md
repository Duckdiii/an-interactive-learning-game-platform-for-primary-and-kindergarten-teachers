# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–73
- `paths`: dòng 74–2643
- `components`: dòng 2644–4946

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
| POST | `/games/validate-text` | validateGameText | implemented | 844–900 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 903–952 |
| POST | `/media/upload` | uploadMedia | implemented | 955–1022 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 1025–1056 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1061–1106 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1107–1148 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1153–1176 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1181–1201 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1206–1225 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1230–1250 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1255–1284 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1289–1316 |
| GET | `/classrooms` | listClassrooms | implemented | 1319–1344 |
| POST | `/classrooms` | createClassroom | implemented | 1345–1378 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1387–1422 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1423–1439 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1444–1487 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1497–1532 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1535–1573 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1579–1610 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1616–1663 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1666–1701 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1706–1749 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1754–1799 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1804–1851 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1856–1916 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 1921–1953 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 1958–1985 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1990–2016 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 2021–2059 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2062–2107 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2108–2145 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2150–2168 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2169–2203 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2208–2231 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2236–2255 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2258–2320 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2323–2377 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2380–2405 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2408–2432 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2433–2468 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2471–2504 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2507–2535 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2540–2570 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2575–2594 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2597–2613 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2614–2642 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2646–2652 |
| securitySchemes | `participantId` | 2653–2659 |
| securitySchemes | `refreshCookie` | 2660–2673 |
| parameters | `GameId` | 2676–2682 |
| parameters | `InsightsSessionType` | 2683–2689 |
| parameters | `InsightsFrom` | 2690–2697 |
| parameters | `InsightsTo` | 2698–2705 |
| parameters | `InsightsClassroom` | 2706–2712 |
| parameters | `Page` | 2713–2720 |
| parameters | `Size` | 2721–2728 |
| parameters | `TeacherId` | 2729–2735 |
| parameters | `VersionId` | 2736–2742 |
| parameters | `SessionId` | 2743–2749 |
| parameters | `ParticipantId` | 2750–2756 |
| parameters | `ShareCode` | 2757–2765 |
| parameters | `QuestionId` | 2766–2773 |
| headers | `RetryAfter` | 2776–2780 |
| headers | `SetRefreshCookie` | 2781–2786 |
| headers | `ClearRefreshCookie` | 2787–2790 |
| responses | `AuthSuccess` | 2793–2811 |
| responses | `ValidationError` | 2812–2819 |
| responses | `Unauthorized` | 2820–2827 |
| responses | `GameSuccess` | 2828–2833 |
| responses | `AdminTeacherSuccess` | 2834–2844 |
| responses | `TeacherStatusSuccess` | 2845–2862 |
| responses | `AiConfigVersionSuccess` | 2863–2873 |
| responses | `BlockedWordsSuccess` | 2874–2884 |
| responses | `SessionControlSuccess` | 2885–2902 |
| responses | `Forbidden` | 2903–2909 |
| responses | `NotFound` | 2910–2915 |
| responses | `Conflict` | 2916–2923 |
| responses | `UnprocessableContent` | 2924–2936 |
| responses | `AiTimeout` | 2937–2944 |
| responses | `RateLimited` | 2945–2953 |
| responses | `InternalError` | 2954–2959 |
| schemas | `ErrorCode` | 2962–2995 |
| schemas | `ErrorBody` | 2997–3028 |
| schemas | `ErrorResponse` | 3030–3036 |
| schemas | `Password` | 3038–3045 |
| schemas | `Role` | 3047–3049 |
| schemas | `RegisterRequest` | 3051–3074 |
| schemas | `RegisterResult` | 3076–3085 |
| schemas | `LoginRequest` | 3087–3100 |
| schemas | `TeacherInfo` | 3102–3118 |
| schemas | `AuthData` | 3120–3132 |
| schemas | `Subject` | 3134–3136 |
| schemas | `GradeLevel` | 3138–3140 |
| schemas | `GameType` | 3142–3158 |
| schemas | `GameStatus` | 3160–3162 |
| schemas | `Voice` | 3164–3175 |
| schemas | `GenerateGameRequest` | 3177–3244 |
| schemas | `UnderstandGameRequest` | 3246–3263 |
| schemas | `ReviseGameRequest` | 3265–3279 |
| schemas | `ChatTurn` | 3281–3291 |
| schemas | `GameUnderstanding` | 3293–3345 |
| schemas | `GameUnderstandingResponse` | 3347–3376 |
| schemas | `GameUnderstandingResult` | 3378–3386 |
| schemas | `GameEnvelope` | 3388–3405 |
| schemas | `CpfGameEnvelope` | 3407–3412 |
| schemas | `Question` | 3414–3428 |
| schemas | `GameResponse` | 3430–3436 |
| schemas | `CpfGameResponse` | 3438–3457 |
| schemas | `DslGameResponse` | 3459–3540 |
| schemas | `GameResult` | 3542–3548 |
| schemas | `GameSummary` | 3550–3587 |
| schemas | `CurriculumReview` | 3589–3631 |
| schemas | `PublishResult` | 3633–3649 |
| schemas | `SessionType` | 3651–3656 |
| schemas | `SessionStatus` | 3658–3660 |
| schemas | `ParticipantStatus` | 3662–3667 |
| schemas | `InteractionStatus` | 3669–3671 |
| schemas | `GroupingStrategy` | 3673–3675 |
| schemas | `TeamInfo` | 3677–3690 |
| schemas | `TeamInput` | 3692–3700 |
| schemas | `CreateSessionRequest` | 3702–3730 |
| schemas | `ClassroomInput` | 3732–3745 |
| schemas | `Classroom` | 3747–3758 |
| schemas | `CreateSessionResult` | 3760–3784 |
| schemas | `SessionByCode` | 3786–3805 |
| schemas | `JoinRequest` | 3807–3819 |
| schemas | `JoinResult` | 3821–3839 |
| schemas | `TeamAssignRequest` | 3841–3847 |
| schemas | `StudentGameResponse` | 3849–3912 |
| schemas | `StudentOddOneOutImageQuestion` | 3914–3935 |
| schemas | `MatchingStudentItem` | 3937–3962 |
| schemas | `MatchingStudentQuestion` | 3964–4020 |
| schemas | `StudentVisualClozeImageQuestion` | 4022–4066 |
| schemas | `InteractionBase` | 4068–4079 |
| schemas | `InteractionRequest` | 4081–4229 |
| schemas | `InteractionResult` | 4231–4267 |
| schemas | `LeaderboardParticipant` | 4269–4286 |
| schemas | `LeaderboardTeam` | 4288–4308 |
| schemas | `Leaderboard` | 4310–4322 |
| schemas | `MyResult` | 4324–4369 |
| schemas | `SharedGameInfo` | 4371–4381 |
| schemas | `PlayRequest` | 4383–4391 |
| schemas | `PlayResult` | 4393–4412 |
| schemas | `SessionListItem` | 4414–4432 |
| schemas | `SessionDetail` | 4434–4479 |
| schemas | `SessionResults` | 4481–4538 |
| schemas | `QuestionInsightDetail` | 4540–4579 |
| schemas | `ReviewNeeded` | 4581–4604 |
| schemas | `GameInsights` | 4606–4636 |
| schemas | `QuestionInsight` | 4638–4670 |
| schemas | `ParticipantInteraction` | 4672–4695 |
| schemas | `PageInfo` | 4697–4712 |
| schemas | `TeacherAccountStatus` | 4714–4716 |
| schemas | `AdminBudgetConfig` | 4718–4727 |
| schemas | `AdminTeacher` | 4728–4746 |
| schemas | `AdminCreateTeacherRequest` | 4748–4763 |
| schemas | `AuditResult` | 4765–4767 |
| schemas | `AuditLogEntry` | 4769–4792 |
| schemas | `ServiceName` | 4794–4796 |
| schemas | `ServiceUsage` | 4798–4829 |
| schemas | `UsageReport` | 4831–4861 |
| schemas | `SystemStatus` | 4863–4886 |
| schemas | `AiConfigInput` | 4888–4909 |
| schemas | `AiConfigVersion` | 4911–4936 |
| schemas | `BlockedWords` | 4938–4945 |
