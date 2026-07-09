const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Abrir/crear base de datos SQLite
const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir la base de datos SQLite:", err);
    } else {
        console.log("Conectado con éxito a la base de datos SQLite: " + dbPath);
    }
});

// Promisificar operaciones de SQLite para un código limpio
const dbRun = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this); // Retorna objeto con lastID y changes
        });
    });
};

const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbGet = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Inicialización de la base de datos SQL con tablas y datos demo
async function initDb() {
    try {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                nombre TEXT,
                rol TEXT,
                grupo TEXT,
                empresa TEXT,
                tarifaDiurna REAL,
                tarifaNocturna REAL,
                frecuenciaPago TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE
            )`,
            `CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuarioId INTEGER,
                fecha TEXT,
                horaEntrada TEXT,
                horaSalida TEXT,
                horasDiurnas REAL,
                horasNocturnas REAL,
                horasTrabajadas REAL,
                montoBruto REAL,
                descuento REAL,
                montoNeto REAL,
                aprobado INTEGER DEFAULT 0,
                aprobadoPor INTEGER,
                aprobadoFecha TEXT,
                latEntrada REAL,
                lngEntrada REAL,
                latSalida REAL,
                lngSalida REAL,
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS penalizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asistenciaId INTEGER,
                usuarioId INTEGER,
                fecha TEXT,
                motivo TEXT,
                monto REAL,
                creadoPor INTEGER,
                FOREIGN KEY(asistenciaId) REFERENCES attendance(id) ON DELETE CASCADE,
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                usuarioId INTEGER,
                nombreUsuario TEXT,
                accion TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                placa TEXT UNIQUE,
                marca TEXT,
                modelo TEXT,
                empleadoAsignadoId INTEGER,
                estado TEXT DEFAULT 'Disponible',
                FOREIGN KEY(empleadoAsignadoId) REFERENCES users(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuarioId INTEGER,
                fecha TEXT,
                monto REAL,
                cuotas INTEGER,
                estado TEXT DEFAULT 'Pendiente',
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS bonuses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asistenciaId INTEGER,
                usuarioId INTEGER,
                fecha TEXT,
                motivo TEXT,
                monto REAL,
                creadoPor INTEGER,
                FOREIGN KEY(asistenciaId) REFERENCES attendance(id) ON DELETE CASCADE,
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS piecework_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuarioId INTEGER,
                fecha TEXT,
                trabajo TEXT,
                precio REAL,
                cantidad INTEGER,
                total REAL,
                estado TEXT DEFAULT 'Pendiente',
                confirmadoPor INTEGER,
                confirmadoFecha TEXT,
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS bus_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuarioId INTEGER,
                fecha TEXT,
                turno TEXT,
                ingresoDinero REAL,
                tipoGasto TEXT,
                montoGasto REAL,
                fotoFacturaUrl TEXT,
                detallesGastos TEXT,
                aprobado INTEGER DEFAULT 0,
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS payroll_cuts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fechaCorte TEXT,
                fechaGenerado TEXT,
                estado TEXT DEFAULT 'Pendiente'
            )`,
            `CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                fechaInicio TEXT,
                fechaFin TEXT,
                presupuesto REAL DEFAULT 0
            )`,
            `CREATE TABLE IF NOT EXISTS project_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proyectoId INTEGER NOT NULL,
                descripcion TEXT,
                monto REAL DEFAULT 0,
                fecha TEXT,
                cantidad INTEGER DEFAULT 1,
                FOREIGN KEY(proyectoId) REFERENCES projects(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                direccion TEXT,
                nit TEXT,
                telefono TEXT,
                email TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS inventories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuarioId INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                cantidad INTEGER DEFAULT 0,
                precio REAL DEFAULT 0.00
            )`,
            `CREATE TABLE IF NOT EXISTS inventory_audits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuarioId INTEGER NOT NULL,
                fecha TEXT NOT NULL,
                fotoUrl TEXT NOT NULL,
                comentarios TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clienteNombre TEXT,
                clienteDireccion TEXT,
                clienteNit TEXT,
                clienteTelefono TEXT,
                clienteEmail TEXT,
                creadoPor INTEGER,
                fecha TEXT,
                validoHasta TEXT,
                estado TEXT DEFAULT 'Borrador',
                FOREIGN KEY(creadoPor) REFERENCES users(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS quote_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quoteId INTEGER NOT NULL,
                descripcion TEXT,
                cantidad INTEGER DEFAULT 1,
                unidad TEXT DEFAULT 'Unidad',
                precio REAL DEFAULT 0,
                FOREIGN KEY(quoteId) REFERENCES quotes(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS petty_cash_funds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                proyecto_id INTEGER,
                monto_asignado REAL,
                monto_disponible REAL,
                descripcion TEXT,
                fecha DATETIME,
                registrado_por INTEGER,
                estado TEXT DEFAULT 'ACTIVO',
                FOREIGN KEY(usuario_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(proyecto_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY(registrado_por) REFERENCES users(id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS petty_cash_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fondo_id INTEGER,
                usuario_id INTEGER,
                monto REAL,
                descripcion TEXT,
                foto_factura TEXT,
                fecha DATETIME,
                FOREIGN KEY(fondo_id) REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
                FOREIGN KEY(usuario_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS global_incomes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuarioId INTEGER,
                fecha TEXT,
                motivo TEXT,
                monto REAL,
                fotoUrl TEXT,
                tipo TEXT DEFAULT 'Ingreso',
                estado TEXT DEFAULT 'Pendiente',
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS stores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                pdf_email TEXT DEFAULT 'serviciosdch1@gmail.com',
                pdf_telefono TEXT DEFAULT '35656886',
                pdf_direccion TEXT DEFAULT 'Lote 4 c Manzana 57 colonia Marianita Villa Nueva',
                pdf_propietario TEXT DEFAULT 'Daniel Isai Chiguichon Choy',
                logo_url TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS user_stores (
                usuarioId INTEGER,
                storeId INTEGER,
                FOREIGN KEY(usuarioId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(storeId) REFERENCES stores(id) ON DELETE CASCADE,
                PRIMARY KEY (usuarioId, storeId)
            )`,
            `CREATE TABLE IF NOT EXISTS materials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empresa_id INTEGER,
                nombre TEXT,
                cantidad INTEGER DEFAULT 0,
                limite_alerta INTEGER DEFAULT 0,
                fotoUrl TEXT,
                FOREIGN KEY(empresa_id) REFERENCES companies(id) ON DELETE CASCADE
            )`
        ];

        for (let q of tables) {
            await dbRun(q);
        }

        // Datos demo
        const defaultCompanies = ['N/A', 'DCH', 'Empresa A', 'Empresa B'];
        for (const c of defaultCompanies) {
            await dbRun(`INSERT OR IGNORE INTO companies (name) VALUES (?)`, [c]);
        }

        const vehiclesCount = await dbGet(`SELECT count(*) as count FROM vehicles`);
        if (vehiclesCount.count === 0) {
            await dbRun(`INSERT INTO vehicles (placa, marca, modelo, estado) VALUES ('P-123ABC', 'Toyota', 'Hilux', 'Disponible')`);
            await dbRun(`INSERT INTO vehicles (placa, marca, modelo, estado) VALUES ('P-456DEF', 'Mitsubishi', 'L200', 'En Servicio')`);
        }

        const usersCount = await dbGet(`SELECT count(*) as count FROM users`);
        if (usersCount.count === 0) {
            await dbRun(`
                INSERT INTO users (id, username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago)
                VALUES (8, 'danielch', '123', 'Daniel CH', 'admin', 'N/A', 'DCH', 0.0, 0.0, 'semanal')
            `);

            await dbRun(`
                INSERT INTO logs (timestamp, usuarioId, nombreUsuario, accion)
                VALUES (?, 8, 'Daniel CH', 'Inicialización de base de datos SQL limpia')
            `, [getFormattedTimestamp()]);
        }

        // Migraciones seguras
        const migrations = [
        "ALTER TABLE users ADD COLUMN préstamoTotal REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN préstamoCuota REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN préstamosaldo REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN préstamoEstadoCuota TEXT DEFAULT 'Ninguno'",
        "ALTER TABLE users ADD COLUMN tipoPago TEXT DEFAULT 'Por Horas'",
        "ALTER TABLE users ADD COLUMN horasNormalesMax REAL DEFAULT 8.0",
        "ALTER TABLE users ADD COLUMN rangoMaximoHoras REAL DEFAULT 44.0",
        "ALTER TABLE users ADD COLUMN tarifaHoraExtra REAL DEFAULT 0.0",
        "ALTER TABLE users ADD COLUMN dpi TEXT",
        "ALTER TABLE users ADD COLUMN dpiFotoUrl TEXT",
        "ALTER TABLE users ADD COLUMN cajaChicaBalance REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN precioDieselBuses REAL DEFAULT 30",
        "ALTER TABLE users ADD COLUMN sueldoBusesAcumulado REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN hasVentasRole INTEGER DEFAULT 0",
        "ALTER TABLE attendance ADD COLUMN bono REAL DEFAULT 0",
        "ALTER TABLE attendance ADD COLUMN justificacionLugarEntrada TEXT",
        "ALTER TABLE attendance ADD COLUMN justificacionMotivoEntrada TEXT",
        "ALTER TABLE attendance ADD COLUMN justificacionLugarSalida TEXT",
        "ALTER TABLE attendance ADD COLUMN justificacionMotivoSalida TEXT",
        "ALTER TABLE attendance ADD COLUMN proyectoId INTEGER",
        "ALTER TABLE attendance ADD COLUMN metodoPago TEXT DEFAULT 'Efectivo'",
        "ALTER TABLE attendance ADD COLUMN archivado INTEGER DEFAULT 0",
        "ALTER TABLE penalizations ADD COLUMN fotoUrl TEXT",
        "ALTER TABLE project_expenses ADD COLUMN fotoFacturaUrl TEXT",
        "ALTER TABLE project_expenses ADD COLUMN cantidad INTEGER DEFAULT 1",
        "ALTER TABLE bus_records ADD COLUMN metodoPago TEXT DEFAULT 'Efectivo'",
        "ALTER TABLE bus_records ADD COLUMN archivado INTEGER DEFAULT 0",
        "ALTER TABLE companies ADD COLUMN encargadoId INTEGER",
        "ALTER TABLE vehicles ADD COLUMN motivoUso TEXT",
        "ALTER TABLE vehicles ADD COLUMN fechaAsignación TEXT",
        "ALTER TABLE projects ADD COLUMN descripcion TEXT",
        "ALTER TABLE stores ADD COLUMN pdf_email TEXT DEFAULT 'serviciosdch1@gmail.com'",
        "ALTER TABLE stores ADD COLUMN pdf_telefono TEXT DEFAULT '35656886'",
        "ALTER TABLE stores ADD COLUMN pdf_direccion TEXT DEFAULT 'Lote 4 c Manzana 57 colonia Marianita Villa Nueva'",
        "ALTER TABLE stores ADD COLUMN pdf_propietario TEXT DEFAULT 'Daniel Isai Chiguichon Choy'",
        "ALTER TABLE materials ADD COLUMN store_id INTEGER",
        "ALTER TABLE materials ADD COLUMN costo REAL DEFAULT 0",
        "ALTER TABLE materials ADD COLUMN precio REAL DEFAULT 0",
        "ALTER TABLE quotes ADD COLUMN store_id INTEGER",
        "ALTER TABLE quotes ADD COLUMN tipo_pago TEXT DEFAULT 'Pendiente'",
        "ALTER TABLE quotes ADD COLUMN tipo_documento TEXT DEFAULT 'Venta'",
        "ALTER TABLE quote_items ADD COLUMN costo REAL DEFAULT 0",
        "ALTER TABLE quote_items ADD COLUMN material_id INTEGER",
        "ALTER TABLE attendance ADD COLUMN corteId INTEGER",
        "ALTER TABLE bus_records ADD COLUMN corteId INTEGER"
];
        for (const query of migrations) {
            try {
                await dbRun(query);
            } catch(e) {} // Ignorar si la columna ya existe
        }

        console.log("Tablas de base de datos SQL inicializadas correctamente.");
    } catch (e) {
        console.error("Error al inicializar las tablas de SQLite:", e);
    }
}

// Helper para fecha formateada YYYY-MM-DD HH:MM:SS (usando fecha local)
function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = now.toTimeString().split(' ')[0];
    return `${dateStr} ${timeStr}`;
}

// Helper para agregar log
async function addLog(userId, action) {
    try {
        let nombre = 'Sistema';
        if (userId && parseInt(userId) !== 0) {
            const u = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(userId)]);
            if (u) nombre = u.nombre;
        }
        await dbRun(`
            INSERT INTO logs (timestamp, usuarioId, nombreUsuario, accion)
            VALUES (?, ?, ?, ?)
        `, [getFormattedTimestamp(), parseInt(userId) || 0, nombre, action]);
    } catch (e) {
        console.error("Error al escribir log:", e);
    }
}

// ----------------------------------------------------
// RUTAS DE LA API REST
// ----------------------------------------------------

// Login


module.exports = { db, dbRun, dbAll, dbGet, initDb, addLog };
