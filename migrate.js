const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');
db.serialize(() => {
    db.run("UPDATE users SET empresa = 'DCH' WHERE empresa = 'N/A' OR empresa = 'servicios 1' COLLATE NOCASE", (err) => {
        if(err) console.error(err); else console.log('Users updated.');
    });
    db.run("UPDATE users SET grupo = 'DCH' WHERE grupo = 'N/A' OR grupo = 'servicios 1' COLLATE NOCASE", (err) => {
        if(err) console.error(err); else console.log('Groups updated.');
    });
});
