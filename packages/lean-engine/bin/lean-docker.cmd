@echo off
rem ───────────────────────────────────────────────────────────
rem lean-docker.cmd — convenience shim for MANUAL use from cmd.exe
rem (e.g. lean-docker init / lean-docker login).
rem
rem Do NOT point LEAN_COMMAND at this file: Node >= 20.12 refuses to
rem spawn .cmd/.bat files with shell:false (CVE-2024-27980), and
rem lean-runner.ts uses shell:false. Point LEAN_COMMAND at the
rem compiled bin\lean-docker.exe instead (see README, npm run build:shim).
rem ───────────────────────────────────────────────────────────
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lean-docker.ps1" %*
exit /b %ERRORLEVEL%
