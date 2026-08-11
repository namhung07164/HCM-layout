const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

// Relax the check for empty brand name
code = code.replace(/!row\.brandName/g, "(!row.brandName || row.brandName.trim() === '' || row.brandName === '-')");

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched 3');
