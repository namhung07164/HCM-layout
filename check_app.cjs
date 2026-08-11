const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
console.log("App has projectStatus state:", code.includes('projectStatus'));
