const db = require('./config/db.js');
const http = require('http');

const data = JSON.stringify({
    username: 'nena', password: '', nombre: 'Damaris Priscila', rol: 'superadmin',
    grupo: 'N/A', empresa: 'N/A', tarifaDiurna: 15, tarifaNocturna: 15, frecuenciaPago: 'semanal',
    adminId: 1, préstamoTotal: 0, préstamoCuota: 0, préstamosaldo: 0, préstamoEstadoCuota: 'Ninguno',
    tipoPago: 'Por Horas', horasNormalesMax: 8, rangoMaximoHoras: 44, tarifaHoraExtra: 0,
    dpi: '', dpiFoto: null, hasVentasRole: 0, assignedStores: [], precioDieselBuses: 30,
    sueldoBusesAcumulado: null, permisos: { control_asistencia: true, mi_historial: false },
    sueldoBusesDiario: 0, empresas_asignadas_json: '[]'
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users/31',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', async () => {
        console.log("Response:", raw);
        const user = await db.dbGet("SELECT id, username, permisos FROM users WHERE id=31");
        console.log("After update:", user);
        process.exit(0);
    });
});
req.write(data);
req.end();
