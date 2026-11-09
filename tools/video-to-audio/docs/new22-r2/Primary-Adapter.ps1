# Import defines functions only. No Add-Type, native call or process launch at top level.
# Windows PowerShell5.1/.NET Framework host is primary-owned and already inside the
# reviewed private station. Never start this as a visible PowerShell window.
$existingLeases = Get-Variable -Name New22OutstandingLeases -Scope Script -ErrorAction SilentlyContinue
if ($null -ne $existingLeases -and $existingLeases.Value.Count -ne 0) { throw 'Refuse to reimport while native leases are pending' }
if ($null -eq $existingLeases) { $script:New22OutstandingLeases = @{} }
function Import-New22ReviewedLibrary {
 param([Parameter(Mandatory=$true)][string]$ExpectedSha256)
 if ($script:New22OutstandingLeases.Count -ne 0) { throw 'No DLL reload while a session is pending' }
 $file = Join-Path $PSScriptRoot 'bin\IsolatedNodeCandidate.dll'
 if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedSha256) { throw 'Reviewed DLL hash mismatch' }
 Add-Type -Path $file
}
function Start-New22ReviewedNodeSession {
 param([Parameter(Mandatory=$true)]$PrimaryBoundaryLease,
       [Parameter(Mandatory=$true)][string]$NodeSha256,
       [Parameter(Mandatory=$true)][string]$IdleScriptSha256)
 if ($script:New22OutstandingLeases.Count -ne 0) { throw 'Single-session calibration only' }
 # A review label/hash is not authorization; primary must approve and supply
 # same-process original/boundary handles with their source lease separately.
 $session = [GlossQuote.New22.NodeIsolationSession]::Start($PrimaryBoundaryLease,$NodeSha256,$IdleScriptSha256)
 $script:New22OutstandingLeases[$session.OutputDirectory] = $session
 Write-Output -NoEnumerate $session
}
function Try-ReleaseNew22ReviewedNodeSession {
 param([Parameter(Mandatory=$true)]$Session,[uint32]$WaitMilliseconds=1000)
 $released = $Session.TryRelease($WaitMilliseconds)
 if ($released) { $script:New22OutstandingLeases.Remove($Session.OutputDirectory) }
 # false = KEEP HOST ALIVE. Do not let a parent timeout exit/kill this host and
 # implicitly close kill-on-close job handles while unknown members are active.
 return $released
}
function Assert-New22NoOutstandingLeases {
 if ($script:New22OutstandingLeases.Count -ne 0) { throw 'Native leases pending: retain host and boundary; no automatic exit or broad process cleanup' }
}
