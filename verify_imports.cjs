const fs = require('fs');
const path = require('path');
function checkImports(dir, depth) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkImports(fullPath, depth + 1);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import ') && lines[i].includes('from') && lines[i].includes('../')) {
           const match = lines[i].match(/from ['"](.*?)['"]/);
           if (match) {
             const importPath = match[1];
             const resolved = path.resolve(dir, importPath);
             if (!fs.existsSync(resolved) && !fs.existsSync(resolved + '.jsx') && !fs.existsSync(resolved + '.js') && !fs.existsSync(resolved + '.css') && !fs.existsSync(resolved + '/index.js')) {
               console.log('BROKEN IMPORT IN: ' + fullPath);
               console.log('Line: ' + lines[i]);
             }
           }
        }
        // Check for CSS imports
        if (lines[i].includes('import ') && lines[i].includes('.css') && lines[i].includes('../')) {
           const match = lines[i].match(/import ['"](.*?)['"]/);
           if (match) {
             const importPath = match[1];
             const resolved = path.resolve(dir, importPath);
             if (!fs.existsSync(resolved)) {
               console.log('BROKEN CSS IMPORT IN: ' + fullPath);
               console.log('Line: ' + lines[i]);
             }
           }
        }
      }
    }
  }
}
checkImports(path.join(process.cwd(), 'src'), 0);
