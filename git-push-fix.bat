@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git add package.json
git commit -m "build: fix build script for vercel"
git push origin main
