const fs = require('fs');
const path = require('path');

function fixPath(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixPath(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix imports that got too many ../
      let newContent = content.replace(/from ['"]\.\.\/\.\.\/\.\.\//g, "from '../../");
      newContent = newContent.replace(/import ['"]\.\.\/\.\.\/\.\.\//g, "import '../../");
      
      // Fix App.jsx or similar that got ././
      newContent = newContent.replace(/\.\/\.\//g, "./");

      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Fixed path errors in ' + fullPath);
      }
    }
  }
}

fixPath(path.join(process.cwd(), 'src'));
