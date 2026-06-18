Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       Starting CogniDispatch in Terminal     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$root = (Get-Item .).FullName
Write-Host "Root Directory: $root" -ForegroundColor Gray

# Launch all services in a single Windows Terminal window with multiple tabs
wt -d "$root\services\auth-service" cmd /k "npm install && npm start" `; `
   new-tab -d "$root\services\vendor-service" cmd /k "npm install && npm start" `; `
   new-tab -d "$root\services\ai-service" cmd /k "npm install && npm start" `; `
   new-tab -d "$root\services\admin-service" cmd /k "npm install && npm start" `; `
   new-tab -d "$root\services\dispatch-service" cmd /k "npm install && npm start" `; `
   new-tab -d "$root\client" cmd /k "npm install --legacy-peer-deps && npm run dev"

Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "All services have been launched in Windows Terminal tabs!" -ForegroundColor Green
Write-Host "Frontend is running at: http://localhost:3000" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
