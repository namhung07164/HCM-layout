const fs = require('fs');

const files = [
  'src/components/DataMapping/DynamicHierarchyTab.tsx',
  'src/components/DataMapping/ReviewTab.tsx',
  'src/components/DataMapping/ReviewOnlyView.tsx',
  'src/components/DataMapping/EditTab.tsx',
  'src/components/DataMapping/HierarchyTab.tsx',
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
  
  // First, check if it was broken by the previous script
  if (code.includes('export default React.memo(function')) {
      code = code.replace(/export default React\.memo\(function ([A-Za-z0-9_]+)\(([^)]*)\) \{/, 'export default function $1($2) {');
      const badIdx = code.lastIndexOf(');\n');
      if (badIdx > code.length - 10) {
         code = code.slice(0, badIdx) + '\n' + code.slice(badIdx + 3);
      }
  }

  // Now properly wrap it using the export default React.memo(XYZ) pattern at the end
  const match = code.match(/export default function ([A-Za-z0-9_]+)\(([^)]*)\) \{/);
  if (match) {
      const funcName = match[1];
      code = code.replace(match[0], \`function \${funcName}(\${match[2]}) {\`);
      
      if (!code.includes('import React')) {
         code = 'import React from "react";\n' + code;
      }
      
      code += \`\nexport default React.memo(\${funcName});\n\`;
      fs.writeFileSync(file, code);
      console.log('Fixed and safely memoized ' + file);
  }
});
