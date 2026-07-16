const express = require('express');
const router = express.Router();
const { dbRun, dbAll, dbGet, addLog } = require('../config/db');
const { getUploadPath } = require('../utils/fileHelpers');

router.get('/stores', async (req, res) => {
    try {
        const rows = await dbAll(`SELECT * FROM stores ORDER BY nombre ASC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/stores', async (req, res) => {
    const { nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logoBase64 } = req.body;
    try {
        let logoUrl = null;
        if (logoBase64 && logoBase64.startsWith('data:image')) {
            const matches = logoBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const dataBuffer = Buffer.from(matches[2], 'base64');
                const filename = `store_${Date.now()}.${ext}`;
                const { filepath, publicUrl } = getUploadPath(__dirname, 'logos', null, filename);
                require('fs').writeFileSync(filepath, dataBuffer);
                logoUrl = publicUrl;
            }
        }

        const result = await dbRun(
            `INSERT INTO stores (nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logo_url) VALUES (?, ?, ?, ?, ?, ?)`, 
            [nombre, pdf_email || 'serviciosdch1@gmail.com', pdf_telefono || '35656886', pdf_direccion || 'Lote 4 c Manzana 57 colonia Marianita Villa Nueva', pdf_propietario || 'Daniel Isai Chiguichon Choy', logoUrl]
        );
        res.json({ success: true, storeId: result.lastID });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.put('/stores/:id', async (req, res) => {
    const { nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logoBase64 } = req.body;
    const id = parseInt(req.params.id);
    try {
        let logoUrl = null;
        if (logoBase64 === '') {
            logoUrl = null;
        } else if (logoBase64 && logoBase64.startsWith('data:image')) {
            const matches = logoBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const dataBuffer = Buffer.from(matches[2], 'base64');
                const filename = `store_${id}_${Date.now()}.${ext}`;
                const { filepath, publicUrl } = getUploadPath(__dirname, 'logos', null, filename);
                require('fs').writeFileSync(filepath, dataBuffer);
                logoUrl = publicUrl;
            }
        }

        if (logoBase64 !== undefined) {
            await dbRun(
                `UPDATE stores SET nombre = ?, pdf_email = ?, pdf_telefono = ?, pdf_direccion = ?, pdf_propietario = ?, logo_url = ? WHERE id = ?`, 
                [nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, logoUrl, id]
            );
        } else {
            await dbRun(
                `UPDATE stores SET nombre = ?, pdf_email = ?, pdf_telefono = ?, pdf_direccion = ?, pdf_propietario = ? WHERE id = ?`, 
                [nombre, pdf_email, pdf_telefono, pdf_direccion, pdf_propietario, id]
            );
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/stores/:id', async (req, res) => {
    try {
        await dbRun(`DELETE FROM stores WHERE id = ?`, [parseInt(req.params.id)]);
        await dbRun(`DELETE FROM user_stores WHERE storeId = ?`, [parseInt(req.params.id)]); // Limpiar asignaciónes
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.get('/clients', async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM clients ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});
router.post('/clients', async (req, res) => {
    try {
        const { nombre, direccion, nit, telefono, email } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }
        const result = await dbRun(
            `INSERT INTO clients (nombre, direccion, nit, telefono, email) VALUES (?, ?, ?, ?, ?)`,
            [nombre, direccion || '', nit || '', telefono || '', email || '']
        );
        res.json({ id: result.lastID, message: 'Cliente creado' });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});
router.get('/projects', async (req, res) => {
        try {
            const { empresa } = req.query;
            let query = `
                SELECT p.*, 
                    COALESCE((SELECT SUM(monto * COALESCE(cantidad, 1)) FROM project_expenses WHERE proyectoId = p.id), 0) as gastosMateriales,
                    COALESCE((SELECT SUM(montoBruto) FROM attendance WHERE proyectoId = p.id), 0) as gastosPersonal,
                    (COALESCE((SELECT SUM(monto * COALESCE(cantidad, 1)) FROM project_expenses WHERE proyectoId = p.id), 0) + 
                     COALESCE((SELECT SUM(montoBruto) FROM attendance WHERE proyectoId = p.id), 0)) as totalGastos,
                    COALESCE((SELECT SUM(monto) FROM project_incomes WHERE proyectoId = p.id), 0) as totalIngresos
                FROM projects p
            `;
            let params = [];
            if (empresa && empresa !== 'Todas') {
                query += ` WHERE p.empresa = ?`;
                params.push(empresa);
            }

            const rows = await dbAll(query, params);
            res.json(rows);
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.get('/projects/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const project = await dbGet(`SELECT * FROM projects WHERE id = ?`, [id]);
            if (!project) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
            
            const expenses = await dbAll(`SELECT * FROM project_expenses WHERE proyectoId = ? ORDER BY fecha DESC, id DESC`, [id]);
            
            const attendances = await dbAll(`
                SELECT a.id, a.fecha, a.horasTrabajadas, a.montoBruto as pago, u.nombre as empleadoNombre
                FROM attendance a
                JOIN users u ON a.usuarioId = u.id
                WHERE a.proyectoId = ? AND a.montoBruto > 0
                ORDER BY a.fecha DESC
            `, [id]);
            const incomes = await dbAll(`SELECT * FROM project_incomes WHERE proyectoId = ? ORDER BY fecha DESC, id DESC`, [id]);
            
            res.json({ success: true, project, expenses, attendances, incomes });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/projects', async (req, res) => {
        try {
            const { nombre, descripcion, fechaInicio, fechaFin, presupuesto, empresa } = req.body;
            if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
            
            const result = await dbRun(`
                INSERT INTO projects (nombre, descripcion, fechaInicio, fechaFin, presupuesto, empresa) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [nombre, descripcion, fechaInicio, fechaFin, parseFloat(presupuesto) || 0, empresa || null]);
            
            res.json({ success: true, id: result.lastID });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.put('/projects/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, descripcion, fechaInicio, fechaFin, presupuesto, empresa } = req.body;
            if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
            
            await dbRun(`
                UPDATE projects 
                SET nombre = ?, descripcion = ?, fechaInicio = ?, fechaFin = ?, presupuesto = ?, empresa = ? 
                WHERE id = ?
            `, [nombre, descripcion, fechaInicio, fechaFin, parseFloat(presupuesto) || 0, empresa || null, id]);
            
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });

router.put('/projects/:id/close', async (req, res) => {
    try {
        const { id } = req.params;
        await dbRun(`UPDATE projects SET estado = 'Cerrado' WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.delete('/projects/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`DELETE FROM projects WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/projects/:id/expenses', async (req, res) => {
        try {
            const { id } = req.params;
            const { descripcion, monto, fecha, cantidad } = req.body;
            if (!descripcion || !monto) {
                return res.status(400).json({ success: false, message: 'La descripción y el monto son obligatorios' });
            }
            
            const result = await dbRun(`
                INSERT INTO project_expenses (proyectoId, descripcion, monto, fecha, cantidad) 
                VALUES (?, ?, ?, ?, ?)
            `, [id, descripcion, parseFloat(monto) || 0, fecha, parseInt(cantidad) || 1]);
            
            res.json({ success: true, id: result.lastID });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.delete('/projects/expenses/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`DELETE FROM project_expenses WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/projects/:id/incomes', async (req, res) => {
        try {
            const { id } = req.params;
            const { descripcion, monto, fecha, fotoBase64 } = req.body;
            if (!monto) {
                return res.status(400).json({ success: false, message: 'El monto es obligatorio' });
            }
            
            let fotoUrl = null;
            if (fotoBase64 && fotoBase64.startsWith('data:image')) {
                const matches = fotoBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const dataBuffer = Buffer.from(matches[2], 'base64');
                    const filename = `proj_income_${id}_${Date.now()}.${ext}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'finances', 'incomes', filename);
                    require('fs').writeFileSync(filepath, dataBuffer);
                    fotoUrl = publicUrl;
                }
            }

            const result = await dbRun(`
                INSERT INTO project_incomes (proyectoId, monto, fecha, descripcion, fotoComprobanteUrl) 
                VALUES (?, ?, ?, ?, ?)
            `, [id, parseFloat(monto) || 0, fecha, descripcion || '', fotoUrl]);
            
            res.json({ success: true, id: result.lastID });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.delete('/projects/incomes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`DELETE FROM project_incomes WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.get('/quotes', async (req, res) => {
        try {
            const rows = await dbAll(`
                SELECT q.*, COALESCE(SUM(qi.cantidad * qi.precio), 0) as totalCotización, s.nombre as tiendaNombre 
                FROM quotes q 
                LEFT JOIN quote_items qi ON q.id = qi.quoteId 
                LEFT JOIN stores s ON q.store_id = s.id
                GROUP BY q.id
                ORDER BY q.id DESC
            `);
            res.json(rows);
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/quotes/:id/reject', async (req, res) => {
        try {
            const fecha = new Date().toLocaleDateString('es-GT') + ' ' + new Date().toLocaleTimeString('es-GT', { hour12: false });
            await dbRun(`UPDATE quotes SET estado = 'Rechazada', fecha_estado = ? WHERE id = ?`, [fecha, id]);
            res.json({ success: true, message: 'Cotización rechazada correctamente' });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/quotes/:id/accept', async (req, res) => {
        try {
            const { id } = req.params;
            const { proyectoId, fotoFacturaBase64, totalCotización } = req.body;

            if (!proyectoId) {
                return res.status(400).json({ success: false, message: 'Debe seleccionar un proyecto' });
            }

            const fecha = new Date().toLocaleDateString('es-GT') + ' ' + new Date().toLocaleTimeString('es-GT', { hour12: false });
            await dbRun(`UPDATE quotes SET estado = 'Aceptada', fecha_estado = ? WHERE id = ?`, [fecha, id]);

            // Guardar factura si se proporcionó
            let facturaUrl = null;
            if (fotoFacturaBase64) {
                const matches = fotoFacturaBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1].split('/')[1] || 'png';
                    const buffer = Buffer.from(matches[2], 'base64');
                    const filename = `quote_factura_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                    const { filepath, publicUrl } = getUploadPath(__dirname, 'sales', 'invoices', filename);
                    require('fs').writeFileSync(filepath, buffer);
                    facturaUrl = publicUrl;
                }
            }

            // Crear el gasto en el proyecto
            const descripcion = `Cotización aprobada #${id}`;
            const fechaExp = new Date().toISOString().split('T')[0];
            await dbRun(`
                INSERT INTO project_expenses (proyectoId, descripcion, monto, fecha, cantidad, fotoFacturaUrl) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [proyectoId, descripcion, parseFloat(totalCotización) || 0, fechaExp, 1, facturaUrl]);

            res.json({ success: true, message: 'Cotización aceptada y asignada al proyecto correctamente' });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.get('/quotes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const quote = await dbGet(`
                SELECT q.*, u.nombre as creadorNombre, s.logo_url as tiendaLogoUrl
                FROM quotes q 
                LEFT JOIN users u ON q.creadoPor = u.id 
                LEFT JOIN stores s ON q.store_id = s.id
                WHERE q.id = ?
            `, [id]);
            if (!quote) return res.status(404).json({ success: false, message: 'Cotizacióno encontrada' });
            
            const items = await dbAll(`SELECT * FROM quote_items WHERE quoteId = ? ORDER BY id ASC`, [id]);
            res.json({ success: true, quote, items });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
    router.post('/quotes', async (req, res) => {
        try {
            const { clienteNombre, clienteDireccion, clienteNit, clienteTelefono, clienteEmail, creadoPor, fecha, validoHasta, estado, tipo_documento, store_id, tipo_pago } = req.body;
            
            const resultQuote = await dbRun(
                `INSERT INTO quotes (clienteNombre, clienteDireccion, clienteNit, clienteTelefono, clienteEmail, creadoPor, fecha, fecha_estado, validoHasta, estado, tipo_documento, store_id, tipo_pago) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [clienteNombre || 'Consumidor Final', clienteDireccion || null, clienteNit || null, clienteTelefono || null, clienteEmail || null, creadoPor || null, fecha, fecha, validoHasta || null, 'Borrador', 'Cotización', store_id || null, tipo_pago || 'Pendiente']
            );
            
            res.json({ success: true, id: resultQuote.lastID });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.put('/quotes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { clienteNombre, clienteDireccion, clienteNit, clienteTelefono, clienteEmail, fecha, validoHasta, estado, tipo_documento } = req.body;
            
            await dbRun(`
                UPDATE quotes 
                SET clienteNombre = ?, clienteDireccion = ?, clienteNit = ?, clienteTelefono = ?, clienteEmail = ?, fecha = ?, validoHasta = ?, estado = ?, tipo_documento = ? 
                WHERE id = ?
            `, [clienteNombre || '', clienteDireccion || '', clienteNit || '', clienteTelefono || '', clienteEmail || '', fecha || '', validoHasta || '', estado || 'Borrador', tipo_documento || 'Venta de producto', id]);
            
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/quotes/:id/pay', async (req, res) => {
        try {
            await dbRun(`UPDATE quotes SET tipo_pago = 'Contado' WHERE id = ?`, [parseInt(req.params.id)]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.delete('/quotes/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`DELETE FROM quotes WHERE id = ?`, [id]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.post('/quotes/:id/items', async (req, res) => {
        try {
            const { id } = req.params;
            const { descripcion, cantidad, unidad, precio } = req.body;
            if (!descripcion || precio === undefined) {
                return res.status(400).json({ success: false, message: 'La descripción y el precio son obligatorios' });
            }
            
            const result = await dbRun(`
                INSERT INTO quote_items (quoteId, descripcion, cantidad, unidad, precio) 
                VALUES (?, ?, ?, ?, ?)
            `, [id, descripcion, parseInt(cantidad) || 1, unidad || 'Unidad', parseFloat(precio) || 0]);
            
            res.json({ success: true, id: result.lastID });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    });
router.delete('/quotes/items/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await dbRun(`DELETE FROM quote_items WHERE id = ?`, [id]);
            res.json({ success: true, message: 'Item eliminado de cotización' });
        } catch (error) {
            console.error('Error al eliminar item de cotización:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar item de cotización' });
        }
    });
router.post('/stores/:id/quotes', async (req, res) => {
    try {
        const storeId = parseInt(req.params.id);
        const { clienteNombre, clienteDireccion, clienteNit, clienteTelefono, clienteEmail, tipo_pago, tipo_documento, creadoPor, items } = req.body;
        const fecha = new Date().toLocaleDateString('es-GT') + ' ' + new Date().toLocaleTimeString('es-GT', { hour12: false });
        
        const resultQuote = await dbRun(
            "INSERT INTO quotes (store_id, clienteNombre, clienteDireccion, clienteNit, clienteTelefono, clienteEmail, tipo_pago, tipo_documento, creadoPor, fecha, fecha_estado, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [storeId, clienteNombre || 'Consumidor Final', clienteDireccion || null, clienteNit || null, clienteTelefono || null, clienteEmail || null, tipo_pago || 'Contado', tipo_documento || 'Venta', creadoPor || null, fecha, fecha, (tipo_documento === 'Cotización') ? 'Borrador' : 'Aceptada']
        );
        const quoteId = resultQuote.lastID;

        if (items && Array.isArray(items)) {
            for (const item of items) {
                const { material_id, descripcion, cantidad, precio, costo } = item;
                await dbRun(
                    "INSERT INTO quote_items (quoteId, material_id, descripcion, cantidad, precio, costo) VALUES (?, ?, ?, ?, ?, ?)",
                    [quoteId, material_id, descripcion, cantidad, precio, costo]
                );
                
                // Deduct stock if there is a material_id
                if (material_id) {
                    await dbRun("UPDATE materials SET cantidad = cantidad - ? WHERE id = ?", [cantidad, material_id]);
                }
            }
        }
        res.json({ success: true, quoteId });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.get('/stores/:id/quotes', async (req, res) => {
    try {
        const storeId = parseInt(req.params.id);
        const rows = await dbAll(`
            SELECT q.*, COALESCE(SUM(qi.cantidad * qi.precio), 0) as totalCotización, s.nombre as tiendaNombre 
            FROM quotes q 
            LEFT JOIN quote_items qi ON q.id = qi.quoteId 
            LEFT JOIN stores s ON q.store_id = s.id
            WHERE q.store_id = ?
            GROUP BY q.id
            ORDER BY q.id DESC
        `, [storeId]);
        res.json({ success: true, data: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.get('/stores/:id/stats', async (req, res) => {
    try {
        const storeId = parseInt(req.params.id);
        const statsRows = await dbAll(`
            SELECT 
                q.tipo_pago,
                SUM(qi.cantidad * qi.precio) as totalVentas,
                SUM(qi.cantidad * (qi.precio - qi.costo)) as totalGanancia,
                COUNT(DISTINCT q.id) as totalCotizaciónes
            FROM quotes q
            JOIN quote_items qi ON q.id = qi.quoteId
            WHERE q.store_id = ?
            GROUP BY q.tipo_pago
        `, [storeId]);
        
        let totalVentas = 0, totalGanancia = 0, totalCotizaciónes = 0;
        let contado = 0, pendiente = 0, propio = 0;
        
        statsRows.forEach(row => {
            totalVentas += row.totalVentas || 0;
            totalGanancia += row.totalGanancia || 0;
            totalCotizaciónes += row.totalCotizaciónes || 0;
            
            if(row.tipo_pago === 'Contado') contado += row.totalVentas || 0;
            if(row.tipo_pago === 'Pendiente') pendiente += row.totalVentas || 0;
            if(row.tipo_pago === 'Propio') propio += row.totalVentas || 0;
        });
        
        res.json({ success: true, data: { totalVentas, totalGanancia, totalCotizaciónes, contado, pendiente, propio } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

