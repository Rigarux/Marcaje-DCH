const fs = require('fs');
let code = fs.readFileSync('js/finances/admin-finanzas.js', 'utf8');
code = code.replace(/currentUser\.rol === 'admin'/g, "(currentUser.rol === 'admin' || currentUser.rol === 'superadmin')");
fs.writeFileSync('js/finances/admin-finanzas.js', code);
