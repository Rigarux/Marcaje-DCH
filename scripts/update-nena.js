const sqlite3 = require('sqlite3').verbose();

function updateDb(path) {
    const db = new sqlite3.Database(path);
    db.run("UPDATE users SET rol = 'leader' WHERE username = 'nena'", (err) => {
        if(err) console.error("Error en", path, err);
        else console.log("Usuario 'nena' actualizado a leader en", path);
        db.close();
    });
}

updateDb('D:\\Marcaje DCH\\database.db');
updateDb('D:\\database.db');
