const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

db.run("UPDATE users SET frecuenciaPago = 'Quincenal' WHERE id = 8", (err) => {
    if (err) console.error(err);
    else console.log("User 8 updated to Quincenal");
});
