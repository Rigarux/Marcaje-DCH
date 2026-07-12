const fs = require('fs');
let code = fs.readFileSync('js/views/vista-admin.js', 'utf8');
code = code.replace(/currentUser\.rol === 'admin'/g, "(currentUser.rol === 'admin' || currentUser.rol === 'superadmin')");
fs.writeFileSync('js/views/vista-admin.js', code);
