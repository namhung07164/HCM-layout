import React, { useState, useEffect } from "react";
import DataTable from "./DataTable";
import { Plus, Lock, Unlock, Trash2 } from "lucide-react";
import { UnitInfo } from "../types";
import { useData } from "../DataContext";
import { cn } from "../lib/utils";
import AutocompleteCell from "./AutocompleteCell";

export default function UnitInfoTab() {
  const { unitInfo, setUnitInfo, units, classInfo } = useData();

  const handleDataChange = (newData: UnitInfo[]) => {
    let finalData = [...newData];

    const unitsMap = new Map<string, UnitInfo[]>();
    for (const r of finalData) {
      const statusVal =
        r.status === "act" || r.status === "Active"
          ? "Active"
          : r.status === "Unactive" ||
              r.status === "unact" ||
              r.status === "Inactive"
            ? "Unactive"
            : r.status || "Active";
      if (statusVal === "Active" && r.unit) {
        if (!unitsMap.has(r.unit)) unitsMap.set(r.unit, []);
        unitsMap.get(r.unit)!.push(r);
      }
    }

    for (const [unitName, activeRows] of unitsMap.entries()) {
      if (activeRows.length > 1) {
        const newlyUpdated = activeRows.find((r) => !unitInfo.includes(r)) || activeRows[activeRows.length - 1];
        if (newlyUpdated) {
          finalData = finalData.map((r) =>
            r.unit === unitName && r !== newlyUpdated && r.status === "Active"
              ? { ...r, status: "Unactive" }
              : r,
          );
        }
      }
    }

    // Basic deduplication
    const uniqueMap = new Map<string, UnitInfo>();
    finalData.forEach((item) => {
      // Key by floor, unit and brandCode
      const key = `${item.floor || ""}|${item.unit || ""}|${item.brandCode || ""}`;
      uniqueMap.set(key, item);
    });
    setUnitInfo(Array.from(uniqueMap.values()));
  };

  const handleUpdateData = (newData: UnitInfo[]) => {
    // Create lookup map from incoming data
    const incomingMap = new Map<string, UnitInfo>();
    newData.forEach((item) => {
      if (item.unit && item.brandCode) {
        // We use unit|brandCode as the lookup key to find records to update
        const key = `${item.unit}|${item.brandCode}`;
        incomingMap.set(key, item);
      }
    });

    let updatedCount = 0;
    const updatedUnitInfo = unitInfo.map((existing) => {
      const key = `${existing.unit}|${existing.brandCode}`;
      const incomingRow = incomingMap.get(key);

      if (incomingRow) {
        let changed = false;
        const currentItem = { ...existing };

        // Prioritize unit and size (overwrite), fill others only if empty
        Object.keys(incomingRow).forEach((k) => {
          const field = k as keyof UnitInfo;
          const incomingValue = incomingRow[field];

          if (!incomingValue) return;

          if (field === "unit" || field === "size") {
            // Priority fields: overwrite even if existing data exists
            if (currentItem[field] !== incomingValue) {
              (currentItem[field] as any) = incomingValue;
              changed = true;
            }
          } else if (!currentItem[field]) {
            // Other fields: only fill if currently empty
            (currentItem[field] as any) = incomingValue;
            changed = true;
          }
        });

        if (changed) {
          updatedCount++;
          return currentItem;
        }
      }
      return existing;
    });

    if (updatedCount > 0) {
      setUnitInfo(updatedUnitInfo);
      alert(
        `Đã cập nhật dữ liệu bổ sung cho ${updatedCount} dòng Unit/Brand Code trùng khớp.`,
      );
    } else {
      alert(
        "Không tìm thấy Unit/Brand Code tương ứng hoặc không có dữ liệu mới để bổ sung.",
      );
    }
  };

  const getUniqueCount = (key: keyof UnitInfo) => (filteredData: UnitInfo[]) => {
    const uniqueVals = new Set(filteredData.map((item) => item[key]).filter(Boolean));
    return uniqueVals.size > 0 ? uniqueVals.size : null;
  };

  const getSum = (key: keyof UnitInfo) => (filteredData: UnitInfo[]) => {
    let sum = 0;
    let count = 0;
    filteredData.forEach(item => {
        const val = item[key];
        if (typeof val === 'number') {
            sum += val;
            count++;
        } else if (typeof val === 'string') {
            const num = parseFloat(val.replace(/[^\d.-]/g, ''));
            if (!isNaN(num)) {
                sum += num;
                count++;
            }
        }
    });
    if (sum === 0 && count === 0) return null;
    
    if (key === 'size') {
        return (
          <span className="flex items-center gap-1">
            {sum.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })} SQM
          </span>
        );
    }
    return sum.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const unitInfoRef = React.useRef(unitInfo);
  const handleDataChangeRef = React.useRef(handleDataChange);
  
  React.useEffect(() => {
    unitInfoRef.current = unitInfo;
    handleDataChangeRef.current = handleDataChange;
  }, [unitInfo, handleDataChange]);

  const formatDate = (date: Date) => {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const renderTextCell = React.useCallback(
    (key: keyof UnitInfo, isReadOnly: boolean = false) =>
      (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => (
        <input
          type="text"
          value={val || ""}
          onChange={(e) => updateRow({ ...row, [key]: e.target.value })}
          disabled={isLocked || !!row.locked || isReadOnly}
          className={cn(
            "bg-transparent border-0 text-slate-300 w-full outline-none",
            isLocked || !!row.locked || isReadOnly
              ? "bg-transparent opacity-50 cursor-not-allowed"
              : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-blue-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-blue-500/50",
          )}
          placeholder={isReadOnly ? "" : "..."}
        />
      ),
    [],
  );

  const renderUnitCell = React.useCallback(
    () =>
      (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        const activeUnits = units.filter(u => u.active !== 'Unactive' && u.active !== 'unact' && u.active !== 'Inactive');
        const options = activeUnits.map((u) => ({
          value: u.unit,
          label: `Floor ${u.floor} - ${u.size} SQM`,
          item: u,
        }));

        const commitUnit = (newUnitName: string, selectedInfo?: any): boolean | void => {
          if (!newUnitName) return true;
          const currentUnits = unitInfoRef.current;
          const dataIndex = currentUnits.findIndex(u => u === row);
          
          let infoToApply = selectedInfo;
          let finalUnitName = newUnitName;
          if (!infoToApply) {
              const lowerName = newUnitName.toLowerCase().trim();
              const matchedUnit = units.find(u => u.unit.toLowerCase().trim() === lowerName && u.active !== 'Unactive' && u.active !== 'unact' && u.active !== 'Inactive');
              if (matchedUnit) {
                  infoToApply = matchedUnit;
                  finalUnitName = matchedUnit.unit; // Override with exact capitalization from source
              }
          }
          
          if (finalUnitName.toLowerCase().trim() === (row.unit || '').toLowerCase().trim() && !infoToApply) {
              return true; // Nothing changed, skip
          }
          
          const activeDuplicates = currentUnits.filter(u => u.unit.toLowerCase().trim() === finalUnitName.toLowerCase().trim() && u !== row && u.status === 'Active');
          let newUnitInfo = [...currentUnits];

          
          if (activeDuplicates.length > 0) {
              if (confirm(`Unit "${finalUnitName}" đã tồn tại và đang bị chiếm dụng (Active). Bạn có muốn tiếp tục và chuyển unit cũ sang Unactive không?`)) {
                  newUnitInfo = newUnitInfo.map(u => {
                      if (activeDuplicates.includes(u)) return { ...u, status: 'Unactive' };
                      return u;
                  });
              } else {
                  return false; // Cancel update
              }
          }
          
          if (dataIndex > -1) {
              const newRow = { ...row, unit: finalUnitName };
              if (infoToApply) {
                  newRow.floor = infoToApply.floor;
                  newRow.size = String(infoToApply.size);
              }
              newUnitInfo[dataIndex] = newRow;
              handleDataChangeRef.current(newUnitInfo);
          } else {
              if (infoToApply) {
                  updateRow({ ...row, unit: finalUnitName, floor: infoToApply.floor, size: String(infoToApply.size) });
              } else {
                  updateRow({ ...row, unit: finalUnitName });
              }
          }
          return true;
        };

        return (
          <div className="flex gap-1 items-center w-full">
            <div className="flex-1 min-w-0">
              <AutocompleteCell
                value={val}
                onChange={(newVal) => {
                  // We do not call updateRow here to avoid losing the `row` reference which we need in `commitUnit`
                }}
                onSelect={(selectedUnit) => {
                  return commitUnit(selectedUnit.unit, selectedUnit);
                }}
                onBlur={(newVal) => {
                  return commitUnit(newVal);
                }}
                options={options}
                minChars={0} // Show all units on focus if they want
                isLocked={isLocked || !!row.locked}
                placeholder="Select Unit..."
              />
            </div>
            {!isLocked && val && (
              <div className="flex items-center shrink-0">
                {!row.locked && (
                  <>
                    <button
                      onClick={() => {
                        const currentUnits = unitInfoRef.current;
                        const baseUnit = String(val).replace(/\(\d+\)$/, '');
                        const children = currentUnits.filter(u => u.unit && u.unit.startsWith(`${baseUnit}(`) && u.unit.endsWith(')'));
                        
                        let nextIndex = 1;
                        if (children.length > 0) {
                          const indices = children.map(c => {
                            const m = c.unit.match(/\((\d+)\)$/);
                            return m ? parseInt(m[1], 10) : 0;
                          });
                          nextIndex = Math.max(...indices) + 1;
                        }
                        
                        const childUnitName = `${baseUnit}(${nextIndex})`;
                        const newRow = { ...row, unit: childUnitName, size: "", update: formatDate(new Date()) };
                        
                        const parentIndex = currentUnits.findIndex(r => r.unit === row.unit);
                        const newUnitInfo = [...currentUnits];
                        if (parentIndex > -1) {
                            newUnitInfo.splice(parentIndex + 1, 0, newRow);
                        } else {
                            newUnitInfo.push(newRow);
                        }
                        handleDataChangeRef.current(newUnitInfo);
                      }}
                      title="Thêm unit con"
                      className="p-1 rounded text-cyan-500 hover:bg-cyan-900/30 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    {String(val).match(/\(\d+\)$/) && (
                      <button
                        onClick={() => {
                          const currentUnits = unitInfoRef.current;
                          const newUnitInfo = currentUnits.filter(r => r.unit !== row.unit);
                          handleDataChangeRef.current(newUnitInfo);
                        }}
                        title="Xoá unit con"
                        className="p-1 rounded text-red-500 hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      },
    [units],
  );

  const renderClassCodeCell = React.useCallback(
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
                : "hover:border-slate-500 focus:border-blue-500/50",
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
  );

  const renderVendorCodeCell = React.useCallback(
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
                : "hover:border-slate-500 focus:border-blue-500/50",
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
  );

  const renderBrandCodeCell = React.useCallback(
    () =>
      (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        const options = classInfo.map((c) => ({
          value: c.brandCode,
          label: c.brandName,
          item: c,
        }));

        return (
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
        );
      },
    [classInfo],
  );

  const renderBrandNameCell = React.useCallback(
    () =>
      (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        const options = classInfo.map((c) => ({
          value: c.brandName,
          label: c.brandCode,
          item: c,
        }));

        return (
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
            minChars={3}
            isLocked={isLocked || !!row.locked}
          />
        );
      },
    [classInfo],
  );

  const renderStatusCell = React.useCallback(
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
            onChange={(e) => updateRow({ ...row, status: e.target.value })}
            disabled={isLocked || !!row.locked}
            className={cn(
              "w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs outline-none transition-all font-medium",
              val === "Unactive" || val === "unact" || val === "Inactive"
                ? "text-red-400"
                : "text-green-400",
              isLocked || !!row.locked
                ? "opacity-50 cursor-not-allowed text-xs"
                : "cursor-pointer hover:border-blue-500/50 focus:border-blue-500 focus:bg-blue-600/20",
            )}
          >
            <option value="">--Select--</option>
            <option
              value="Active"
              className="bg-slate-900 text-green-400 font-medium"
            >
              Active
            </option>
            <option
              value="Unactive"
              className="bg-slate-900 text-red-400 font-medium"
            >
              Unactive
            </option>
          </select>
        );
      },
    [],
  );

  const columns: {
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
    [
      unitInfo,
      renderTextCell,
      renderUnitCell,
      renderClassCodeCell,
      renderVendorCodeCell,
      renderBrandCodeCell,
      renderBrandNameCell,
      renderStatusCell,
    ],
  );

  const importConfig = React.useMemo(
    () => ({
      expectedHeaders: [
        "floor",
        "unit",
        "size",
        "start month",
        "class code",
        "vendor code",
        "brand code",
        "brand name",
        "status",
      ],
      mapping: (row: any) => ({
        floor: row["floor"] || row["Floor"] || "",
        unit: row["unit"] || row["Unit"] || "",
        size: row["size"] || row["Size"] || "",
        startMonth:
          row["start month"] || row["startMonth"] || row["Start Month"] || "",
        classCode:
          row["class code"] || row["classCode"] || row["Class Code"] || "",
        vendorCode:
          row["vendor code"] || row["vendorCode"] || row["Vendor Code"] || "",
        brandCode:
          row["brand code"] || row["brandCode"] || row["Brand Code"] || "",
        brandName:
          row["brand name"] || row["brandName"] || row["Brand Name"] || "",
        status: row["status"] || row["Status"] || "",
      }),
    }),
    [],
  );

  const tableData = React.useMemo(
    () =>
      unitInfo.map((u) => {
        let statusVal = u.status || "Active";
        if (statusVal === "act") statusVal = "Active";
        if (statusVal === "unact") statusVal = "Unactive";
        if (statusVal === "Inactive") statusVal = "Unactive";
        return { ...u, status: statusVal };
      }),
    [unitInfo],
  );

  return (
    <DataTable
      title="Dữ Liệu Unit Info"
      description="Quản lý thông tin Unit, Size và Tháng bắt đầu"
      columns={columns}
      data={tableData}
      onDataChange={handleDataChange}
      onUpdateData={handleUpdateData}
      importConfig={importConfig}
      defaultFilters={{ status: "Active" }}
    />
  );
}
