param(
    [ValidateSet('CheckConfig', 'Extract', 'Migrate', 'Ingest', 'Query', 'Evaluate', 'Holdout', 'CompareGeneration')]
    [string]$Mode = 'CheckConfig',
    [string]$EnvFile,
    [string]$PdfPath,
    [ValidateSet('MATH', 'VIETNAMESE', 'ENGLISH')][string]$Subject = 'MATH',
    [ValidateSet('KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5')]
    [string]$GradeLevel = 'GRADE_1',
    [ValidateSet('v1', 'v2')][string]$HoldoutVersion = 'v1',
    [ValidateSet('QUIZ', 'AUDIO_VISUAL_MATCH', 'ODD_ONE_OUT', 'SPOT_THE_TARGET', 'WORD_SCRAMBLE', 'MATCHING', 'MEMORY_CARD', 'DRAG_DROP', 'ORDERING', 'VISUAL_CLOZE')]
    [string]$GameType,
    [string]$QueryId,
    [string]$Topic,
    [switch]$SkipBuild,
    [switch]$ScopeOnly
)
$ErrorActionPreference = 'Stop'
$ragRoot = Split-Path -Parent $PSScriptRoot
$ragBackend = Join-Path $ragRoot 'backend'
if (-not $EnvFile) { $EnvFile = Join-Path $ragBackend '.env' }
$ragAllowedKeys = @('GEMINI_API_KEY','GEMINI_MODEL','DB_URL','DB_USERNAME','DB_PASSWORD',
    'GEMINI_EMBEDDING_MODEL','RAG_MIN_SCORE','CURRICULUM_PDF')
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
if ($Mode -eq 'Holdout') {
    $ragModeFlag = if ($HoldoutVersion -eq 'v2') { '--evaluate-holdout-v2' } else { '--evaluate-holdout' }
    if ($HoldoutVersion -eq 'v2' -and -not $ScopeOnly) { throw 'Holdout v2 is scoped; pass -ScopeOnly -Subject MATH -GradeLevel GRADE_1..GRADE_3.' }
}
if ($Mode -eq 'CompareGeneration') {
    if (-not $GameType -or (-not $Topic -and -not $QueryId)) { throw 'CompareGeneration needs -GameType and either -Topic or -QueryId.' }
    if ($Topic -and $QueryId) { throw 'Use either -Topic or -QueryId, not both.' }
    $ragModeFlag = '--compare-generation'
}
$ragArguments = @($ragModeFlag)
if ($PdfPath -and $Mode -in @('Extract','Ingest')) { $ragArguments += $PdfPath }
if ($Mode -eq 'Query') {
    if (-not $Topic) { throw 'Query mode needs -Topic.' }
    $ragArguments += @($Subject, $GradeLevel, $Topic)
}
if ($Mode -eq 'CompareGeneration') {
    $ragArguments += @($Subject, $GradeLevel, $GameType)
    if ($QueryId) { $ragArguments += @('--query-id', $QueryId) }
    else { $ragArguments += $Topic }
}
if ($ScopeOnly) {
    if ($Mode -notin @('Evaluate','Holdout')) { throw '-ScopeOnly is supported for Evaluate and Holdout modes.' }
    $ragArguments += @($Subject, $GradeLevel)
}
Push-Location $ragBackend
try {
    if (-not $SkipBuild) {
        $ragMavenCommand = Get-Command mvn -ErrorAction SilentlyContinue
        if ($ragMavenCommand) { $ragMaven = $ragMavenCommand.Source }
        else {
            $ragCachedMaven = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.m2/wrapper/dists') -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue |
                Sort-Object FullName -Descending | Select-Object -First 1
            if ($ragCachedMaven) { $ragMaven = $ragCachedMaven.FullName }
            else { $ragMaven = Join-Path $ragBackend 'mvnw.cmd' }
        }
        & $ragMaven -B '-DskipTests' compile dependency:build-classpath '-Dmdep.outputFile=target/rag-classpath.txt'
        if ($LASTEXITCODE -ne 0) { throw 'Maven preparation failed.' }
    }
    $ragClasspathFile = Join-Path $ragBackend 'target/rag-classpath.txt'
    if (-not (Test-Path -LiteralPath $ragClasspathFile)) { throw 'Classpath missing; rerun without -SkipBuild.' }
    $ragClasspath = (Join-Path $ragBackend 'target/classes') + ';' + [System.IO.File]::ReadAllText($ragClasspathFile).Trim()
    $ragMainClass = if ($Mode -eq 'CompareGeneration') {
        'com.aigameplatform.backend.service.curriculum.CurriculumGenerationComparisonRunner'
    } else { 'com.aigameplatform.backend.service.curriculum.CurriculumSpikeRunner' }
    & java -cp $ragClasspath $ragMainClass @ragArguments
    $ragExitCode = $LASTEXITCODE
}
finally { Pop-Location }
exit $ragExitCode
