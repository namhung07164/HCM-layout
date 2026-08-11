const fs = require('fs');

const files = [
  'src/components/MDStatusTab.tsx',
  'src/components/DailySalesProfitTab.tsx',
  'src/components/AllSubFeeTab.tsx',
  'src/components/ActualClassInfoTab.tsx',
  'src/components/SalesTab.tsx',
  'src/components/ProjectStatusTab.tsx',
  'src/components/ClassInfoTab.tsx',
  'src/components/ProjectLinkTab.tsx',
  'src/components/BasePlanTab.tsx',
  'src/components/ProfitTab.tsx',
  'src/components/UnitsTab.tsx',
  'src/components/UnitInfoTab.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('export default function') && !code.includes('React.memo(')) {
     code = code.replace(/export default function ([A-Za-z0-9_]+)\(([^)]*)\) \{/, 'export default React.memo(function $1($2) {');
     // add closing parenthesis at the end
     if (code.includes('export default React.memo')) {
       // but wait, is React imported?
       if (!code.includes('import React')) {
         code = 'import React from "react";\n' + code;
       }
       
       // find the last closing brace
       const lastBraceIdx = code.lastIndexOf('}');
       code = code.substring(0, lastBraceIdx + 1) + ');\n' + code.substring(lastBraceIdx + 1);
       fs.writeFileSync(file, code);
       console.log('patched ' + file);
     }
  }
});
