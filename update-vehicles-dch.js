const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
db.run("UPDATE vehicles SET empresa = 'DCH'", (err) => {
    if (err) console.error(err);
    else console.log('Successfully updated all vehicles to DCH');
});
