@echo off
title Servidor DCH
echo ==================================================
echo   Iniciando Sistema de Control de Asistencia
echo ==================================================
echo.
echo Por favor, NO cierre esta ventana mientras use el sistema.
echo Para apagar el servidor, presione Ctrl + C en esta ventana.
echo.

:: Cambiar al directorio donde está el script
cd /d "%~dp0"

:: Abrir el navegador por defecto
start http://localhost:3000/

:: Iniciar el servidor de Node
node server.js

pause
