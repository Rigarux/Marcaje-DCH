
const fs = require('fs');
const path = require('path');
function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if (file === 'node_modules' || file === '.git' || file === '.gemini') return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else {
            if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}
const files = walkDir('d:/Marcaje DCH');

const replacements = [
    // Double misencodings
    [/Vehículos/g, 'Vehículos'],
    [/Vehículo/g, 'Vehículo'],
    [/vehículos/g, 'vehículos'],
    [/vehículo/g, 'vehículo'],
    [/Préstamos/g, 'Préstamos'],
    [/Préstamo/g, 'Préstamo'],
    [/préstamos/g, 'préstamos'],
    [/préstamo/g, 'préstamo'],
    [/Da/g, 'Da'],
    [/da/g, 'da'],
    [/Asignación/g, 'Asignación'],
    [/asignación/g, 'asignación'],
    [/Gestión/g, 'Gestión'],
    [/gestión/g, 'gestión'],
    [/Cotización/g, 'Cotización'],
    [/cotización/g, 'cotización'],
    [/Revisión/g, 'Revisión'],
    [/Atención/g, 'Atención'],
    [/Éxito/g, 'ÉÉxito'],
    [/Estás/g, 'Estás'],
    [/seguro/g, 'seguro'],
    [/Añadir/g, 'Añadir'],
    [/añadir/g, 'añadir'],
    // ǟ corruptions
    [/Vehículos/g, 'Vehículos'],
    [/vehículos/g, 'vehículos'],
    [/Préstamos/g, 'Préstamos'],
    [/préstamos/g, 'préstamos'],
    [/Asignación/g, 'Asignación'],
    [/Gestión/g, 'Gestión'],
    //  replacements dynamically targeting specific words since  is just a replacement char
    [/Vehículos/g, 'Vehículos'],
    [/vehículos/g, 'vehículos'],
    [/Préstamos/g, 'Préstamos'],
    [/préstamos/g, 'préstamos'],
    [/Gestión/g, 'Gestión'],
    [/gestión/g, 'gestión'],
    [/Cotización/g, 'Cotización'],
    [/cotización/g, 'cotización'],
    [/Asignación/g, 'Asignación'],
    [/Da/g, 'Da'],
    [/da/g, 'da'],
    [/Módulo/g, 'Módulo'],
    [/módulo/g, 'módulo'],
    [/Contraseña/g, 'Contraseña'],
    [/contraseña/g, 'contraseña'],
    [/Configuración/g, 'Configuración'],
    [/configuración/g, 'configuración'],
    [/Acción/g, 'Acción'],
    [/acción/g, 'acción'],
    [/Información/g, 'Información'],
    [/información/g, 'información'],
    [/Bsqueda/g, 'Búsqueda'],
    [/bsqueda/g, 'búsqueda']
];

let changedFiles = 0;
files.forEach(file => {
    let original = fs.readFileSync(file, 'utf8');
    let modified = original;
    replacements.forEach(r => {
        modified = modified.replace(r[0], r[1]);
    });
    if (original !== modified) {
        fs.writeFileSync(file, modified, 'utf8');
        console.log('Fixed:', file);
        changedFiles++;
    }
});
console.log('Total fixed:', changedFiles);

