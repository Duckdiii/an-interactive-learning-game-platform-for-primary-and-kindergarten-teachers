# Chỉ mục `openapi.yaml`

> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).
> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.

## Phần đầu file

- `info`: dòng 3–26
- `servers`: dòng 27–30
- `tags`: dòng 31–73
- `paths`: dòng 74–2652
- `components`: dòng 2653–4956

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
| POST | `/games/{gameId}/regenerate` | regenerateGame | implemented | 638–689 |
| POST | `/games/{gameId}/revise` | reviseGame | implemented | 694–733 |
| GET | `/games/{gameId}/curriculum-review` | getGameCurriculumReview | implemented | 738–772 |
| POST | `/games/{gameId}/questions/{questionId}/regenerate` | regenerateQuestion | implemented | 778–850 |
| POST | `/games/validate-text` | validateGameText | implemented | 853–909 |
| GET | `/media/pexels-search` | searchPexelsImages | implemented | 912–961 |
| POST | `/media/upload` | uploadMedia | implemented | 964–1031 |
| GET | `/media/{group}/{name}` | downloadMedia | implemented | 1034–1065 |
| POST | `/games/{gameId}/sessions` | createSession | implemented | 1070–1115 |
| GET | `/games/{gameId}/sessions` | listGameSessions | implemented | 1116–1157 |
| POST | `/sessions/{sessionId}/start` | startSession | implemented | 1162–1185 |
| POST | `/sessions/{sessionId}/pause` | pauseSession | implemented | 1190–1210 |
| POST | `/sessions/{sessionId}/resume` | resumeSession | implemented | 1215–1234 |
| POST | `/sessions/{sessionId}/close` | closeSession | implemented | 1239–1259 |
| GET | `/sessions/{sessionId}` | getSession | implemented | 1264–1293 |
| GET | `/sessions/{sessionId}/results` | getSessionResults | implemented | 1298–1325 |
| GET | `/classrooms` | listClassrooms | implemented | 1328–1353 |
| POST | `/classrooms` | createClassroom | implemented | 1354–1387 |
| PUT | `/classrooms/{classroomId}` | updateClassroom | implemented | 1396–1431 |
| DELETE | `/classrooms/{classroomId}` | deleteClassroom | implemented | 1432–1448 |
| GET | `/games/{gameId}/insights` | getGameInsights | extended-pending | 1453–1496 |
| GET | `/games/{gameId}/questions/{questionId}/insights` | getQuestionInsights | extended-pending | 1506–1541 |
| GET | `/insights/review-needed` | listReviewNeeded | extended-pending | 1544–1582 |
| GET | `/sessions/{sessionId}/participants/{participantId}/interactions` | getParticipantInteractions | implemented | 1588–1619 |
| PUT | `/sessions/{sessionId}/participants/{participantId}/team` | assignParticipantTeam | implemented | 1625–1672 |
| GET | `/sessions/by-code/{accessCode}` | getSessionByCode | implemented | 1675–1710 |
| POST | `/sessions/{sessionId}/join` | joinSession | implemented | 1715–1758 |
| PUT | `/sessions/{sessionId}/my-team` | changeMyTeam | implemented | 1763–1808 |
| GET | `/sessions/{sessionId}/questions` | getSessionQuestions | implemented | 1813–1860 |
| POST | `/sessions/{sessionId}/interactions` | submitInteraction | implemented | 1865–1925 |
| GET | `/sessions/{sessionId}/leaderboard` | getLeaderboard | implemented | 1930–1962 |
| GET | `/sessions/{sessionId}/my-result` | getMyResult | implemented | 1967–1994 |
| GET | `/games/shared/{shareCode}` | getSharedGame | implemented | 1999–2025 |
| POST | `/games/shared/{shareCode}/play` | playSharedGame | implemented | 2030–2068 |
| GET | `/admin/teachers` | adminListTeachers | implemented | 2071–2116 |
| POST | `/admin/teachers` | adminCreateTeacher | implemented | 2117–2154 |
| GET | `/admin/teachers/{teacherId}` | adminGetTeacher | implemented | 2159–2177 |
| PUT | `/admin/teachers/{teacherId}` | adminUpdateTeacher | implemented | 2178–2212 |
| POST | `/admin/teachers/{teacherId}/lock` | adminLockTeacher | implemented | 2217–2240 |
| POST | `/admin/teachers/{teacherId}/unlock` | adminUnlockTeacher | implemented | 2245–2264 |
| GET | `/admin/audit-logs` | adminListAuditLogs | implemented | 2267–2329 |
| GET | `/admin/usage` | adminGetUsage | implemented | 2332–2386 |
| GET | `/admin/system-status` | adminGetSystemStatus | implemented | 2389–2414 |
| GET | `/admin/budget-config` | adminGetBudgetConfig | implemented | 2417–2441 |
| POST | `/admin/budget-config` | adminUpdateBudgetConfig | implemented | 2442–2477 |
| GET | `/admin/ai-config` | adminGetAiConfig | implemented | 2480–2513 |
| POST | `/admin/ai-config/versions` | adminCreateAiConfigVersion | implemented | 2516–2544 |
| POST | `/admin/ai-config/versions/{versionId}/freeze` | adminFreezeAiConfigVersion | implemented | 2549–2579 |
| POST | `/admin/ai-config/versions/{versionId}/activate` | adminActivateAiConfigVersion | implemented | 2584–2603 |
| GET | `/admin/safety/blocked-words` | adminGetBlockedWords | implemented | 2606–2622 |
| PUT | `/admin/safety/blocked-words` | adminReplaceBlockedWords | implemented | 2623–2651 |

