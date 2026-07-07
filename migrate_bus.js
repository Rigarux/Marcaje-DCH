const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getUploadPath } = require('./utils/fileHelpers');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const uploadsDir = path.join(__dirname, 'uploads');

async function migrateBus() {
    db.all(`SELECT id, detallesGastos FROM bus_records`, async (err, rows) => {
        if (err) return console.error(err);
        
        for (const row of rows) {
            if (!row.detallesGastos) continue;
            
            try {
                let changed = false;
                let gastos = JSON.parse(row.detallesGastos);
                
                for (let g of gastos) {
                    if (g.fotoUrl && g.fotoUrl.startsWith('/uploads/bus_factura_')) {
                        const filename = path.basename(g.fotoUrl);
                        let oldPath = path.join(uploadsDir, filename);
                        
                        const { filepath, publicUrl } = getUploadPath(path.join(__dirname, 'routes'), 'finances', 'discounts', filename);
                        
                        if (oldPath !== filepath && fs.existsSync(oldPath)) {
                            const destDir = path.dirname(filepath);
                            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                            fs.renameSync(oldPath, filepath);
                        }
                        
                        g.fotoUrl = publicUrl;
                        changed = true;
                    }
                }
                
                if (changed) {
                    db.run(`UPDATE bus_records SET detallesGastos = ? WHERE id = ?`, [JSON.stringify(gastos), row.id]);
                }
            } catch(e) {
                console.error(e);
            }
        }
        console.log("Bus records migrated.");
    });
}

migrateBus();
