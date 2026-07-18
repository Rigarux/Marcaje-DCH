const db = require('./config/db.js');
db.dbAll("SELECT * FROM users WHERE username LIKE '%nena%' OR nombre LIKE '%nena%'").then(users => {
    console.log(users);
    process.exit(0);
});
