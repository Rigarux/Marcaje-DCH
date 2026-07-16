const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');
db.run("UPDATE petty_cash_funds SET empresa = 'DCH' WHERE empresa IS NULL OR empresa = 'Efectivo ya' OR empresa = 'N/A'", (err) => {
    if (err) console.error(err);
    else console.log('Petty cash funds actualizados a DCH exitosamente');
});
