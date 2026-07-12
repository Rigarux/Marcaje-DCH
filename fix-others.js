const fs = require('fs');

function fixFile(file) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/currentUser\.rol === 'admin'/g, "(currentUser.rol === 'admin' || currentUser.rol === 'superadmin')");
    fs.writeFileSync(file, code);
}

fixFile('js/finances/ingresos.js');
fixFile('js/inventory/materiales.js');
fixFile('js/sales/cotizaciones.js');
