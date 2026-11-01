param(
    [ValidateSet('CheckConfig', 'Extract', 'Migrate', 'Ingest', 'Query', 'Evaluate', 'RuntimePreflight', 'RuntimeExploratory', 'RuntimeReviewed')]
    [string]$Mode = 'CheckConfig',
    [ValidateSet('primary-math-g1', 'kindergarten', 'vietnamese-g1-draft', 'vietnamese-g2-draft', 'vietnamese-g3-draft', 'vietnamese-g4-draft', 'vietnamese-g5-draft', 'math-g2-draft', 'math-g3-draft', 'math-g4-draft', 'math-g5-draft', 'english-g1-draft', 'english-g2-draft', 'english-g3-draft', 'english-g4-draft', 'english-g5-draft')]
    [string]$Dataset = 'primary-math-g1',
    [string]$EnvFile,
    [string]$PdfPath,
    [ValidateSet('MATH', 'VIETNAMESE', 'ENGLISH')][string]$Subject = 'MATH',
    [ValidateSet('KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5')]
    [string]$GradeLevel = 'GRADE_1',
    [string]$Topic,
    [ValidateSet('AGE_3_4','AGE_4_5','AGE_5_6')][string]$KindergartenAgeBand,
    [ValidateSet('legacy','tune','holdout')][string]$EvaluationSet = 'legacy',
    [string]$QueriesPath,
    [string]$TunePath,
    [ValidateSet('DEV','HOLDOUT_CANDIDATE','HOLDOUT')][string]$RuntimeSplit = 'DEV',
    [Alias('ReportPath')][string]$RunRoot,
    [string]$RunId,
    [string]$DatasetVersion,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$ragRoot = Split-Path -Parent $PSScriptRoot
$ragBackend = Join-Path $ragRoot 'backend'
if (-not $EnvFile) { $EnvFile = Join-Path $ragBackend '.env' }
$ragAllowedKeys = @('GEMINI_API_KEY','DB_URL','DB_USERNAME','DB_PASSWORD',
    'GEMINI_EMBEDDING_MODEL','RAG_MIN_SCORE','CURRICULUM_PDF','CURRICULUM_CONSTRAINTS_APPROVED_SHA256',
    'CURRICULUM_KINDERGARTEN_ENABLED','CURRICULUM_KINDERGARTEN_TOP_K','CURRICULUM_KINDERGARTEN_MIN_SCORE',
    'RAG_LOCAL_EVAL','GEMINI_MODEL','CURRICULUM_KINDERGARTEN_EXPERT_APPROVED_SOURCE_SHA256',
    'RAG_EVAL_CONFIRMED_EMBEDDING_REQUESTS','RAG_EVAL_CONFIRMED_REVIEWER_REQUESTS','RAG_EVAL_QUOTA_CHECKED_AT')
if (Test-Path -LiteralPath $EnvFile) {
    foreach ($ragLine in [System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $EnvFile).Path)) {
        if ($ragLine -match '^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$' -and $ragAllowedKeys -contains $Matches[1]) {
            $ragKey = $Matches[1]
            $ragValue = $Matches[2].Trim()
            if ($ragValue.Length -ge 2 -and (($ragValue.StartsWith('"') -and $ragValue.EndsWith('"')) -or
                ($ragValue.StartsWith("'") -and $ragValue.EndsWith("'")))) {
                $ragValue = $ragValue.Substring(1, $ragValue.Length - 2)
            }
            # Process variables take precedence. File contents are parsed as data, never executed.
            if (-not [Environment]::GetEnvironmentVariable($ragKey, 'Process') -and $ragValue) {
                [Environment]::SetEnvironmentVariable($ragKey, $ragValue, 'Process')
            }
        }
    }
}
$ragModeFlag = '--' + $Mode.ToLowerInvariant()
if ($Mode -eq 'CheckConfig') { $ragModeFlag = '--check-config' }
$ragArguments = @('--dataset', $Dataset, $ragModeFlag)
if ($PdfPath -and $Mode -in @('Extract','Ingest')) { $ragArguments += $PdfPath }
if ($Mode -eq 'Query') {
    if (-not $Topic) { throw 'Query mode needs -Topic.' }
    if ($Dataset -eq 'kindergarten') {
        if (-not $KindergartenAgeBand) { throw 'Kindergarten Query mode needs -KindergartenAgeBand.' }
        $ragArguments += @($Subject, $GradeLevel, $KindergartenAgeBand, $Topic)
    } else {
        $ragArguments += @($Subject, $GradeLevel, $Topic)
    }
}
if ($Mode -eq 'Evaluate') {
    $ragArguments += $EvaluationSet
    if ($EvaluationSet -ne 'legacy') {
        if (-not $QueriesPath) { throw 'Tune/holdout needs -QueriesPath and its review manifest.' }
        $ragArguments += (Resolve-Path -LiteralPath $QueriesPath).Path
        if ($EvaluationSet -eq 'holdout') {
            if (-not $TunePath) { throw 'Holdout needs -TunePath to verify group separation.' }
            $ragArguments += (Resolve-Path -LiteralPath $TunePath).Path
        }
    }
}
$ragMainClass = 'com.aigameplatform.backend.service.curriculum.CurriculumSpikeRunner'
if ($Mode -in @('RuntimePreflight','RuntimeExploratory','RuntimeReviewed')) {
    $ragMainClass = 'com.aigameplatform.backend.service.curriculum.CurriculumRuntimeEvaluation'
    if (-not $QueriesPath) { $QueriesPath = Join-Path $ragRoot 'docs/rag-spike/evaluation-drafts' }
    if (-not $RunRoot) { $RunRoot = Join-Path $ragBackend 'target/rag-eval-local/runs' }
    if ($Mode -eq 'RuntimeExploratory' -and -not $DatasetVersion) {
        throw 'RuntimeExploratory requires -DatasetVersion to avoid running all 480 queries at once.'
    }
    if ($Mode -eq 'RuntimeExploratory' -and -not $RunId) {
        throw 'RuntimeExploratory requires a stable -RunId so dataset checkpoints can be resumed independently.'
    }
    $ragRuntimeFlag = switch ($Mode) {
        'RuntimePreflight' { '--preflight' }
        'RuntimeExploratory' { '--exploratory' }
        'RuntimeReviewed' { '--reviewed' }
    }
    $ragArguments = @($ragRuntimeFlag, (Resolve-Path -LiteralPath $QueriesPath).Path,
        $RuntimeSplit, [System.IO.Path]::GetFullPath($RunRoot))
    if ($RunId -or $DatasetVersion) { $ragArguments += $RunId }
    if ($DatasetVersion) { $ragArguments += $DatasetVersion }
}
Push-Location $ragBackend
try {
    $ragGitCommit = & git -C $ragRoot rev-parse HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $ragGitCommit) { [Environment]::SetEnvironmentVariable('GIT_COMMIT', $ragGitCommit.Trim(), 'Process') }
    $ragGitStatus = & git -C $ragRoot status --porcelain 2>$null
    [Environment]::SetEnvironmentVariable('GIT_DIRTY', [string]([bool]$ragGitStatus), 'Process')
    if (-not $SkipBuild) {
        $ragMavenCommand = Get-Command mvn -ErrorAction SilentlyContinue
        if ($ragMavenCommand) { $ragMaven = $ragMavenCommand.Source }
        else {
            $ragCachedMaven = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.m2/wrapper/dists') -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue |
                Sort-Object FullName -Descending | Select-Object -First 1
            if ($ragCachedMaven) { $ragMaven = $ragCachedMaven.FullName }
            else { $ragMaven = Join-Path $ragBackend 'mvnw.cmd' }
        }
        & $ragMaven -B '-DskipTests' test-compile dependency:build-classpath '-DincludeScope=test' '-Dmdep.outputFile=target/rag-classpath.txt'
        if ($LASTEXITCODE -ne 0) { throw 'Maven preparation failed.' }
    }
    $ragClasspathFile = Join-Path $ragBackend 'target/rag-classpath.txt'
    if (-not (Test-Path -LiteralPath $ragClasspathFile)) { throw 'Classpath missing; rerun without -SkipBuild.' }
    $ragClasspath = (Join-Path $ragBackend 'target/test-classes') + ';' + (Join-Path $ragBackend 'target/classes') + ';' + [System.IO.File]::ReadAllText($ragClasspathFile).Trim()
    & java -cp $ragClasspath $ragMainClass @ragArguments
    $ragExitCode = $LASTEXITCODE
}
finally { Pop-Location }
exit $ragExitCode
