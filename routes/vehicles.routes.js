const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet, addLog } = require('../config/db');

router.get('/vehicles', async (req, res) => {
    try {
        const rows = await dbAll(`
            SELECT v.*, u.nombre as nombreEmpleado
            FROM vehicles v
            LEFT JOIN users u ON v.empleadoAsignadoId = u.id
            ORDER BY v.placa ASC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/vehicles', async (req, res) => {
    const { placa, marca, modelo, empleadoAsignadoId, estado, adminId } = req.body;
    try {
        const existing = await dbGet(`SELECT id FROM vehicles WHERE LOWER(placa) = LOWER(?)`, [placa.trim()]);
        if (existing) {
            return res.status(400).json({ success: false, message: 'La placa ya está registrada.' });
        }
        await dbRun(`
            INSERT INTO vehicles (placa, marca, modelo, empleadoAsignadoId, estado)
            VALUES (?, ?, ?, ?, ?)
        `, [placa.trim().toUpperCase(), marca.trim(), modelo.trim(), empleadoAsignadoId || null, estado || 'Disponible']);
        
        await addLog(adminId, `Se registró el vehículo con placa ${placa.trim().toUpperCase()} (${marca} ${modelo})`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.put('/vehicles/:id', async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const { placa, marca, modelo, empleadoAsignadoId, estado, motivoUso, fechaAsignación, adminId } = req.body;
    try {
        const existing = await dbGet(`SELECT id FROM vehicles WHERE LOWER(placa) = LOWER(?) AND id != ?`, [placa.trim(), vehicleId]);
        if (existing) {
            return res.status(400).json({ success: false, message: 'La placa ya está en uso.' });
        }
        await dbRun(`
            UPDATE vehicles
            SET placa = ?, marca = ?, modelo = ?, empleadoAsignadoId = ?, estado = ?, motivoUso = ?, fechaAsignación = ?
            WHERE id = ?
        `, [placa.trim().toUpperCase(), marca.trim(), modelo.trim(), empleadoAsignadoId || null, estado || 'Disponible', motivoUso || null, fechaAsignación || null, vehicleId]);

        await addLog(adminId, `Se modificaron los datos del vehículo ID ${vehicleId} (Placa: ${placa}, Estado: ${estado || 'Disponible'}, Asignado a ID: ${empleadoAsignadoId || 'Ninguno'})`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.delete('/vehicles/:id', async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const adminId = parseInt(req.query.adminId);
    try {
        const vehicle = await dbGet(`SELECT placa FROM vehicles WHERE id = ?`, [vehicleId]);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });

        await dbRun(`DELETE FROM vehicles WHERE id = ?`, [vehicleId]);
        await addLog(adminId, `Se eliminó el vehículo con placa ${vehicle.placa}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
