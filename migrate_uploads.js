const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getUploadPath } = require('./utils/fileHelpers');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const uploadsDir = path.join(__dirname, 'uploads');
const routesUploadsDir = path.join(__dirname, 'routes', 'uploads');

async function migrateFile(oldPath, category, subcategory, filename, table, urlColumn, idColumn, id) {
    if (!fs.existsSync(oldPath)) return false;

    const { filepath, publicUrl } = getUploadPath(path.join(__dirname, 'routes'), category, subcategory, filename);
    
    // Si el archivo ya está en el destino correcto, no hacer nada
    if (oldPath === filepath) {
        // Solo actualizar la DB si la URL es diferente
        return new Promise((resolve) => {
            db.run(`UPDATE ${table} SET ${urlColumn} = ? WHERE ${idColumn} = ?`, [publicUrl, id], (err) => {
                if (err) console.error(`Error updating ${table}:`, err);
                resolve(true);
            });
        });
    }

    try {
        // Asegurar que el directorio destino exista (getUploadPath ya lo hace, pero por si acaso)
        const destDir = path.dirname(filepath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        // Mover archivo
        fs.renameSync(oldPath, filepath);
        
        // Actualizar base de datos
        return new Promise((resolve) => {
            db.run(`UPDATE ${table} SET ${urlColumn} = ? WHERE ${idColumn} = ?`, [publicUrl, id], (err) => {
                if (err) console.error(`Error updating ${table}:`, err);
                resolve(true);
            });
        });
    } catch (e) {
        console.error(`Error migrating file ${filename}:`, e);
        return false;
    }
}

async function migrateAll() {
    console.log("Starting uploads migration...");
    
    // 1. Migrate Materials (materials)
    db.all(`SELECT id, fotoUrl FROM materials WHERE fotoUrl IS NOT NULL`, async (err, rows) => {
        if (err) return console.error(err);
        for (const row of rows) {
            const filename = path.basename(row.fotoUrl);
            let oldPath = path.join(uploadsDir, filename);
            if (!fs.existsSync(oldPath)) oldPath = path.join(routesUploadsDir, filename);
            
            await migrateFile(oldPath, 'materials', null, filename, 'materials', 'fotoUrl', 'id', row.id);
        }
        console.log("Materials migrated.");
    });

    // 2. Migrate Inventory Audits (inventory_audits)
    db.all(`SELECT id, fotoUrl FROM inventory_audits WHERE fotoUrl IS NOT NULL`, async (err, rows) => {
        if (err) return console.error(err);
        for (const row of rows) {
            const filename = path.basename(row.fotoUrl);
            let oldPath = path.join(uploadsDir, filename);
            if (!fs.existsSync(oldPath)) oldPath = path.join(routesUploadsDir, filename);
            
            await migrateFile(oldPath, 'inventory_audits', null, filename, 'inventory_audits', 'fotoUrl', 'id', row.id);
        }
        console.log("Inventory Audits migrated.");
    });

    // 3. Migrate Users DPI (users)
    db.all(`SELECT id, dpiFotoUrl FROM users WHERE dpiFotoUrl IS NOT NULL`, async (err, rows) => {
        if (err) return console.error(err);
        for (const row of rows) {
            const filename = path.basename(row.dpiFotoUrl);
            let oldPath = path.join(uploadsDir, filename);
            if (!fs.existsSync(oldPath)) oldPath = path.join(routesUploadsDir, filename);
            
            await migrateFile(oldPath, 'users', 'dpi', filename, 'users', 'dpiFotoUrl', 'id', row.id);
        }
        console.log("Users DPI migrated.");
    });

    // 4. Migrate Penalizations (penalizations)
    db.all(`SELECT id, fotoUrl FROM penalizations WHERE fotoUrl IS NOT NULL`, async (err, rows) => {
        if (err) return console.error(err);
        for (const row of rows) {
            const filename = path.basename(row.fotoUrl);
            let oldPath = path.join(uploadsDir, filename);
            if (!fs.existsSync(oldPath)) oldPath = path.join(routesUploadsDir, filename);
            
            await migrateFile(oldPath, 'finances', 'discounts', filename, 'penalizations', 'fotoUrl', 'id', row.id);
        }
        console.log("Penalizations migrated.");
    });

    // 5. Migrate Global Incomes (global_incomes)
    db.all(`SELECT id, fotoUrl FROM global_incomes WHERE fotoUrl IS NOT NULL`, async (err, rows) => {
        if (err) return console.error(err);
        for (const row of rows) {
            const filename = path.basename(row.fotoUrl);
            let oldPath = path.join(uploadsDir, filename);
            if (!fs.existsSync(oldPath)) oldPath = path.join(routesUploadsDir, filename);
            
            await migrateFile(oldPath, 'finances', 'incomes', filename, 'global_incomes', 'fotoUrl', 'id', row.id);
        }
        console.log("Global Incomes migrated.");
    });

    // 6. Migrate Project Expenses (project_expenses)
    db.all(`SELECT id, fotoFacturaUrl FROM project_expenses WHERE fotoFacturaUrl IS NOT NULL`, async (err, rows) => {
        if (err) return console.error(err);
        for (const row of rows) {
            const filename = path.basename(row.fotoFacturaUrl);
            let oldPath = path.join(uploadsDir, filename);
            if (!fs.existsSync(oldPath)) oldPath = path.join(routesUploadsDir, filename);
            
            // Si es de caja chica
            if (filename.includes('cajachica')) {
                await migrateFile(oldPath, 'finances', 'caja_chica', filename, 'project_expenses', 'fotoFacturaUrl', 'id', row.id);
            } 
            // Si es de cotizacion
            else if (filename.includes('quote_factura')) {
                await migrateFile(oldPath, 'sales', 'invoices', filename, 'project_expenses', 'fotoFacturaUrl', 'id', row.id);
            } else {
                await migrateFile(oldPath, 'finances', 'expenses', filename, 'project_expenses', 'fotoFacturaUrl', 'id', row.id);
            }
        }
        console.log("Project Expenses migrated.");
    });
    
    // 7. Migrate Petty Cash Expenses (petty_cash_expenses)
    db.all(`SELECT id, foto_factura FROM petty_cash_expenses WHERE foto_factura IS NOT NULL`, async (err, rows) => {
        if (err) return console.error(err);
        for (const row of rows) {
            if (!row.foto_factura) continue;
            // Puede ser multiples fotos
            const urls = row.foto_factura.split(',');
            let newUrls = [];
            for (const url of urls) {
                const filename = path.basename(url);
                let oldPath = path.join(uploadsDir, filename);
                if (!fs.existsSync(oldPath)) oldPath = path.join(routesUploadsDir, filename);
                
                const { filepath, publicUrl } = getUploadPath(path.join(__dirname, 'routes'), 'finances', 'caja_chica', filename);
                if (oldPath !== filepath && fs.existsSync(oldPath)) {
                    const destDir = path.dirname(filepath);
                    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                    fs.renameSync(oldPath, filepath);
                }
                newUrls.push(publicUrl);
            }
            db.run(`UPDATE petty_cash_expenses SET foto_factura = ? WHERE id = ?`, [newUrls.join(','), row.id]);
        }
        console.log("Petty Cash migrated.");
    });
}

migrateAll();
