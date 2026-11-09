param([Parameter(Mandatory)][ValidateSet('batch')][string]$Site,[Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$ApprovedCommit,[Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{64}$')][string]$ApprovedDigest,[switch]$DryRun)
$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$node='C:\Program Files\nodejs\node.exe'
$wrangler=Join-Path $taskRoot '.runs/date-calculator/t09/deploy-tools/node_modules/wrangler/bin/wrangler.js'
$guard=Join-Path $env:USERPROFILE '.codex/check-persistent-environment.ps1'
$before=(& $guard | Out-String)|ConvertFrom-Json
$baseline=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'environment-before.json') -Raw|ConvertFrom-Json
if($before.Status-ne'PASS'-or($before.Snapshots|ConvertTo-Json -Depth 8 -Compress)-cne($baseline.Snapshots|ConvertTo-Json -Depth 8 -Compress)){throw 'Persistent environment drift'}
& $node (Join-Path $PSScriptRoot 'release-tools.mjs') validate $Site $ApprovedCommit $ApprovedDigest
if($LASTEXITCODE-ne0){throw 'Fixed source / config / CLI validation failed'}
$plan=Get-Content -LiteralPath (Join-Path $PSScriptRoot ($Site+'-plan.json')) -Raw|ConvertFrom-Json
$loader=Join-Path $taskRoot '.runs/focus-timer/token-file.ps1'
if((Get-FileHash -LiteralPath $loader).Hash-ine'7ccdad3b6f169c83115db1df3b4f7f7e4a71a8cb22781c9af18db84ce82df5bb'){throw 'Loader changed'}
$runtime=Join-Path $PSScriptRoot ($Site+'-runtime-'+[Guid]::NewGuid().ToString('N'))
foreach($dir in @('profile','config','temp','logs','dry-output')){[void][IO.Directory]::CreateDirectory((Join-Path $runtime $dir))}
$secure=$null;$pointer=[IntPtr]::Zero
try{
 $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=$node;$start.WorkingDirectory=$plan.stage;$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true;$start.Environment.Clear()
 foreach($pair in @{PATH='C:\Program Files\nodejs;C:\Windows\System32;C:\Windows';SystemRoot='C:\Windows';WINDIR='C:\Windows';ComSpec='C:\Windows\System32\cmd.exe';USERPROFILE=(Join-Path $runtime 'profile');XDG_CONFIG_HOME=(Join-Path $runtime 'config');TEMP=(Join-Path $runtime 'temp');TMP=(Join-Path $runtime 'temp');WRANGLER_LOG_PATH=(Join-Path $runtime 'logs');WRANGLER_SEND_METRICS='false';CI='true';CLOUDFLARE_ACCOUNT_ID='6fdf783f594cf587849cf13b69939d5a'}.GetEnumerator()){$start.Environment[$pair.Key]=$pair.Value}
 foreach($arg in @($wrangler,'deploy','--autoconfig=false','--install-skills=false','--config','wrangler.jsonc')){$start.ArgumentList.Add($arg)}
 if($DryRun){$start.ArgumentList.Add('--dry-run');$start.ArgumentList.Add('--outdir');$start.ArgumentList.Add((Join-Path $runtime 'dry-output'))}
 else{
  . $loader
  $secure=Read-ReleaseTokenFile -LiteralPath 'C:\Users\123ik\.codex\secrets\glossquote-cloudflare.token' -ExcludedDirectory $taskRoot
  $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $start.Environment['CLOUDFLARE_API_TOKEN']=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
 }
 $process=[Diagnostics.Process]::Start($start);[void]$start.Environment.Remove('CLOUDFLARE_API_TOKEN')
 $stdout=$process.StandardOutput.ReadToEndAsync();$stderr=$process.StandardError.ReadToEndAsync()
 if(-not$process.WaitForExit(240000)){$process.Kill($true);throw 'Task-owned deployment timed out'}
 $code=$process.ExitCode;$output=$stdout.GetAwaiter().GetResult()+$stderr.GetAwaiter().GetResult();$process.Dispose()
 if($pointer-ne[IntPtr]::Zero){$output=$output.Replace([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer),'[REDACTED]')}
 $output|Set-Content -LiteralPath (Join-Path $runtime 'deploy.log') -Encoding utf8
 $receipt=[ordered]@{site=$Site;commit=$plan.commit;dryRun=[bool]$DryRun;exitCode=$code;at=[DateTime]::UtcNow.ToString('o');runtime=$runtime;version=([regex]::Match($output,'Current Version ID: ([0-9a-f-]+)').Groups[1].Value)}
 $receipt|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot ($Site+$(if($DryRun){'-dryrun.json'}else{'-deployment.json'}))) -Encoding utf8
 Write-Output $output;if($code-ne0){throw "Deploy failed exit $code"}
}finally{
 if($pointer-ne[IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)};if($null-ne$secure){$secure.Dispose()}
 $after=(& $guard|Out-String)|ConvertFrom-Json;$after|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $runtime 'environment-after.json') -Encoding utf8
 if($after.Status-ne'PASS'-or($before.Snapshots|ConvertTo-Json -Depth 8 -Compress)-cne($after.Snapshots|ConvertTo-Json -Depth 8 -Compress)){throw 'Persistent environment drift; stop'}
 & $node (Join-Path $PSScriptRoot 'release-tools.mjs') validate $Site $ApprovedCommit $ApprovedDigest
 if($LASTEXITCODE-ne0){throw 'Post-deployment stage or helper drift; stop'}
}
