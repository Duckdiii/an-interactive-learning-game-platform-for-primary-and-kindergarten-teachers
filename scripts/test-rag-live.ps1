param([string]$EnvFile)
$ErrorActionPreference = 'Stop'
$ragRepository = Split-Path -Parent $PSScriptRoot
$ragBackend = Join-Path $ragRepository 'backend'
if (-not $EnvFile) { $EnvFile = Join-Path $ragBackend '.env' }
$ragKeys = @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET', 'GEMINI_API_KEY', 'GEMINI_MODEL',
    'GEMINI_EMBEDDING_MODEL', 'OPENAI_API_KEY', 'CURRICULUM_RAG_TOP_K', 'CURRICULUM_RAG_MIN_SCORE')
foreach ($ragLine in [IO.File]::ReadAllLines((Resolve-Path -LiteralPath $EnvFile).Path)) {
    if ($ragLine -match '^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$' -and $ragKeys -contains $Matches[1]) {
        $ragKey = $Matches[1]
        $ragValue = $Matches[2].Trim()
        if ($ragValue.Length -ge 2 -and (($ragValue.StartsWith('"') -and $ragValue.EndsWith('"')) -or
            ($ragValue.StartsWith("'") -and $ragValue.EndsWith("'")))) {
            $ragValue = $ragValue.Substring(1, $ragValue.Length - 2)
        }
        if (-not [Environment]::GetEnvironmentVariable($ragKey, 'Process') -and $ragValue) {
            [Environment]::SetEnvironmentVariable($ragKey, $ragValue, 'Process')
        }
    }
}
foreach ($ragKey in @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'OPENAI_API_KEY')) {
    if (-not [Environment]::GetEnvironmentVariable($ragKey, 'Process')) { throw "Missing configuration: $ragKey" }
}
$ragMavenCommand = Get-Command mvn -ErrorAction SilentlyContinue
if ($ragMavenCommand) { $ragMaven = $ragMavenCommand.Source }
else {
    $ragCachedMaven = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.m2/wrapper/dists') -Recurse -Filter mvn.cmd |
        Sort-Object FullName -Descending | Select-Object -First 1
    $ragMaven = if ($ragCachedMaven) { $ragCachedMaven.FullName } else { Join-Path $ragBackend 'mvnw.cmd' }
}
$env:RUN_LIVE_RAG_GENERATION_SMOKE = 'true'
Push-Location $ragBackend
try {
    & $ragMaven -B '-Dtest=CurriculumRagGeminiLiveSmokeTest' '-Dsurefire.skipAfterFailureCount=1' test
    $ragExitCode = $LASTEXITCODE
}
finally { Pop-Location }
exit $ragExitCode
