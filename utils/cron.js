const { dbRun, dbAll, addLog } = require('../config/db');

async function processAutomaticCut() {
    try {
        console.log("Iniciando verificación de corte de planilla automático...");

        // 1. Obtener empleados semanales y quincenales
        const users = await dbAll("SELECT * FROM users");
        if (users.length === 0) return;

        let userIdsToCut = [];

        for (const user of users) {
            const isSemanales = !user.frecuenciaPago || user.frecuenciaPago === 'semanal';
            
            if (isSemanales) {
                // Si es semanal, siempre se corta el viernes
                userIdsToCut.push(user.id);
            } else if (user.frecuenciaPago === '15na') {
                // Verificar si tiene >= 15 días laborados sin cortar
                const attendance = await dbAll(`
                    SELECT COUNT(DISTINCT fecha) as days 
                    FROM attendance 
                    WHERE usuarioId = ? AND corteId IS NULL AND archivado = 0
                `, [user.id]);
                
                const busRecords = await dbAll(`
                    SELECT COUNT(DISTINCT fecha) as days 
                    FROM bus_records 
                    WHERE usuarioId = ? AND corteId IS NULL AND archivado = 0
                `, [user.id]);
                
                const totalDays = (attendance[0]?.days || 0) + (busRecords[0]?.days || 0);
                if (totalDays >= 15) {
                    userIdsToCut.push(user.id);
                }
            }
        }

        if (userIdsToCut.length === 0) {
            console.log("No hay empleados pendientes de corte.");
            return;
        }

        // Crear un nuevo corte en la base de datos
        const currentDate = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0];
        const result = await dbRun(
            "INSERT INTO payroll_cuts (fechaCorte, fechaGenerado, estado) VALUES (?, ?, ?)", 
            [currentDate, `${currentDate} ${currentTime}`, 'Pendiente']
        );
        const nuevoCorteId = result.lastID;

        // Cerrar registros de attendance
        let attParams = userIdsToCut.map(() => '?').join(',');
        await dbRun(`
            UPDATE attendance 
            SET corteId = ?, archivado = 1 
            WHERE usuarioId IN (${attParams}) AND corteId IS NULL AND archivado = 0 AND horaSalida IS NOT NULL AND horaSalida != ''
        `, [nuevoCorteId, ...userIdsToCut]);

        // Cerrar registros de bus_records
        await dbRun(`
            UPDATE bus_records 
            SET corteId = ?, archivado = 1 
            WHERE usuarioId IN (${attParams}) AND corteId IS NULL AND archivado = 0
        `, [nuevoCorteId, ...userIdsToCut]);

        await addLog(0, `Se generó automáticamente el corte de planilla #${nuevoCorteId} para ${userIdsToCut.length} colaboradores.`);
        console.log(`Corte #${nuevoCorteId} generado exitosamente.`);

    } catch (error) {
        console.error("Error al procesar el corte automático:", error);
    }
}

function startCron() {
    console.log("Cron job para corte automático inicializado.");
    let hasRunToday = false;

    setInterval(() => {
        const now = new Date();
        const isFriday = now.getDay() === 5;
        const isTime = now.getHours() === 23 && now.getMinutes() === 59; // 11:59 PM

        // Reiniciar la bandera al inicio del día
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            hasRunToday = false;
        }

        if (isFriday && isTime && !hasRunToday) {
            hasRunToday = true;
            processAutomaticCut();
        }
    }, 60000); // Revisar cada minuto
}

module.exports = { startCron, processAutomaticCut };
