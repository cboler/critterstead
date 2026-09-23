# Rebuild the original Critterstead icon at all manifest sizes using Windows' native drawing API.
# The matching vector source lives at public/icons/critterstead.svg.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/icons'))
$canvas = [Drawing.Bitmap]::new(512, 512)
$drawing = [Drawing.Graphics]::FromImage($canvas)
$drawing.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$drawing.Clear([Drawing.ColorTranslator]::FromHtml('#f4ecd8'))
function Draw-Ellipse($color, [float]$x, [float]$y, [float]$width, [float]$height) {
    $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($color))
    $drawing.FillEllipse($brush, $x, $y, $width, $height)
    $brush.Dispose()
}
function Draw-Leaf($color, [float[]]$points) {
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddBezier($points[0], $points[1], $points[2], $points[3], $points[4], $points[5], $points[6], $points[7])
    $path.AddBezier($points[6], $points[7], $points[8], $points[9], $points[10], $points[11], $points[0], $points[1])
    $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($color))
    $drawing.FillPath($brush, $path)
    $brush.Dispose()
    $path.Dispose()
}
Draw-Ellipse '#e3e9ce' 54 54 404 404
Draw-Ellipse '#b1bf91' 114 343 284 52
Draw-Leaf '#637d4b' @(337,282, 407,220, 433,255, 398,332, 376,357, 339,345)
Draw-Leaf '#637d4b' @(210,206, 136,180, 144,143, 173,113, 224,116, 239,163)
Draw-Leaf '#637d4b' @(274,201, 286,134, 312,113, 351,127, 369,177, 327,216)
$vein = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#9db376'), 8)
$vein.StartCap = [Drawing.Drawing2D.LineCap]::Round
$vein.EndCap = [Drawing.Drawing2D.LineCap]::Round
$drawing.DrawBezier($vein, 203,179, 184,162, 178,149, 177,133)
$drawing.DrawBezier($vein, 300,186, 316,158, 327,149, 338,145)
$vein.Dispose()
Draw-Ellipse '#c78357' 173 332 68 46
Draw-Ellipse '#c78357' 268 332 68 46
Draw-Ellipse '#e6ad79' 143 173 222 200
Draw-Ellipse '#f3c798' 167 231 174 130
Draw-Ellipse '#394634' 205 252 18 26
Draw-Ellipse '#394634' 285 252 18 26
Draw-Ellipse '#fff9e9' 213 259 6 6
Draw-Ellipse '#fff9e9' 293 259 6 6
Draw-Ellipse '#db9070' 172 278 30 16
Draw-Ellipse '#db9070' 306 278 30 16
$smile = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#694c36'), 6)
$smile.StartCap = [Drawing.Drawing2D.LineCap]::Round
$smile.EndCap = [Drawing.Drawing2D.LineCap]::Round
$drawing.DrawBezier($smile, 241,290, 250,302, 259,302, 267,290)
$smile.Dispose()
Draw-Leaf '#829757' @(133,356, 116,333, 110,314, 110,299, 143,315, 150,341)
Draw-Leaf '#829757' @(361,361, 377,340, 389,334, 401,332, 396,358, 375,370)
Draw-Ellipse '#d9af59' 117 288 18 18
Draw-Ellipse '#d9af59' 375 187 14 14
foreach ($size in @(72, 96, 128, 144, 152, 192, 384, 512)) {
    $output = [Drawing.Bitmap]::new($size, $size)
    $graphics = [Drawing.Graphics]::FromImage($output)
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($canvas, 0, 0, $size, $size)
    $output.Save((Join-Path $iconDirectory "icon-${size}x${size}.png"), [Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $output.Dispose()
}
$drawing.Dispose()
$canvas.Dispose()
# ICO files can carry PNG payloads. This avoids native icon handles and keeps one design.
$png = [IO.File]::ReadAllBytes((Join-Path $iconDirectory 'icon-128x128.png'))
$iconPath = [IO.Path]::GetFullPath((Join-Path $iconDirectory '../favicon.ico'))
$stream = [IO.File]::Create($iconPath)
$writer = [IO.BinaryWriter]::new($stream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([byte]128)
$writer.Write([byte]128)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png.Length)
$writer.Write([UInt32]22)
$writer.Write($png)
$writer.Dispose()
Write-Output 'Generated eight Critterstead PNG icons and the favicon.'
