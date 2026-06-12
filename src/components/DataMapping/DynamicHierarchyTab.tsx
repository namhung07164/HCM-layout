import React, { useState, useMemo, useEffect } from "react";
import { UnitShape, Group, GroupRule, MapVersion } from "./types";
import { v4 as uuidv4 } from "uuid";
import {
  Plus,
  Download,
  Trash2,
  FolderPlus,
  Calculator,
  Edit2,
  X,
  Copy,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useData } from "../../DataContext";
import { useSummaryData } from "../../lib/summaryData";
import Papa from "papaparse";
import { ColorPicker } from "../ColorPicker";

interface DynamicHierarchyTabProps {
  units: UnitShape[];
  setUnits: (u: UnitShape[]) => void;
  versions: MapVersion[];
  setVersions: (v: MapVersion[]) => void;
  activeVersionId: string | null;
  setActiveVersionId: (id: string | null) => void;
}

export default function DynamicHierarchyTab({
  units,
  setUnits,
  versions,
  setVersions,
  activeVersionId,
  setActiveVersionId,
}: DynamicHierarchyTabProps) {
  const { profits, subFees, mdStatus, projectStatus } = useData();
  const summaryData = useSummaryData();

  const viewVersionId = activeVersionId || versions[0]?.id || null;
  const activeVersion = versions.find((v) => v.id === viewVersionId);
  const isVersionActive = activeVersion?.isDynamicActive ?? true;

  const toggleVersionActive = () => {
    if (!activeVersion) return;
    setVersions(versions.map(v => v.id === activeVersion.id ? { ...v, isDynamicActive: !isVersionActive } : v));
  };

  const unitNamesStr = useMemo(() => JSON.stringify(units.map(u => ({ id: u.id, name: u.name }))), [units]);

  // Pre-compute aggregated data for unit evaluation
  const aggregatedData = useMemo(() => {
    const dataMap: Record<string, any> = {};

    // Initialize with mapped shapes
    const parsedUnits = JSON.parse(unitNamesStr);
    parsedUnits.forEach((u: any) => {
      dataMap[u.name.toLowerCase()] = {
        name: u.name,
        id: u.id,
        sales: 0,
        salesByCp: 0,
        salesByHcmcate: 0,
        profit: 0,
        profitByCp: 0,
        profitByHcmcate: 0,
        margin: 0,
        marginByCp: 0,
        mgmtFee: 0,
        mdStatus: "",
        projectStatus: "",
        vendorCode: "",
        brandCode: "",
        brandName: "",
        classCode: "",
        floor: "",
        taskDelegation: "",
        flowStatus: "",
        party: "",
      };
    });

    summaryData.forEach((sumData) => {
      const key = sumData.unit?.toLowerCase();
      if (key && dataMap[key]) {
        dataMap[key].sales += sumData.salesAmount || 0;
        dataMap[key].salesByCp += sumData.salesByCp || 0;
        dataMap[key].salesByHcmcate += sumData.salesByHcmcate || 0;
        dataMap[key].profitByHcmcate += sumData.profitByHcmcate || 0;
        dataMap[key].vendorCode = sumData.vendorCode || dataMap[key].vendorCode;
        dataMap[key].brandCode = sumData.brandCode || dataMap[key].brandCode;
        dataMap[key].brandName = sumData.brandName || dataMap[key].brandName;
        dataMap[key].classCode = sumData.classCode || dataMap[key].classCode;
        dataMap[key].floor = (sumData as any).floor || dataMap[key].floor;
        if (!dataMap[key].mdStatus) dataMap[key].mdStatus = sumData.mdStatus;
        if (!dataMap[key].projectStatus)
          dataMap[key].projectStatus = sumData.projectStatus;
      }
    });

    projectStatus.forEach((ps) => {
      const key = ps.unit?.toLowerCase();
      if (key && dataMap[key]) {
        if (!dataMap[key].taskDelegation) dataMap[key].taskDelegation = ps.delegationStatus;
        if (!dataMap[key].flowStatus) dataMap[key].flowStatus = ps.flowStatus;
        if (!dataMap[key].party) dataMap[key].party = ps.party;
      }
    });

    profits.forEach((p) => {
      const uInfo = summaryData.find((u) => u.brandCode === p.brandCode);
      if (uInfo && uInfo.unit) {
        const key = uInfo.unit.toLowerCase();
        if (dataMap[key]) {
          dataMap[key].profit += Number(p.profit) || 0;
          dataMap[key].profitByCp += Number(p.profitByCp) || 0;
        }
      }
    });

    Object.values(dataMap).forEach((d) => {
      d.margin = d.sales ? d.profit / d.sales : 0;
      d.marginByCp = d.salesByCp ? d.profitByCp / d.salesByCp : 0;
    });

    subFees.forEach((sf) => {
      const uInfo = summaryData.find((u) => u.brandCode === sf.brandCode);
      if (uInfo && uInfo.unit) {
        const key = uInfo.unit.toLowerCase();
        if (dataMap[key]) {
          dataMap[key].mgmtFee += Number(sf.managementFee) || 0;
        }
      }
    });

    mdStatus.forEach((m) => {
      if (m.unit) {
        const key = m.unit.toLowerCase();
        if (dataMap[key]) {
          dataMap[key].mdStatus = m.status;
        }
      }
    });

    projectStatus.forEach((ps) => {
      if (ps.unit) {
        const key = ps.unit.toLowerCase();
        if (dataMap[key]) {
          dataMap[key].projectStatus = ps.status;
        }
      }
    });

    return dataMap;
  }, [unitNamesStr, summaryData, profits, subFees, mdStatus, projectStatus]);

  // Evaluates rules for a given group against a unit shape
  const matchRules = (unit: UnitShape, rules: GroupRule[] | undefined) => {
    if (!rules || rules.length === 0) return false;
    const data = aggregatedData[unit.name.toLowerCase()];
    if (!data) return false;

    // Must pass all rules (AND condition)
    return rules.every((rule) => {
      let val = data[rule.field];
      if (rule.field === "margin" || rule.field === "marginByCp") {
        val = val * 100; // evaluate margin as percentage, e.g. 25 instead of 0.25
      }

      const numVal = Number(rule.value);
      const isNum = !isNaN(numVal) && rule.value.trim() !== "";

      switch (rule.operator) {
        case ">":
          return isNum ? Number(val) > numVal : false;
        case "<":
          return isNum ? Number(val) < numVal : false;
        case ">=":
          return isNum ? Number(val) >= numVal : false;
        case "<=":
          return isNum ? Number(val) <= numVal : false;
        case "=":
          return String(val || "").toLowerCase().trim() === String(rule.value || "").toLowerCase().trim();
        case "contains":
          return String(val || "").toLowerCase().includes(String(rule.value || "").toLowerCase().trim());
        case "exclude":
          return !String(val || "").toLowerCase().includes(String(rule.value || "").toLowerCase().trim());
        default:
          return false;
      }
    });
  };

  useEffect(() => {
    if (!activeVersion || !isVersionActive) return;
    
    let colorChanges = false;
    const nextUnits = [...units];
    nextUnits.forEach((u, idx) => {
      let assignedColor = "#3b82f6";
      activeVersion.groups.forEach((g) => {
        if (activeVersion.groupMappings[g.id]?.includes(u.id)) {
          assignedColor = g.color;
        }
      });
      if (u.fill !== assignedColor) {
        nextUnits[idx] = { ...u, fill: assignedColor };
        colorChanges = true;
      }
    });

    if (colorChanges) {
      setUnits(nextUnits);
    }
  }, [activeVersion?.groupMappings, activeVersion?.id, isVersionActive]);

  const applyRules = () => {
    if (!activeVersion || !isVersionActive) return;

    let hasChanges = false;
    const newMappings = { ...activeVersion.groupMappings };

    activeVersion.groups.forEach((group) => {
      const matchingUnits = units
        .filter((u) => matchRules(u, group.rules))
        .map((u) => u.id);
      const currentMappings = newMappings[group.id] || [];

      // Simple equality check
      if (
        matchingUnits.length !== currentMappings.length ||
        !matchingUnits.every((id) => currentMappings.includes(id))
      ) {
        newMappings[group.id] = matchingUnits;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setVersions(
        versions.map((v) =>
          v.id === activeVersion.id ? { ...v, groupMappings: newMappings } : v,
        ),
      );
    }

    // Also update unit styles based on evaluation
    let colorChanges = false;
    const nextUnits = [...units];
    nextUnits.forEach((u, idx) => {
      let assignedColor = "#3b82f6";
      activeVersion.groups.forEach((g) => {
        if (newMappings[g.id]?.includes(u.id)) {
          assignedColor = g.color;
        }
      });
      if (u.fill !== assignedColor) {
        nextUnits[idx] = { ...u, fill: assignedColor };
        colorChanges = true;
      }
    });

    if (colorChanges) {
      setUnits(nextUnits);
    }
    
    if (hasChanges || colorChanges) {
        alert("Đã áp dụng điều kiện cho phiên bản hiện tại.");
    }
  };

  const addVersion = () => {
    const name = prompt("Tên version mới:");
    if (name) {
      const newVersion: MapVersion = {
        id: uuidv4(),
        name,
        backgroundUrl: null,
        backgroundScale: 1,
        backgroundPos: { x: 0, y: 0 },
        groups: [],
        groupMappings: {},
      };
      setVersions([...versions, newVersion]);
      setActiveVersionId(newVersion.id);
    }
  };

  const duplicateVersion = () => {
    if (!activeVersionId || !activeVersion) return;
    const name = prompt("Tên version mới (bản sao):", `${activeVersion.name} (Copy)`);
    if (name) {
      const newVersion: MapVersion = {
        ...activeVersion,
        id: uuidv4(),
        name,
      };
      setVersions([...versions, newVersion]);
      setActiveVersionId(newVersion.id);
    }
  };

  const deleteVersion = () => {
    if (!activeVersion) return;
    if (!confirm(`Bạn có chắc muốn xoá version "${activeVersion.name}"?`))
      return;
    const newVersions = versions.filter((v) => v.id !== activeVersion.id);
    setVersions(newVersions);
    setActiveVersionId(newVersions.length > 0 ? newVersions[0].id : null);
  };

  const addGroup = () => {
    if (!activeVersion) return alert("Hãy tạo hoặc chọn một Version trước.");
    const name = prompt("Tên group mới cho version này:");
    if (name) {
      const color =
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0");
      const newGroup = { id: uuidv4(), name, color, rules: [] };

      setVersions(
        versions.map((v) => {
          if (v.id === activeVersion.id) {
            return {
              ...v,
              groups: [...(v.groups || []), newGroup],
              groupMappings: { ...v.groupMappings, [newGroup.id]: [] },
            };
          }
          return v;
        }),
      );
    }
  };

  const deleteGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Xoá group này khỏi version hiện tại?")) return;
    setVersions(
      versions.map((v) => {
        if (v.id === viewVersionId) {
          const newMappings = { ...v.groupMappings };
          delete newMappings[id];
          return {
            ...v,
            groups: v.groups.filter((g) => g.id !== id),
            groupMappings: newMappings,
          };
        }
        return v;
      }),
    );
  };

  const renameGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const group = activeVersion?.groups.find(g => g.id === id);
    if (!group) return;
    const newName = prompt("Đổi tên group:", group.name);
    if (newName && newName !== group.name) {
      setVersions(
        versions.map((v) => {
          if (v.id === viewVersionId) {
            return {
              ...v,
              groups: v.groups.map((g) =>
                g.id === id ? { ...g, name: newName } : g,
              ),
            };
          }
          return v;
        }),
      );
    }
  };

  const updateGroupColor = (groupId: string, color: string) => {
    setVersions(
      versions.map((v) => {
        if (v.id === viewVersionId) {
          return {
            ...v,
            groups: v.groups.map((g) =>
              g.id === groupId ? { ...g, color } : g,
            ),
          };
        }
        return v;
      }),
    );
  };

  const updateGroupOpacity = (groupId: string, opacity: number) => {
    setVersions(
      versions.map((v) => {
        if (v.id === viewVersionId) {
          return {
            ...v,
            groups: v.groups.map((g) =>
              g.id === groupId ? { ...g, opacity } : g,
            ),
          };
        }
        return v;
      }),
    );
  };

  const addRuleToGroup = (groupId: string) => {
    setVersions(
      versions.map((v) => {
        if (v.id === viewVersionId) {
          return {
            ...v,
            groups: v.groups.map((g) => {
              if (g.id === groupId) {
                const newRules = [
                  ...(g.rules || []),
                  { field: "sales", operator: ">", value: "0" },
                ];
                return { ...g, rules: newRules };
              }
              return g;
            }),
          };
        }
        return v;
      }),
    );
  };

  const updateRule = (
    groupId: string,
    ruleIndex: number,
    attr: keyof GroupRule,
    value: string,
  ) => {
    setVersions(
      versions.map((v) => {
        if (v.id === viewVersionId) {
          return {
            ...v,
            groups: v.groups.map((g) => {
              if (g.id === groupId && g.rules) {
                const newRules = [...g.rules];
                newRules[ruleIndex] = { ...newRules[ruleIndex], [attr]: value };
                return { ...g, rules: newRules };
              }
              return g;
            }),
          };
        }
        return v;
      }),
    );
  };

  const deleteRule = (groupId: string, ruleIndex: number) => {
    setVersions(
      versions.map((v) => {
        if (v.id === viewVersionId) {
          return {
            ...v,
            groups: v.groups.map((g) => {
              if (g.id === groupId && g.rules) {
                const newRules = [...g.rules];
                newRules.splice(ruleIndex, 1);
                return { ...g, rules: newRules };
              }
              return g;
            }),
          };
        }
        return v;
      }),
    );
  };

  const copyGroups = (sourceVersionId: string) => {
    const sourceVersion = versions.find((v) => v.id === sourceVersionId);
    if (!sourceVersion || !activeVersion) return;

    if (!confirm(`Bạn có chắc muốn copy groups từ version "${sourceVersion.name}"?\n(Các group hiện tại trong version này sẽ bị thay thế)`)) {
      return;
    }

    const newGroups = sourceVersion.groups.map(g => ({ ...g, id: uuidv4() }));
    const newGroupMappings: Record<string, string[]> = {};
    
    sourceVersion.groups.forEach((g, idx) => {
        const newId = newGroups[idx].id;
        newGroupMappings[newId] = [...(sourceVersion.groupMappings[g.id] || [])];
    });

    setVersions(
      versions.map((v) => {
        if (v.id === activeVersion.id) {
          return {
            ...v,
            groups: newGroups,
            groupMappings: newGroupMappings,
          };
        }
        return v;
      }),
    );
  };

  const activeGroups = activeVersion?.groups || [];

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6 glass flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3">
              <Calculator className="text-blue-500" /> Dynamic Hierarchy
            </h3>
            <select
              className="bg-slate-950 text-white text-sm px-4 py-2 rounded-lg border border-slate-700 outline-none"
              value={viewVersionId || ""}
              onChange={(e) =>
                setActiveVersionId(
                  e.target.value === "" ? null : e.target.value,
                )
              }
            >
              {!viewVersionId && <option value="">-- No Version --</option>}
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {activeVersion && (
              <>
                <button
                  onClick={toggleVersionActive}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors shrink-0",
                    isVersionActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/50"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700",
                  )}
                >
                  {isVersionActive ? "Active ON" : "Active OFF"}
                </button>
                <button
                  onClick={duplicateVersion}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-400 transition-colors"
                  title="Duplicate version"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={deleteVersion}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                  title="Delete version"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={addVersion}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase shadow-lg hover:bg-blue-500 transition-colors"
            >
              <Plus size={14} /> New Version
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {activeVersion ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
                  Rule-Based Groups
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={applyRules}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase transition-colors shadow-lg shadow-indigo-900/20 box-border border-2 border-indigo-400"
                  >
                    <Calculator size={12} /> Apply Rules
                  </button>
                  <button
                    onClick={addGroup}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold uppercase transition-colors"
                  >
                    <Plus size={12} /> Create Group
                  </button>

                  {versions.length > 1 && (
                    <select
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold uppercase px-3 py-1.5 rounded-lg border border-slate-700 outline-none transition-colors cursor-pointer"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                            copyGroups(e.target.value);
                            e.target.value = "";
                        }
                      }}
                    >
                        <option value="">[ Copy Groups From ]</option>
                        {versions.filter(v => v.id !== activeVersion.id).map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              {activeGroups.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                  <p className="mb-2">This version has no groups.</p>
                  <button
                    onClick={addGroup}
                    className="text-blue-400 hover:underline"
                  >
                    Create the first group
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {activeGroups.map((group) => {
                  const assignedUnits =
                    activeVersion.groupMappings[group.id] || [];
                  return (
                    <div
                      key={group.id}
                      className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/80 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ColorPicker
                            color={group.color}
                            onChange={(color) => updateGroupColor(group.id, color)}
                            className="shrink-0"
                          />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={group.opacity ?? 0.6}
                            title={`Opacity: ${group.opacity ?? 0.6}`}
                            onChange={(e) =>
                              updateGroupOpacity(
                                group.id,
                                parseFloat(e.target.value),
                              )
                            }
                            className="w-12 h-1 accent-blue-500 shrink-0 cursor-pointer"
                          />
                          <span 
                            className="text-sm font-bold text-white ml-2 cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2 group/title"
                            onClick={(e) => renameGroup(group.id, e)}
                          >
                            {group.name}
                            <Edit2 size={10} className="opacity-0 group-hover/title:opacity-100" />
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-300 bg-slate-700 px-2 py-1 rounded-md font-medium">
                            {assignedUnits.length} Matches
                          </span>
                          <button
                            onClick={(e) => deleteGroup(group.id, e)}
                            className="p-1 text-slate-400 hover:text-red-400"
                            title="Delete group"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-500 font-bold">
                            Conditions API
                          </span>
                          <button
                            onClick={() => addRuleToGroup(group.id)}
                            className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Rule
                          </button>
                        </div>

                        {(!group.rules || group.rules.length === 0) && (
                          <div className="text-xs text-slate-500 italic">
                            No rules defined. Add a rule to dynamically assign
                            units.
                          </div>
                        )}

                        {group.rules &&
                          group.rules.map((rule, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800"
                            >
                              <select
                                className="bg-slate-900 text-slate-300 text-sm outline-none w-1/3 flex-shrink-0 px-2 py-1 rounded border border-slate-700"
                                value={rule.field}
                                onChange={(e) =>
                                  updateRule(
                                    group.id,
                                    idx,
                                    "field",
                                    e.target.value,
                                  )
                                }
                              >
                                <optgroup label="Metrics">
                                  <option value="sales">Sales</option>
                                  <option value="salesByCp">Sales by CP</option>
                                  <option value="salesByHcmcate">Sales by HCMcate</option>
                                  <option value="margin">Margin (%)</option>
                                  <option value="marginByCp">
                                    Margin by CP (%)
                                  </option>
                                  <option value="profit">Profit</option>
                                  <option value="profitByCp">
                                    Profit by CP
                                  </option>
                                  <option value="profitByHcmcate">Profit by HCMcate</option>
                                  <option value="mgmtFee">Mgmt Fee</option>
                                </optgroup>
                                <optgroup label="Attributes">
                                  <option value="name">Unit Name</option>
                                  <option value="floor">Floor</option>
                                  <option value="vendorCode">
                                    Vendor Code
                                  </option>
                                  <option value="classCode">Class Code</option>
                                  <option value="brandCode">Brand Code</option>
                                  <option value="brandName">Brand Name</option>
                                  <option value="mdStatus">MD Status</option>
                                  <option value="projectStatus">
                                    Project Status
                                  </option>
                                  <option value="taskDelegation">Task Delegation</option>
                                  <option value="flowStatus">Flow: Status</option>
                                  <option value="party">Party</option>
                                </optgroup>
                              </select>

                              <select
                                className="bg-slate-900 text-slate-300 text-sm px-2 py-1 rounded border border-slate-700 outline-none"
                                value={rule.operator}
                                onChange={(e) =>
                                  updateRule(
                                    group.id,
                                    idx,
                                    "operator",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value=">">&gt;</option>
                                <option value="<">&lt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<=">&lt;=</option>
                                <option value="=">=</option>
                                <option value="contains">Contains (Bao gồm)</option>
                                <option value="exclude">Exclude (Ngoại trừ)</option>
                              </select>

                              <input
                                type="text"
                                className="bg-transparent text-slate-300 text-sm flex-1 outline-none border-b border-slate-700 focus:border-blue-500 px-1"
                                value={rule.value}
                                onChange={(e) =>
                                  updateRule(
                                    group.id,
                                    idx,
                                    "value",
                                    e.target.value,
                                  )
                                }
                                placeholder="Value..."
                              />

                              <button
                                onClick={() => deleteRule(group.id, idx)}
                                className="text-slate-500 hover:text-red-400 p-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}

                        {group.rules &&
                          group.rules.length > 0 &&
                          assignedUnits.length > 0 && (
                            <div className="pt-2 mt-2 border-t border-slate-800/50">
                              <span className="text-[10px] uppercase text-slate-500 font-bold mb-2 block">
                                Matched Units
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {assignedUnits.map((uid) => {
                                  const u = units.find((x) => x.id === uid);
                                  return u ? (
                                    <div
                                      key={uid}
                                      className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300"
                                    >
                                      {u.name}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 pb-20">
              <FolderPlus size={48} className="mb-4 opacity-20" />
              <p className="text-lg mb-2">No Version Selected</p>
              <p className="text-sm">
                Select a version or create a new one to manage dynamic
                hierarchies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
