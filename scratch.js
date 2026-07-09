const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
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

const targetDirs = [
    path.join(__dirname, 'js'),
    path.join(__dirname, 'routes'),
    path.join(__dirname, 'config')
];

let files = [];
targetDirs.forEach(dir => {
    files = files.concat(walkDir(dir));
});
files.push(path.join(__dirname, 'index.html'));
files.push(path.join(__dirname, 'styles.css'));

const replacements = [
    [/Ventaes/g, 'Ventas'],
    [/VentaES/g, 'VENTAS'],
    [/ventaes/g, 'ventas'],
    [/Ventae /g, 'Venta '],
    [/eÉxitosamente/g, 'exitosamente']
];

let changedFiles = 0;
files.forEach(file => {
    if (!fs.existsSync(file)) return;
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
console.log('Total files fixed:', changedFiles);
