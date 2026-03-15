@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git add -A
git commit -m "chore: final deployment cleanup and build script optimization"
git push origin main
