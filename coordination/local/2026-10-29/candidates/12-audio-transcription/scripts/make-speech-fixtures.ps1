#requires -Version 5.1
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
Add-Type -AssemblyName System.Speech
$project = if ($PSScriptRoot) { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')) } else { [IO.Path]::GetFullPath((Get-Location).Path) }
$quality = $env:GQ_SPEECH_SUITE -eq 'quality'
if ($env:GQ_SPEECH_SUITE -and -not $quality) { throw 'FIXTURE_SUITE_INVALID' }
$destination = [IO.Path]::GetFullPath((Join-Path $project $(if ($quality) { 'test/fixtures/generated/t02-v1/raw' } else { 'test/fixtures/generated' })))
if (-not $destination.StartsWith($project + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'FIXTURE_PATH_INVALID' }
[IO.Directory]::CreateDirectory($destination) | Out-Null
if ((Get-Item -LiteralPath $destination).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'FIXTURE_PATH_INVALID' }
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $installed = @($speaker.GetInstalledVoices() | Where-Object { $_.Enabled })
    $cases = @(
        @{ Id = 'minimum-zh'; Culture = 'zh-CN'; Fallback = 'zh-TW'; Text = '今天下雨了，我在家中休息。'; Language = 'chinese' },
        @{ Id = 'minimum-en'; Culture = 'en-US'; Fallback = 'en-GB'; Text = 'The blue cup is on the wooden table.'; Language = 'english' }
    )
    if ($quality) {
        $cases = @(
            @{ Id = 'zh-01'; Culture = 'zh-CN'; Fallback = 'zh-TW'; Text = '今天下雨了，我在家中休息。'; Language = 'chinese' },
            @{ Id = 'zh-02'; Culture = 'zh-CN'; Fallback = 'zh-TW'; Text = '桌上有三本中文故事。'; Language = 'chinese' },
            @{ Id = 'zh-03'; Culture = 'zh-CN'; Fallback = 'zh-TW'; Text = '星期天上午，我和朋友一起散步。'; Language = 'chinese' },
            @{ Id = 'zh-04'; Culture = 'zh-CN'; Fallback = 'zh-TW'; Text = '如果明天下雨，就在家中吃午餐。'; Language = 'chinese' },
            @{ Id = 'zh-05'; Culture = 'zh-CN'; Fallback = 'zh-TW'; Text = '今天的工作完成了，大家可以休息。'; Language = 'chinese' },
            @{ Id = 'en-01'; Culture = 'en-US'; Fallback = 'en-GB'; Text = 'The blue cup is on the wooden table.'; Language = 'english' },
            @{ Id = 'en-02'; Culture = 'en-US'; Fallback = 'en-GB'; Text = 'We will meet at the park on Sunday.'; Language = 'english' },
            @{ Id = 'en-03'; Culture = 'en-US'; Fallback = 'en-GB'; Text = 'Please open the window before lunch.'; Language = 'english' },
            @{ Id = 'en-04'; Culture = 'en-US'; Fallback = 'en-GB'; Text = 'This is a short test of local speech recognition.'; Language = 'english' },
            @{ Id = 'en-05'; Culture = 'en-US'; Fallback = 'en-GB'; Text = 'The next task is ready for review.'; Language = 'english' }
        )
    }
    $records = @()
    foreach ($case in $cases) {
        $voice = @($installed | Where-Object { $_.VoiceInfo.Culture.Name -eq $case.Culture } | Select-Object -First 1)
        if ($voice.Count -eq 0) { $voice = @($installed | Where-Object { $_.VoiceInfo.Culture.Name -eq $case.Fallback } | Select-Object -First 1) }
        if ($voice.Count -eq 0) { throw 'OFFLINE_VOICE_UNAVAILABLE' }
        $target = Join-Path $destination ($case.Id + '.wav')
        if (Test-Path -LiteralPath $target) { throw 'FIXTURE_ALREADY_EXISTS' }
        $speaker.SelectVoice($voice[0].VoiceInfo.Name)
        $speaker.Rate = -2
        $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
        $speaker.SetOutputToWaveFile($target, $format)
        $speaker.Speak($case.Text)
        $speaker.SetOutputToNull()
        $records += [pscustomobject]@{ id = $case.Id; language = $case.Language; reference = $case.Text; voice = $voice[0].VoiceInfo.Name; culture = $voice[0].VoiceInfo.Culture.Name; speechAssemblyVersion = [System.Speech.Synthesis.SpeechSynthesizer].Assembly.GetName().Version.ToString(); rate = $speaker.Rate }
    }
    $records | ConvertTo-Json -Depth 4
}
finally { $speaker.Dispose() }
