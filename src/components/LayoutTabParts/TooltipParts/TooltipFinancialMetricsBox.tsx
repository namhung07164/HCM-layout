import React from 'react';

interface TooltipFinancialMetricsBoxProps {
  v: any;
  p: any;
  data: any;
}

export const TooltipFinancialMetricsBox: React.FC<TooltipFinancialMetricsBoxProps> = React.memo(({
  v,
  p,
  data,
}) => {
  const showBox = Boolean(
    (v.sales && data.sales) ||
    (v.profit && data.profit) ||
    (v.margin && data.margin) ||
    (v.budget && (p?.budget || data.budget)) ||
    (v.actualCost && (p?.actual || data.actualCost)) ||
    (v.classCode && data.classCode) ||
    (v.vendorCode && data.vendorCode) ||
    (v.contractor && (p?.party || data.party))
  );

  if (!showBox) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 text-[10px] mt-0.5">
      {v.sales && data.sales && (
        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
          Sales: <strong className="font-mono">{Number(data.sales).toLocaleString()}đ</strong>
        </span>
      )}
      {v.profit && data.profit && (
        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
          Profit: <strong className="font-mono">{Number(data.profit).toLocaleString()}đ</strong>
        </span>
      )}
      {v.margin && data.margin && (
        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
          Margin: <strong className="font-mono">{data.margin}%</strong>
        </span>
      )}
      {v.budget && (p?.budget || data.budget) && (
        <span className="font-semibold text-purple-800 dark:text-purple-300">
          Budget: <strong className="font-mono">{Number(p?.budget || data.budget).toLocaleString()}đ</strong>
        </span>
      )}
      {v.actualCost && (p?.actual || data.actualCost) && (
        <span className="font-semibold text-purple-800 dark:text-purple-300">
          Actual: <strong className="font-mono">{Number(p?.actual || data.actualCost).toLocaleString()}đ</strong>
        </span>
      )}
      {v.classCode && data.classCode && (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Class: <strong>{data.classCode}</strong>
        </span>
      )}
      {v.vendorCode && data.vendorCode && (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Vendor: <strong>{data.vendorCode}</strong>
        </span>
      )}
      {v.contractor && (p?.party || data.party) && (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Party: <strong>{p?.party || data.party}</strong>
        </span>
      )}
    </div>
  );
});
