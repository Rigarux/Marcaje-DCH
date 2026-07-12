const fs = require('fs');
let code = fs.readFileSync('js/users/gestion-usuarios.js', 'utf8');
code = code.replace(/u\.rol === 'admin'/g, "(u.rol === 'admin' || u.rol === 'superadmin')");
fs.writeFileSync('js/users/gestion-usuarios.js', code);
