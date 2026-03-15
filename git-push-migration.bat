@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git add -A
git commit -m "feat: migrate database from SQLite to MongoDB Atlas"
git push origin main
