$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$Src = Join-Path $Root "cep\com.aeagent.panel"
$Dest = Join-Path $env:APPDATA "Adobe\CEP\extensions\com.aeagent.panel"

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item -Path (Join-Path $Src "*") -Destination $Dest -Recurse -Force

9,10,11,12 | ForEach-Object {
    $path = "HKCU:\Software\Adobe\CSXS.$_"
    New-Item -Path $path -Force | Out-Null
    New-ItemProperty -Path $path -Name PlayerDebugMode -Value "1" -PropertyType String -Force | Out-Null
}

Write-Host "Installed: $Dest"
Write-Host "Restart After Effects, then open Window > Extensions > AE Agent"
