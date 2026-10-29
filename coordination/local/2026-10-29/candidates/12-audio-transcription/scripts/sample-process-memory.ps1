#requires -Version 5.1
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$targets = @($env:GQ_MEMORY_TARGETS.Split(',') | ForEach-Object { [int]$_ })
$expectedName = $env:GQ_MEMORY_BROWSER
if ($expectedName -notin @('chrome', 'msedge') -or $targets.Count -lt 1 -or $targets.Count -gt 4 -or @($targets | Select-Object -Unique).Count -ne $targets.Count) { throw 'MEMORY_TARGET_INVALID' }
$project = if ($PSScriptRoot) { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')) } else { [IO.Path]::GetFullPath((Get-Location).Path) }
$evidenceParent = [IO.Path]::GetFullPath((Join-Path $project '../../.runs/audio-transcription'))
$evidence = if ($env:GQ_MEMORY_EVIDENCE) { [IO.Path]::GetFullPath($env:GQ_MEMORY_EVIDENCE) } else { [IO.Path]::GetFullPath((Join-Path $evidenceParent '20261011-resume-t02')) }
if (-not $evidence.StartsWith($evidenceParent + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'MEMORY_EVIDENCE_INVALID' }
$output = [IO.Path]::GetFullPath($env:GQ_MEMORY_OUTPUT)
if (-not $output.StartsWith($evidence + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($output) -ne '.jsonl') { throw 'MEMORY_OUTPUT_INVALID' }
$stopFile = $output + '.stop'
$starts = @{}
foreach ($targetId in $targets) {
    $p = Get-Process -Id $targetId
    $cim = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $targetId)
    if ($p.ProcessName -ne $expectedName -or $cim.CommandLine -notmatch '--type=renderer(?:\s|$)') { throw 'MEMORY_TARGET_NOT_RENDERER' }
    $starts[$targetId] = $p.StartTime.ToUniversalTime().ToString('o')
}
$stream = New-Object IO.FileStream($output, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$writer = New-Object IO.StreamWriter($stream, (New-Object Text.UTF8Encoding($false)))
$writer.AutoFlush = $true
$clock = [Diagnostics.Stopwatch]::StartNew()
try {
    $index = 0
    while (-not (Test-Path -LiteralPath $stopFile) -and $clock.Elapsed.TotalSeconds -lt 1800) {
        $parts = @()
        foreach ($targetId in $targets) {
            $p = Get-Process -Id $targetId
            if ($p.ProcessName -ne $expectedName -or $p.StartTime.ToUniversalTime().ToString('o') -ne $starts[$targetId]) { throw 'MEMORY_TARGET_CHANGED' }
            $p.Refresh()
            $parts += [pscustomobject]@{ processId = $targetId; processName = $p.ProcessName; startTime = $starts[$targetId]; privateBytes = $p.PrivateMemorySize64; workingSetBytes = $p.WorkingSet64; peakWorkingSetBytes = $p.PeakWorkingSet64; cpuSeconds = $p.TotalProcessorTime.TotalSeconds }
        }
        $record = [pscustomobject]@{ at = [DateTime]::UtcNow.ToString('o'); elapsedMs = $clock.Elapsed.TotalMilliseconds; index = $index; processes = $parts; totalPrivateBytes = ($parts | Measure-Object -Property privateBytes -Sum).Sum; totalWorkingSetBytes = ($parts | Measure-Object -Property workingSetBytes -Sum).Sum }
        $writer.WriteLine(($record | ConvertTo-Json -Depth 5 -Compress)); $index += 1
        $wait = [Math]::Max(0, [int](1000 * $index - $clock.Elapsed.TotalMilliseconds)); if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
    }
    [pscustomobject]@{ status = 'STOPPED'; samples = $index; output = $output; elapsedSeconds = $clock.Elapsed.TotalSeconds } | ConvertTo-Json -Compress
}
finally { $writer.Dispose(); $stream.Dispose(); $clock.Stop() }
