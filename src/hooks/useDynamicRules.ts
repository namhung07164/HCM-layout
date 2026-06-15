import { useMemo } from 'react';
import { UnitShape, MapVersion } from '../components/DataMapping/types';
import { SummaryDataItem } from '../lib/summaryData';

export function useDynamicRules(
  units: UnitShape[],
  summaryData: SummaryDataItem[],
  profits: any[],
  subFees: any[],
  mdStatus: any[],
  projectStatus: any[],
  projectLink: any[]
) {
  const unitNamesStr = useMemo(() => JSON.stringify(units.map(u => ({ id: u.id, name: u.name }))), [units]);

  const aggregatedData = useMemo(() => {
    const dataMap: Record<string, any> = {};

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
        projectLink: "",
        actStatus: "",
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
        if (!dataMap[key].projectStatus) dataMap[key].projectStatus = sumData.projectStatus;
        if (!dataMap[key].actStatus) dataMap[key].actStatus = sumData.actStatus;
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

    projectLink.forEach((pl) => {
      if (pl.unit) {
        const key = pl.unit.toLowerCase();
        if (dataMap[key]) {
          dataMap[key].projectLink = pl.status;
        }
      }
    });

    return dataMap;
  }, [unitNamesStr, summaryData, profits, subFees, mdStatus, projectStatus, projectLink]);

  const calculateNextVersions = (versions: MapVersion[]): { nextVersions: MapVersion[], hasChanges: boolean } => {
    let hasChanges = false;
    const nextVersions = versions.map(v => {
      const isActive = v.isDynamicActive !== false;
      if (!isActive) return v;

      let versionChanged = false;
      const newMappings = { ...v.groupMappings };

      v.groups.forEach((group) => {
        const matchingUnits = units.filter((u) => {
          if (!group.rules || group.rules.length === 0) return false;
          const data = aggregatedData[u.name.toLowerCase()];
          if (!data) return false;

          return group.rules.every((rule) => {
            let val = data[rule.field];
            if (rule.field === "margin" || rule.field === "marginByCp") val = val * 100;
            const numVal = Number(rule.value);
            const isNum = !isNaN(numVal) && rule.value.trim() !== "";

            switch (rule.operator) {
              case ">": return isNum ? Number(val) > numVal : false;
              case "<": return isNum ? Number(val) < numVal : false;
              case ">=": return isNum ? Number(val) >= numVal : false;
              case "<=": return isNum ? Number(val) <= numVal : false;
              case "=": return String(val || "").toLowerCase().trim() === String(rule.value || "").toLowerCase().trim();
              case "contains": return String(val || "").toLowerCase().includes(String(rule.value || "").toLowerCase().trim());
              case "exclude": return !String(val || "").toLowerCase().includes(String(rule.value || "").toLowerCase().trim());
              default: return false;
            }
          });
        }).map(u => u.id);

        const currentMappings = newMappings[group.id] || [];
        if (matchingUnits.length !== currentMappings.length || !matchingUnits.every((id) => currentMappings.includes(id))) {
          newMappings[group.id] = matchingUnits;
          versionChanged = true;
          hasChanges = true;
        }
      });

      if (versionChanged) {
        return { ...v, groupMappings: newMappings };
      }
      return v;
    });

    return { nextVersions, hasChanges };
  };

  return { aggregatedData, calculateNextVersions };
}
