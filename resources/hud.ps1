# Island HUD helper: system volume, screen brightness and battery, watched closely enough that a
# key press shows in the notch right away. Prints one JSON line per change; takes commands on stdin:
#   volume <0..1> | mute <0|1> | brightness <0..100>
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms

# Windows Core Audio, through the same COM interfaces the volume flyout uses.
Add-Type @"
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr p); int UnregisterControlChangeNotify(IntPtr p);
  int GetChannelCount(out uint c);
  int SetMasterVolumeLevel(float l, ref Guid ctx); int SetMasterVolumeLevelScalar(float l, ref Guid ctx);
  int GetMasterVolumeLevel(out float l); int GetMasterVolumeLevelScalar(out float l);
  int SetChannelVolumeLevel(uint ch, float l, ref Guid ctx); int SetChannelVolumeLevelScalar(uint ch, float l, ref Guid ctx);
  int GetChannelVolumeLevel(uint ch, out float l); int GetChannelVolumeLevelScalar(uint ch, out float l);
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool m, ref Guid ctx); int GetMute([MarshalAs(UnmanagedType.Bool)] out bool m);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o);
  int OpenPropertyStore(int access, out IPropertyStore store);
  int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
}
[StructLayout(LayoutKind.Sequential)] struct PropertyKey { public Guid fmtid; public int pid; }
[StructLayout(LayoutKind.Explicit, Size = 24)] struct PropVariant { [FieldOffset(0)] public short vt; [FieldOffset(8)] public IntPtr p; }
[Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore {
  int GetCount(out int n); int GetAt(int i, out PropertyKey k);
  int GetValue(ref PropertyKey k, out PropVariant v);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int EnumAudioEndpoints(int f, int s, out IntPtr d); int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice d); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorCom {}
public static class Audio {
  static IAudioEndpointVolume ep;
  static DateTime got = DateTime.MinValue;
  // The default device can change (headphones in, speaker out), so it's looked up again every few seconds.
  static IAudioEndpointVolume Ep() {
    if (ep == null || (DateTime.Now - got).TotalSeconds > 3) {
      var en = (IMMDeviceEnumerator)new MMDeviceEnumeratorCom();
      IMMDevice dev; en.GetDefaultAudioEndpoint(0, 1, out dev);
      var iid = typeof(IAudioEndpointVolume).GUID; object o;
      dev.Activate(ref iid, 23, IntPtr.Zero, out o);
      ep = (IAudioEndpointVolume)o; got = DateTime.Now;
    }
    return ep;
  }
  public static float Level() { float v; Ep().GetMasterVolumeLevelScalar(out v); return v; }
  public static bool Muted() { bool m; Ep().GetMute(out m); return m; }
  public static void SetLevel(float v) { var g = Guid.Empty; Ep().SetMasterVolumeLevelScalar(Math.Max(0, Math.Min(1, v)), ref g); }
  public static void SetMuted(bool m) { var g = Guid.Empty; Ep().SetMute(m, ref g); }
  /** The current output device as "id|name", e.g. "{0.0.0.00000000}.{…}|Headphones (AirPods Pro)". */
  public static string Output() {
    var en = (IMMDeviceEnumerator)new MMDeviceEnumeratorCom();
    IMMDevice dev; en.GetDefaultAudioEndpoint(0, 1, out dev);
    string id; dev.GetId(out id);
    IPropertyStore store; dev.OpenPropertyStore(0, out store);
    var key = new PropertyKey { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 }; // PKEY_Device_FriendlyName
    PropVariant v; store.GetValue(ref key, out v);
    string name = v.vt == 31 ? Marshal.PtrToStringUni(v.p) : "";
    return id + "|" + name;
  }
}
// Windows publishes Do Not Disturb / Focus Assist through a notification state (WNF), the same one
// the quick-settings button reads: 0 off, 1 priority only, 2 alarms only.
public static class Focus {
  [DllImport("ntdll.dll")] static extern int NtQueryWnfStateData(ref ulong name, IntPtr type, IntPtr scope, out uint stamp, byte[] buffer, ref uint size);
  public static int Profile() {
    ulong name = 0x0D83063EA3BF1C75UL; // WNF_SHEL_QUIETHOURS_ACTIVE_PROFILE_CHANGED
    var buf = new byte[4]; uint size = 4, stamp;
    return NtQueryWnfStateData(ref name, IntPtr.Zero, IntPtr.Zero, out stamp, buf, ref size) == 0 && size >= 4 ? BitConverter.ToInt32(buf, 0) : -1;
  }
}
"@

$out = [Console]::Out
function Send($obj) { $out.WriteLine(($obj | ConvertTo-Json -Compress)); $out.Flush() }

# Brightness exists only for built-in laptop screens; desktops simply never report it.
function Get-Brightness { (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue | Select-Object -First 1).CurrentBrightness }
function Set-Brightness([int]$v) {
  $m = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($m) { Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{ Timeout = 0; Brightness = [byte][math]::Max(0, [math]::Min(100, $v)) } | Out-Null }
}

$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput()) # truly async, unlike [Console]::In
$pending = $stdin.ReadLineAsync()
$last = @{}
$tick = 0
while ($true) {
  # Handle every command that is waiting, not just one, so a dragged slider never lags behind.
  while ($pending.IsCompleted) {
    if ($null -eq $pending.Result) { exit 0 }
    $parts = $pending.Result.Trim().Split(' ')
    $inv = [Globalization.CultureInfo]::InvariantCulture
    switch ($parts[0]) {
      'volume' { [Audio]::SetLevel([float]::Parse($parts[1], $inv)) }
      'mute' { [Audio]::SetMuted($parts[1] -eq '1') }
      'brightness' { Set-Brightness ([int]$parts[1]) }
    }
    $pending = $stdin.ReadLineAsync()
  }

  # Volume: every 100 ms, so the HUD keeps up with a held-down volume key.
  $vol = [ordered]@{ type = 'volume'; level = [math]::Round([Audio]::Level(), 3); muted = [Audio]::Muted() }
  $key = "$($vol.level)|$($vol.muted)"
  if ($last.volume -ne $key) { Send $vol; $last.volume = $key }

  # Brightness: every 500 ms (the WMI query is slower).
  if ($tick % 5 -eq 0) {
    $b = Get-Brightness
    if ($null -ne $b -and $last.brightness -ne "$b") { Send @{ type = 'brightness'; level = [int]$b }; $last.brightness = "$b" }
  }

  # Sound output and Do Not Disturb: every 500 ms.
  if ($tick % 5 -eq 2) {
    $o = [Audio]::Output()
    if ($o -and $last.output -ne $o) { $parts = $o.Split("|", 2); Send ([ordered]@{ type = 'output'; id = $parts[0]; name = $parts[1] }); $last.output = $o }
    $f = [Focus]::Profile()
    if ($f -ge 0 -and $last.focus -ne "$f") { Send @{ type = 'focus'; profile = $f }; $last.focus = "$f" }
  }

  # Battery: every 2 s.
  if ($tick % 20 -eq 0) {
    $p = [System.Windows.Forms.SystemInformation]::PowerStatus
    $present = -not ($p.BatteryChargeStatus -band [System.Windows.Forms.BatteryChargeStatus]::NoSystemBattery)
    $bat = [ordered]@{ type = 'battery'; present = $present; percent = [math]::Round($p.BatteryLifePercent * 100); charging = ($p.PowerLineStatus -eq 'Online') }
    $key = "$($bat.present)|$($bat.percent)|$($bat.charging)"
    if ($last.battery -ne $key) { Send $bat; $last.battery = $key }
  }

  $tick++
  Start-Sleep -Milliseconds 100
}
