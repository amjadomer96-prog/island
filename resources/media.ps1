# Island media helper: reads Windows' system media controls (the same source as the
# volume flyout), so any player works: Spotify, YouTube Music in a browser, Apple Music...
# Prints one JSON line per change on stdout; takes "toggle" / "next" / "previous" on stdin.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
  Select-Object -First 1
function Await($op, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  if ($task.Wait(3000)) { return $task.Result }
  return $null
}

[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$manager = Await ($mgrType::RequestAsync()) $mgrType
if (-not $manager) { [Console]::Out.WriteLine('{"error":"media-unavailable"}'); exit 1 }

[void][Windows.Storage.Streams.IInputStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
# PowerShell hands the thumbnail back as a bare COM object it will not convert, so the
# stream helper is called through reflection, which casts it properly.
$asStream = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [Type[]]@([Windows.Storage.Streams.IInputStream]))

function Read-Art($props) {
  try {
    if (-not $props.Thumbnail) { return $null }
    $stream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    if (-not $stream) { return $null }
    $mem = New-Object System.IO.MemoryStream
    $asStream.Invoke($null, @($stream)).CopyTo($mem)
    $bytes = $mem.ToArray()
    if ($bytes.Length -lt 8) { return $null }
    $type = if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8) { 'image/jpeg' } else { 'image/png' }
    return "data:$type;base64," + [Convert]::ToBase64String($bytes)
  } catch { return $null }
}

# PowerShell buffers piped output, so every line is written and flushed explicitly.
$out = [Console]::Out
function Send([string]$line) { $out.WriteLine($line); $out.Flush() }

# [Console]::In.ReadLineAsync() runs synchronously in Windows PowerShell and would block
# the loop until a command arrives; a StreamReader over the raw stdin stream is truly async.
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$pending = $stdin.ReadLineAsync()
$lastKey = $null
$lastLine = ''

function Run-Command($cmd) {
  $session = $manager.GetCurrentSession()
  if (-not $session) { return }
  switch ($cmd.Trim()) {
    'toggle' { [void](Await ($session.TryTogglePlayPauseAsync()) ([bool])) }
    'next' { [void](Await ($session.TrySkipNextAsync()) ([bool])) }
    'previous' { [void](Await ($session.TrySkipPreviousAsync()) ([bool])) }
  }
}

while ($true) {
  $session = $manager.GetCurrentSession()
  if (-not $session) {
    $line = '{"type":"state","title":null,"playing":false}'
  } else {
    $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $info = $session.GetPlaybackInfo()
    $time = $session.GetTimelineProperties()
    $key = "$($props.Title)|$($props.Artist)"
    if ($key -ne $lastKey) {
      # Album art (often 50 KB+) goes out once per track, not every second.
      $lastKey = $key
      Send ([ordered]@{ type = 'art'; key = $key; art = (Read-Art $props) } | ConvertTo-Json -Compress)
    }
    $playing = $info.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing
    $position = $time.Position.TotalMilliseconds
    if ($playing -and $time.LastUpdatedTime) { $position += ([DateTimeOffset]::Now - $time.LastUpdatedTime).TotalMilliseconds }
    $line = [ordered]@{
      type     = 'state'
      key      = $key
      playing  = $playing
      title    = $props.Title
      artist   = $props.Artist
      album    = $props.AlbumTitle
      app      = $session.SourceAppUserModelId
      position = [math]::Round([math]::Max(0, $position))
      duration = [math]::Round($time.EndTime.TotalMilliseconds)
    } | ConvertTo-Json -Compress
  }
  if ($line -ne $lastLine) { Send $line; $lastLine = $line }

  # Wait ~1 s, but answer play/pause/skip within 100 ms.
  for ($i = 0; $i -lt 10; $i++) {
    if ($pending.IsCompleted) {
      if ($null -eq $pending.Result) { exit 0 } # Island closed our stdin
      Run-Command $pending.Result
      $pending = $stdin.ReadLineAsync()
      break
    }
    Start-Sleep -Milliseconds 100
  }
}
