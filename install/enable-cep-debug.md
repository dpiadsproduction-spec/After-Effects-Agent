# Enable unsigned CEP panels in After Effects

Adobe blocks unsigned HTML panels unless PlayerDebugMode is set.

## macOS

Run in Terminal, then restart After Effects:

```bash
defaults write com.adobe.CSXS.9 PlayerDebugMode 1
defaults write com.adobe.CSXS.10 PlayerDebugMode 1
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

Log out or reboot if the panel still does not appear.

## Windows

Run PowerShell as the same Windows user that launches After Effects:

```powershell
New-Item -Path "HKCU:\Software\Adobe\CSXS.9" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.9" -Name PlayerDebugMode -Value "1" -PropertyType String -Force | Out-Null
New-Item -Path "HKCU:\Software\Adobe\CSXS.10" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.10" -Name PlayerDebugMode -Value "1" -PropertyType String -Force | Out-Null
New-Item -Path "HKCU:\Software\Adobe\CSXS.11" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.11" -Name PlayerDebugMode -Value "1" -PropertyType String -Force | Out-Null
New-Item -Path "HKCU:\Software\Adobe\CSXS.12" -Force | Out-Null
New-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.12" -Name PlayerDebugMode -Value "1" -PropertyType String -Force | Out-Null
```

Restart After Effects.
