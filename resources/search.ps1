# Island search helper (Spotlight in the island). On start it lists every app in the Start menu;
# then each stdin line "files <id> <text>" is answered from the Windows Search index, the same
# index File Explorer uses, so results are instant and cover the user's files.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$out = [Console]::Out
function Send($obj) { $out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 3)); $out.Flush() }

function Send-Apps {
  $apps = @(Get-StartApps | Where-Object { $_.Name -and $_.AppID } | ForEach-Object { [ordered]@{ name = $_.Name; id = $_.AppID } })
  Send @{ type = 'apps'; apps = $apps }
}
Send-Apps

# Start menu icons come from the shell, the way the Start menu draws them. That covers Store apps,
# which have no .exe to read an icon from. The shell hands back a premultiplied 32-bit bitmap.
Add-Type -ReferencedAssemblies System.Drawing @"
using System; using System.IO; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class ShellIcon {
  [StructLayout(LayoutKind.Sequential)] struct SIZE { public int cx, cy; }
  [StructLayout(LayoutKind.Sequential)] struct BITMAP { public int bmType, bmWidth, bmHeight, bmWidthBytes; public ushort bmPlanes, bmBitsPixel; public IntPtr bmBits; }
  [ComImport, Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IShellItemImageFactory { [PreserveSig] int GetImage(SIZE size, int flags, out IntPtr bitmap); }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  static extern int SHCreateItemFromParsingName(string path, IntPtr bc, [In] ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IShellItemImageFactory item);
  [DllImport("gdi32.dll")] static extern int GetObject(IntPtr h, int size, ref BITMAP bm);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr h);

  public static string Png(string path, int px) {
    Guid iid = typeof(IShellItemImageFactory).GUID;
    IShellItemImageFactory item;
    if (SHCreateItemFromParsingName(path, IntPtr.Zero, ref iid, out item) != 0) return null;
    IntPtr hbm;
    SIZE size; size.cx = px; size.cy = px;
    if (item.GetImage(size, 0x1 | 0x4, out hbm) != 0) return null; // bigger size OK, icon only
    try {
      BITMAP bm = new BITMAP();
      GetObject(hbm, Marshal.SizeOf(typeof(BITMAP)), ref bm);
      using (var ms = new MemoryStream()) {
        if (bm.bmBitsPixel == 32 && bm.bmBits != IntPtr.Zero) {
          using (var raw = new Bitmap(bm.bmWidth, bm.bmHeight, bm.bmWidthBytes, PixelFormat.Format32bppPArgb, bm.bmBits))
          using (var png = new Bitmap(raw)) { png.RotateFlip(RotateFlipType.RotateNoneFlipY); png.Save(ms, ImageFormat.Png); }
        } else {
          using (var png = Image.FromHbitmap(hbm)) png.Save(ms, ImageFormat.Png);
        }
        return "data:image/png;base64," + Convert.ToBase64String(ms.ToArray());
      }
    } finally { DeleteObject(hbm); }
  }
}
"@

$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows';")

function Find-Files([string]$text) {
  # Only letters, digits, spaces and a few safe marks reach the query.
  $safe = ($text -replace "[^\p{L}\p{Nd} ._-]", '').Trim()
  if ($safe.Length -lt 2) { return @() }
  $sql = "SELECT TOP 8 System.ItemPathDisplay, System.ItemNameDisplay, System.Kind FROM SystemIndex " +
         "WHERE System.ItemNameDisplay LIKE '%$safe%' " +
         "AND NOT System.ItemPathDisplay LIKE '%\AppData\%' AND NOT System.ItemPathDisplay LIKE '%\node_modules\%' " +
         "AND NOT System.ItemPathDisplay LIKE 'C:\Windows\%' AND NOT System.ItemPathDisplay LIKE 'C:\Program Files%' " +
         "AND System.FileExtension <> '.lnk' AND System.FileExtension <> '.url' " +
         "ORDER BY System.DateModified DESC"
  $rs = New-Object -ComObject ADODB.Recordset
  $rs.Open($sql, $conn)
  $items = @()
  while (-not $rs.EOF) {
    $kind = $rs.Fields.Item('System.Kind').Value
    $items += [ordered]@{ path = $rs.Fields.Item('System.ItemPathDisplay').Value; name = $rs.Fields.Item('System.ItemNameDisplay').Value; folder = ($kind -contains 'folder') }
    $rs.MoveNext()
  }
  $rs.Close()
  return $items
}

$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
while ($true) {
  $line = $stdin.ReadLine()
  if ($null -eq $line) { exit 0 }
  $parts = $line.Split(' ', 3)
  switch ($parts[0]) {
    'files' { Send @{ type = 'files'; id = [int]$parts[1]; items = @(Find-Files $parts[2]) } }
    'apps' { Send-Apps }
    'icon' { Send @{ type = 'icon'; id = [int]$parts[1]; data = [ShellIcon]::Png("shell:AppsFolder\" + $parts[2], 64) } }
  }
}
