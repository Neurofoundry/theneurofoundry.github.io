@echo off
setlocal

rem Launch the Browser Use bridge server.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0browser-use-bridge.ps1"

endlocal
