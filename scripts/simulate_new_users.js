const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

async function run() {
    const findUser = (query) => new Promise((res, rej) => {
        db.get(query, (err, row) => err ? rej(err) : res(row));
    });

    try {
        // Find one user "Por Horas" and "Quincenal"
        let userQuincenal = await findUser("SELECT id, nombre, tarifaDiurna, frecuenciaPago FROM users WHERE tipoPago = 'Por Horas' AND frecuenciaPago = 'Quincenal' LIMIT 1");
        
        // Find one user "Por Horas" and "Semanal" (or anything else)
        let userSemanal = await findUser("SELECT id, nombre, tarifaDiurna, frecuenciaPago FROM users WHERE tipoPago = 'Por Horas' AND frecuenciaPago != 'Quincenal' LIMIT 1");
        
        if (!userQuincenal || !userSemanal) {
            console.log("Could not find both users exactly matching criteria, using whatever 'Por Horas' users exist.");
            const both = await new Promise((res, rej) => {
                db.all("SELECT id, nombre, tarifaDiurna, frecuenciaPago FROM users WHERE tipoPago = 'Por Horas' LIMIT 2", (err, rows) => err ? rej(err) : res(rows));
            });
            userQuincenal = both[0];
            userSemanal = both[1];
        }
        
        const usersToSimulate = [userQuincenal, userSemanal].filter(Boolean);
        
        const today = new Date();
        const dayOfWeek = today.getDay() || 7; 
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);
        
        const statements = [];
        
        for (const user of usersToSimulate) {
            console.log(`Simulating for: ${user.nombre} (${user.frecuenciaPago}), ID: ${user.id}`);
            
            // 4 days, 12 hours each (08:00 to 20:00)
            for (let i = 0; i < 4; i++) {
                const currentDate = new Date(monday);
                currentDate.setDate(monday.getDate() + i);
                const dateStr = currentDate.toISOString().split('T')[0];
                
                const tarifa = user.tarifaDiurna || 20;
                const horaEntrada = "08:00:00";
                const horaSalida = "20:00:00";
                const horasDiurnas = 12; // Just assuming all diurnal for the sim
                const horasNocturnas = 0;
                const horasTrabajadas = 12;
                const montoBruto = horasTrabajadas * tarifa;
                
                statements.push(new Promise((resolve, reject) => {
                    db.run(`INSERT INTO attendance 
                        (usuarioId, fecha, horaEntrada, horaSalida, horasDiurnas, horasNocturnas, horasTrabajadas, montoBruto, descuento, montoNeto)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [user.id, dateStr, horaEntrada, horaSalida, horasDiurnas, horasNocturnas, horasTrabajadas, montoBruto, 0, montoBruto],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                }));
            }
        }
        
        await Promise.all(statements);
        console.log("Simulation complete! Check the UI.");
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
