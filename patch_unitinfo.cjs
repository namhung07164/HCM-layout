const fs = require('fs');

let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

// Insert the similarity function if not exists
if (!code.includes('function stringSimilarity(')) {
    const simFunc = `
function stringSimilarity(s1: string, s2: string) {
  const a = (s1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = (s2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b) return 1;
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) {
     return 0.8 + (Math.min(a.length, b.length) / Math.max(a.length, b.length)) * 0.1;
  }
  let costs = new Array();
  for (let i = 0; i <= a.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= b.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (a.charAt(i - 1) != b.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[b.length] = lastValue;
  }
  const maxLen = Math.max(a.length, b.length);
  return (maxLen - costs[b.length]) / maxLen;
}
`;
    code = code.replace(/export default function UnitInfoTab\(\) \{/, simFunc + '\nexport default function UnitInfoTab() {');
}

// Find where commitUnit adds brandName logic
const oldLogic = `          if (dataIndex > -1) {
            const newRow = { ...row, unit: finalUnitName };
            if (infoToApply) {
              newRow.floor = infoToApply.floor;
              newRow.size = String(infoToApply.size);
            }
            newUnitInfo[dataIndex] = newRow;
            handleDataChangeRef.current(newUnitInfo);
          } else {
            if (infoToApply) {
              updateRow({
                ...row,
                unit: finalUnitName,
                floor: infoToApply.floor,
                size: String(infoToApply.size),
              });
            } else {
              updateRow({ ...row, unit: finalUnitName });
            }
          }`;

const newLogic = `          // AUTOFILL BRAND NAME LOGIC
          let bestBrandMatch = row.brandName;
          let bestBrandCode = row.brandCode;
          
          if (finalUnitName) {
            const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === finalUnitName.toLowerCase().trim());
            if (matchedProj && matchedProj.projectName) {
              const projName = matchedProj.projectName;
              let bestSim = 0;
              let bestClassInfo = null;
              classInfo.forEach(ci => {
                 if (ci.brandName) {
                   const sim = stringSimilarity(projName, ci.brandName);
                   if (sim > bestSim) {
                     bestSim = sim;
                     bestClassInfo = ci;
                   }
                 }
              });
              if (bestClassInfo && bestSim > 0.4) { // Minimum similarity threshold
                 bestBrandMatch = bestClassInfo.brandName;
                 bestBrandCode = bestClassInfo.brandCode;
              } else if (!bestBrandMatch && projName) {
                 bestBrandMatch = projName;
              }
            }
          }

          if (dataIndex > -1) {
            const newRow = { ...row, unit: finalUnitName };
            if (infoToApply) {
              newRow.floor = infoToApply.floor;
              newRow.size = String(infoToApply.size);
            }
            if (bestBrandMatch) newRow.brandName = bestBrandMatch;
            if (bestBrandCode) newRow.brandCode = bestBrandCode;
            
            newUnitInfo[dataIndex] = newRow;
            handleDataChangeRef.current(newUnitInfo);
          } else {
            const updatePayload: any = { ...row, unit: finalUnitName };
            if (infoToApply) {
              updatePayload.floor = infoToApply.floor;
              updatePayload.size = String(infoToApply.size);
            }
            if (bestBrandMatch) updatePayload.brandName = bestBrandMatch;
            if (bestBrandCode) updatePayload.brandCode = bestBrandCode;
            
            updateRow(updatePayload);
          }`;

code = code.split(oldLogic).join(newLogic);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched');
