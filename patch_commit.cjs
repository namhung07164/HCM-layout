const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldCommit = `          // AUTOFILL BRAND NAME LOGIC
          let bestBrandMatch = row.brandName;
          let bestBrandCode = row.brandCode;
          
          console.group(\`commitUnit Auto-fill Debugging (\${finalUnitName})\`);
          if (finalUnitName && (!row.brandName || row.brandName.trim() === '' || row.brandName === '-')) { // ONLY IF EMPTY
            console.log(\`Looking for project match for unit '\${finalUnitName}'\`);
            const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(finalUnitName) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(finalUnitName)));
            if (matchedProj) {
               console.log(\`Found matching project:\`, matchedProj);
               if (matchedProj.projectName) {
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
                 
                 // First take project name, then if we find a good match in classInfo, use that instead.
                 if (bestClassInfo && bestSim > 0.4) {
                    console.log(\`-> Best class match: '\${bestClassInfo.brandName}' (similarity: \${bestSim})\`);
                    bestBrandMatch = bestClassInfo.brandName;
                    bestBrandCode = bestClassInfo.brandCode;
                 } else {
                    console.log(\`-> No sufficient class match. Using projName: '\${projName}'\`);
                    bestBrandMatch = projName;
                 }
               }
            } else {
               console.log(\`No matching project found.\`);
            }
          } else {
            console.log(\`Skipping project status autofill. finalUnitName: '\${finalUnitName}', row.brandName: '\${row.brandName}'\`);
          }
          console.groupEnd();

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

const newCommit = `          if (dataIndex > -1) {
            let newRow = { ...row, unit: finalUnitName };
            if (infoToApply) {
              newRow.floor = infoToApply.floor;
              newRow.size = String(infoToApply.size);
            }
            
            // AUTOFILL BRAND NAME LOGIC
            newRow = autofillBrandName(newRow, finalUnitName);
               
            newUnitInfo[dataIndex] = newRow;
            handleDataChangeRef.current(newUnitInfo);
          } else {
            let updatePayload: any = { ...row, unit: finalUnitName };
            if (infoToApply) {
              updatePayload.floor = infoToApply.floor;
              updatePayload.size = String(infoToApply.size);
            }
            
            // AUTOFILL BRAND NAME LOGIC
            updatePayload = autofillBrandName(updatePayload, finalUnitName);
               
            updateRow(updatePayload);
          }`;

code = code.replace(oldCommit, newCommit);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched commitUnit');
