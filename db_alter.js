const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    // Add columns to attendance table
    const columns = [
        "ALTER TABLE attendance ADD COLUMN fotoEntrada TEXT DEFAULT NULL;",
        "ALTER TABLE attendance ADD COLUMN trabajoDescripcion TEXT DEFAULT NULL;",
        "ALTER TABLE attendance ADD COLUMN trabajoCantidad INTEGER DEFAULT 0;",
        "ALTER TABLE attendance ADD COLUMN fotoAntes TEXT DEFAULT NULL;",
        "ALTER TABLE attendance ADD COLUMN fotoDespues TEXT DEFAULT NULL;"
    ];

    columns.forEach(col => {
        db.run(col, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log("Column already exists, skipping...");
                } else {
                    console.error("Error adding column:", err.message);
                }
            } else {
                console.log("Column added successfully.");
            }
        });
    });
});
