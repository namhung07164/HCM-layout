const fs = require('fs');

let content = fs.readFileSync('src/DataContext.tsx', 'utf8');
content = content.replace(/}\)\)\);/g, "})) });");
content = content.replace(/}\) }\);/g, "})) });"); // in case the previous script ran
fs.writeFileSync('src/DataContext.tsx', content);
