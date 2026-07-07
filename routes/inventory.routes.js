const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet, addLog } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { getUploadPath } = require('../utils/fileHelpers');


router.get('/inventory-audits', async (req, res) => {
        try {
            const { usuarioId } = req.query;
            let rows;
            if (usuarioId) {
                rows = await dbAll('SELECT * FROM inventory_audits WHERE usuarioId = ? ORDER BY id DESC', [usuarioId]);
            } else {
                rows = await dbAll('SELECT * FROM inventory_audits ORDER BY id DESC');
            }
            res.json(rows);
        } catch (error) {
            console.error('Error al obtener auditorías:', error);
            res.status(500).json({ error: 'Error interno' });
        }
    });
router.post('/inventory-audits', async (req, res) => {
        try {
            const { usuarioId, fecha, fotoBase64, comentarios } = req.body;
            if (!usuarioId || !fotoBase64) return res.status(400).json({ error: 'Faltan datos' });

            let fotoUrl = '';
            if (fotoBase64.startsWith('data:image')) {
                const matches = fotoBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const dataBuffer = Buffer.from(matches[2], 'base64');
                    const filename = `audit_${usuarioId}_${Date.now()}.${extension}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'inventory_audits', null, filename);
                    fs.writeFileSync(filepath, dataBuffer);
                    fotoUrl = publicUrl;
                }
            }

            const result = await dbRun(
                `INSERT INTO inventory_audits (usuarioId, fecha, fotoUrl, comentarios) VALUES (?, ?, ?, ?)`,
                [usuarioId, fecha, fotoUrl, comentarios || '']
            );
            res.json({ id: result.lastID, success: true });
        } catch (error) {
            console.error('Error al guardar auditoria:', error);
            res.status(500).json({ error: 'Error interno' });
        }
    });
router.get('/materials', async (req, res) => {
        try {
            const { store_id } = req.query;
            let query = `
                SELECT m.*, s.nombre as tiendaNombre 
                FROM materials m
                LEFT JOIN stores s ON m.store_id = s.id
            `;
            let params = [];
            if (store_id) {
                query += ` WHERE m.store_id = ?`;
                params.push(store_id);
            }
            query += ` ORDER BY m.nombre ASC`;
            
            const rows = await dbAll(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error al obtener materiales:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.get('/materials/alerts', async (req, res) => {
        try {
            const rows = await dbAll(`
                SELECT m.*, s.nombre as tiendaNombre 
                FROM materials m
                LEFT JOIN stores s ON m.store_id = s.id
                WHERE m.cantidad <= m.limite_alerta
                ORDER BY m.store_id ASC, m.nombre ASC
            `);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error al obtener alertas de materiales:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.post('/materials', async (req, res) => {
        try {
            const { store_id, nombre, cantidad, limite_alerta, fotoBase64, costo, precio } = req.body;
            let fotoUrl = null;
            if (fotoBase64) {
                const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, "");
                const ext = fotoBase64.split(';')[0].split('/')[1] || 'png';
                const filename = `material_${Date.now()}.${ext}`;
                const { filepath, publicUrl } = getUploadPath(__dirname, 'materials', null, filename);
                fs.writeFileSync(filepath, base64Data, 'base64');
                fotoUrl = publicUrl;
            }

            await dbRun(
                `INSERT INTO materials (store_id, nombre, cantidad, limite_alerta, fotoUrl, costo, precio) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [store_id, nombre, cantidad || 0, limite_alerta || 0, fotoUrl, parseFloat(costo) || 0, parseFloat(precio) || 0]
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Error al crear material:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.put('/materials/:id/cantidad', async (req, res) => {
        try {
            const { id } = req.params;
            const { cantidad } = req.body;
            await dbRun(`UPDATE materials SET cantidad = ? WHERE id = ?`, [cantidad, id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Error al actualizar cantidad de material:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.put('/materials/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, limite_alerta, costo, precio, fotoBase64 } = req.body;
            
            let fotoUrl = null;
            if (fotoBase64 && fotoBase64.startsWith('data:image')) {
                const matches = fotoBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const dataBuffer = Buffer.from(matches[2], 'base64');
                    const filename = `material_${id}_${Date.now()}.${extension}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'materials', null, filename);
                    fs.writeFileSync(filepath, dataBuffer);
                    fotoUrl = publicUrl;
                }
            }

            if (fotoUrl) {
                await dbRun(
                    `UPDATE materials SET nombre = ?, limite_alerta = ?, costo = ?, precio = ?, fotoUrl = ? WHERE id = ?`, 
                    [nombre, limite_alerta, parseFloat(costo) || 0, parseFloat(precio) || 0, fotoUrl, id]
                );
            } else {
                await dbRun(
                    `UPDATE materials SET nombre = ?, limite_alerta = ?, costo = ?, precio = ? WHERE id = ?`, 
                    [nombre, limite_alerta, parseFloat(costo) || 0, parseFloat(precio) || 0, id]
                );
            }
            res.json({ success: true });
        } catch (error) {
            console.error('Error al actualizar material:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });
router.delete('/materials/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`DELETE FROM materials WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Error al eliminar material:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    });

module.exports = router;
