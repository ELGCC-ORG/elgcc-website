@echo off
cd /d "%~dp0"
python live_stream_assistant.py
if errorlevel 1 (
  echo.
  echo Could not start Live Stream Assistant.
  echo Make sure Python is installed and available in PATH.
  pause
)
