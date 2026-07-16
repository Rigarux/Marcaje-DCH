const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run("ALTER TABLE payroll_cuts ADD COLUMN empresa TEXT DEFAULT 'DCH'", (err) => {
        if (err && !err.message.includes('duplicate column')) console.error("Error adding column:", err);
        else console.log("Added empresa column to payroll_cuts");
    });
    db.run("UPDATE payroll_cuts SET empresa = 'DCH' WHERE empresa IS NULL", (err) => {
        if (err) console.error("Error updating existing cuts:", err);
        else console.log("Updated existing cuts to DCH");
    });
});
