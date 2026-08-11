import { useShallow } from 'zustand/react/shallow';
import React, { useState, useEffect } from "react";
import DataTable from "./DataTable";
import { Plus, Lock, Unlock, Trash2 } from "lucide-react";
import { UnitInfo } from "../types";
import { useDataStore } from '../DataContext';
import { cn } from "../lib/utils";
import AutocompleteCell from "./AutocompleteCell";



function normalizeUnit(u: string | undefined): string {
  return (u || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
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

export default function UnitInfoTab() {
  const {  unitInfo, setUnitInfo, units, classInfo, projectStatus  } = useDataStore(useShallow(state => ({
    unitInfo: state.unitInfo,
    setUnitInfo: state.setUnitInfo,
    units: state.units,
    projectStatus: state.projectStatus,
    classInfo: state.classInfo,
  })));

  const handleDataChange = (newData: UnitInfo[]) => {
    let finalData = [...newData].map(row => {
       // AUTOFILL BRAND NAME IF EMPTY
       if (row.unit && (!row.brandName || row.brandName.trim() === '' || row.brandName === '-')) {
         console.group(`handleDataChange Auto-fill Debugging (${row.unit})`);
         const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(row.unit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(row.unit)));
         if (matchedProj) {
            console.log(`Found matching project:`, matchedProj);
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
              
              if (bestClassInfo && bestSim > 0.4) {
                 console.log(`-> Best class match: '${bestClassInfo.brandName}' (similarity: ${bestSim})`);
                 console.groupEnd();
                 return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
              } else {
                 console.log(`-> No sufficient class match. Using projName: '${projName}'`);
                 console.groupEnd();
                 return { ...row, brandName: projName };
              }
            }
         } else {
            console.log(`No matching project found for unit '${row.unit}'`);
         }
         console.groupEnd();
       }
       return row;
    });

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
        const newlyUpdated =
          activeRows.find((r) => !unitInfo.includes(r)) ||
          activeRows[activeRows.length - 1];
        if (newlyUpdated) {
          const confirmed = window.confirm(
            `Unit ${unitName} hiện đang có bản ghi Active khác. Bạn có muốn đặt các bản ghi khác của Unit này thành Unactive không?`,
          );
          if (confirmed) {
            finalData = finalData.map((r) => {
              if (
                r.unit === unitName &&
                r !== newlyUpdated &&
                r.status === "Active"
              ) {
                return { ...r, status: "Unactive" };
              }
              return r;
            });
          } else {
            const idx = finalData.findIndex((r) => r === newlyUpdated);
            if (idx > -1 && unitInfo[idx]) {
              finalData[idx] = { ...unitInfo[idx] }; // Revert back to old row
            }
          }
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

    let deduplicated = Array.from(uniqueMap.values());

    // Auto-update parent brand names based on children
    const activeData = deduplicated.filter(
      (r) => r.status === "Active" || r.status === "act" || !r.status,
    );

    deduplicated = deduplicated.map((row) => {
      if (row.unit && !row.unit.match(/\(\d+\)$/)) {
        const children = activeData.filter(
          (c) =>
            c.unit &&
            c.unit.startsWith(`${row.unit}(`) &&
            c.unit.match(/\(\d+\)$/),
        );
        if (children.length > 0) {
          const combinedBrandName = Array.from(
            new Set(children.map((c) => c.brandName).filter(Boolean)),
          ).join(" + ");
          const combinedBrandCode = Array.from(
            new Set(children.map((c) => c.brandCode).filter(Boolean)),
          ).join(" + ");
          if (
            row.brandName !== combinedBrandName ||
            row.brandCode !== combinedBrandCode
          ) {
            return {
              ...row,
              brandName: combinedBrandName,
              brandCode: combinedBrandCode,
            };
          }
        }
      }
      return row;
    });

    setUnitInfo(deduplicated);
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

  const getUniqueCount =
    (key: keyof UnitInfo) => (filteredData: UnitInfo[]) => {
      const uniqueVals = new Set(
        filteredData.map((item) => item[key]).filter(Boolean),
      );
      return uniqueVals.size > 0 ? uniqueVals.size : null;
    };

  const getSum = (key: keyof UnitInfo) => (filteredData: UnitInfo[]) => {
    let sum = 0;
    let count = 0;
    filteredData.forEach((item) => {
      const val = item[key];
      if (typeof val === "number") {
        sum += val;
        count++;
      } else if (typeof val === "string") {
        const num = parseFloat(val.replace(/[^\d.-]/g, ""));
        if (!isNaN(num)) {
          sum += num;
          count++;
        }
      }
    });
    if (sum === 0 && count === 0) return null;

    if (key === "size") {
      return (
        <span className="flex items-center gap-1">
          {sum.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}{" "}
          SQM
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

  // AUTO-FILL BRAND NAMES FROM PROJECT STATUS
  React.useEffect(() => {
    if (!unitInfo.length || !projectStatus.length) return;
    
    let hasChanges = false;
    console.group("UnitInfoTab Auto-fill Debugging (Effect)");
    const updated = unitInfo.map(row => {
      if (row.unit && (!row.brandName || row.brandName.trim() === '' || row.brandName === '-')) {
         console.log(`Evaluating row with unit '${row.unit}' (brandName is empty)`);
         const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(row.unit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(row.unit)));
         if (matchedProj) {
            console.log(`Found matching project for unit '${row.unit}':`, matchedProj);
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
                 console.log(`-> Best class match: '${bestClassInfo.brandName}' (similarity: ${bestSim})`);
                 return { ...row, brandName: bestClassInfo.brandName, brandCode: row.brandCode || bestClassInfo.brandCode };
              } else {
                 console.log(`-> No sufficient class match. Using projName: '${projName}'`);
                 return { ...row, brandName: projName };
              }
            } else {
               console.log(`-> Matched project has no projectName.`);
            }
         } else {
            console.log(`No matching project found for unit '${row.unit}' in projectStatus dataset.`);
         }
      }
      return row;
    });
    console.groupEnd();

    if (hasChanges) {
      setUnitInfo(updated);
    }
  }, [unitInfo, projectStatus, classInfo, setUnitInfo]);

  const formatDate = (date: Date) => {
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const renderTextCell = React.useCallback(
    (key: keyof UnitInfo, isReadOnly: boolean = false) => {
      // Calculate options outside of row render to prevent re-calculating on every cell render
      const options = Array.from(
        new Set(
          unitInfo.map((item) => String(item[key] || "")).filter(Boolean),
        ),
      ).map((opt) => ({ value: opt, label: "", item: opt }));

      return (
        val: any,
        row: UnitInfo,
        updateRow: (newRow: UnitInfo) => void,
        isLocked: boolean,
      ) => {
        if (isReadOnly) {
          return (
            <input
              type="text"
              value={val || ""}
              onChange={(e) => updateRow({ ...row, [key]: e.target.value })}
              disabled={true}
              className={cn(
                "bg-transparent border-0 text-slate-300 w-full outline-none",
                "bg-transparent opacity-50 cursor-not-allowed",
              )}
              placeholder=""
            />
          );
        }
        return (
          <AutocompleteCell
            value={val || ""}
            onChange={(newVal) => {
              // Do not update data on every keystroke
            }}
            onBlur={(newVal) => updateRow({ ...row, [key]: newVal })}
            onSelect={(item) =>
              updateRow({
                ...row,
                [key]: typeof item === "object" ? item.value || item : item,
              })
            }
            options={options}
            minChars={0}
            isLocked={isLocked || !!row.locked}
            placeholder="..."
          />
        );
      };
    },
    [unitInfo],
  );

  const renderUnitCell = React.useCallback(
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
          label: `Floor ${u.floor} - ${u.size} SQM`,
          item: u,
        }));

        const commitUnit = (
          newUnitName: string,
          selectedInfo?: any,
        ): boolean | void => {
          if (!newUnitName) return true;
          const currentUnits = unitInfoRef.current;
          const dataIndex = currentUnits.findIndex((u) => u === row);

          let infoToApply = selectedInfo;
          let finalUnitName = newUnitName;
          if (!infoToApply) {
            const lowerName = newUnitName.toLowerCase().trim();
            const matchedUnit = units.find(
              (u) =>
                u.unit.toLowerCase().trim() === lowerName &&
                u.active !== "Unactive" &&
                u.active !== "unact" &&
                u.active !== "Inactive",
            );
            if (matchedUnit) {
              infoToApply = matchedUnit;
              finalUnitName = matchedUnit.unit; // Override with exact capitalization from source
            }
          }

          if (
            finalUnitName.toLowerCase().trim() ===
              (row.unit || "").toLowerCase().trim() &&
            !infoToApply
          ) {
            return true; // Nothing changed, skip
          }

          const activeDuplicates = currentUnits.filter(
            (u) =>
              u.unit.toLowerCase().trim() ===
                finalUnitName.toLowerCase().trim() &&
              u !== row &&
              u.status === "Active",
          );
          let newUnitInfo = [...currentUnits];

          // AUTOFILL BRAND NAME LOGIC
          let bestBrandMatch = row.brandName;
          let bestBrandCode = row.brandCode;
          
          console.group(`commitUnit Auto-fill Debugging (${finalUnitName})`);
          if (finalUnitName && (!row.brandName || row.brandName.trim() === '' || row.brandName === '-')) { // ONLY IF EMPTY
            console.log(`Looking for project match for unit '${finalUnitName}'`);
            const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(finalUnitName) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(finalUnitName)));
            if (matchedProj) {
               console.log(`Found matching project:`, matchedProj);
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
                    console.log(`-> Best class match: '${bestClassInfo.brandName}' (similarity: ${bestSim})`);
                    bestBrandMatch = bestClassInfo.brandName;
                    bestBrandCode = bestClassInfo.brandCode;
                 } else {
                    console.log(`-> No sufficient class match. Using projName: '${projName}'`);
                    bestBrandMatch = projName;
                 }
               }
            } else {
               console.log(`No matching project found.`);
            }
          } else {
            console.log(`Skipping project status autofill. finalUnitName: '${finalUnitName}', row.brandName: '${row.brandName}'`);
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
                        const baseUnit = String(val).replace(/\(\d+\)$/, "");
                        const children = currentUnits.filter(
                          (u) =>
                            u.unit &&
                            u.unit.startsWith(`${baseUnit}(`) &&
                            u.unit.endsWith(")"),
                        );

                        let nextIndex = 1;
                        if (children.length > 0) {
                          const indices = children.map((c) => {
                            const m = c.unit.match(/\((\d+)\)$/);
                            return m ? parseInt(m[1], 10) : 0;
                          });
                          nextIndex = Math.max(...indices) + 1;
                        }

                        const childUnitName = `${baseUnit}(${nextIndex})`;
                        const newRow = {
                          ...row,
                          unit: childUnitName,
                          size: "",
                          update: formatDate(new Date()),
                        };

                        const parentIndex = currentUnits.findIndex(
                          (r) => r.unit === row.unit,
                        );
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
                          const newUnitInfo = currentUnits.filter(
                            (r) => r.unit !== row.unit,
                          );
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
  );

  const renderBrandCodeCell = React.useCallback(() => {
    const options = classInfo.map((c) => ({
      value: c.brandCode,
      label: c.brandName,
      item: c,
    }));

    return (
      val: any,
      row: UnitInfo,
      updateRow: (newRow: UnitInfo) => void,
      isLocked: boolean,
    ) => {
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
    };
  }, [classInfo]);

  const renderBrandNameCell = React.useCallback(() => {
    const options = classInfo.map((c) => ({
      value: c.brandName,
      label: c.brandCode,
      item: c,
    }));

    return (
      val: any,
      row: UnitInfo,
      updateRow: (newRow: UnitInfo) => void,
      isLocked: boolean,
    ) => {
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
          minChars={2}
          isLocked={isLocked || !!row.locked}
        />
      );
    };
  }, [classInfo]);

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
                : "cursor-pointer hover:border-brand-500/50 focus:border-brand-500 focus:bg-brand-600/20",
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
