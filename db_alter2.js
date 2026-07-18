const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    // Modify danielch
    db.run("UPDATE users SET rol = 'superadmin' WHERE username = 'danielch'", (err) => {
        if (err) console.error("Error updating danielch:", err.message);
        else console.log("Danielch updated to superadmin");
    });

    // Add fechaIngreso
    db.run("ALTER TABLE users ADD COLUMN fechaIngreso TEXT DEFAULT NULL", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding fechaIngreso:", err.message);
        else console.log("fechaIngreso added");
    });
    
    // Set fechaIngreso to today for users where it is null
    const today = new Date().toISOString().split('T')[0];
    db.run("UPDATE users SET fechaIngreso = ? WHERE fechaIngreso IS NULL", [today], (err) => {
        if (err) console.error("Error updating fechaIngreso:", err.message);
        else console.log("fechaIngreso set to today for existing users");
    });
});