## Components

| Loại | Tên | Dòng |
|---|---|---|
| securitySchemes | `bearerAuth` | 2655–2661 |
| securitySchemes | `participantId` | 2662–2668 |
| securitySchemes | `refreshCookie` | 2669–2682 |
| parameters | `GameId` | 2685–2691 |
| parameters | `InsightsSessionType` | 2692–2698 |
| parameters | `InsightsFrom` | 2699–2706 |
| parameters | `InsightsTo` | 2707–2714 |
| parameters | `InsightsClassroom` | 2715–2721 |
| parameters | `Page` | 2722–2729 |
| parameters | `Size` | 2730–2737 |
| parameters | `TeacherId` | 2738–2744 |
| parameters | `VersionId` | 2745–2751 |
| parameters | `SessionId` | 2752–2758 |
| parameters | `ParticipantId` | 2759–2765 |
| parameters | `ShareCode` | 2766–2774 |
| parameters | `QuestionId` | 2775–2782 |
| headers | `RetryAfter` | 2785–2789 |
| headers | `SetRefreshCookie` | 2790–2795 |
| headers | `ClearRefreshCookie` | 2796–2799 |
| responses | `AuthSuccess` | 2802–2820 |
| responses | `ValidationError` | 2821–2828 |
| responses | `Unauthorized` | 2829–2836 |
| responses | `GameSuccess` | 2837–2842 |
| responses | `AdminTeacherSuccess` | 2843–2853 |
| responses | `TeacherStatusSuccess` | 2854–2871 |
| responses | `AiConfigVersionSuccess` | 2872–2882 |
| responses | `BlockedWordsSuccess` | 2883–2893 |
| responses | `SessionControlSuccess` | 2894–2911 |
| responses | `Forbidden` | 2912–2918 |
| responses | `NotFound` | 2919–2924 |
| responses | `Conflict` | 2925–2932 |
| responses | `UnprocessableContent` | 2933–2945 |
| responses | `AiTimeout` | 2946–2953 |
| responses | `RateLimited` | 2954–2962 |
| responses | `InternalError` | 2963–2968 |
| schemas | `ErrorCode` | 2971–3004 |
| schemas | `ErrorBody` | 3006–3037 |
| schemas | `ErrorResponse` | 3039–3045 |
| schemas | `Password` | 3047–3054 |
| schemas | `Role` | 3056–3058 |
| schemas | `RegisterRequest` | 3060–3083 |
| schemas | `RegisterResult` | 3085–3094 |
| schemas | `LoginRequest` | 3096–3109 |
| schemas | `TeacherInfo` | 3111–3127 |
| schemas | `AuthData` | 3129–3141 |
| schemas | `Subject` | 3143–3145 |
| schemas | `GradeLevel` | 3147–3149 |
| schemas | `GameType` | 3151–3167 |
| schemas | `GameStatus` | 3169–3171 |
| schemas | `Voice` | 3173–3184 |
| schemas | `GenerateGameRequest` | 3186–3253 |
| schemas | `UnderstandGameRequest` | 3255–3272 |
| schemas | `ReviseGameRequest` | 3274–3288 |
| schemas | `ChatTurn` | 3290–3300 |
| schemas | `GameUnderstanding` | 3302–3354 |
| schemas | `GameUnderstandingResponse` | 3356–3385 |
| schemas | `GameUnderstandingResult` | 3387–3395 |
| schemas | `GameEnvelope` | 3397–3414 |
| schemas | `CpfGameEnvelope` | 3416–3421 |
| schemas | `Question` | 3423–3437 |
| schemas | `GameResponse` | 3439–3445 |
| schemas | `CpfGameResponse` | 3447–3466 |
| schemas | `DslGameResponse` | 3468–3549 |
| schemas | `GameResult` | 3551–3557 |
| schemas | `GameSummary` | 3559–3596 |
| schemas | `CurriculumReview` | 3598–3640 |
| schemas | `PublishResult` | 3642–3658 |
| schemas | `SessionType` | 3660–3665 |
| schemas | `SessionStatus` | 3667–3669 |
| schemas | `ParticipantStatus` | 3671–3676 |
| schemas | `InteractionStatus` | 3678–3680 |
| schemas | `GroupingStrategy` | 3682–3684 |
| schemas | `TeamInfo` | 3686–3699 |
| schemas | `TeamInput` | 3701–3709 |
| schemas | `CreateSessionRequest` | 3711–3739 |
| schemas | `ClassroomInput` | 3741–3754 |
| schemas | `Classroom` | 3756–3767 |
| schemas | `CreateSessionResult` | 3769–3793 |
| schemas | `SessionByCode` | 3795–3814 |
| schemas | `JoinRequest` | 3816–3828 |
| schemas | `JoinResult` | 3830–3848 |
| schemas | `TeamAssignRequest` | 3850–3856 |
| schemas | `StudentGameResponse` | 3858–3921 |
| schemas | `StudentOddOneOutImageQuestion` | 3923–3944 |
| schemas | `MatchingStudentItem` | 3946–3971 |
| schemas | `MatchingStudentQuestion` | 3973–4029 |
| schemas | `StudentVisualClozeImageQuestion` | 4031–4076 |
| schemas | `InteractionBase` | 4078–4089 |
| schemas | `InteractionRequest` | 4091–4239 |
| schemas | `InteractionResult` | 4241–4277 |
| schemas | `LeaderboardParticipant` | 4279–4296 |
| schemas | `LeaderboardTeam` | 4298–4318 |
| schemas | `Leaderboard` | 4320–4332 |
| schemas | `MyResult` | 4334–4379 |
| schemas | `SharedGameInfo` | 4381–4391 |
| schemas | `PlayRequest` | 4393–4401 |
| schemas | `PlayResult` | 4403–4422 |
| schemas | `SessionListItem` | 4424–4442 |
| schemas | `SessionDetail` | 4444–4489 |
| schemas | `SessionResults` | 4491–4548 |
| schemas | `QuestionInsightDetail` | 4550–4589 |
| schemas | `ReviewNeeded` | 4591–4614 |
| schemas | `GameInsights` | 4616–4646 |
| schemas | `QuestionInsight` | 4648–4680 |
| schemas | `ParticipantInteraction` | 4682–4705 |
| schemas | `PageInfo` | 4707–4722 |
| schemas | `TeacherAccountStatus` | 4724–4726 |
| schemas | `AdminBudgetConfig` | 4728–4737 |
| schemas | `AdminTeacher` | 4738–4756 |
| schemas | `AdminCreateTeacherRequest` | 4758–4773 |
| schemas | `AuditResult` | 4775–4777 |
| schemas | `AuditLogEntry` | 4779–4802 |
| schemas | `ServiceName` | 4804–4806 |
| schemas | `ServiceUsage` | 4808–4839 |
| schemas | `UsageReport` | 4841–4871 |
| schemas | `SystemStatus` | 4873–4896 |
| schemas | `AiConfigInput` | 4898–4919 |
| schemas | `AiConfigVersion` | 4921–4946 |
| schemas | `BlockedWords` | 4948–4955 |
