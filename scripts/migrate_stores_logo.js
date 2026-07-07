const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err);
        process.exit(1);
    }
});

db.serialize(() => {
    db.run("ALTER TABLE stores ADD COLUMN logo_url TEXT", (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("Column logo_url already exists in stores table.");
            } else {
                console.error("Error adding column logo_url:", err);
            }
        } else {
            console.log("Successfully added logo_url column to stores table.");
        }
    });
});

db.close();
