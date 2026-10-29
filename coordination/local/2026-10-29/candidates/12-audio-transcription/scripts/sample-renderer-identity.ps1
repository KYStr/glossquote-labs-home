#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$browser = $env:GQ_IDENTITY_BROWSER
if ($browser -notin @('chrome', 'msedge')) { throw 'IDENTITY_BROWSER_INVALID' }
$project = [IO.Path]::GetFullPath((Get-Location).Path)
$allowed = [IO.Path]::GetFullPath((Join-Path $project '../../.runs/audio-transcription'))
$output = [IO.Path]::GetFullPath($env:GQ_IDENTITY_OUTPUT)
if (-not $output.StartsWith($allowed + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($output) -ne '.jsonl') { throw 'IDENTITY_OUTPUT_INVALID' }
$ids = @(Get-CimInstance Win32_Process -Filter ("Name = '" + $browser + ".exe'") | Where-Object { $_.CommandLine -match '--type=renderer(?:\s|$)' } | ForEach-Object { $_.ProcessId })
$stream = New-Object IO.FileStream($output, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$writer = New-Object IO.StreamWriter($stream, (New-Object Text.UTF8Encoding($false))); $writer.AutoFlush = $true
$clock = [Diagnostics.Stopwatch]::StartNew(); $index = 0
try {
  while ($clock.Elapsed.TotalSeconds -lt 60 -and -not (Test-Path -LiteralPath ($output + '.stop'))) {
    $parts = @()
    foreach ($targetId in $ids) {
      $p = Get-Process -Id $targetId -ErrorAction SilentlyContinue
      if (-not $p -or $p.ProcessName -ne $browser) { continue }
      $p.Refresh(); $parts += [pscustomobject]@{ processId = $targetId; startTime = $p.StartTime.ToUniversalTime().ToString('o'); cpuSeconds = $p.TotalProcessorTime.TotalSeconds; privateBytes = $p.PrivateMemorySize64 }
    }
    $writer.WriteLine(([pscustomobject]@{ at = [DateTime]::UtcNow.ToString('o'); elapsedMs = $clock.Elapsed.TotalMilliseconds; index = $index; processes = $parts } | ConvertTo-Json -Depth 5 -Compress)); $index += 1
    $wait = [Math]::Max(0, [int](200 * $index - $clock.Elapsed.TotalMilliseconds)); if ($wait -gt 0) { Start-Sleep -Milliseconds $wait }
  }
  [pscustomobject]@{ status = 'STOPPED'; samples = $index; elapsedSeconds = $clock.Elapsed.TotalSeconds } | ConvertTo-Json -Compress
} finally { $writer.Dispose(); $stream.Dispose() }
