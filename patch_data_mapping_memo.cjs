const fs = require('fs');

const files = [
  'src/components/DataMapping/DynamicHierarchyTab.tsx',
  'src/components/DataMapping/ReviewTab.tsx',
  'src/components/DataMapping/ReviewOnlyView.tsx',
  'src/components/DataMapping/EditTab.tsx',
  'src/components/DataMapping/HierarchyTab.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('export default function') && !code.includes('React.memo(')) {
     code = code.replace(/export default function ([A-Za-z0-9_]+)\(([^)]*)\) \{/, 'export default React.memo(function $1($2) {');
     
     if (code.includes('export default React.memo')) {
       if (!code.includes('import React')) {
         code = 'import React from "react";\n' + code;
       }
       
       const lastBraceIdx = code.lastIndexOf('}');
       code = code.substring(0, lastBraceIdx + 1) + ');\n' + code.substring(lastBraceIdx + 1);
       fs.writeFileSync(file, code);
       console.log('patched ' + file);
     }
  }
});
