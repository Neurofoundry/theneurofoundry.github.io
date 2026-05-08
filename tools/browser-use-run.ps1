param(
    [Parameter(Mandatory = $true)]
    [string]$Task,
    [string]$WorkerUrl,
    [string]$Model,
    [switch]$Headless,
    [switch]$MockAi
)

$scriptPath = Join-Path $PSScriptRoot "browser_use\run_task.py"
$argsList = @($scriptPath, "--task", $Task)

if ($WorkerUrl) {
    $argsList += @("--worker-url", $WorkerUrl)
}

if ($Model) {
    $argsList += @("--model", $Model)
}

if ($Headless) {
    $argsList += "--headless"
}

if ($MockAi) {
    $argsList += "--mock-ai"
}

python @argsList
