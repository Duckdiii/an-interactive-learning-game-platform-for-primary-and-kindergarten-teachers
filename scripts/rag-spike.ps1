param(
    [ValidateSet('CheckConfig', 'Extract', 'Migrate', 'Ingest', 'Query', 'Evaluate')]
    [string]$Mode = 'CheckConfig',
    [string]$EnvFile,
    [string]$PdfPath,
    [ValidateSet('MATH', 'VIETNAMESE', 'ENGLISH')][string]$Subject = 'MATH',
    [ValidateSet('KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5')]
    [string]$GradeLevel = 'GRADE_1',
    [string]$Topic,
    [ValidateSet('legacy','tune','holdout')][string]$EvaluationSet = 'legacy',
    [string]$QueriesPath,
    [string]$TunePath,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$ragRoot = Split-Path -Parent $PSScriptRoot
$ragBackend = Join-Path $ragRoot 'backend'
if (-not $EnvFile) { $EnvFile = Join-Path $ragBackend '.env' }
$ragAllowedKeys = @('GEMINI_API_KEY','DB_URL','DB_USERNAME','DB_PASSWORD',
    'GEMINI_EMBEDDING_MODEL','RAG_MIN_SCORE','CURRICULUM_PDF','CURRICULUM_CONSTRAINTS_APPROVED_SHA256')
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
$ragArguments = @($ragModeFlag)
if ($PdfPath -and $Mode -in @('Extract','Ingest')) { $ragArguments += $PdfPath }
if ($Mode -eq 'Query') {
    if (-not $Topic) { throw 'Query mode needs -Topic.' }
    $ragArguments += @($Subject, $GradeLevel, $Topic)
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
    & java -cp $ragClasspath com.aigameplatform.backend.service.curriculum.CurriculumSpikeRunner @ragArguments
    $ragExitCode = $LASTEXITCODE
}
finally { Pop-Location }
exit $ragExitCode
