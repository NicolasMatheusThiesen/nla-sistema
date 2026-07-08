const fs = require('fs');
const path = require('path');
const dir = './src/routes';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.ts')) {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    content = content.replace(/\{ error: err\.errors \}/g, '{ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") }');
    fs.writeFileSync(path.join(dir, file), content);
  }
});
console.log('Replaced error handling');
