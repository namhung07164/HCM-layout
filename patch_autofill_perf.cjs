const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

// Find the autofillBrandName declaration
const oldAutofill = `  const autofillBrandName = (row: UnitInfo, targetUnit: string): UnitInfo => {
      const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(targetUnit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(targetUnit)));
      const projName = matchedProj?.projectName?.trim();`;

// Wait, autofillBrandName is defined inside UnitInfoTab component.
// We can use a useMemo to build the project map.

code = code.replace(oldAutofill, `  const projectStatusMap = React.useMemo(() => {
    const map = new Map<string, string>();
    projectStatus.forEach(p => {
       if (p.projectName) {
          if (p.unit) map.set(normalizeUnit(p.unit), p.projectName.trim());
          if (p.unitLink) map.set(normalizeUnit(p.unitLink), p.projectName.trim());
       }
    });
    return map;
  }, [projectStatus]);

  const classInfoMatches = React.useMemo(() => {
     // Pre-calculate similarities for known project names? Too complex. We'll just optimize projectStatusMap.
     return new Map();
  }, []);

  const autofillBrandName = (row: UnitInfo, targetUnit: string): UnitInfo => {
      const normalizedTarget = normalizeUnit(targetUnit);
      const projName = projectStatusMap.get(normalizedTarget);`);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched autofillBrandName perf');
