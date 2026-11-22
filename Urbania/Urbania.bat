@echo off
setlocal

set "GAME_PAGE=%~dp0Urbania.html"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if not exist "%GAME_PAGE%" (
  echo Urbania.html was not found next to this launcher.
  echo Please keep Urbania.bat and Urbania.html in the same folder.
  pause
  exit /b 1
)

if not exist "%EDGE%" (
  echo Microsoft Edge is required to run Urbania in app mode.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%U in (`powershell.exe -NoProfile -Command "[uri]::new((Resolve-Path -LiteralPath '%GAME_PAGE%').Path).AbsoluteUri"`) do set "GAME_URL=%%U"

if not defined GAME_URL (
  echo Could not create the Urbania app URL.
  pause
  exit /b 1
)

start "" "%EDGE%" --app="%GAME_URL%" --no-first-run
