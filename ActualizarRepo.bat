@echo off
setlocal
:: Configura aquí tu URL
set REPO_URL=https://github.com/Fedes10/ApuntesJava-DAM.git

echo === SOLUCIONANDO PERMISOS Y SUBIDA FORZADA ===

:: 0. FIX CRÍTICO: Configurar el directorio actual como seguro antes de nada
:: Usamos %~dp0 para referirnos a la carpeta donde está este script
git config --global --add safe.directory "%~dp0."
git config --global --add safe.directory "*"

:: 1. Inicializar si no existe .git
if not exist .git (
    echo [1/6] Inicializando repositorio Git...
    git init
    git remote add origin %REPO_URL%
)

:: 2. PARCHE: Crear .gitkeep en carpetas vacias
echo [2/6] Buscando y activando carpetas vacias...
for /f "delims=" %%d in ('dir /s /b /ad ^| sort /r') do (
    dir /a /b "%%d" | findstr "^" >nul || (
        echo. > "%%d\.gitkeep"
    )
)

:: 3. Asegurarse de que estamos en la rama 'main'
echo [3/6] Configurando rama main...
:: Primero intentamos crearla o cambiar a ella
git checkout -B main

:: 4. Añadir todos los archivos
echo [4/6] Anadiendo archivos...
git add .

:: 5. Hacer el commit con marca de tiempo
set dt=%date% %time%
echo [5/6] Creando commit: "Actualizacion - %dt%"
git commit -m "Actualizacion con estructura de carpetas - %dt%"

:: 6. Empujar al servidor SOBREESCRIBIENDO TODO
echo [6/6] Subiendo cambios (FORZADO)...
git push -u origin main --force

echo.
echo === PROCESO COMPLETADO ===
pause
exit