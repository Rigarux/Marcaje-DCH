const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./js', function(filePath) {
  if (filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /\$\{([a-zA-Z0-9_]+)\.fecha\}/g;
    
    let newContent = content.replace(regex, (match, p1) => {
        return '${typeof formatDateDDMMYYYY === \'function\' ? formatDateDDMMYYYY(' + p1 + '.fecha) : ' + p1 + '.fecha}';
    });

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated', filePath);
    }
  }
});
