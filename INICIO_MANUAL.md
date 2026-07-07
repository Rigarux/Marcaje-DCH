# Guía de Inicio Manual y Resolución de Problemas

Esta guía te ayudará a iniciar manualmente el **Sistema de Control de Asistencia y Pagos (DCH)** y solucionar problemas comunes de carga (como ventanas que no abren).

---

## 🚀 Cómo Iniciar el Servidor Manualmente

Sigue estos pasos en tu terminal (PowerShell o CMD) dentro de la carpeta del proyecto `d:\Marcaje DCH`:

### 1. Iniciar el Servidor Node.js
Ejecuta el siguiente comando para levantar la base de datos y la API en el puerto `3000`:
```bash
node server.js
```
o también puedes usar el script preconfigurado:
```bash
npm run dev
```

### 2. Acceder al Sistema
Una vez que en la consola se imprima:
`🚀 Servidor API de Control Horario Iniciado en http://localhost:3000/`

Abre tu navegador de preferencia (Chrome, Edge, Firefox) y visita:
👉 **[http://localhost:3000/](http://localhost:3000/)**

---

## 🛠️ Resolución de Errores Comunes

### 1. Las ventanas emergentes (Modales) no se abren al hacer clic
Si haces clic en "Editar Perfil", "Crear Trabajador", "Aplicar Descuento", "Encargados" o similar y nada ocurre:
* **Causa Común:** El navegador tiene en caché una versión antigua y rota del script de lógica (`app.js`).
* **Solución:** Realiza una **limpieza forzada del caché** en tu navegador presionando:
  * **Windows (Chrome / Edge / Firefox):** `Ctrl + F5` o `Ctrl + Shift + R`.
  * **Mac (Chrome / Safari):** `Cmd + Shift + R`.

### 2. Error: `listen EADDRINUSE: address already in use 0.0.0.0:3000`
* **Causa:** El puerto `3000` está ocupado por otra instancia del servidor que ya está corriendo en segundo plano.
* **Solución:**
  1. Cierra todas las terminales abiertas y vuelve a abrir una sola.
  2. Si persiste, detén la tarea que ocupa el puerto ejecutando en PowerShell:
     ```powershell
     Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
     ```
  3. Ejecuta de nuevo `node server.js`.

### 3. Cómo ver errores detallados de la aplicación (Consola Web)
Si la página carga pero los botones no responden, abre la herramienta de diagnóstico del navegador:
1. Presiona la tecla **`F12`** (o clic derecho en la página -> **Inspeccionar**).
2. Ve a la pestaña **Consola** (Console).
3. Si hay textos de color rojo (ej: `TypeError` o `ReferenceError`), copia o toma una captura de pantalla de esos errores para diagnosticar qué línea de código está fallando.
