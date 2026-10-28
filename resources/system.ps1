# Island system helper: the apps you have open and the notifications Windows shows.
# Prints one JSON line per change on stdout; takes commands on stdin:
#   focus <hwnd> | close <hwnd> | open <aumid> | dismiss <notification id>
# -SkipPid: Island's own process, so its window never lists itself.
param([int]$SkipPid = 0)
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime, System.Drawing

Add-Type @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class Win {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int val, int size);

  // Windows that show in Alt+Tab: visible, titled, unowned, not tool windows, not cloaked (hidden UWP shells).
  public static List<IntPtr> AppWindows() {
    var list = new List<IntPtr>();
    EnumWindows((h, p) => {
      if (!IsWindowVisible(h) || GetWindowTextLength(h) == 0) return true;
      if (GetWindow(h, 4) != IntPtr.Zero) return true;           // GW_OWNER
      int ex = GetWindowLong(h, -20);                             // GWL_EXSTYLE
      if ((ex & 0x80) != 0 && (ex & 0x40000) == 0) return true;   // WS_EX_TOOLWINDOW without WS_EX_APPWINDOW
      int cloaked; DwmGetWindowAttribute(h, 14, out cloaked, 4);  // DWMWA_CLOAKED
      if (cloaked != 0) return true;
      list.Add(h);
      return true;
    }, IntPtr.Zero);
    return list;
  }
  public static string Title(IntPtr h) { var sb = new StringBuilder(512); GetWindowText(h, sb, 512); return sb.ToString(); }
  // Windows only lets the active app change focus; a tapped Alt key lifts that lock for us.
  public static void Focus(IntPtr h) {
    if (IsIconic(h)) ShowWindow(h, 9);                            // SW_RESTORE
    keybd_event(0x12, 0, 0, UIntPtr.Zero); keybd_event(0x12, 0, 2, UIntPtr.Zero);
    SetForegroundWindow(h);
  }
  public static void Close(IntPtr h) { PostMessage(h, 0x0010, IntPtr.Zero, IntPtr.Zero); } // WM_CLOSE: the app can still ask to save
}
"@

$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
  Select-Object -First 1
function Await($op, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  if ($task.Wait(3000)) { return $task.Result }
  return $null
}

$out = [Console]::Out
function Send($obj) { $out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 4)); $out.Flush() }

# ---------- App icons, cached per program ----------
$icons = @{}
function Icon-Of([string]$exe) {
  if (-not $exe) { return $null }
  if ($icons.ContainsKey($exe)) { return $icons[$exe] }
  $data = $null
  try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
    $bmp = $icon.ToBitmap()
    $mem = New-Object System.IO.MemoryStream
    $bmp.Save($mem, [System.Drawing.Imaging.ImageFormat]::Png)
    $data = 'data:image/png;base64,' + [Convert]::ToBase64String($mem.ToArray())
  } catch {}
  $icons[$exe] = $data
  return $data
}

# Friendly names: "chrome" -> "Google Chrome" from the program's own file description.
$names = @{}
function Name-Of($proc) {
  $exe = $proc.Path
  if ($exe -and $names.ContainsKey($exe)) { return $names[$exe] }
  $n = $null
  try { $n = $proc.MainModule.FileVersionInfo.FileDescription } catch {}
  if (-not $n) { $n = $proc.ProcessName } # e.g. "SnippingTool", never "SnippingTool.exe"
  $n = $n -replace '\.exe$', ''
  if ($exe) { $names[$exe] = $n }
  return $n
}

$self = $PID
$skip = @('TextInputHost', 'ApplicationFrameHost', 'SystemSettings', 'ShellExperienceHost', 'StartMenuExperienceHost', 'SearchHost', 'LockApp')

function Read-Apps {
  $fg = [Win]::GetForegroundWindow()
  $apps = @()
  foreach ($h in [Win]::AppWindows()) {
    $procId = [uint32]0
    [void][Win]::GetWindowThreadProcessId($h, [ref]$procId)
    if ($procId -eq $self -or $procId -eq $SkipPid) { continue }
    $proc = Get-Process -Id $procId
    if (-not $proc -or $skip -contains $proc.ProcessName) { continue }
    $apps += [ordered]@{
      hwnd   = [int64]$h
      title  = [Win]::Title($h)
      name   = (Name-Of $proc)
      exe    = $proc.Path
      icon   = (Icon-Of $proc.Path)
      active = ($h -eq $fg)
    }
  }
  return $apps
}

