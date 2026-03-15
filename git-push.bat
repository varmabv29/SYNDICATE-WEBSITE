@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git add -A
git commit -m "fix: remove foreclose loan option from member dashboard"
git push origin main
