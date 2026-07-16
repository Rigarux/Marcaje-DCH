const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');
db.all("SELECT nombre, username, password, pin FROM users WHERE username LIKE '%rocio%' OR nombre LIKE '%rocio%'", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});
