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
  if (code.includes('export default React.memo(function')) {
      // Revert the export line
      code = code.replace(/export default React\.memo\(function ([A-Za-z0-9_]+)\(([^)]*)\) \{/, 'export default function $1($2) {');
      
      // Revert the closing parenthesis
      if (code.endsWith(');\n')) {
          code = code.slice(0, -3) + '\n';
      }
      fs.writeFileSync(file, code);
      console.log('reverted ' + file);
  }
});
