const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    // Add descansoFechas
    db.run("ALTER TABLE users ADD COLUMN descansoFechas TEXT DEFAULT NULL", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding descansoFechas:", err.message);
        else console.log("descansoFechas added");
    });
});
