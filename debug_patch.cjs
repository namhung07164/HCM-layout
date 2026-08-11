const fs = require('fs');

let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldEffect = `  // AUTO-FILL BRAND NAMES FROM PROJECT STATUS
  React.useEffect(() => {
    if (!unitInfo.length || !projectStatus.length) return;
    
    let hasChanges = false;
    const updated = unitInfo.map(row => {
      if (row.unit && !row.brandName) {
         const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === row.unit.toLowerCase().trim());
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
            hasChanges = true;
            if (bestClassInfo && bestSim > 0.4) {
               return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
            } else {
               return { ...row, brandName: projName };
            }
         }
      }
      return row;
    });

    if (hasChanges) {
      setUnitInfo(updated);
    }
  }, [unitInfo, projectStatus, classInfo, setUnitInfo]);`;

const newEffect = `  // AUTO-FILL BRAND NAMES FROM PROJECT STATUS
  React.useEffect(() => {
    if (!unitInfo.length || !projectStatus.length) return;
    
    let hasChanges = false;
    console.group("UnitInfoTab Auto-fill Debugging (Effect)");
    const updated = unitInfo.map(row => {
      if (row.unit && !row.brandName) {
         console.log(\`Evaluating row with unit '\${row.unit}' (brandName is empty)\`);
         const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === row.unit.toLowerCase().trim());
         if (matchedProj) {
            console.log(\`Found matching project for unit '\${row.unit}':\`, matchedProj);
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
              hasChanges = true;
              if (bestClassInfo && bestSim > 0.4) {
                 console.log(\`-> Best class match: '\${bestClassInfo.brandName}' (similarity: \${bestSim})\`);
                 return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
              } else {
                 console.log(\`-> No sufficient class match. Using projName: '\${projName}'\`);
                 return { ...row, brandName: projName };
              }
            } else {
               console.log(\`-> Matched project has no projectName.\`);
            }
         } else {
            console.log(\`No matching project found for unit '\${row.unit}' in projectStatus dataset.\`);
         }
      }
      return row;
    });
    console.groupEnd();

    if (hasChanges) {
      setUnitInfo(updated);
    }
  }, [unitInfo, projectStatus, classInfo, setUnitInfo]);`;

code = code.replace(oldEffect, newEffect);

const oldCommit = `          // AUTOFILL BRAND NAME LOGIC
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
              
              // First take project name, then if we find a good match in classInfo, use that instead.
              if (bestClassInfo && bestSim > 0.4) {
                 bestBrandMatch = bestClassInfo.brandName;
                 bestBrandCode = bestClassInfo.brandCode;
              } else {
                 bestBrandMatch = projName;
              }
            }
          }`;

const newCommit = `          // AUTOFILL BRAND NAME LOGIC
          let bestBrandMatch = row.brandName;
          let bestBrandCode = row.brandCode;
          
          console.group(\`commitUnit Auto-fill Debugging (\${finalUnitName})\`);
          if (finalUnitName && !row.brandName) { // ONLY IF EMPTY
            console.log(\`Looking for project match for unit '\${finalUnitName}'\`);
            const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === finalUnitName.toLowerCase().trim());
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
          console.groupEnd();`;

code = code.replace(oldCommit, newCommit);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched');
