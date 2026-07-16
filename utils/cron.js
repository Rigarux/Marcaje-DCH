const { dbRun, dbAll, addLog } = require('../config/db');

async function processAutomaticCut() {
    try {
        console.log("Iniciando verificación de corte de planilla automático...");

        // 1. Obtener empleados semanales y quincenales
        const users = await dbAll("SELECT * FROM users");
        if (users.length === 0) return;

        let usersToCutByCompany = {};

        for (const user of users) {
            const isSemanales = !user.frecuenciaPago || user.frecuenciaPago === 'semanal';
            let shouldCut = false;
            
            if (isSemanales) {
                shouldCut = true;
            } else if (user.frecuenciaPago === '15na') {
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
                    shouldCut = true;
                }
            }

            if (shouldCut) {
                const emp = user.empresa || 'DCH';
                if (!usersToCutByCompany[emp]) {
                    usersToCutByCompany[emp] = [];
                }
                usersToCutByCompany[emp].push(user.id);
            }
        }

        if (Object.keys(usersToCutByCompany).length === 0) {
            console.log("No hay empleados pendientes de corte.");
            return;
        }

        const currentDate = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0];

        for (const [empresa, userIds] of Object.entries(usersToCutByCompany)) {
            // Crear un nuevo corte en la base de datos por empresa
            const result = await dbRun(
                "INSERT INTO payroll_cuts (fechaCorte, fechaGenerado, estado, empresa) VALUES (?, ?, ?, ?)", 
                [currentDate, `${currentDate} ${currentTime}`, 'Pendiente', empresa]
            );
            const nuevoCorteId = result.lastID;

            // Cerrar registros de attendance
            let attParams = userIds.map(() => '?').join(',');
            await dbRun(`
                UPDATE attendance 
                SET corteId = ?, archivado = 1 
                WHERE usuarioId IN (${attParams}) AND corteId IS NULL AND archivado = 0 AND horaSalida IS NOT NULL AND horaSalida != ''
            `, [nuevoCorteId, ...userIds]);

            // Cerrar registros de bus_records
            await dbRun(`
                UPDATE bus_records 
                SET corteId = ?, archivado = 1 
                WHERE usuarioId IN (${attParams}) AND corteId IS NULL AND archivado = 0
            `, [nuevoCorteId, ...userIds]);

            await addLog(0, `Se generó automáticamente el corte de planilla #${nuevoCorteId} para la empresa ${empresa} (${userIds.length} colaboradores).`);
            console.log(`Corte #${nuevoCorteId} generado exitosamente para ${empresa}.`);
        }

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

        // Lógica de reseteo de vacaciones (5 de enero)
        const isJan5 = now.getMonth() === 0 && now.getDate() === 5;
        if (isJan5 && !global.hasRunVacationResetToday) {
            global.hasRunVacationResetToday = true;
            console.log("Detectado 5 de enero: Reiniciando contadores de vacaciones a 15...");
            dbRun("UPDATE users SET vacacionesRestantes = 15")
                .then(() => console.log("Vacaciones reiniciadas exitosamente."))
                .catch(e => console.error("Error al reiniciar vacaciones:", e));
        }
        if (!isJan5) {
            global.hasRunVacationResetToday = false;
        }
    }, 60000); // Revisar cada minuto
}

module.exports = { startCron, processAutomaticCut };