# ---------- Notifications ----------
[void][Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IInputStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
$asStream = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [Type[]]@([Windows.Storage.Streams.IInputStream]))
$listType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
$seen = @{}
$logos = @{}

function Logo-Of($appInfo) {
  $key = $appInfo.AppUserModelId
  if ($logos.ContainsKey($key)) { return $logos[$key] }
  $data = $null
  try {
    $ref = $appInfo.DisplayInfo.GetLogo((New-Object Windows.Foundation.Size 64, 64))
    $stream = Await ($ref.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    $mem = New-Object System.IO.MemoryStream
    $asStream.Invoke($null, @($stream)).CopyTo($mem)
    if ($mem.Length -gt 0) { $data = 'data:image/png;base64,' + [Convert]::ToBase64String($mem.ToArray()) }
  } catch {}
  $logos[$key] = $data
  return $data
}

# Reading the list takes ~3 s, and overlapping reads jam Windows' notification service for every
# program, so only one read is ever in flight: it runs in the background and the loop checks on it.
$toTask = $asTask.MakeGenericMethod($listType)
function Start-NotificationRead { $toTask.Invoke($null, @($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast))) }

function Build-Notifications($list, [bool]$announce) {
  $items = @()
  foreach ($n in $list) {
    $texts = @()
    try {
      $binding = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
      if ($binding) { $texts = @($binding.GetTextElements() | ForEach-Object { $_.Text }) }
    } catch {}
    $item = [ordered]@{
      id    = [int64]$n.Id
      app   = $n.AppInfo.DisplayInfo.DisplayName
      aumid = $n.AppInfo.AppUserModelId
      title = if ($texts.Count -gt 0) { $texts[0] } else { $null }
      body  = if ($texts.Count -gt 1) { ($texts[1..($texts.Count - 1)] -join ' ') } else { $null }
      at    = $n.CreationTime.ToUnixTimeMilliseconds()
      icon  = (Logo-Of $n.AppInfo)
    }
    # Only notifications that arrive while Island runs pop up; older ones just sit in the list.
    if ($announce -and -not $seen.ContainsKey($item.id)) { Send @{ type = 'notification'; item = $item } }
    $seen[$item.id] = $true
    $items += $item
  }
  return @($items | Sort-Object { $_.at } -Descending | Select-Object -First 20)
}

function Run-Command([string]$line) {
  $parts = $line.Trim().Split(' ', 2)
  if ($parts.Count -lt 2) { return }
  switch ($parts[0]) {
    'focus' { [Win]::Focus([IntPtr][int64]$parts[1]) }
    'close' { [Win]::Close([IntPtr][int64]$parts[1]) }
    'open' { Start-Process "shell:AppsFolder\$($parts[1])" }
    'dismiss' { $listener.RemoveNotification([uint32]$parts[1]) }
  }
}

# ---------- Loop ----------
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput()) # truly async, unlike [Console]::In
$pending = $stdin.ReadLineAsync()
$lastApps = ''
$lastNotes = ''
$first = $true
$read = $null
$nextRead = [DateTime]::MinValue
while ($true) {
  $apps = Read-Apps
  $appsJson = ($apps | ConvertTo-Json -Compress -Depth 3)
  if ($appsJson -ne $lastApps) { Send @{ type = 'apps'; apps = @($apps) }; $lastApps = $appsJson }

  $access = "$($listener.GetAccessStatus())"
  if ($access -ne 'Allowed') {
    if ($lastNotes -ne $access) { Send @{ type = 'notifications'; access = $access; items = @() }; $lastNotes = $access }
  } elseif (-not $read -and [DateTime]::Now -ge $nextRead) {
    $read = Start-NotificationRead
  } elseif ($read -and $read.IsCompleted) {
    if ($read.Status -eq 'RanToCompletion') {
      $items = Build-Notifications $read.Result (-not $first)
      $first = $false
      $key = (@($items) | ForEach-Object { $_.id }) -join ','
      if ($key -ne $lastNotes) { Send @{ type = 'notifications'; access = $access; items = @($items) }; $lastNotes = $key }
    }
    $read = $null
    $nextRead = [DateTime]::Now.AddMilliseconds(250)
  }

  for ($i = 0; $i -lt 10; $i++) {
    if ($pending.IsCompleted) {
      if ($null -eq $pending.Result) { exit 0 }
      Run-Command $pending.Result
      $pending = $stdin.ReadLineAsync()
      break
    }
    Start-Sleep -Milliseconds 100
  }
}
