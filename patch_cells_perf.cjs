const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

// 1. Fix renderUnitCell
const oldUnitCell = `  const renderUnitCell = React.useCallback(
    () =>
      (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        const activeUnits = units.filter(
          (u) =>
            u.active !== "Unactive" &&
            u.active !== "unact" &&
            u.active !== "Inactive",
        );
        const options = activeUnits.map((u) => ({
          value: u.unit,
          label: \`Floor \${u.floor} - \${u.size} SQM\`,
          item: u,
        }));

        const commitUnit = (`;

const newUnitCell = `  const renderUnitCell = React.useCallback(
    () => {
        const activeUnits = units.filter(
          (u) =>
            u.active !== "Unactive" &&
            u.active !== "unact" &&
            u.active !== "Inactive",
        );
        const options = activeUnits.map((u) => ({
          value: u.unit,
          label: \`Floor \${u.floor} - \${u.size} SQM\`,
          item: u,
        }));
      return (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        const commitUnit = (`;

code = code.replace(oldUnitCell, newUnitCell);

// 2. Fix renderClassCodeCell (if it's inline)
const oldClassCodeCell = `  const renderClassCodeCell = React.useCallback(
    () =>
      (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        return (
          <select
            value={val || ""}
            onChange={(e) => updateRow({ ...row, classCode: e.target.value })}
            disabled={isLocked || !!row.locked}
            className={cn(
              "w-full bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-slate-300 outline-none text-sm",
              isLocked || !!row.locked
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-slate-500 focus:border-brand-500/50",
            )}
          >
            <option value="">--Select--</option>
            {Array.from(
              new Set(classInfo.map((c) => c.classCode).filter(Boolean)),
            ).map((cc) => (
              <option key={cc} value={cc}>
                {cc}
              </option>
            ))}
          </select>
        );
      },
    [classInfo],
  );`;

const newClassCodeCell = `  const renderClassCodeCell = React.useCallback(
    () => {
      const options = Array.from(
        new Set(classInfo.map((c) => c.classCode).filter(Boolean))
      );
      return (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        return (
          <select
            value={val || ""}
            onChange={(e) => updateRow({ ...row, classCode: e.target.value })}
            disabled={isLocked || !!row.locked}
            className={cn(
              "w-full bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-slate-300 outline-none text-sm",
              isLocked || !!row.locked
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-slate-500 focus:border-brand-500/50",
            )}
          >
            <option value="">--Select--</option>
            {options.map((cc) => (
              <option key={cc} value={cc}>
                {cc}
              </option>
            ))}
          </select>
        );
      };
    },
    [classInfo],
  );`;

code = code.replace(oldClassCodeCell, newClassCodeCell);


// 3. Fix renderVendorCodeCell
const oldVendorCodeCell = `  const renderVendorCodeCell = React.useCallback(
    () =>
      (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        return (
          <select
            value={val || ""}
            onChange={(e) => updateRow({ ...row, vendorCode: e.target.value })}
            disabled={isLocked || !!row.locked}
            className={cn(
              "w-full bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-slate-300 outline-none text-sm",
              isLocked || !!row.locked
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-slate-500 focus:border-brand-500/50",
            )}
          >
            <option value="">--Select--</option>
            {Array.from(
              new Set(classInfo.map((c) => c.vendorCode).filter(Boolean)),
            ).map((vc) => (
              <option key={vc} value={vc}>
                {vc}
              </option>
            ))}
          </select>
        );
      },
    [classInfo],
  );`;

const newVendorCodeCell = `  const renderVendorCodeCell = React.useCallback(
    () => {
      const options = Array.from(
        new Set(classInfo.map((c) => c.vendorCode).filter(Boolean))
      );
      return (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        return (
          <select
            value={val || ""}
            onChange={(e) => updateRow({ ...row, vendorCode: e.target.value })}
            disabled={isLocked || !!row.locked}
            className={cn(
              "w-full bg-slate-900/80 border border-slate-700/50 rounded px-2 py-1.5 text-slate-300 outline-none text-sm",
              isLocked || !!row.locked
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-slate-500 focus:border-brand-500/50",
            )}
          >
            <option value="">--Select--</option>
            {options.map((vc) => (
              <option key={vc} value={vc}>
                {vc}
              </option>
            ))}
          </select>
        );
      };
    },
    [classInfo],
  );`;

code = code.replace(oldVendorCodeCell, newVendorCodeCell);


fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched cells perf');
