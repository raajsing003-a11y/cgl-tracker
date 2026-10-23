@echo off
cd /d "%~dp0"
echo === Step 1: install ===
pip install -r requirements.txt
echo === Step 2: latest jobs laa raha hoon ===
python tracker.py --no-open --out tools/latestjob.html
echo.
echo Ho gaya. Ab GitHub Desktop kholo, Commit to main, phir Push origin dabao.
pause
