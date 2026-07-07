const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ruta principal
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

// Servir e inicializar carpeta de uploads para fotos
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}
app.use('/uploads', express.static(uploadsPath));

// DB e inicialización
const { initDb } = require('./config/db');

// Rutas de la API (Backend Modularizado)
const usersRoutes = require('./routes/users.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const salesRoutes = require('./routes/sales.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const financesRoutes = require('./routes/finances.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');

app.use('/api', usersRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', salesRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', financesRoutes);
app.use('/api', vehiclesRoutes);

// Iniciar cron jobs
const { startCron } = require('./utils/cron');

// Iniciar servidor
initDb().then(() => {
    startCron();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n==================================================`);
        console.log(`  Servidor API de Control Horario Iniciado`);
        console.log(`==================================================`);
        console.log(` Dirección local:  http://localhost:${PORT}/`);
        console.log(` Base de datos:    SQLite (database.db)`);
        console.log(`==================================================\n`);
    });
}).catch(e => console.error("Error inicializando DB:", e));
