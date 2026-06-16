import { useMemo } from "react";
import { useData } from "../DataContext";
import { UnitInfo, SalesInfo } from "../types";

export interface SummaryDataItem extends UnitInfo {
  className?: string;
  salesAmount: number;
  salesByCp: number;
  profitAmount: number;
  profitByCp: number;
  margin: number;
  marginByCp: number;
  mgmtFee: number;
  mdStatus: string;
  task: string;
  projectStatus: string;
  actStatus: string;
  taskDelegation: string;
  flowStatus: string;
  party: string;
  startDate: string;
  endDate: string;
  salesByHcmcate: number;
  profitByHcmcate: number;
  hcmSalesEffi: number;
  hcmMargin: number;
}

export function useSummaryData() {
  const {
    unitInfo,
    classInfo,
    actualClassInfo,
    sales: salesData,
    profits: profitData,
    subFees: subFeesData,
    mdStatus: mdStatusData,
    projectStatus: projectStatusData,
    projectLink: projectLinkData,
    basePlan,
    units: unitsData,
  } = useData();

  const summaryData = useMemo(() => {
    return (unitInfo || []).map((unit) => {
      let salesAmount = 0;
      let salesByCpAmount = 0;

      const matches = (salesData || []).filter((s) => {
        // Must have at least one identifier in the sales record to match
        if (!s?.vendorCode && !s?.brandCode && !s?.brandName && !s?.classCode)
          return false;

        let isMatch = true;

        if (s?.vendorCode) {
          if (unit.vendorCode !== s.vendorCode) isMatch = false;
        }

        if (s?.brandCode) {
          if (unit.brandCode !== s.brandCode) isMatch = false;
        }

        if (s?.brandName) {
          if (unit.brandName !== s.brandName) isMatch = false;
        }

        if (s?.classCode && unit.classCode) {
          if (unit.classCode !== s.classCode) isMatch = false;
        }

        return isMatch;
      });

      if (matches.length > 0) {
        salesAmount = matches.reduce(
          (sum, s) => sum + (Number(s?.sales) || 0),
          0,
        );
        salesByCpAmount = matches.reduce(
          (sum, s) => sum + (Number(s?.salesByCp) || 0),
          0,
        );
      }

      let profitAmount = 0;
      let profitByCpAmount = 0;

      const profitMatches = (profitData || []).filter((p) => {
        return p.brandCode && unit.brandCode && p.brandCode === unit.brandCode;
      });

      if (profitMatches.length > 0) {
        profitAmount = profitMatches.reduce(
          (sum, p) => sum + (Number(p?.profit) || 0),
          0,
        );
        profitByCpAmount = profitMatches.reduce(
          (sum, p) => sum + (Number(p?.profitByCp) || 0),
          0,
        );
      }

      const margin = salesAmount > 0 ? profitAmount / salesAmount : 0;
      const marginByCp =
        salesByCpAmount > 0 ? profitByCpAmount / salesByCpAmount : 0;

      const subFeesMatches = (subFeesData || []).filter((sf) => {
        return sf.brandCode && unit.brandCode && sf.brandCode === unit.brandCode;
      });

      let mgmtFeeAmount = 0;
      if (subFeesMatches.length > 0) {
        mgmtFeeAmount = subFeesMatches.reduce(
          (sum, sf) => sum + (Number(sf?.managementFee) || 0),
          0,
        );
      }

      const mdStatusMatch = (mdStatusData || []).find((md) => {
        return md.unit === unit.unit;
      });

      const projectStatusMatch = (projectStatusData || []).find((ps) => {
        return ps.unit === unit.unit;
      });

      const projectLinkMatch = (projectLinkData || []).find((ps) => {
        return ps.unit === unit.unit;
      });

      let statusVal = unit.status || "Active";
      if (statusVal === "act") statusVal = "Active";
      if (statusVal === "unact" || statusVal === "Inactive") statusVal = "Unactive";

      const normalize = (s: any) => String(s || "").toLowerCase().trim();
      
      const matchedClass = (classInfo || []).find((c) => {
          const cCode = normalize(c.classCode || c['class code'] || c['classcode']);
          const uCode = normalize(unit.classCode || unit['class code'] || unit['classcode']);
          return cCode === uCode && cCode !== "";
      });
      
      const matchedActualClass = (actualClassInfo || []).find((c) => {
          const cCode = normalize(c.classCode || c['class code'] || c['classcode']);
          const uCode = normalize(unit.classCode || unit['class code'] || unit['classcode']);
          return cCode === uCode && cCode !== "";
      });
      
      console.log('Unit Class Code:', unit.classCode, 'Matched Class:', matchedClass?.classCode, 'Matched Actual Class:', matchedActualClass?.classCode);

      const salesEffiStr = String(matchedClass?.salesEffi || matchedClass?.['sales effi'] || matchedClass?.['sales efficiency'] || matchedClass?.['hcm sales effi'] || 0);
      const profitEffiStr = String(matchedClass?.profitEffi || matchedClass?.['profit effi'] || matchedClass?.['profit efficiency'] || matchedClass?.['hcm profit effi'] || 0);
      
      const actualSalesEffiStr = String(matchedActualClass?.hcmSalesEffi || matchedActualClass?.['hcm sales effi'] || matchedActualClass?.['sales effi'] || 0);
      const actualProfitEffiStr = String(matchedActualClass?.hcmProfitEffi || matchedActualClass?.['hcm profit effi'] || matchedActualClass?.['profit effi'] || 0);
      
      // Try resolving explicit margin (might be stored in matchedClass from Google sheet)
      const explicitMarginStr = String(matchedClass?.margin || matchedClass?.['hcm margin'] || matchedClass?.['margin (%)'] || matchedActualClass?.hcmMargin || matchedActualClass?.['hcm margin'] || 0);
      
      const salesEffi = Number(salesEffiStr.replace(/,/g, '').replace(/%/g, '')) || 0;
      const profitEffi = Number(profitEffiStr.replace(/,/g, '').replace(/%/g, '')) || 0;
      
      const actualSalesEffi = Number(actualSalesEffiStr.replace(/,/g, '').replace(/%/g, '')) || 0;
      const actualProfitEffi = Number(actualProfitEffiStr.replace(/,/g, '').replace(/%/g, '')) || 0;
      
      let explicitMargin = Number(explicitMarginStr.replace(/,/g, '').replace(/%/g, '')) || 0;
      
      // If explicitMargin is something like 25 (meaning 25%), we convert it to 0.25 for calculation if necessary, but assume it's just the value. Usually if they enter 25%, it is parsed as 25.
      if (explicitMargin > 1) {
        explicitMargin = explicitMargin / 100;
      }
      
      const finalSalesEffi = actualSalesEffi > 0 ? actualSalesEffi : salesEffi;
      const finalProfitEffi = actualProfitEffi !== 0 ? actualProfitEffi : profitEffi;
      
      let hcmMargin = Math.max(explicitMargin, finalSalesEffi > 0 ? finalProfitEffi / finalSalesEffi : 0);
      
      let unitSize = Number(String(unit.size).replace(/,/g, '')) || 0;
      if (unitSize === 0 && unitsData) {
        const uCode = normalize(unit.unit);
        const matchedUnit = unitsData.find(u => normalize(u.unit) === uCode && uCode !== "");
        if (matchedUnit) {
          unitSize = Number(String(matchedUnit.size).replace(/,/g, '')) || 0;
        }
      }

      const matchedBasePlan = (basePlan || []).find((b) => normalize(b.floor) === normalize(unit.floor) && normalize(b.floor) !== "");
      const vsHCMStr = String(matchedBasePlan?.vshcm || matchedBasePlan?.Vshcm || 0);
      const vsHCM = Number(vsHCMStr.replace(/,/g, '').replace(/%/g, '')) || 0;

      const salesByHcmcate = finalSalesEffi * 12 * unitSize * (vsHCM / 100);
      const profitByHcmcate = finalProfitEffi * 12 * unitSize * (vsHCM / 100);

      // console.log(`Unit: ${unit.unit}, size: ${unitSize}, floor: ${unit.floor}, baseFloor: ${matchedBasePlan?.floor}, classCode: ${unit.classCode}, mappedClassCode: ${matchedClass?.classCode}, vsHcm: ${vsHCM}, salesEffi: ${salesEffi}, salesByHcmcate: ${salesByHcmcate}`);

      return {
        ...unit,
        className: matchedClass?.name || matchedActualClass?.name || "",
        status: statusVal,
        update: unit?.update || "-",
        salesAmount,
        salesByCp: salesByCpAmount,
        profitAmount,
        profitByCp: profitByCpAmount,
        margin,
        marginByCp,
        mgmtFee: mgmtFeeAmount,
        mdStatus: mdStatusMatch ? mdStatusMatch.status : "-",
        task: (() => {
          const psTask = projectStatusMatch?.task;
          const plTask = projectLinkMatch?.task;
          if (psTask && plTask && psTask !== plTask) return `${psTask} + ${plTask}`;
          return psTask || plTask || "-";
        })(),
        projectStatus: (() => {
          const ps = projectStatusMatch?.status;
          const pl = projectLinkMatch?.status;
          if (ps && pl) return `${ps} + ${pl}`;
          return ps || pl || "N/A";
        })(),
        actStatus: 
          projectLinkMatch && projectLinkMatch.actStatus
            ? projectLinkMatch.actStatus
            : (projectStatusMatch && projectStatusMatch.actStatus ? projectStatusMatch.actStatus : "-"),
        taskDelegation: projectStatusMatch ? projectStatusMatch.delegationStatus || "-" : "-",
        flowStatus: projectStatusMatch ? projectStatusMatch.flowStatus || "-" : "-",
        party: projectStatusMatch ? projectStatusMatch.party || "-" : "-",
        startDate: (() => {
          const psDate = projectStatusMatch?.startDate;
          const plDate = projectLinkMatch?.startDate;
          if (psDate && plDate && psDate !== plDate) return `${psDate} / ${plDate}`;
          return psDate || plDate || "-";
        })(),
        endDate: (() => {
          const psDate = projectStatusMatch?.endDate;
          const plDate = projectLinkMatch?.endDate;
          if (psDate && plDate && psDate !== plDate) return `${psDate} / ${plDate}`;
          return psDate || plDate || "-";
        })(),
        salesByHcmcate,
        profitByHcmcate,
        hcmSalesEffi: finalSalesEffi,
        hcmMargin,
      };
    });
  }, [unitInfo, classInfo, actualClassInfo, salesData, profitData, subFeesData, mdStatusData, projectStatusData, projectLinkData, basePlan, unitsData]);

  return summaryData;
}

