import sys

with open('src/components/UnitInfoTab.tsx', 'r') as f:
    content = f.read()

start_idx = content.find('  const columns: {')
end_idx = content.find('    [', start_idx)

new_columns = """  const columns: {
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
"""

content = content[:start_idx] + new_columns + content[end_idx:]

with open('src/components/UnitInfoTab.tsx', 'w') as f:
    f.write(content)
print("fixed columns array")
