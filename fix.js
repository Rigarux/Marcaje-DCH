const fs = require('fs');
let code = fs.readFileSync('js/core/app-core.js', 'utf8');
code = code.replace(/currentUser\.rol === 'admin'/g, "(currentUser.rol === 'admin' || currentUser.rol === 'superadmin')");
fs.writeFileSync('js/core/app-core.js', code);
