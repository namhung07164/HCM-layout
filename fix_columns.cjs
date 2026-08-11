const fs = require('fs');
let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const startIdx = code.indexOf('  const columns: {');
const endIdx = code.indexOf('    [', startIdx);

const newColumns = \`  const columns: {
    key: keyof UnitInfo;
    label: string;
    summary?: any;
    renderCell?: (
      val: any,
      row: UnitInfo,
      updateRow: (newRow: UnitInfo) => void,
      isLocked: boolean,
    ) => React.ReactNode;
  }[] = React.useMemo(
    () => [
      {
        key: "floor",
        label: "Floor",
        summary: getUniqueCount("floor"),
        renderCell: renderTextCell("floor", true),
      },
      {
        key: "classCode",
        label: "Class Code",
        summary: getUniqueCount("classCode"),
        renderCell: renderClassCodeCell(),
      },
      {
        key: "unit",
        label: "Unit",
        summary: getUniqueCount("unit"),
        renderCell: renderUnitCell(),
      },
      {
        key: "size",
        label: "Size",
        summary: getSum("size"),
        renderCell: renderTextCell("size", true),
      },
      {
        key: "startMonth",
        label: "Start Month",
        renderCell: renderTextCell("startMonth"),
      },
      {
        key: "vendorCode",
        label: "Vendor Code",
        summary: getUniqueCount("vendorCode"),
        renderCell: renderVendorCodeCell(),
      },
      {
        key: "brandCode",
        label: "Brand Code",
        summary: getUniqueCount("brandCode"),
        renderCell: renderBrandCodeCell(),
      },
      {
        key: "brandName",
        label: "Brand Name",
        summary: getUniqueCount("brandName"),
        renderCell: renderBrandNameCell(),
      },
      {
        key: "status",
        label: "Status",
        renderCell: renderStatusCell(),
        filterType: "select",
        filterOptions: [
          { label: "Active", value: "Active" },
          { label: "Unactive", value: "Unactive" },
        ],
      },
    ],
\`;

code = code.slice(0, startIdx) + newColumns + code.slice(endIdx);
fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('fixed columns');
