const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

if (!code.includes('projectStatus: state.projectStatus')) {
  code = code.replace('units: state.units,', 'units: state.units,\n    projectStatus: state.projectStatus,');
  code = code.replace('unitInfo, setUnitInfo, units, classInfo', 'unitInfo, setUnitInfo, units, classInfo, projectStatus');
}

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
