const fs = require('fs');
let code = fs.readFileSync('js/views/vista-lider.js', 'utf8');
code = code.replace(/currentUser\.rol === 'admin'/g, "(currentUser.rol === 'admin' || currentUser.rol === 'superadmin')");
fs.writeFileSync('js/views/vista-lider.js', code);
