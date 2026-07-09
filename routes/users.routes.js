const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet, addLog } = require('../config/db');
const { getUploadPath } = require('../utils/fileHelpers');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Falta usuario o contraseña.' });
    }
    try {
        const user = await dbGet(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`, [username.trim()]);
        if (user && user.password === password) {
            await addLog(user.id, `Inicio de sesión eÉxitoso - Rol: ${user.rol}`);
            return res.json({ success: true, user });
        } else {
            await addLog(0, `Intento de acceso fallido para el usuario: "${username}"`);
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/logs', async (req, res) => {
    const { usuarioId, accion } = req.body;
    await addLog(usuarioId, accion);
    res.json({ success: true });
});
router.get('/logs', async (req, res) => {
    try {
        const rows = await dbAll(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 500`);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/reset-db', async (req, res) => {
    const { adminId } = req.body;
    try {
        await dbRun(`DROP TABLE IF EXISTS logs`);
        await dbRun(`DROP TABLE IF EXISTS penalizations`);
        await dbRun(`DROP TABLE IF EXISTS attendance`);
        await dbRun(`DROP TABLE IF EXISTS companies`);
        await dbRun(`DROP TABLE IF EXISTS groups`);
        await dbRun(`DROP TABLE IF EXISTS users`);
        await initDb();
        await addLog(adminId || 9, 'Restablecimiento de la base de datos a los valores por defecto');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/groups', async (req, res) => {
    try {
        const rows = await dbAll(`SELECT DISTINCT grupo as name FROM users WHERE grupo IS NOT NULL AND grupo != '' ORDER BY grupo ASC`);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const rows = await dbAll(`SELECT * FROM users ORDER BY nombre ASC`);
        const userStores = await dbAll(`SELECT * FROM user_stores`);
        
        const storesMap = {};
        userStores.forEach(us => {
            if (!storesMap[us.usuarioId]) storesMap[us.usuarioId] = [];
            storesMap[us.usuarioId].push(us.storeId);
        });

        rows.forEach(r => {
            r.assignedStores = storesMap[r.id] || [];
        });

        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/users/:id', async (req, res) => {
    try {
        const row = await dbGet(`SELECT * FROM users WHERE id = ?`, [parseInt(req.params.id)]);
        if (row) {
            const userStores = await dbAll(`SELECT storeId FROM user_stores WHERE usuarioId = ?`, [row.id]);
            row.assignedStores = userStores.map(us => us.storeId);
            res.json(row);
        } else res.status(404).json({ error: 'Usuario no encontrado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/users', async (req, res) => {
    const { username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, rangoMaximoHoras, tarifaHoraExtra, dpi, dpiFoto, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado } = req.body;
    try {
        const existing = await dbGet(`SELECT id FROM users WHERE LOWER(username) = LOWER(?)`, [username.trim()]);
        if (existing) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está registrado.' });
        }

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';

        let estadoCuota = préstamoEstadoCuota || 'Ninguno';
        if (parseFloat(préstamoTotal) > 0 && (estadoCuota === 'Ninguno' || !préstamoEstadoCuota)) {
            estadoCuota = 'Pendiente de Autorizar';
        }

        // Procesar foto de DPI
        let dpiFotoUrl = null;
        if (dpiFoto) {
            try {
                const matches = dpiFoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1].split('/')[1] || 'jpg';
                    const dataBuffer = Buffer.from(matches[2], 'base64');
                    const filename = `dpi_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'users', 'dpi', filename);
                    require('fs').writeFileSync(filepath, dataBuffer);
                    dpiFotoUrl = publicUrl;
                }
            } catch (err) {
                console.error("Error al guardar la foto del DPI:", err);
            }
        }

        const result = await dbRun(`
            INSERT INTO users (username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, rangoMaximoHoras, tarifaHoraExtra, dpi, dpiFotoUrl, hasVentasRole, precioDieselBuses, sueldoBusesAcumulado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            username.toLowerCase().trim(),
            password,
            nombre.trim(),
            rol,
            grupo,
            empresa || 'N/A',
            parseFloat(tarifaDiurna) || 0,
            parseFloat(tarifaNocturna) || 0,
            frecuenciaPago || 'semanal',
            parseFloat(préstamoTotal) || 0,
            parseFloat(préstamoCuota) || 0,
            parseFloat(préstamosaldo) || 0,
            estadoCuota,
            tipoPago || 'Por Horas',
            parseFloat(horasNormalesMax) !== undefined ? parseFloat(horasNormalesMax) : 8.0,
            parseFloat(rangoMaximoHoras) !== undefined ? parseFloat(rangoMaximoHoras) : 44.0,
            parseFloat(tarifaHoraExtra) !== undefined ? parseFloat(tarifaHoraExtra) : 0,
            dpi || '',
            dpiFotoUrl,
            hasVentasRole ? 1 : 0,
            parseFloat(precioDieselBuses) || 30.0,
            parseFloat(sueldoBusesAcumulado) || 0.0
        ]);

        if (assignedStores && Array.isArray(assignedStores)) {
            for (const storeId of assignedStores) {
                try {
                    await dbRun(`INSERT INTO user_stores (usuarioId, storeId) VALUES (?, ?)`, [result.lastID, storeId]);
                } catch(e) {}
            }
        }

        await addLog(adminId, `${adminName} creó el usuario "${nombre}" (@${username}) con rol "${rol}", grupo "${grupo}", empresa "${empresa || 'N/A'}".`);
        res.json({ success: true, userId: result.lastID });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.put('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, password, nombre, rol, grupo, empresa, tarifaDiurna, tarifaNocturna, frecuenciaPago, adminId, préstamoTotal, préstamoCuota, préstamosaldo, préstamoEstadoCuota, tipoPago, horasNormalesMax, rangoMaximoHoras, tarifaHoraExtra, dpi, dpiFoto, hasVentasRole, assignedStores, precioDieselBuses, sueldoBusesAcumulado } = req.body;
    try {
        const existing = await dbGet(`SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?`, [username.trim(), userId]);
        if (existing) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está en uso.' });
        }

        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';

        let estadoCuota = préstamoEstadoCuota || 'Ninguno';
        if (parseFloat(préstamoTotal) > 0 && (estadoCuota === 'Ninguno' || !préstamoEstadoCuota)) {
            if ((parseFloat(user.préstamoTotal) || 0) === 0) {
                estadoCuota = 'Pendiente de Autorizar';
            }
        } else if (parseFloat(préstamoTotal) === 0) {
            estadoCuota = 'Ninguno';
        }

        // Procesar foto de DPI
        let dpiFotoUrl = user.dpiFotoUrl || null;
        if (dpiFoto) {
            if (dpiFoto.startsWith('data:')) {
                try {
                    const matches = dpiFoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const ext = matches[1].split('/')[1] || 'jpg';
                        const dataBuffer = Buffer.from(matches[2], 'base64');
                        const filename = `dpi_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                        const { filepath, publicUrl } = getUploadPath(__dirname, 'users', 'dpi', filename);
                        require('fs').writeFileSync(filepath, dataBuffer);

                        // Borrar foto vieja si existe
                        if (user.dpiFotoUrl) {
                            const oldPath = path.join(__dirname, '..', user.dpiFotoUrl);
                            if (require('fs').existsSync(oldPath)) {
                                try {
                                    require('fs').unlinkSync(oldPath);
                                } catch (e) {
                                    console.error("Error al borrar foto de DPI vieja:", e);
                                }
                            }
                        }

                        dpiFotoUrl = publicUrl;
                    }
                } catch (err) {
                    console.error("Error al guardar la foto del DPI:", err);
                }
            } else if (dpiFoto === '') {
                // Si explícitamente se envía vacío, se borra la foto
                if (user.dpiFotoUrl) {
                    const oldPath = path.join(__dirname, '..', user.dpiFotoUrl);
                    if (require('fs').existsSync(oldPath)) {
                        try {
                            require('fs').unlinkSync(oldPath);
                        } catch (e) {
                            console.error("Error al borrar foto de DPI vieja:", e);
                        }
                    }
                }
                dpiFotoUrl = null;
            }
        }

        let updateQuery = `
            UPDATE users 
            SET username = ?, nombre = ?, rol = ?, grupo = ?, empresa = ?, tarifaDiurna = ?, tarifaNocturna = ?, frecuenciaPago = ?, préstamoTotal = ?, préstamoCuota = ?, préstamosaldo = ?, préstamoEstadoCuota = ?, tipoPago = ?, horasNormalesMax = ?, rangoMaximoHoras = ?, tarifaHoraExtra = ?, dpi = ?, dpiFotoUrl = ?, hasVentasRole = ?, precioDieselBuses = ?, sueldoBusesAcumulado = ?
        `;
        let params = [
            username.toLowerCase().trim(),
            nombre.trim(),
            rol,
            grupo,
            empresa || 'N/A',
            parseFloat(tarifaDiurna) || 0,
            parseFloat(tarifaNocturna) || 0,
            frecuenciaPago || 'semanal',
            parseFloat(préstamoTotal) || 0,
            parseFloat(préstamoCuota) || 0,
            parseFloat(préstamosaldo) || 0,
            estadoCuota,
            tipoPago || 'Por Horas',
            parseFloat(horasNormalesMax) !== undefined ? parseFloat(horasNormalesMax) : 8.0,
            parseFloat(rangoMaximoHoras) !== undefined ? parseFloat(rangoMaximoHoras) : 44.0,
            parseFloat(tarifaHoraExtra) !== undefined ? parseFloat(tarifaHoraExtra) : 0,
            dpi || '',
            dpiFotoUrl,
            hasVentasRole ? 1 : 0,
            parseFloat(precioDieselBuses) || 30.0,
            parseFloat(sueldoBusesAcumulado) || 0.0
        ];

        if (password) {
            updateQuery += `, password = ?`;
            params.push(password);
        }

        updateQuery += ` WHERE id = ?`;
        params.push(userId);

        await dbRun(updateQuery, params);

        if (assignedStores && Array.isArray(assignedStores)) {
            await dbRun(`DELETE FROM user_stores WHERE usuarioId = ?`, [userId]);
            for (const storeId of assignedStores) {
                try {
                    await dbRun(`INSERT INTO user_stores (usuarioId, storeId) VALUES (?, ?)`, [userId, storeId]);
                } catch(e) {}
            }
        }

        await addLog(adminId, `${adminName} configuró el usuario "${user.nombre}" (@${username}) -> Cambios aplicados.`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/stores/:id/users', async (req, res) => {
    try {
        const rows = await dbAll('SELECT u.id, u.nombre, u.rol FROM user_stores us JOIN users u ON us.usuarioId = u.id WHERE us.storeId = ?', [req.params.id]);
        res.json({ success: true, data: rows });
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/stores/:id/users', async (req, res) => {
    const storeId = parseInt(req.params.id);
    const { userIds } = req.body;
    try {
        await dbRun(`DELETE FROM user_stores WHERE storeId = ?`, [storeId]);
        if (userIds && Array.isArray(userIds)) {
            for (const uid of userIds) {
                await dbRun(`INSERT INTO user_stores (usuarioId, storeId) VALUES (?, ?)`, [parseInt(uid), storeId]);
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const adminId = parseInt(req.query.adminId);
    try {
        if (userId === adminId) {
            return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta.' });
        }

        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }



        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [adminId]);
        const adminName = admin ? admin.nombre : 'Admin';

        await dbRun(`DELETE FROM users WHERE id = ?`, [userId]);

        await addLog(adminId, `${adminName} eliminó al usuario "${user.nombre}" (@${user.username})`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/companies', async (req, res) => {
    try {
        const rows = await dbAll(`SELECT * FROM companies ORDER BY name ASC`);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/companies', async (req, res) => {
    const { name, encargadoId, adminId } = req.body;
    try {
        const trimName = name.trim();
        if (!trimName) return res.status(400).json({ success: false, message: 'Nombre vacío.' });

        const exists = await dbGet(`SELECT id FROM companies WHERE LOWER(name) = LOWER(?)`, [trimName]);
        if (exists) return res.status(400).json({ success: false, message: 'La empresa ya existe.' });

        await dbRun(`INSERT INTO companies (name, encargadoId) VALUES (?, ?)`, [trimName, encargadoId ? parseInt(encargadoId) : null]);

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';

        await addLog(adminId, `${adminName} creó la nueva empresa: "${trimName}"`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.put('/companies', async (req, res) => {
    const { oldName, newName, encargadoId, employeeIds, adminId } = req.body;
    try {
        const old = oldName.trim();
        const nuevo = newName.trim();
        if (!nuevo) return res.status(400).json({ success: false, message: 'El nuevo nombre no puede estar vacío.' });

        if (old === 'N/A' || old === 'DCH') {
            return res.status(400).json({ success: false, message: 'No se puede modificar una empresa fija del sistema.' });
        }

        if (old.toLowerCase() !== nuevo.toLowerCase()) {
            const exists = await dbGet(`SELECT id FROM companies WHERE LOWER(name) = LOWER(?)`, [nuevo]);
            if (exists) return res.status(400).json({ success: false, message: 'Ya existe una empresa con ese nombre.' });
        }

        const comp = await dbGet(`SELECT id FROM companies WHERE name = ?`, [old]);
        if (!comp) return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });

        await dbRun(`UPDATE companies SET name = ?, encargadoId = ? WHERE name = ?`, [nuevo, encargadoId ? parseInt(encargadoId) : null, old]);
        await dbRun(`UPDATE users SET empresa = ? WHERE empresa = ?`, [nuevo, old]);

        if (employeeIds && Array.isArray(employeeIds)) {
            // Desasociar los antiguos que estaban asociados a esta empresa (poner en N/A)
            await dbRun(`UPDATE users SET empresa = 'N/A' WHERE empresa = ?`, [nuevo]);
            // Asociar los seleccionados
            for (const empId of employeeIds) {
                await dbRun(`UPDATE users SET empresa = ? WHERE id = ?`, [nuevo, parseInt(empId)]);
            }
        }

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';

        await addLog(adminId, `${adminName} modificó la empresa "${old}" (Nuevo nombre: "${nuevo}", Encargado: ${encargadoId || 'Ninguno'})`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/companies', async (req, res) => {
    const { name, adminId } = req.body;
    try {
        const compName = name.trim();
        if (compName === 'N/A' || compName === 'DCH') {
            return res.status(400).json({ success: false, message: 'No se puede eliminar una empresa fija del sistema.' });
        }

        const comp = await dbGet(`SELECT id FROM companies WHERE name = ?`, [compName]);
        if (!comp) return res.status(404).json({ success: 'Empresa no encontrada.' });

        const workers = await dbGet(`SELECT count(*) as count FROM users WHERE empresa = ?`, [compName]);
        if (workers.count > 0) {
            return res.status(400).json({ success: false, message: 'No se puede eliminar la empresa porque tiene colaboradores asociados.' });
        }

        await dbRun(`DELETE FROM companies WHERE name = ?`, [compName]);

        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';

        await addLog(adminId, `${adminName} eliminó la empresa "${compName}"`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/users/:id/loans/authorize-cuota', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { adminId } = req.body;
    try {
        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        
        const cuota = parseFloat(user.préstamoCuota) || 0;
        const nuevoSaldo = Math.max(0, (parseFloat(user.préstamosaldo) || 0) - cuota);
        
        await dbRun(`
            UPDATE users 
            SET préstamoEstadoCuota = 'Autorizado', préstamosaldo = ?
            WHERE id = ?
        `, [nuevoSaldo, userId]);
        
        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';
        
        await addLog(adminId, `${adminName} autorizó el cobro de la cuota semanal de préstamo de Q${cuota.toFixed(2)} para ${user.nombre}. Nuevo saldo: Q${nuevoSaldo.toFixed(2)}`);
        res.json({ success: true, préstamosaldo: nuevoSaldo, préstamoEstadoCuota: 'Autorizado' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.post('/users/:id/loans/reset-cuota', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { adminId } = req.body;
    try {
        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        
        await dbRun(`
            UPDATE users 
            SET préstamoEstadoCuota = 'Pendiente de Autorizar'
            WHERE id = ?
        `, [userId]);
        
        const admin = await dbGet(`SELECT nombre FROM users WHERE id = ?`, [parseInt(adminId)]);
        const adminName = admin ? admin.nombre : 'Admin';
        
        await addLog(adminId, `${adminName} restableció la cuota semanal de préstamo a PENDIENTE DE AUTORIZAR para ${user.nombre}`);
        res.json({ success: true, préstamoEstadoCuota: 'Pendiente de Autorizar' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/inventories', async (req, res) => {
        try {
            const { usuarioId } = req.query;
            let rows;
            if (usuarioId) {
                rows = await dbAll('SELECT * FROM inventories WHERE usuarioId = ? ORDER BY nombre ASC', [usuarioId]);
            } else {
                rows = await dbAll('SELECT * FROM inventories ORDER BY nombre ASC');
            }
            res.json(rows);
        } catch (error) {
            console.error('Error al obtener inventario:', error);
            res.status(500).json({ error: 'Error interno' });
        }
    });
router.post('/inventories', async (req, res) => {
        try {
            const { usuarioId, nombre, descripcion, cantidad, precio, material_id } = req.body;
            if (!nombre || !usuarioId) return res.status(400).json({ error: 'Nombre y usuarioId son obligatorios' });
            
            const parsedCantidad = parseInt(cantidad) || 0;

            const result = await dbRun(
                `INSERT INTO inventories (usuarioId, nombre, descripcion, cantidad, precio) VALUES (?, ?, ?, ?, ?)`,
                [usuarioId, nombre, descripcion || '', parsedCantidad, parseFloat(precio) || 0]
            );
            
            if (material_id && parsedCantidad > 0) {
                // Descontar del inventario de la ferretería
                await dbRun(
                    `UPDATE materials SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?`,
                    [parsedCantidad, material_id, parsedCantidad]
                );
            }
            
            res.json({ id: result.lastID, success: true });
        } catch (error) {
            console.error('Error al crear articulo:', error);
            res.status(500).json({ error: 'Error interno' });
        }
    });
router.put('/inventories/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, descripcion, cantidad, precio } = req.body;
            await dbRun(
                `UPDATE inventories SET nombre = ?, descripcion = ?, cantidad = ?, precio = ? WHERE id = ?`,
                [nombre, descripcion, parseInt(cantidad) || 0, parseFloat(precio) || 0, id]
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Error al actualizar articulo:', error);
            res.status(500).json({ error: 'Error interno' });
        }
    });
router.delete('/inventories/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`DELETE FROM inventories WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Error al eliminar articulo:', error);
            res.status(500).json({ error: 'Error interno' });
        }
    });

module.exports = router;
