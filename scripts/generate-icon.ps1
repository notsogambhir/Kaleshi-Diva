# Generates placeholder app icon + splash images for Capacitor.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/generate-icon.ps1
# Output: assets/icon.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png

Add-Type -AssemblyName System.Drawing

$SkyBlue = [System.Drawing.Color]::FromArgb(0xFF, 0x7D, 0xD3, 0xFC)
$DeepBlue = [System.Drawing.Color]::FromArgb(0xFF, 0x0E, 0x74, 0x90)
$PetalYellow = [System.Drawing.Color]::FromArgb(0xFF, 0xFF, 0xC5, 0x3D)
$PetalDark = [System.Drawing.Color]::FromArgb(0xFF, 0xE8, 0xA0, 0x00)
$DiscBrown = [System.Drawing.Color]::FromArgb(0xFF, 0x7A, 0x4A, 0x21)
$DiscDark = [System.Drawing.Color]::FromArgb(0xFF, 0x5C, 0x36, 0x16)

function New-Canvas([int]$size, $bgColor) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    if ($bgColor -ne $null) {
        $g.Clear($bgColor)
    }
    return @{ Bmp = $bmp; G = $g }
}

function Draw-PetalLayer($g, [double]$cx, [double]$cy, [double]$R, [int]$count, [double]$offsetDeg, $color, [double]$scale) {
    $brush = New-Object System.Drawing.SolidBrush($color)
    $L = 0.62 * $R * $scale
    $W = 0.30 * $R * $scale
    $state = $g.Save()
    $g.TranslateTransform([float]$cx, [float]$cy)
    for ($i = 0; $i -lt $count; $i++) {
        $angle = $offsetDeg + (360.0 / $count) * $i
        $s2 = $g.Save()
        $g.RotateTransform([float]$angle)
        $g.FillEllipse($brush, [float](-$W / 2), [float](-$R * $scale), [float]$W, [float]$L)
        $g.Restore($s2)
    }
    $g.Restore($state)
    $brush.Dispose()
}

function Draw-Sunflower($g, [double]$cx, [double]$cy, [double]$R) {
    # back layer of petals (darker, offset half-step)
    Draw-PetalLayer $g $cx $cy $R 14  (360.0 / 28.0) $PetalDark 1.0
    # front layer
    Draw-PetalLayer $g $cx $cy $R 14 0 $PetalYellow 0.92

    # seed disc
    $discBrush = New-Object System.Drawing.SolidBrush($DiscBrown)
    $discR = 0.46 * $R
    $g.FillEllipse($discBrush, [float]($cx - $discR), [float]($cy - $discR), [float](2 * $discR), [float](2 * $discR))
    $discBrush.Dispose()

    # darker inner disc for depth
    $innerBrush = New-Object System.Drawing.SolidBrush($DiscDark)
    $innerR = 0.30 * $R
    $g.FillEllipse($innerBrush, [float]($cx - $innerR), [float]($cy - $innerR), [float](2 * $innerR), [float](2 * $innerR))
    $innerBrush.Dispose()
}

$outDir = Join-Path $PSScriptRoot "..\assets"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$outDir = (Resolve-Path $outDir).Path

# --- icon.png: full-bleed square icon (flower fills canvas) ---
$c = New-Canvas 1024 $SkyBlue
Draw-Sunflower $c.G 512 512 430
$c.Bmp.Save((Join-Path $outDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$c.G.Dispose(); $c.Bmp.Dispose()

# --- icon-foreground.png: flower inside adaptive-icon safe zone (~66%) ---
$c = New-Canvas 1024 $null
Draw-Sunflower $c.G 512 512 300
$c.Bmp.Save((Join-Path $outDir "icon-foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$c.G.Dispose(); $c.Bmp.Dispose()

# --- icon-background.png: solid sky blue ---
$c = New-Canvas 1024 $SkyBlue
$c.Bmp.Save((Join-Path $outDir "icon-background.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$c.G.Dispose(); $c.Bmp.Dispose()

# --- splash.png / splash-dark.png ---
foreach ($pair in @(@("splash.png", $SkyBlue, [System.Drawing.Color]::FromArgb(0xFF, 0x0C, 0x4A, 0x6E)), @("splash-dark.png", $DeepBlue, [System.Drawing.Color]::FromArgb(0xFF, 0xBA, 0xE6, 0xFD)))) {
    $name = $pair[0]; $bg = $pair[1]; $textColor = $pair[2]
    $c = New-Canvas 2732 $bg
    Draw-Sunflower $c.G 1366 1160 520
    $font = New-Object System.Drawing.Font("Segoe UI", 180, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Object System.Drawing.SolidBrush($textColor)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 1820, 2732, 320)
    $c.G.DrawString("Kaleshi Diva", $font, $brush, $rect, $fmt)
    $c.Bmp.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $brush.Dispose(); $font.Dispose()
    $c.G.Dispose(); $c.Bmp.Dispose()
}

Write-Host "Generated icon and splash assets in $outDir"
