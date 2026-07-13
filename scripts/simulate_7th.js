const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT id, nombre, tarifaDiurna FROM users WHERE nombre LIKE '%Bryan%' LIMIT 1", (err, user) => {
    if (err || !user) {
        console.error("User Bryan not found.", err);
        process.exit(1);
    }
    
    console.log(`Found user: ${user.nombre} (ID: ${user.id}, Tarifa: ${user.tarifaDiurna})`);
    
    const tarifa = user.tarifaDiurna || 20; // default 20
    const today = new Date();
    // Go to monday of this week
    const dayOfWeek = today.getDay() || 7; 
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    
    const statements = [];
    
    for (let i = 0; i < 6; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // 8 hours per day, from 08:00 to 16:00
        const horaEntrada = "08:00:00";
        const horaSalida = "16:00:00";
        const horasDiurnas = 8;
        const horasNocturnas = 0;
        const horasTrabajadas = 8;
        const montoBruto = horasTrabajadas * tarifa;
        const descuento = 0;
        const montoNeto = montoBruto;
        
        statements.push(new Promise((resolve, reject) => {
            db.run(`INSERT INTO attendance 
                (usuarioId, fecha, horaEntrada, horaSalida, horasDiurnas, horasNocturnas, horasTrabajadas, montoBruto, descuento, montoNeto)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [user.id, dateStr, horaEntrada, horaSalida, horasDiurnas, horasNocturnas, horasTrabajadas, montoBruto, descuento, montoNeto],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        }));
    }
    
    Promise.all(statements).then(() => {
        console.log("6 days of 8 hours have been successfully added for Bryan.");
        process.exit(0);
    }).catch(err => {
        console.error("Error inserting records", err);
        process.exit(1);
    });
});
