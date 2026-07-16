const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Running migration to add empresa to petty_cash_funds...');
    
    db.run('ALTER TABLE petty_cash_funds ADD COLUMN empresa TEXT', (err) => {
        if (err) {
            console.error('Error altering petty_cash_funds table (might already exist):', err.message);
        } else {
            console.log('Successfully added empresa to petty_cash_funds.');
        }
    });

    db.run("UPDATE petty_cash_funds SET empresa = 'DCH'", (err) => {
        if (err) console.error(err);
        else console.log('Successfully updated all existing petty_cash_funds to DCH.');
    });
});

db.close(() => {
    console.log('Migration finished.');
});
