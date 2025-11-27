@echo off
REM Script para iniciar servidor de desenvolvimento local (Windows)
REM Sistema Sinergy

echo ======================================
echo    Sistema Sinergy - Dev Server
echo ======================================
echo.
echo Iniciando servidor de desenvolvimento...
echo.
echo URL: http://localhost:8000
echo API: http://localhost:8000/../api/
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
echo ======================================
echo.

cd public
php -S localhost:8000
