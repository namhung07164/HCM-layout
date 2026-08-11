const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const oldClassCodeCell = `      return (
        <AutocompleteCell
          value={val}
          onChange={(newVal) => {
            const found = classInfo.find((c) => c.brandCode === newVal);
            if (found) {
              updateRow({
                ...row,
                brandCode: found.brandCode,
                brandName: found.brandName,
                vendorCode: found.vendorCode || row.vendorCode,
                classCode: found.classCode || row.classCode,
              });
            } else {
              updateRow({ ...row, brandCode: newVal });
            }
          }}
          onSelect={(selectedClass) => {
            updateRow({
              ...row,
              brandCode: selectedClass.brandCode,
              brandName: selectedClass.brandName,
              vendorCode: selectedClass.vendorCode || row.vendorCode,
              classCode: selectedClass.classCode || row.classCode,
            });
          }}
          options={options}
          minChars={4}
          isLocked={isLocked || !!row.locked}
        />
      );`;

const newClassCodeCell = `      return (
        <AutocompleteCell
          value={val}
          onChange={() => {}}
          onBlur={(newVal) => {
            const found = classInfo.find((c) => c.brandCode === newVal);
            if (found) {
              updateRow({
                ...row,
                brandCode: found.brandCode,
                brandName: found.brandName,
                vendorCode: found.vendorCode || row.vendorCode,
                classCode: found.classCode || row.classCode,
              });
            } else {
              updateRow({ ...row, brandCode: newVal });
            }
          }}
          onSelect={(selectedClass) => {
            updateRow({
              ...row,
              brandCode: selectedClass.brandCode,
              brandName: selectedClass.brandName,
              vendorCode: selectedClass.vendorCode || row.vendorCode,
              classCode: selectedClass.classCode || row.classCode,
            });
          }}
          options={options}
          minChars={4}
          isLocked={isLocked || !!row.locked}
        />
      );`;

const oldBrandNameCell = `      return (
        <AutocompleteCell
          value={val}
          onChange={(newVal) => {
            const found = classInfo.find((c) => c.brandName === newVal);
            if (found) {
              updateRow({
                ...row,
                brandName: found.brandName,
                brandCode: found.brandCode,
                vendorCode: found.vendorCode || row.vendorCode,
                classCode: found.classCode || row.classCode,
              });
            } else {
              updateRow({ ...row, brandName: newVal });
            }
          }}
          onSelect={(selectedClass) => {
            updateRow({
              ...row,
              brandName: selectedClass.brandName,
              brandCode: selectedClass.brandCode,
              vendorCode: selectedClass.vendorCode || row.vendorCode,
              classCode: selectedClass.classCode || row.classCode,
            });
          }}
          options={options}
          minChars={2}
          isLocked={isLocked || !!row.locked}
        />
      );`;

const newBrandNameCell = `      return (
        <AutocompleteCell
          value={val}
          onChange={() => {}}
          onBlur={(newVal) => {
            const found = classInfo.find((c) => c.brandName === newVal);
            if (found) {
              updateRow({
                ...row,
                brandName: found.brandName,
                brandCode: found.brandCode,
                vendorCode: found.vendorCode || row.vendorCode,
                classCode: found.classCode || row.classCode,
              });
            } else {
              updateRow({ ...row, brandName: newVal });
            }
          }}
          onSelect={(selectedClass) => {
            updateRow({
              ...row,
              brandName: selectedClass.brandName,
              brandCode: selectedClass.brandCode,
              vendorCode: selectedClass.vendorCode || row.vendorCode,
              classCode: selectedClass.classCode || row.classCode,
            });
          }}
          options={options}
          minChars={2}
          isLocked={isLocked || !!row.locked}
        />
      );`;

code = code.replace(oldClassCodeCell, newClassCodeCell);
code = code.replace(oldBrandNameCell, newBrandNameCell);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched Autocomplete Cells');
