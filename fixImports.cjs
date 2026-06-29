const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
}

const files = walkSync('src');

files.forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('useShallow(') && !content.includes("zustand/react/shallow")) {
        content = `import { useShallow } from 'zustand/react/shallow';\n` + content;
        fs.writeFileSync(file, content);
        console.log(`Fixed ${file}`);
    }
  }
});