export const formatMoney = (val: any) => val ? Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0';
export const formatPercent = (val: any) => val ? (Number(val) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%' : '0%';

export const generateSizeLabel = (unit: Record<string, any>, uInfo: any, selectedLabels: string[]) => {
    const parts = [];
    if (selectedLabels.includes('Unit ID')) parts.push(unit.name);
    if (selectedLabels.includes('Size SQM') && uInfo?.size) parts.push(`${uInfo.size} SQM`);
    if (selectedLabels.includes('Floor') && uInfo?.floor) parts.push(`Floor: ${uInfo.floor}`);
    if (selectedLabels.includes('Brand Code') && uInfo?.brandCode) parts.push(`Brand Code: ${uInfo.brandCode}`);
    if (selectedLabels.includes('Brand Name') && uInfo?.brandName) parts.push(uInfo.brandName);
    if (selectedLabels.includes('Vendor Code') && uInfo?.vendorCode) parts.push(`Vendor Code: ${uInfo.vendorCode}`);
    if (selectedLabels.includes('Name') && uInfo?.className) parts.push(uInfo.className);
    if (selectedLabels.includes('Class Code') && uInfo?.classCode) parts.push(uInfo.classCode);
    if (selectedLabels.includes('Update') && uInfo?.update) parts.push(`Update: ${uInfo.update}`);
    if (selectedLabels.includes('Status') && uInfo?.status) parts.push(`Status: ${uInfo.status}`);
    if (selectedLabels.includes('MD Status') && uInfo?.mdStatus) parts.push(`MD Status: ${uInfo.mdStatus}`);
    if (selectedLabels.includes('Task') && uInfo?.task) parts.push(`Task: ${uInfo.task}`);
    if (selectedLabels.includes('Project Status') && uInfo?.projectStatus) parts.push(`Project Status: ${uInfo.projectStatus}`);
    if (selectedLabels.includes('Act: Status') && uInfo?.actStatus) parts.push(`Act: Status: ${uInfo.actStatus}`);
    
    if (selectedLabels.includes('Sales') && uInfo?.salesAmount !== undefined) parts.push(`Sales: ${formatMoney(uInfo.salesAmount)}`);
    if (selectedLabels.includes('Sales By CP') && uInfo?.salesByCp !== undefined) parts.push(`Sales (CP): ${formatMoney(uInfo.salesByCp)}`);
    if (selectedLabels.includes('Sales By HCM Categ') && uInfo?.salesByHcmcate !== undefined) parts.push(`Sales (HCM): ${formatMoney(uInfo.salesByHcmcate)}`);
    
    if (selectedLabels.includes('Profit') && uInfo?.profitAmount !== undefined) parts.push(`Profit: ${formatMoney(uInfo.profitAmount)}`);
    if (selectedLabels.includes('Profit By CP') && uInfo?.profitByCp !== undefined) parts.push(`Profit (CP): ${formatMoney(uInfo.profitByCp)}`);
    if (selectedLabels.includes('Profit By HCM Categ') && uInfo?.profitByHcmcate !== undefined) parts.push(`Profit (HCM): ${formatMoney(uInfo.profitByHcmcate)}`);
    
    if (selectedLabels.includes('Margin') && uInfo?.margin !== undefined) parts.push(`Margin: ${formatPercent(uInfo.margin)}`);
    if (selectedLabels.includes('Margin By CP') && uInfo?.marginByCp !== undefined) parts.push(`Margin (CP): ${formatPercent(uInfo.marginByCp)}`);
    if (selectedLabels.includes('HCM Margin') && uInfo?.hcmMargin !== undefined) parts.push(`HCM Margin: ${formatPercent(uInfo.hcmMargin)}`);
    
    if (selectedLabels.includes('HCM Sales Effi') && uInfo?.hcmSalesEffi !== undefined) parts.push(`HCM Sales Effi: ${formatMoney(uInfo.hcmSalesEffi)}`);
    
    return parts.join('\n') || unit.name;
};
