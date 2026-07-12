const fs = require('fs');
const content = fs.readFileSync('d:/Marcaje DCH/server.js', 'utf8');
const lines = content.split('\n');
const routes = lines.filter(line => line.includes('app.') && (line.includes('get') || line.includes('post') || line.includes('put') || line.includes('delete')));
console.log(routes.join('\n'));
