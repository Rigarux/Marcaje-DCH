const fs = require('fs');
const path = require('path');
let html = fs.readFileSync('d:/Marcaje DCH/index.html', 'utf8');

const viewsDir = 'd:/Marcaje DCH/views/';
const viewFiles = fs.readdirSync(viewsDir);

let count = 0;
for (const file of viewFiles) {
    if (file.endsWith('.html')) {
        const id = file.replace('.html', '');
        const content = fs.readFileSync(path.join(viewsDir, file), 'utf8');
        
        // Escape the regex string correctly without literal quotes breaking it
        const regex = new RegExp('<section id="' + id + '" class="role-view hidden">\\s*</section>', 'i');
        
        if (regex.test(html)) {
            html = html.replace(regex, '<section id="' + id + '" class="role-view hidden">\n' + content + '\n</section>');
            count++;
        } else {
            console.log('Could not find empty section for:', id);
        }
    }
}

fs.writeFileSync('d:/Marcaje DCH/index.html', html, 'utf8');
console.log('Injected ' + count + ' views back into index.html');
