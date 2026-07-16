const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ajusta la ruta a donde esté ubicada tu base de datos en producción
const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al conectar con la base de datos:", err);
        process.exit(1);
    }
});

console.log("Iniciando actualización de base de datos...");

// Se agrega la columna sueldoBusesDiario.
// Si ya existe, sqlite3 lanzará un error que podemos atrapar.
db.run("ALTER TABLE users ADD COLUMN sueldoBusesDiario REAL DEFAULT 0", (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log("La columna 'sueldoBusesDiario' ya existe. No es necesario actualizar.");
        } else {
            console.error("Ocurrió un error al actualizar la base de datos:", err.message);
        }
    } else {
        console.log("¡Actualización exitosa! Se agregó 'sueldoBusesDiario' a la tabla 'users'.");
    }
    
    // Cerrar la conexión
    db.close();
});
