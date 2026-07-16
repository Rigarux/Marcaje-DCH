const sqlite3 = require('sqlite3').verbose();

const activeDbPath = 'd:/Marcaje DCH/database.db';
const sourceDbPath = 'D:/database.db';

const activeDb = new sqlite3.Database(activeDbPath);

const tablesToSync = [
    'users', 
    'attendance', 
    'bus_records', 
    'projects', 
    'project_expenses', 
    'global_incomes', 
    'loans', 
    'payroll_cuts'
];

async function run() {
    console.log("Iniciando migración...");

    // Attach source DB
    await new Promise((resolve, reject) => {
        activeDb.run(`ATTACH DATABASE ? AS source`, [sourceDbPath], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    console.log("Base de datos conectada. Fusionando tablas...");

    for (const table of tablesToSync) {
        try {
            // Get columns from source table
            const cols = await new Promise((resolve, reject) => {
                activeDb.all(`PRAGMA source.table_info(${table})`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(r => r.name));
                });
            });

            if (cols.length === 0) {
                console.log(`Tabla ${table} no existe en la base fuente, omitiendo.`);
                continue;
            }

            const columnsStr = cols.join(', ');
            
            // Insert records from source that don't exist in active (by primary key 'id')
            const result = await new Promise((resolve, reject) => {
                activeDb.run(`
                    INSERT OR IGNORE INTO main.${table} (${columnsStr}) 
                    SELECT ${columnsStr} FROM source.${table}
                `, [], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });

            console.log(`✅ ${table}: ${result} registros nuevos importados.`);
        } catch (e) {
            console.error(`❌ Error migrando tabla ${table}: ${e.message}`);
        }
    }

    console.log("Sincronizando actualizaciones de usuarios...");
    try {
        // Para asegurar que cualquier contraseña o dato modificado de usuarios que ya existían se actualice, 
        // pero respetando las columnas nuevas (vacaciones)
        const userCols = await new Promise((resolve, reject) => {
            activeDb.all(`PRAGMA source.table_info(users)`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => r.name).filter(n => n !== 'id'));
            });
        });
        
        let setClauses = userCols.map(c => `${c} = (SELECT ${c} FROM source.users WHERE source.users.id = main.users.id)`).join(', ');
        
        const updateResult = await new Promise((resolve, reject) => {
            activeDb.run(`
                UPDATE main.users 
                SET ${setClauses}
                WHERE id IN (SELECT id FROM source.users)
            `, [], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`✅ users: ${updateResult} registros actualizados.`);
    } catch (e) {
        console.error(`❌ Error actualizando usuarios: ${e.message}`);
    }

    await new Promise(resolve => activeDb.run(`DETACH DATABASE source`, resolve));
    activeDb.close();
    console.log("Migración finalizada con éxito.");
}

run();
