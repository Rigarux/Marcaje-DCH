const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('d:/Marcaje DCH/database.db');

db.run('DELETE FROM companies WHERE name IN (?, ?)', ['Empresa A', 'Empresa B'], function(err) {
    if (err) {
        console.error(err);
    } else {
        console.log(`Borrados ${this.changes} registros.`);
    }
    db.close();
});
