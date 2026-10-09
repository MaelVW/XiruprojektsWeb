$ErrorActionPreference = 'Stop'

$appRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $appRoot '..\..')).Path
$downloadRoot = Join-Path $repoRoot 'downloads'
$buildRoot = Join-Path $appRoot '.package-build'
$readme = Join-Path $appRoot 'README.md'
$projects = @(
    @{ Name = 'Xiru-Rechner'; Project = 'Xiru.Rechner\Xiru.Rechner.csproj'; Archive = 'Xiru-Rechner-1.0.0-beta1-win-x64.zip' },
    @{ Name = 'Xiru-Pausenplaner'; Project = 'Xiru.Pausenplaner\Xiru.Pausenplaner.csproj'; Archive = 'Xiru-Pausenplaner-1.0.0-beta1-win-x64.zip' },
    @{ Name = 'Xiru-CodeNotizbuch'; Project = 'Xiru.CodeNotizbuch\Xiru.CodeNotizbuch.csproj'; Archive = 'Xiru-CodeNotizbuch-1.0.0-beta1-win-x64.zip' }
)

New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null

foreach ($app in $projects) {
    $output = Join-Path $buildRoot $app.Name
    if (Test-Path $output) {
        Remove-Item -LiteralPath $output -Recurse -Force
    }
    dotnet publish (Join-Path $appRoot $app.Project) -c Release -r win-x64 --self-contained false -o $output
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet publish failed for $($app.Name)."
    }
    Copy-Item -LiteralPath $readme -Destination (Join-Path $output 'README.md')
    $archivePath = Join-Path $downloadRoot $app.Archive
    if (Test-Path $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Compress-Archive -Path (Join-Path $output '*') -DestinationPath $archivePath -CompressionLevel Optimal
    Write-Host "Created $archivePath"
}
