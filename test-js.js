const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = '<!DOCTYPE html><html><body><form id="login-form"></form><input id="username"><input id="password"></body></html>';
const dom = new JSDOM(html, { runScripts: 'dangerously' });
dom.window.localStorage = { getItem: () => null, setItem: () => null };
dom.window.sessionStorage = { getItem: () => null, setItem: () => null };
const code = fs.readFileSync('d:\\Marcaje DCH\\js\\core\\app-core.js', 'utf8');
try {
  dom.window.eval(code);
  console.log('Evaluated app-core.js successfully');
} catch (e) {
  console.error('Error evaluating app-core.js:', e);
}
