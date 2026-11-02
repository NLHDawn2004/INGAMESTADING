param([Parameter(Mandatory=$true)][string]$RuntimeConfig,[string]$ImagePath,[switch]$Once)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.SoftwareBitmap,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null=[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'} | Select-Object -First 1
function Await($operation,[Type]$type){$task=$asTask.MakeGenericMethod($type).Invoke($null,@($operation));$task.GetAwaiter().GetResult()}
Add-Type -ReferencedAssemblies System.Drawing @'
using System;
using System.Drawing;
using System.Runtime.InteropServices;
public class LiveBoardVision {
 [StructLayout(LayoutKind.Sequential)] public struct RECT {public int Left,Top,Right,Bottom;}
 [StructLayout(LayoutKind.Sequential)] public struct POINT {public int X,Y;}
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h,ref POINT p);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 public static Bitmap NumberMask(Bitmap src,Rectangle rect){
  var mask=new Bitmap(rect.Width,rect.Height);
  for(int y=0;y<rect.Height;y++)for(int x=0;x<rect.Width;x++) {var c=src.GetPixel(rect.X+x,rect.Y+y);int lo=Math.Min(c.R,Math.Min(c.G,c.B)),hi=Math.Max(c.R,Math.Max(c.G,c.B));mask.SetPixel(x,y,lo>130&&hi-lo<70?Color.Black:Color.White);}return mask;
 }
 public static bool ZeroShape(Bitmap image){
  int x0=image.Width,y0=image.Height,x1=-1,y1=-1;
  for(int y=0;y<image.Height;y++)for(int x=0;x<image.Width;x++)if(image.GetPixel(x,y).R<128){x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);}
  int w=x1-x0+1,h=y1-y0+1;if(w<5||h<10||w/(double)h<.28||w/(double)h>.85)return false;
  int rows=0,left=0,right=0,inside=0,total=0,top=0,bottom=0;
  for(int y=0;y<h;y++){int filled=0;bool l=false,r=false;for(int x=0;x<w;x++){bool ink=image.GetPixel(x0+x,y0+y).R<128;if(ink)filled++;if(x<=w*.22&&ink)l=true;if(x>=w*.78&&ink)r=true;if(y>h*.25&&y<h*.75&&x>w*.3&&x<w*.7){total++;if(ink)inside++;}}
   if(y>h*.2&&y<h*.8){rows++;if(l)left++;if(r)right++;}if(y<h*.2)top=Math.Max(top,filled);if(y>h*.8)bottom=Math.Max(bottom,filled);
  }
  return rows>0&&left>=rows*.85&&right>=rows*.85&&total>0&&inside/(double)total<.05&&top>=w*.45&&bottom>=w*.45;
 }
 public static bool OneShape(Bitmap image){
  int x0=image.Width,y0=image.Height,x1=-1,y1=-1,count=0;
  for(int y=0;y<image.Height;y++)for(int x=0;x<image.Width;x++)if(image.GetPixel(x,y).R<128){x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);count++;}
  int w=x1-x0+1,h=y1-y0+1;if(w<1||h<10||h<image.Height*.35||h>image.Height*.85||w/(double)h>.3)return false;
  return count/(double)(w*h)>.35;
 }
 public static int[] Sample(Bitmap src,int x,int y){int r=0,g=0,b=0,n=0;for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){int px=Math.Max(0,Math.Min(src.Width-1,x+dx)),py=Math.Max(0,Math.Min(src.Height-1,y+dy));var c=src.GetPixel(px,py);r+=c.R;g+=c.G;b+=c.B;n++;}return new int[]{r/n,g/n,b/n};}
}
'@
[LiveBoardVision]::SetProcessDPIAware() | Out-Null
$language=[Windows.Globalization.Language]::new('en-US')
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if (-not $engine) { throw 'Windows English OCR language is not installed.' }
$work=Split-Path -Parent $RuntimeConfig
function Read-Ocr([string]$path) {
 $file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
 $stream=Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
 $software=$null
 try {
  $decoder=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $software=Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  return Await ($engine.RecognizeAsync($software)) ([Windows.Media.Ocr.OcrResult])
 } finally { if ($software) { $software.Dispose() }; $stream.Dispose() }
}
do {
 $bitmap=$null
 try {
  $config=Get-Content -LiteralPath $RuntimeConfig -Raw -Encoding UTF8 | ConvertFrom-Json
  $layout=$config.layout
  $started=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $pidValue=0; $processStarted=0
  if ($ImagePath) { $bitmap=[Drawing.Bitmap]::FromFile($ImagePath) }
  else {
   $game=Get-Process -Name 'Free Fire_64' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
   if (-not $game) { throw 'WAIT: Client Free Fire chua chay.' }
   $handle=$game.MainWindowHandle
   if ([LiveBoardVision]::IsIconic($handle) -or [LiveBoardVision]::GetForegroundWindow() -ne $handle) { throw 'WAIT: Giu game o phia truoc, khong bi che/minimize.' }
   $pidValue=$game.Id; $processStarted=([DateTimeOffset]$game.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()
   $rect=New-Object LiveBoardVision+RECT; $point=New-Object LiveBoardVision+POINT
   [LiveBoardVision]::GetClientRect($handle,[ref]$rect) | Out-Null
   [LiveBoardVision]::ClientToScreen($handle,[ref]$point) | Out-Null
   $bitmap=[Drawing.Bitmap]::new(($rect.Right-$rect.Left),($rect.Bottom-$rect.Top))
   $g=[Drawing.Graphics]::FromImage($bitmap)
   try { $g.CopyFromScreen($point.X,$point.Y,0,0,$bitmap.Size) } finally { $g.Dispose() }
  }
  [int]$w=$bitmap.Width; [int]$h=$bitmap.Height; [int]$rows=$layout.visibleRows
  [int]$left=[Math]::Max(0.0,[Math]::Min([double]$layout.teamX,[double]$layout.elimsX)-0.05)*$w
  [int]$top=[Math]::Max(0.0,[double]$layout.rowTop-0.05)*$h
  [int]$regionRight=$w-$left
  [int]$height=[Math]::Min(($h-$top),([int](($layout.rowTop+($rows-1)*$layout.rowStep+$layout.rowHeight)*$h+12)-$top))
  if ($height -le 0 -or $regionRight -le 0) { throw 'Invalid OCR region.' }
  [int]$zoom=[Math]::Min(3.0,[Math]::Floor(2500.0/[Math]::Max($height,$regionRight)))
  if ($zoom -lt 1) { $zoom=1 }
  $names=[Drawing.Bitmap]::new(($regionRight*$zoom),($height*$zoom))
  $g=[Drawing.Graphics]::FromImage($names)
  try {
   $dest=[Drawing.Rectangle]::new(0,0,$names.Width,$names.Height)
   $source=[Drawing.Rectangle]::new($left,$top,$regionRight,$height)
   $g.DrawImage($bitmap,$dest,$source,[Drawing.GraphicsUnit]::Pixel)
   $names.Save((Join-Path $work 'ocr-names.png'),[Drawing.Imaging.ImageFormat]::Png)
  } finally { $g.Dispose(); $names.Dispose() }
  $namesResult=Read-Ocr (Join-Path $work 'ocr-names.png')
  $words=@($namesResult.Lines | ForEach-Object { $_.Words | ForEach-Object { [pscustomobject]@{text=$_.Text;x=$_.BoundingRect.X/$zoom+$left;y=$_.BoundingRect.Y/$zoom+$top;width=$_.BoundingRect.Width/$zoom;height=$_.BoundingRect.Height/$zoom} } })
  $labels=@($words | ForEach-Object { $_.text.ToUpperInvariant() })
  $header=($labels -contains 'TEAM') -and ($labels -contains 'ELIMS') -and ($labels -contains 'ALIVE')
  $digits=[Drawing.Bitmap]::new(360,(($rows+2)*90))
  $g=[Drawing.Graphics]::FromImage($digits); $g.Clear([Drawing.Color]::White)
  $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half; $font=[Drawing.Font]::new('Arial',27,[Drawing.FontStyle]::Bold); $zero=@(); $one=@()
  try {
   for ($i=0; $i -lt ($rows+2); $i++) {
    $g.DrawString('ELIMS',$font,[Drawing.Brushes]::Black,5,($i*90+15))
    if ($i -lt $rows) {
     $r=[Drawing.Rectangle]::new([int]($layout.elimsX*$w),[int](($layout.rowTop+$i*$layout.rowStep)*$h),[int]($layout.elimsWidth*$w),[int]($layout.rowHeight*$h))
    } elseif ($i -eq $rows) {
     $r=[Drawing.Rectangle]::new([int](1734.0/1920*$w),[int](12.0/1009*$h),[int](46.0/1920*$w),[int](43.0/1009*$h))
    } else {
     $r=[Drawing.Rectangle]::new([int](1843.0/1920*$w),[int](12.0/1009*$h),[int](55.0/1920*$w),[int](43.0/1009*$h))
    }
    if ($r.Right -gt $w -or $r.Bottom -gt $h -or $r.Width -le 0 -or $r.Height -le 0) { throw 'OCR number region outside client.' }
    $mask=[LiveBoardVision]::NumberMask($bitmap,$r)
    try {
     $zero+=([LiveBoardVision]::ZeroShape($mask)); $one+=([LiveBoardVision]::OneShape($mask))
     $scale=[Math]::Min(2.0,[Math]::Min((150.0/$r.Width),(80.0/$r.Height)))
     $dest=[Drawing.Rectangle]::new(190,($i*90),[int]($r.Width*$scale),[int]($r.Height*$scale))
     $g.DrawImage($mask,$dest)
    } finally { $mask.Dispose() }
   }
   $digits.Save((Join-Path $work 'ocr-digits.png'),[Drawing.Imaging.ImageFormat]::Png)
  } finally { $g.Dispose(); $font.Dispose(); $digits.Dispose() }
  $digitResult=Read-Ocr (Join-Path $work 'ocr-digits.png'); $values=@{}
  foreach ($line in $digitResult.Lines) { foreach ($word in $line.Words) {
   if ($word.BoundingRect.X -gt 170) {
    $index=[int][Math]::Floor(($word.BoundingRect.Y+$word.BoundingRect.Height/2)/90)
    if ($values.ContainsKey($index)) { $values[$index]+=' '+$word.Text } else { $values[$index]=$word.Text }
   }
  } }
  $outputRows=@(for ($i=0; $i -lt $rows; $i++) {
   $rowTop=($layout.rowTop+$i*$layout.rowStep)*$h; $rowBottom=$rowTop+$layout.rowHeight*$h
   $teamWords=@($words | Where-Object { ($_.x+$_.width/2) -ge ($layout.teamX*$w) -and ($_.x+$_.width/2) -le (($layout.teamX+$layout.teamWidth)*$w) -and ($_.y+$_.height/2) -ge $rowTop -and ($_.y+$_.height/2) -le $rowBottom } | Sort-Object x)
   $pixels=@($layout.barXs | ForEach-Object { $c=[LiveBoardVision]::Sample($bitmap,[int]($_*$w),[int]($rowTop+$layout.barY*$h)); [pscustomobject]@{r=$c[0];g=$c[1];b=$c[2]} })
   [pscustomobject]@{teamName=(@($teamWords | ForEach-Object text) -join ' ');elimsText=[string]$values[$i];zeroShape=[bool]$zero[$i];oneShape=[bool]$one[$i];pixels=$pixels}
  })
  $remainingTeams=$null; $remainingPlayers=$null
  if ([string]$values[$rows] -match '^\d{1,3}$') { $remainingTeams=[int]$values[$rows] }
  if ([string]$values[$rows+1] -match '^\d{1,3}$') { $remainingPlayers=[int]$values[$rows+1] }
  $replayHint=$false
  $footerX=[int](480.0/1920*$w);$footerY=[int](930.0/1009*$h);$footerW=[int](950.0/1920*$w);$footerH=$h-$footerY
  if ($footerH -gt 10 -and $footerW -gt 0) {
   $footer=[Drawing.Bitmap]::new(($footerW*2),($footerH*2));$g=[Drawing.Graphics]::FromImage($footer)
   try {$g.DrawImage($bitmap,[Drawing.Rectangle]::new(0,0,$footer.Width,$footer.Height),[Drawing.Rectangle]::new($footerX,$footerY,$footerW,$footerH),[Drawing.GraphicsUnit]::Pixel);$footer.Save((Join-Path $work 'ocr-footer.png'),[Drawing.Imaging.ImageFormat]::Png)}finally{$g.Dispose();$footer.Dispose()}
   $footerResult=Read-Ocr (Join-Path $work 'ocr-footer.png');$footerText=$footerResult.Text
   $replayHint=($footerText -match '(?:[0-9]+(?:[.,][0-9]+)?|I)\s*[xX]') -and ($footerText -match '\d{2}:\d{2}:\d{2}')
  }
  $packet=[pscustomobject]@{type='frame';configId=$config.configId;capturedAt=$started;processStartedAt=$processStarted;processId=$pidValue;width=$w;height=$h;headerDetected=$header;replayHint=$replayHint;processingMs=([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-$started);rows=$outputRows;remainingTeams=$remainingTeams;remainingPlayers=$remainingPlayers}
  [Console]::WriteLine(($packet | ConvertTo-Json -Depth 8 -Compress))
 } catch { [Console]::WriteLine((@{type='status';message=$_.Exception.Message;line=$_.InvocationInfo.ScriptLineNumber} | ConvertTo-Json -Compress)) }
 finally { if ($bitmap) { $bitmap.Dispose() } }
 if (-not $Once) { Start-Sleep -Milliseconds 500 }
} while (-not $Once)
