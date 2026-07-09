const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet, addLog } = require('../config/db');
const { getUploadPath } = require('../utils/fileHelpers');

router.post('/bus-records/approve/:id', async (req, res) => {
    const recordId = parseInt(req.params.id);
    const { adminId, metodoPago } = req.body;
    try {
        const record = await dbGet(`SELECT * FROM bus_records WHERE id = ?`, [recordId]);
        if (!record) return res.status(404).json({ success: false, message: 'Registro de bus no encontrado.' });
        if (record.aprobado) return res.json({ success: true, message: 'Ya aprobado.' });

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';
        const user = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [record.usuarioId]);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0];

        await dbRun(`
            UPDATE bus_records 
            SET aprobado = 1, metodoPago = ?
            WHERE id = ?
        `, [metodoPago || 'Efectivo', recordId]);

        await addLog(adminId, `${adminName} aprobó el pago de buses para ${user ? user.nombre : 'Colaborador'} correspondientes al ${record.fecha}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/loans', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT pr.*, u.nombre as nombreEmpleado
            FROM loans pr
            JOIN users u ON pr.usuarioId = u.id
            ORDER BY pr.fecha DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/loans/user/:userId', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT pr.*, u.nombre as nombreEmpleado
            FROM loans pr
            JOIN users u ON pr.usuarioId = u.id
            WHERE pr.usuarioId = ?
            ORDER BY pr.fecha DESC
        `, [parseInt(req.params.userId)]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/loans', async (req, res) => {
    const { usuarioId, monto, cuotas } = req.body;
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        await dbRun(`
            INSERT INTO loans (usuarioId, fecha, monto, cuotas, estado)
            VALUES (?, ?, ?, ?, 'Pendiente')
        `, [parseInt(usuarioId), dateStr, parseFloat(monto), parseInt(cuotas)]);
        
        await addLog(usuarioId, `Solicitó un préstamo de Q${parseFloat(monto).toFixed(2)} a pagar en ${cuotas} cuotas`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/loans/approve/:id', async (req, res) => {
    const loanId = parseInt(req.params.id);
    const { adminId } = req.body;
    try {
        const loan = await dbGet(`SELECT l.*, u.nombre, u.préstamoTotal, u.préstamosaldo FROM loans l JOIN users u ON l.usuarioId = u.id WHERE l.id = ?`, [loanId]);
        if (!loan) return res.status(404).json({ success: false, message: 'Préstamo no encontrado.' });

        await dbRun(`UPDATE loans SET estado = 'Aprobado' WHERE id = ?`, [loanId]);
        
        const cuotaMonto = loan.monto / loan.cuotas;
        const nuevoTotal = (parseFloat(loan.préstamoTotal) || 0) + loan.monto;
        const nuevoSaldo = (parseFloat(loan.préstamosaldo) || 0) + loan.monto;
        
        await dbRun(`
            UPDATE users 
            SET préstamoTotal = ?, 
                préstamosaldo = ?, 
                préstamoCuota = ?, 
                préstamoEstadoCuota = 'Autorizado' 
            WHERE id = ?
        `, [nuevoTotal, nuevoSaldo, cuotaMonto, loan.usuarioId]);

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';

        await addLog(adminId, `${adminName} aprobó el préstamo de Q${loan.monto.toFixed(2)} solicitado por ${loan.nombre}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/loans/reject/:id', async (req, res) => {
    const loanId = parseInt(req.params.id);
    const { adminId } = req.body;
    try {
        const loan = await dbGet(`SELECT l.*, u.nombre FROM loans l JOIN users u ON l.usuarioId = u.id WHERE l.id = ?`, [loanId]);
        if (!loan) return res.status(404).json({ success: false, message: 'Préstamo no encontrado.' });

        await dbRun(`UPDATE loans SET estado = 'Rechazado' WHERE id = ?`, [loanId]);
        
        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';

        await addLog(adminId, `${adminName} rechazó el préstamo de Q${loan.monto.toFixed(2)} solicitado por ${loan.nombre}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/loans/:id', async (req, res) => {
    const loanId = parseInt(req.params.id);
    const adminId = parseInt(req.query.adminId);
    try {
        const loan = await dbGet(`SELECT l.*, u.nombre FROM loans l JOIN users u ON l.usuarioId = u.id WHERE l.id = ?`, [loanId]);
        if (!loan) return res.status(404).json({ success: false, message: 'Préstamo no encontrado.' });

        await dbRun(`DELETE FROM loans WHERE id = ?`, [loanId]);
        await addLog(adminId, `Eliminó el préstamo ID ${loanId} solicitado por ${loan.nombre}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/bus-records', async (req, res) => {
        try {
            const rows = await dbAll('SELECT * FROM bus_records ORDER BY id DESC');
            res.json({ success: true, data: rows });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/bus-records/submit', async (req, res) => {
        try {
            const { usuarioId, turno, ingresoDinero, gastos } = req.body;
            const fecha = new Date().toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' }) + ' ' + 
                          new Date().toLocaleTimeString('es-GT', { timeZone: 'America/Guatemala', hour12: false });
            
            let totalMontoGasto = 0;
            const processedGastos = [];

            for (const g of (gastos || [])) {
                let fotoUrl = null;
                if (g.fotoBase64 && g.fotoBase64.startsWith('data:')) {
                    const matches = g.fotoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const ext = matches[1].split('/')[1] || 'jpg';
                        const dataBuffer = Buffer.from(matches[2], 'base64');
                        const filename = `bus_factura_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                        const { filepath, publicUrl } = getUploadPath(__dirname, 'finances', 'discounts', filename);
                        require('fs').writeFileSync(filepath, dataBuffer);
                        fotoUrl = publicUrl;
                    }
                }
                const monto = parseFloat(g.monto) || 0;
                totalMontoGasto += monto;
                
                // Actualizaciones en la base de datos según el tipo de gasto
                if (g.tipo === 'Sueldo') {
                    await dbRun(`UPDATE users SET sueldoBusesAcumulado = sueldoBusesAcumulado - ? WHERE id = ?`, [monto, usuarioId]);
                } else if (g.tipo === 'Préstamo' && g.empleadoId) {
                    await dbRun(`UPDATE users SET préstamoTotal = préstamoTotal + ?, préstamosaldo = préstamosaldo + ? WHERE id = ?`, [monto, monto, g.empleadoId]);
                }

                processedGastos.push({
                    tipo: g.tipo,
                    monto: monto,
                    fotoUrl: fotoUrl,
                    cantidad: g.cantidad || null,
                    empleadoId: g.empleadoId || null,
                    empleadoNombre: g.empleadoNombre || null,
                    justificacion: g.justificacion || null
                });
            }

            const detallesGastosStr = JSON.stringify(processedGastos);

            await dbRun(`
                INSERT INTO bus_records (usuarioId, fecha, turno, ingresoDinero, tipoGasto, montoGasto, fotoFacturaUrl, detallesGastos, aprobado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            `, [usuarioId, fecha, turno, ingresoDinero || 0, 'Multiples', totalMontoGasto, null, detallesGastosStr]);

            if (ingresoDinero && parseFloat(ingresoDinero) > 0) {
                await dbRun(`UPDATE users SET sueldoBusesAcumulado = sueldoBusesAcumulado + 200 WHERE id = ?`, [usuarioId]);
            }

            res.json({ success: true, message: 'Registro de BUSES guardado con éxito.' });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.get('/petty-cash-funds', async (req, res) => {
        try {
            const { usuarioId } = req.query;
            let query = `
                SELECT f.*, u.nombre as empleadoNombre, p.nombre as proyectoNombre 
                FROM petty_cash_funds f
                LEFT JOIN users u ON f.usuario_id = u.id
                LEFT JOIN projects p ON f.proyecto_id = p.id
            `;
            let params = [];
            
            if (usuarioId) {
                query += ` WHERE f.usuario_id = ?`;
                params.push(usuarioId);
            }
            query += ` ORDER BY f.estado ASC, f.fecha DESC`; // ACTIVO primero
            
            const funds = await dbAll(query, params);
            
            // Obtener gastos por fondo para inyectarlos
            for (let f of funds) {
                f.gastos = await dbAll(`
                    SELECT e.*, u.nombre as empleadoNombre 
                    FROM petty_cash_expenses e 
                    LEFT JOIN users u ON e.usuario_id = u.id 
                    WHERE e.fondo_id = ? 
                    ORDER BY e.fecha DESC
                `, [f.id]);
            }
            
            res.json(funds);
        } catch (error) {
            console.error('Error al obtener fondos de caja chica:', error);
            res.status(500).json({ error: 'Error interno' });
        }
    });
router.post('/petty-cash-funds/assign', async (req, res) => {
        try {
            const { usuario_id, monto, descripcion, registrado_por, proyecto_id } = req.body;
            if (!usuario_id || !monto || !descripcion) {
                return res.status(400).json({ success: false, message: 'Datos incompletos' });
            }

            await dbRun(
                `INSERT INTO petty_cash_funds (usuario_id, proyecto_id, monto_asignado, monto_disponible, descripcion, fecha, registrado_por, estado) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
                [usuario_id, proyecto_id || null, monto, monto, descripcion, getFormattedTimestamp(), registrado_por || null]
            );

            await addLog(registrado_por || 0, `Asignó fondo Q${monto} a usuario ID: ${usuario_id}`);
            res.json({ success: true });
        } catch (error) {
            console.error('Error al asignar fondo:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.post('/petty-cash-funds/:id/expense', async (req, res) => {
        try {
            const fondo_id = req.params.id;
            const { usuario_id, monto, descripcion, fotosBase64, fotoFacturaBase64 } = req.body;
            if (!usuario_id || !monto || !descripcion) {
                return res.status(400).json({ success: false, message: 'Datos incompletos' });
            }

            // Verificar fondo
            const fondo = await dbGet(`SELECT * FROM petty_cash_funds WHERE id = ? AND estado = 'ACTIVO'`, [fondo_id]);
            if (!fondo) {
                return res.status(400).json({ success: false, message: 'Fondo no encontrado o ya no está activo.' });
            }
            if (monto > fondo.monto_disponible) {
                return res.status(400).json({ success: false, message: 'El monto excede lo disponible en el fondo.' });
            }

            let fotoUrls = [];
            const base64Array = Array.isArray(fotosBase64) ? fotosBase64 : (fotoFacturaBase64 ? [fotoFacturaBase64] : []);
            
            for (let b64 of base64Array) {
                try {
                    const base64Data = b64.replace(/^data:image\/\w+;base64,/, "");
                    const ext = b64.split(';')[0].split('/')[1] || 'png';
                    const filename = `factura_cajachica_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'finances', 'caja_chica', filename);
                    require('fs').writeFileSync(filepath, base64Data, 'base64');
                    fotoUrls.push(publicUrl);
                } catch (imgErr) {
                    console.error("Error guardando imagen de caja chica:", imgErr);
                }
            }

            const fotoUrlStr = fotoUrls.length > 0 ? fotoUrls.join(',') : null;

            await dbRun(
                `INSERT INTO petty_cash_expenses (fondo_id, usuario_id, monto, descripcion, foto_factura, fecha) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [fondo_id, usuario_id, monto, descripcion, fotoUrlStr, getFormattedTimestamp()]
            );

            // Si el fondo está vinculado a un proyecto, registrar el gasto en la tabla project_expenses
            if (fondo.proyecto_id) {
                try {
                    const userRow = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [usuario_id]);
                    const userName = userRow ? userRow.nombre : 'Desconocido';

                    await dbRun(
                        `INSERT INTO project_expenses (proyectoId, descripcion, monto, fecha, cantidad, fotoFacturaUrl) 
                         VALUES (?, ?, ?, ?, 1, ?)`,
                        [
                            fondo.proyecto_id,
                            `Caja Chica (${fondo.descripcion}) - ${descripcion} (Por: ${userName})`,
                            monto,
                            getFormattedTimestamp(),
                            fotoUrls.length > 0 ? fotoUrls[0] : null
                        ]
                    );
                } catch (peErr) {
                    console.error("Error al registrar gasto en project_expenses:", peErr);
                }
            }

            const nuevo_disponible = fondo.monto_disponible - monto;
            
            await dbRun(
                `UPDATE petty_cash_funds SET monto_disponible = ? WHERE id = ?`,
                [nuevo_disponible, fondo_id]
            );

            await addLog(usuario_id, `Registró gasto Q${monto} en fondo #${fondo_id}`);
            res.json({ success: true, fotoUrls, nuevo_disponible });
        } catch (error) {
            console.error('Error al registrar gasto:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.put('/petty-cash-funds/:id/submit', async (req, res) => {
        try {
            await dbRun(`UPDATE petty_cash_funds SET estado = 'EN REVISIÓN' WHERE id = ?`, [req.params.id]);
            await addLog(req.body.usuarioId || 9, `Envió fondo #${req.params.id} a revisión`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false });
        }
    });
router.put('/petty-cash-funds/:id/close', async (req, res) => {
        try {
            await dbRun(`UPDATE petty_cash_funds SET estado = 'CERRADO' WHERE id = ?`, [req.params.id]);
            await addLog(req.body.usuarioId || 9, `Cerró fondo de caja chica #${req.params.id}`);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false });
        }
    });
router.post('/global-incomes', async (req, res) => {
        const { usuarioId, motivo, monto, fotoBase64, tipo, projectIds } = req.body;
        const transactionType = tipo || 'Ingreso';
        
        try {
            let fotoUrl = null;
            if (fotoBase64) {
                const matches = fotoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1].split('/')[1] || 'jpg';
                    const dataBuffer = Buffer.from(matches[2], 'base64');
                    const filename = `income_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'finances', 'incomes', filename);
                    require('fs').writeFileSync(filepath, dataBuffer);
                    fotoUrl = publicUrl;
                }
            }

            const fecha = getFormattedTimestamp();
            await dbRun(
                `INSERT INTO global_incomes (usuarioId, fecha, motivo, monto, fotoUrl, estado, tipo) VALUES (?, ?, ?, ?, ?, 'Pendiente', ?)`,
                [usuarioId, fecha, motivo, monto, fotoUrl, transactionType]
            );

            // Reflejar gasto en proyectos si corresponde
            if (transactionType === 'Gasto' && Array.isArray(projectIds) && projectIds.length > 0) {
                const userRow = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [usuarioId]);
                const userName = userRow ? userRow.nombre : 'Desconocido';

                for (const pid of projectIds) {
                    try {
                        await dbRun(
                            `INSERT INTO project_expenses (proyectoId, descripcion, monto, fecha, cantidad, fotoFacturaUrl) 
                             VALUES (?, ?, ?, ?, 1, ?)`,
                            [pid, `${motivo} (Por: ${userName})`, monto, fecha, fotoUrl]
                        );
                        console.log(`Gasto global reflejado en project_expenses para Proyecto ID: ${pid}`);
                    } catch (peErr) {
                        console.error("Error al registrar gasto global en project_expenses:", peErr);
                    }
                }
            }

            const logActionText = transactionType === 'Gasto' ? 'un gasto' : 'un ingreso';
            await addLog(usuarioId, `Registró ${logActionText} por Q${monto}: ${motivo}`);
            res.json({ success: true });
        } catch (error) {
            console.error('Error al registrar transacción:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.get('/global-incomes', async (req, res) => {
        try {
            const rows = await dbAll(`
                SELECT i.*, u.nombre as nombreUsuario 
                FROM global_incomes i
                LEFT JOIN users u ON i.usuarioId = u.id
                ORDER BY i.fecha DESC
            `);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error al obtener ingresos:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.put('/global-incomes/:id/pay', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`UPDATE global_incomes SET estado = 'Pagado' WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Error al marcar ingreso como pagado:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.delete('/petty-cash-funds/expenses/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Solo lo borramos de petty_cash_expenses, se mantiene intacto en project_expenses
            await dbRun(`DELETE FROM petty_cash_expenses WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Error al eliminar gasto de caja chica:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar el gasto' });
        }
    });

module.exports = router;
