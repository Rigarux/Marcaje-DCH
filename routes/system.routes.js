const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Endpoint para descargar la base de datos (database.db)
router.get('/download-db', (req, res) => {
    try {
        const dbPath = path.join(__dirname, '..', 'database.db');
        
        if (fs.existsSync(dbPath)) {
            res.download(dbPath, 'database.db', (err) => {
                if (err) {
                    console.error("Error al enviar el archivo database.db:", err);
                    if (!res.headersSent) {
                        res.status(500).json({ success: false, message: 'Error al descargar la base de datos.' });
                    }
                }
            });
        } else {
            console.error("El archivo database.db no existe en la ruta:", dbPath);
            res.status(404).json({ success: false, message: 'El archivo de base de datos no fue encontrado.' });
        }
    } catch (error) {
        console.error("Error en la ruta /download-db:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

module.exports = router;
