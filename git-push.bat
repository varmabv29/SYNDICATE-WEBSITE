@echo off
set PATH=C:\Program Files\Git\cmd;%PATH%
cd /d "C:\Users\vedha\SYNDICATE WEBSITE"
git config user.email "varmabv29@gmail.com"
git config user.name "varmabv29"
git commit -m "feat: add expenditure tracking with edit/delete, NAV, loan management"
git branch -M main
git remote set-url origin https://github.com/varmabv29/SYNDICATE-WEBSITE.git 2>nul || git remote add origin https://github.com/varmabv29/SYNDICATE-WEBSITE.git
git push -u origin main
