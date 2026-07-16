const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');
db.run("UPDATE projects SET empresa = 'DCH'", (err) => {
    if (err) console.error(err);
    else console.log('Proyectos actualizados a DCH exitosamente');
});
