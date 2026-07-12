const fs = require('fs');
let code = fs.readFileSync('js/views/vista-usuario.js', 'utf8');
code = code.replace(/user\.rol === 'admin'/g, "(user.rol === 'admin' || user.rol === 'superadmin')");
code = code.replace(/loggedInUser\.rol === 'admin'/g, "(loggedInUser.rol === 'admin' || loggedInUser.rol === 'superadmin')");
fs.writeFileSync('js/views/vista-usuario.js', code);
