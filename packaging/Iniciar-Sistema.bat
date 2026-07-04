@echo off
title Sistema de Gestao de Audiencias - TJSP (Comarca de Cotia)
cd /d "%~dp0"
echo ============================================================
echo   Sistema de Gestao de Audiencias - TJSP - Comarca de Cotia
echo ============================================================
echo.
echo Iniciando o servidor... aguarde alguns segundos.
echo O navegador abrira sozinho em http://localhost:8080
echo.
echo  * DEIXE ESTA JANELA ABERTA enquanto usar o sistema.
echo  * Para ENCERRAR o sistema, feche esta janela.
echo.
rem Abre o navegador depois de alguns segundos, sem travar o servidor.
start "" cmd /c "timeout /t 6 /nobreak >nul & start "" http://localhost:8080"
rem Usa o Java portatil embutido (nao depende do Java instalado na maquina).
"%~dp0jre\bin\java.exe" -jar "%~dp0audiencias-1.0.0.jar"
echo.
echo O servidor foi encerrado.
pause
