const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Running migration to add empresa to vehicles and projects...');
    
    db.run('ALTER TABLE vehicles ADD COLUMN empresa TEXT', (err) => {
        if (err) {
            console.error('Error altering vehicles table (might already exist):', err.message);
        } else {
            console.log('Successfully added empresa to vehicles.');
        }
    });

    db.run('ALTER TABLE projects ADD COLUMN empresa TEXT', (err) => {
        if (err) {
            console.error('Error altering projects table (might already exist):', err.message);
        } else {
            console.log('Successfully added empresa to projects.');
        }
    });

    db.run("UPDATE vehicles SET empresa = 'EFECTIVO YA' WHERE empresa IS NULL", (err) => {
        if (!err) console.log('Updated existing vehicles to default empresa EFECTIVO YA');
    });
    db.run("UPDATE projects SET empresa = 'EFECTIVO YA' WHERE empresa IS NULL", (err) => {
        if (!err) console.log('Updated existing projects to default empresa EFECTIVO YA');
    });
});

db.close(() => {
    console.log('Migration finished.');
});
