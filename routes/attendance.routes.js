const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet, addLog } = require('../config/db');
const { getUploadPath } = require('../utils/fileHelpers');

router.get('/attendance', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.*, u.nombre as nombreColaborador, u.grupo as grupoColaborador 
            FROM attendance a
            JOIN users u ON a.usuarioId = u.id
            ORDER BY a.fecha DESC, a.horaEntrada DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/attendance/user/:userId', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT * FROM attendance 
            WHERE usuarioId = ?
            ORDER BY fecha DESC, horaEntrada DESC
        `, [parseInt(req.params.userId)]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/attendance/group/:groupName', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT a.*, u.nombre as nombreColaborador, u.grupo as grupoColaborador
            FROM attendance a
            JOIN users u ON a.usuarioId = u.id
            WHERE u.grupo = ?
            ORDER BY a.fecha DESC, a.horaEntrada DESC
        `, [req.params.groupName]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/attendance/active/:userId', async (req, res) => {
    try {
        const row = await dbGet(`
            SELECT * FROM attendance 
            WHERE usuarioId = ? AND (horaSalida IS NULL OR horaSalida = '')
        `, [parseInt(req.params.userId)]);
        if (row) {
            res.json(row);
        } else {
            res.json(null);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/attendance/checkin', async (req, res) => {
    const { usuarioId, lat, lng, justificacionLugar, justificacionMotivo, proyectoId } = req.body;
    try {
        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [parseInt(usuarioId)]);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

        const active = await dbGet(`SELECT id FROM attendance WHERE usuarioId = ? AND (horaSalida IS NULL OR horaSalida = '')`, [user.id]);
        if (active) {
            return res.json({ success: true, record: active, message: 'Ya tienes un turno activo' });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const timeStr = now.toTimeString().split(' ')[0];

        const result = await dbRun(`
            INSERT INTO attendance (usuarioId, fecha, horaEntrada, horaSalida, horasDiurnas, horasNocturnas, horasTrabajadas, montoBruto, descuento, bono, montoNeto, aprobado, aprobadoPor, aprobadoFecha, latEntrada, lngEntrada, justificacionLugarEntrada, justificacionMotivoEntrada, proyectoId)
            VALUES (?, ?, ?, NULL, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, ?, ?, ?, ?, ?)
        `, [user.id, dateStr, timeStr, lat || null, lng || null, justificacionLugar || null, justificacionMotivo || null, proyectoId || null]);

        await addLog(user.id, `${user.nombre} registró entrada (Check-in) a las ${timeStr}. Ubicación: "${justificacionLugar || 'N/A'}", Actividad: "${justificacionMotivo || 'N/A'}", Proyecto: ${proyectoId || 'Ninguno'}`);

        const newRecord = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [result.lastID]);
        res.json({ success: true, record: newRecord });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/attendance/checkout', async (req, res) => {
    const { usuarioId, lat, lng, justificacionLugar, justificacionMotivo } = req.body;
    try {
        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [parseInt(usuarioId)]);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

        const record = await dbGet(`SELECT * FROM attendance WHERE usuarioId = ? AND (horaSalida IS NULL OR horaSalida = '')`, [user.id]);
        if (!record) {
            return res.status(400).json({ success: false, message: 'No hay ningún turno activo para este usuario.' });
        }

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        const [year, month, day] = record.fecha.split('-').map(Number);
        const [entH, entM, entS] = record.horaEntrada.split(':').map(Number);
        const entradaDate = new Date(year, month - 1, day, entH, entM, entS, 0);

        let diffMs = now.getTime() - entradaDate.getTime();
        if (diffMs < 0) diffMs = 0;

        let totalSeconds = Math.floor(diffMs / 1000);
        let secondsDiurnas = 0;
        let secondsNocturnas = 0;

        let current = new Date(entradaDate);
        if (totalSeconds < 172800) { // Menos de 48 horas
            for (let i = 0; i < totalSeconds; i++) {
                const hr = current.getHours();
                if (hr >= 6 && hr < 18) {
                    secondsDiurnas++;
                } else {
                    secondsNocturnas++;
                }
                current.setSeconds(current.getSeconds() + 1);
            }
        } else {
            // Fallback rápido si es de das enteros
            let minutesDiurnas = 0;
            let minutesNocturnas = 0;
            let currentMin = new Date(entradaDate);
            const end = new Date(now);
            while (currentMin < end) {
                const hr = currentMin.getHours();
                if (hr >= 6 && hr < 18) {
                    minutesDiurnas++;
                } else {
                    minutesNocturnas++;
                }
                currentMin.setMinutes(currentMin.getMinutes() + 1);
            }
            secondsDiurnas = minutesDiurnas * 60;
            secondsNocturnas = minutesNocturnas * 60;
        }

        const horasDiurnas = parseFloat((secondsDiurnas / 3600).toFixed(4));
        const horasNocturnas = parseFloat((secondsNocturnas / 3600).toFixed(4));
        const horas = parseFloat(((secondsDiurnas + secondsNocturnas) / 3600).toFixed(4));

        const tarifaDiurna = user.tarifaDiurna !== undefined ? user.tarifaDiurna : 0;
        const tarifaNocturna = user.tarifaNocturna !== undefined ? user.tarifaNocturna : 0;

        let bruto = 0;
        if (user.tipoPago === 'Destajo') {
            bruto = parseFloat(tarifaDiurna.toFixed(2));
        } else {
            const horasNormalesLimit = parseFloat(user.horasNormalesMax) || 8.0;
            let horasNormalesTrabajadas = Math.min(horas, horasNormalesLimit);
            let horasExtrasTrabajadas = Math.max(0, horas - horasNormalesLimit);

            let propDiurna = horas > 0 ? (horasDiurnas / horas) : 1;
            let propNocturna = horas > 0 ? (horasNocturnas / horas) : 0;

            let diurnasNormales = horasNormalesTrabajadas * propDiurna;
            let nocturnasNormales = horasNormalesTrabajadas * propNocturna;

            let diurnasExtras = horasExtrasTrabajadas * propDiurna;
            let nocturnasExtras = horasExtrasTrabajadas * propNocturna;

            bruto = parseFloat((
                (diurnasNormales * tarifaDiurna) +
                (nocturnasNormales * tarifaNocturna) +
                (diurnasExtras * tarifaDiurna * 2) +
                (nocturnasExtras * tarifaNocturna * 2)
            ).toFixed(2));
        }

        const pens = await dbAll(`SELECT monto FROM penalizations WHERE asistenciaId = ?`, [record.id]);
        const descuentos = pens.reduce((acc, curr) => acc + curr.monto, 0);

        const bons = await dbAll(`SELECT monto FROM bonuses WHERE asistenciaId = ?`, [record.id]);
        const bonos = bons.reduce((acc, curr) => acc + curr.monto, 0);

        const neto = Math.max(0, parseFloat((bruto + bonos - descuentos).toFixed(2)));

        await dbRun(`
            UPDATE attendance 
            SET horaSalida = ?, horasDiurnas = ?, horasNocturnas = ?, horasTrabajadas = ?, montoBruto = ?, descuento = ?, bono = ?, montoNeto = ?, latSalida = ?, lngSalida = ?, justificacionLugarSalida = ?, justificacionMotivoSalida = ?
            WHERE id = ?
        `, [timeStr, horasDiurnas, horasNocturnas, horas, bruto, descuentos, bonos, neto, lat || null, lng || null, justificacionLugar || null, justificacionMotivo || null, record.id]);

        await addLog(user.id, `${user.nombre} registró salida (Check-out) a las ${timeStr}. Diurnas: ${horasDiurnas}h, Nocturnas: ${horasNocturnas}h, Total: ${horas}h, Bruto: Q${bruto}, Extras: Q${bonos}, Deducciones: Q${descuentos}. Ubicación: "${justificacionLugar || 'N/A'}", Actividad: "${justificacionMotivo || 'N/A'}"`);

        const updatedRecord = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [record.id]);
        res.json({ success: true, record: updatedRecord });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/attendance/approve/:id', async (req, res) => {
    const asistenciaId = parseInt(req.params.id);
    const { adminId, metodoPago } = req.body;
    try {
        const record = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [asistenciaId]);
        if (!record) return res.status(404).json({ success: false, message: 'Marcaje no encontrado.' });
        if (record.aprobado) return res.json({ success: true, message: 'Ya aprobado.' });

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';
        const user = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [record.usuarioId]);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0];

        await dbRun(`
            UPDATE attendance 
            SET aprobado = 1, aprobadoPor = ?, aprobadoFecha = ?, metodoPago = ?
            WHERE id = ?
        `, [parseInt(adminId), dateStr, metodoPago || 'Efectivo', asistenciaId]);

        await addLog(adminId, `${adminName} aprobó el pago de Q${record.montoNeto} para ${user ? user.nombre : 'Colaborador'} correspondientes al ${record.fecha}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/penalizations', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT p.*, u.nombre as nombreColaborador, a.fecha as fechaMarcaje
            FROM penalizations p
            JOIN users u ON p.usuarioId = u.id
            LEFT JOIN attendance a ON p.asistenciaId = a.id
            ORDER BY p.fecha DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/penalizations/user/:userId', async (req, res) => {
    try {
        const rows = await dbAll(`SELECT * FROM penalizations WHERE usuarioId = ?`, [parseInt(req.params.userId)]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/penalizations', async (req, res) => {
    const { asistenciaId, usuarioId, motivo, monto, adminId, foto } = req.body;
    try {
        let finalAsistenciaId = asistenciaId ? parseInt(asistenciaId) : null;
        let finalUsuarioId = usuarioId ? parseInt(usuarioId) : null;

        if (finalAsistenciaId) {
            const record = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [finalAsistenciaId]);
            if (record) {
                finalUsuarioId = record.usuarioId;
            }
        } else if (finalUsuarioId) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const record = await dbGet(`SELECT id FROM attendance WHERE usuarioId = ? AND fecha = ? ORDER BY id DESC LIMIT 1`, [finalUsuarioId, dateStr]);
            if (record) {
                finalAsistenciaId = record.id;
            } else {
                const lastRecord = await dbGet(`SELECT id FROM attendance WHERE usuarioId = ? ORDER BY fecha DESC, id DESC LIMIT 1`, [finalUsuarioId]);
                if (lastRecord) {
                    finalAsistenciaId = lastRecord.id;
                }
            }
        }

        if (!finalUsuarioId) {
            return res.status(400).json({ success: false, message: 'Se requiere un usuario válido para la descuento.' });
        }

        const user = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [finalUsuarioId]);
        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);

        // Procesar foto adjunta
        let fotoUrl = null;
        if (foto) {
            try {
                const matches = foto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1].split('/')[1] || 'jpg';
                    const dataBuffer = Buffer.from(matches[2], 'base64');
                    const filename = `discount_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'finances', 'discounts', filename);
                    require('fs').writeFileSync(filepath, dataBuffer);
                    fotoUrl = publicUrl;
                }
            } catch (err) {
                console.error("Error al guardar la foto del descuento:", err);
            }
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        await dbRun(`
            INSERT INTO penalizations (asistenciaId, usuarioId, fecha, motivo, monto, creadoPor, fotoUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [finalAsistenciaId, finalUsuarioId, dateStr, motivo, parseFloat(monto), parseInt(adminId), fotoUrl]);

        if (finalAsistenciaId) {
            const record = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [finalAsistenciaId]);
            if (record) {
                const pens = await dbAll(`SELECT monto FROM penalizations WHERE asistenciaId = ?`, [record.id]);
                const totalDescuento = pens.reduce((acc, curr) => acc + curr.monto, 0);

                const bons = await dbAll(`SELECT monto FROM bonuses WHERE asistenciaId = ?`, [record.id]);
                const totalBono = bons.reduce((acc, curr) => acc + curr.monto, 0);

                const nuevoNeto = Math.max(0, parseFloat((record.montoBruto + totalBono - totalDescuento).toFixed(2)));

                await dbRun(`
                    UPDATE attendance 
                    SET descuento = ?, montoNeto = ? 
                    WHERE id = ?
                `, [totalDescuento, nuevoNeto, record.id]);
            }
        }

        await addLog(adminId, `${admin ? admin.nombre : 'Admin'} aplicó descuento de Q${monto} a ${user ? user.nombre : 'Colaborador'}. Motivo: ${motivo}${fotoUrl ? ' (Con foto adjunta)' : ''}`);
        res.json({ success: true, fotoUrl });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/penalizations/:id', async (req, res) => {
    const penId = parseInt(req.params.id);
    const adminId = parseInt(req.query.adminId);
    try {
        const pen = await dbGet(`SELECT * FROM penalizations WHERE id = ?`, [penId]);
        if (!pen) return res.status(404).json({ success: false, message: 'Descuento no encontrada.' });

        const user = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [pen.usuarioId]);
        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [adminId]);

        await dbRun(`DELETE FROM penalizations WHERE id = ?`, [penId]);

        const record = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [pen.asistenciaId]);
        if (record) {
            const pens = await dbAll(`SELECT monto FROM penalizations WHERE asistenciaId = ?`, [record.id]);
            const totalDescuento = pens.reduce((acc, curr) => acc + curr.monto, 0);
            const nuevoNeto = Math.max(0, parseFloat((record.montoBruto - totalDescuento).toFixed(2)));

            await dbRun(`
                UPDATE attendance 
                SET descuento = ?, montoNeto = ? 
                WHERE id = ?
            `, [totalDescuento, nuevoNeto, record.id]);
        }

        await addLog(adminId, `${admin ? admin.nombre : 'Admin'} eliminó la descuento de Q${pen.monto} asociada a ${user ? user.nombre : 'Colaborador'}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/bonuses', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT b.*, u.nombre as nombreColaborador, a.fecha as fechaMarcaje
            FROM bonuses b
            JOIN users u ON b.usuarioId = u.id
            JOIN attendance a ON b.asistenciaId = a.id
            ORDER BY b.fecha DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/bonuses/user/:userId', async (req, res) => {
    try {
        const rows = await dbAll(`SELECT * FROM bonuses WHERE usuarioId = ?`, [parseInt(req.params.userId)]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/bonuses', async (req, res) => {
    const { asistenciaId, motivo, monto, adminId } = req.body;
    try {
        const record = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [parseInt(asistenciaId)]);
        if (!record) return res.status(404).json({ success: false, message: 'Marcaje no encontrado.' });

        const user = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [record.usuarioId]);
        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        await dbRun(`
            INSERT INTO bonuses (asistenciaId, usuarioId, fecha, motivo, monto, creadoPor)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [record.id, record.usuarioId, dateStr, motivo, parseFloat(monto), parseInt(adminId)]);

        const pens = await dbAll(`SELECT monto FROM penalizations WHERE asistenciaId = ?`, [record.id]);
        const totalDescuento = pens.reduce((acc, curr) => acc + curr.monto, 0);

        const bons = await dbAll(`SELECT monto FROM bonuses WHERE asistenciaId = ?`, [record.id]);
        const totalBono = bons.reduce((acc, curr) => acc + curr.monto, 0);

        const nuevoNeto = Math.max(0, parseFloat((record.montoBruto + totalBono - totalDescuento).toFixed(2)));

        await dbRun(`
            UPDATE attendance 
            SET descuento = ?, bono = ?, montoNeto = ? 
            WHERE id = ?
        `, [totalDescuento, totalBono, nuevoNeto, record.id]);

        await addLog(adminId, `${admin ? admin.nombre : 'Admin'} aplicó bono extra de Q${monto} a ${user ? user.nombre : 'Colaborador'}. Motivo: ${motivo}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/bonuses/:id', async (req, res) => {
    const bonusId = parseInt(req.params.id);
    const adminId = parseInt(req.query.adminId);
    try {
        const bonus = await dbGet(`SELECT * FROM bonuses WHERE id = ?`, [bonusId]);
        if (!bonus) return res.status(404).json({ success: false, message: 'Bono no encontrado.' });

        const user = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [bonus.usuarioId]);
        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [adminId]);

        await dbRun(`DELETE FROM bonuses WHERE id = ?`, [bonusId]);

        const record = await dbGet(`SELECT * FROM attendance WHERE id = ?`, [bonus.asistenciaId]);
        if (record) {
            const pens = await dbAll(`SELECT monto FROM penalizations WHERE asistenciaId = ?`, [record.id]);
            const totalDescuento = pens.reduce((acc, curr) => acc + curr.monto, 0);

            const bons = await dbAll(`SELECT monto FROM bonuses WHERE asistenciaId = ?`, [record.id]);
            const totalBono = bons.reduce((acc, curr) => acc + curr.monto, 0);

            const nuevoNeto = Math.max(0, parseFloat((record.montoBruto + totalBono - totalDescuento).toFixed(2)));

            await dbRun(`
                UPDATE attendance 
                SET descuento = ?, bono = ?, montoNeto = ? 
                WHERE id = ?
            `, [totalDescuento, totalBono, nuevoNeto, record.id]);
        }

        await addLog(adminId, `${admin ? admin.nombre : 'Admin'} eliminó el bono de Q${bonus.monto} asociado a ${user ? user.nombre : 'Colaborador'}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/piecework', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM piecework_records ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/piecework/submit', async (req, res) => {
    try {
        const { usuarioId, trabajo, precio, cantidad, total } = req.body;
        const fecha = new Date().toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' }) + ' ' +
            new Date().toLocaleTimeString('es-GT', { timeZone: 'America/Guatemala', hour12: false });

        await dbRun(`
                INSERT INTO piecework_records (usuarioId, fecha, trabajo, precio, cantidad, total, estado)
                VALUES (?, ?, ?, ?, ?, ?, 'Pendiente')
            `, [usuarioId, fecha, trabajo, precio, cantidad, total]);

        res.json({ success: true, message: 'Trabajo entregado con éxito.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/piecework/approve/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmadoPor } = req.body;
        const fecha = new Date().toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' }) + ' ' +
            new Date().toLocaleTimeString('es-GT', { timeZone: 'America/Guatemala', hour12: false });

        const result = await dbRun(`
                UPDATE piecework_records 
                SET estado = 'Confirmado', confirmadoPor = ?, confirmadoFecha = ? 
                WHERE id = ?
            `, [confirmadoPor, fecha, id]);

        if (result.changes === 0) return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        res.json({ success: true, message: 'Trabajo confirmado.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/piecework/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dbRun(`DELETE FROM piecework_records WHERE id = ?`, [id]);
        if (result.changes === 0) return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        res.json({ success: true, message: 'Registro eliminado.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/attendance/cuts', async (req, res) => {
    try {
        const cuts = await dbAll("SELECT * FROM payroll_cuts ORDER BY id DESC");
        res.json({ success: true, cuts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/attendance/cuts/:id/records', async (req, res) => {
    try {
        const { id } = req.params;
        const attendance = await dbAll(`
            SELECT a.*, u.nombre as nombreColaborador, u.grupo as grupoColaborador, u.tipoPago, u.frecuenciaPago
            FROM attendance a 
            JOIN users u ON a.usuarioId = u.id 
            WHERE a.corteId = ?
        `, [id]);
        
        const busRecords = await dbAll(`
            SELECT b.*, u.nombre as nombreColaborador, u.grupo as grupoColaborador, u.tipoPago, u.frecuenciaPago
            FROM bus_records b 
            JOIN users u ON b.usuarioId = u.id 
            WHERE b.corteId = ?
        `, [id]);

        res.json({ success: true, attendance, busRecords });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Guardar confirmaciones individualmente o masivamente
router.post('/attendance/cuts/:id/confirm', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId, attendanceApprovals, busApprovals } = req.body;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0];
        
        if (attendanceApprovals && attendanceApprovals.length > 0) {
            for (const att of attendanceApprovals) {
                await dbRun(`
                    UPDATE attendance 
                    SET aprobado = 1, aprobadoPor = ?, aprobadoFecha = ?, metodoPago = ?
                    WHERE id = ? AND corteId = ?
                `, [adminId, dateStr, att.metodoPago || 'Efectivo', att.id, id]);
            }
        }
        
        if (busApprovals && busApprovals.length > 0) {
            for (const bus of busApprovals) {
                await dbRun(`
                    UPDATE bus_records 
                    SET aprobado = 1, metodoPago = ?
                    WHERE id = ? AND corteId = ?
                `, [bus.metodoPago || 'Efectivo', bus.id, id]);
            }
        }
        
        res.json({ success: true, message: 'Confirmaciones guardadas correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Finalizar corte (Guardar y Exportar)
router.post('/attendance/cuts/:id/finalize', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.body;
        
        const cut = await dbGet("SELECT * FROM payroll_cuts WHERE id = ?", [id]);
        if (!cut) return res.status(404).json({ success: false, message: 'Corte no encontrado.' });
        if (cut.estado === 'Finalizado') return res.json({ success: true, message: 'Corte ya finalizado.' });
        
        // 0. Aplicar deducción de préstamos solo a los usuarios que participan en este corte
        const usersInCut = await dbAll(`
            SELECT DISTINCT usuarioId FROM attendance WHERE corteId = ?
            UNION
            SELECT DISTINCT usuarioId FROM bus_records WHERE corteId = ?
        `, [id, id]);
        
        for (const row of usersInCut) {
            const user = await dbGet("SELECT * FROM users WHERE id = ?", [row.usuarioId]);
            if (!user) continue;
            
            let isAuth = false;
            let cuota = 0;
            let saldoActual = 0;
            let keysToUpdateSaldo = [];
            let keysToUpdateEstado = [];

            Object.keys(user).forEach(k => {
                const lowerK = k.toLowerCase();
                if (lowerK.includes('stamoestadocuota') || lowerK.includes('stamo_estado_cuota')) {
                    if (user[k] === 'Autorizado') isAuth = true;
                    keysToUpdateEstado.push(k);
                }
                if (lowerK.includes('stamocuota') || lowerK.includes('stamo_cuota')) {
                    const val = parseFloat(user[k]);
                    if (val > 0) cuota = val;
                }
                if (lowerK.includes('stamosaldo') || lowerK.includes('stamo_saldo')) {
                    const val = parseFloat(user[k]);
                    if (val > 0) saldoActual = val;
                    keysToUpdateSaldo.push(k);
                }
            });

            if (isAuth && cuota > 0 && saldoActual > 0) {
                let nuevoSaldo = saldoActual - cuota;
                let nuevoEstado = 'Autorizado';

                if (nuevoSaldo <= 0) {
                    nuevoSaldo = 0;
                    nuevoEstado = 'Saldado';
                }

                for (const col of keysToUpdateSaldo) {
                    await dbRun(`UPDATE users SET "${col}" = ? WHERE id = ?`, [nuevoSaldo, user.id]).catch(e => { });
                }
                for (const col of keysToUpdateEstado) {
                    await dbRun(`UPDATE users SET "${col}" = ? WHERE id = ?`, [nuevoEstado, user.id]).catch(e => { });
                }
            }
        }
        
        // 1. Actualizar estado del corte a Finalizado
        await dbRun("UPDATE payroll_cuts SET estado = 'Finalizado' WHERE id = ?", [id]);
        
        await addLog(adminId || 0, `Corte de planilla #${id} finalizado y préstamos deducidos.`);
        
        res.json({ success: true, message: 'Corte finalizado exitosamente.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/*
    ,d88b.d88b,
    88888888888
    `Y8 N + B 8P'
      `Y888P'  
        `Y'    
*/
module.exports = router;

