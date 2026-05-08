@echo off
cd /d "%~dp0"
echo Deploying Neurofoundry Auth Server to Fly.io...
echo.
flyctl deploy
echo.
echo Deployment complete!
pause
