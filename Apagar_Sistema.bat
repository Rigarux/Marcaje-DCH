@echo off
title Apagar Servidor DCH
echo ==================================================
echo   Deteniendo Sistema de Control de Asistencia...
echo ==================================================
echo.
echo Forzando cierre del servidor web...

taskkill /F /IM node.exe

echo.
echo El servidor ha sido detenido correctamente.
pause
