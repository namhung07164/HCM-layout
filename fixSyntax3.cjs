const fs = require('fs');

let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace(/}\)\)\);/g, "}) });");

fs.writeFileSync('src/DataContext.tsx', content);
