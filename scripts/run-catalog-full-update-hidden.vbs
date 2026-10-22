Option Explicit

Dim shell, command, exitCode
Set shell = CreateObject("WScript.Shell")

command = "powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\TD\Documents\Codex\2026-06-03\COMETAG\scripts\run-catalog-full-update.ps1"""
exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
