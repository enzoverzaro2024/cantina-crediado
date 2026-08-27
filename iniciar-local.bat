@echo off
cd /d "C:\Users\enzoverzaro\Documents\ANTI-PROJETOS\SISTEMA CANTINA\cantina-crediado"

echo Instalando dependencias...
call pnpm install

echo Rodando migrations...
call pnpm db:migrate

echo Iniciando backend e frontend...
start "Backend" cmd /c "pnpm dev:backend"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /c "pnpm dev:web"

echo.
echo ========================================
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Feche esta janela ou pressione Ctrl+C para parar.
pause
