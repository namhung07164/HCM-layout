const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const targetStart = code.indexOf('          // AUTOFILL BRAND NAME LOGIC');
const targetEnd = code.indexOf('updateRow(updatePayload);', targetStart) + 'updateRow(updatePayload);\n          }'.length;

if (targetStart === -1 || targetEnd < targetStart) {
   console.log('Could not find target');
   process.exit(1);
}

const newCommitBlock = `          if (dataIndex > -1) {
            let newRow = { ...row, unit: finalUnitName };
            if (infoToApply) {
              newRow.floor = infoToApply.floor;
              newRow.size = String(infoToApply.size);
            }
            
            newRow = autofillBrandName(newRow, finalUnitName);
               
            newUnitInfo[dataIndex] = newRow;
            handleDataChangeRef.current(newUnitInfo);
          } else {
            let updatePayload: any = { ...row, unit: finalUnitName };
            if (infoToApply) {
              updatePayload.floor = infoToApply.floor;
              updatePayload.size = String(infoToApply.size);
            }
            
            updatePayload = autofillBrandName(updatePayload, finalUnitName);
               
            updateRow(updatePayload);
          }`;

code = code.slice(0, targetStart) + newCommitBlock + code.slice(targetEnd);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched commit fix');
