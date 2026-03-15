@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git add src/app/api/debug-auth/route.ts
git commit -m "debug: add diagnostic auth route for production troubleshooting"
git push origin main
