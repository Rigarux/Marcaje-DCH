const fs = require('fs');
let code = fs.readFileSync('js/users/gestion-usuarios.js', 'utf8');
code = code.replace(/currentUser\.rol === 'admin'/g, "(currentUser.rol === 'admin' || currentUser.rol === 'superadmin')");
fs.writeFileSync('js/users/gestion-usuarios.js', code);
