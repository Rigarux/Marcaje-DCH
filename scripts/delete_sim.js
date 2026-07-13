const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT id FROM users WHERE nombre LIKE '%Bryan%' LIMIT 1", (err, user) => {
    if (err || !user) {
        console.error("User Bryan not found.");
        process.exit(1);
    }
    
    // We will delete all attendance records for Bryan that match this week's dates
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; 
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    
    const dates = [];
    for(let i=0; i<6; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
    }
    
    const placeholders = dates.map(() => '?').join(',');
    const query = `DELETE FROM attendance WHERE usuarioId = ? AND fecha IN (${placeholders})`;
    
    db.run(query, [user.id, ...dates], function(err) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Deleted ${this.changes} simulated attendance records for Bryan.`);
        
        // Also delete any "Séptimo Día" bonus that might have been added
        db.run(`DELETE FROM penalizations WHERE usuarioId = ? AND motivo = 'Séptimo Día'`, [user.id], function(err2) {
            if (err2) {
                console.error(err2);
                process.exit(1);
            }
            console.log(`Deleted ${this.changes} bonuses for Séptimo Día.`);
            process.exit(0);
        });
    });
});
