@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git add -A
git commit -m "fix: update dynamic route params type to Promise for Next.js 15+"
git push origin main
