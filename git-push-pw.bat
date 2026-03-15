@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git add -A
git commit -m "feat: add change password feature for admin in settings"
git push origin main
