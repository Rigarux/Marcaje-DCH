const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.db');
db.all("SELECT * FROM materials ORDER BY id DESC LIMIT 5;", (err, rows) => console.log(rows));
