import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Ruler,
  TrendingUp,
  CheckCircle2,
  Camera,
  Maximize,
  Tags,
} from 'lucide-react';
import { useDataStore } from '../PictureMapping/DataContext';
import { useAppStore } from '../../store/useAppStore';

export type SecondaryLabelMode = 'none' | 'brand' | 'area' | 'sales' | 'margin' | 'status';

const SECONDARY_LABEL_STORAGE_KEY = 'hcm_layout_secondary_label_mode_v1';

export function getSavedSecondaryLabelMode(): SecondaryLabelMode {
  if (typeof window === 'undefined') return 'none';
  try {
    const val = localStorage.getItem(SECONDARY_LABEL_STORAGE_KEY) as SecondaryLabelMode | null;
    if (val && ['none', 'brand', 'area', 'sales', 'margin', 'status'].includes(val)) {
      return val;
    }
  } catch {}
  return 'none';
}

interface LayoutFloorKpiBarProps {
  activeStore: string;
  activeLocation: string;
  activeYear: string;
}

function formatCompactVnd(val: number): string {
  if (!val || !Number.isFinite(val)) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(2)} Tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(0)} Tr`;
  }
  return val.toLocaleString('vi-VN');
}

export const LayoutFloorKpiBar: React.FC<LayoutFloorKpiBarProps> = React.memo(({
  activeStore,
  activeLocation,
  activeYear,
}) => {
  const unitInfo = useDataStore((s) => s.unitInfo);
  const sales = useDataStore((s) => s.sales);
  const profits = useDataStore((s) => s.profits);
  const projectStatus = useDataStore((s) => s.projectStatus);
  const storeLocationData = useDataStore((s) => s.storeLocationData);
  const mapUnits = useDataStore((s) => s.mapUnits);
  const setToast = useAppStore((s) => s.setToast);

  const [secondaryMode, setSecondaryMode] = useState<SecondaryLabelMode>(() =>
    getSavedSecondaryLabelMode()
  );

  useEffect(() => {
    const handleCloudOrModeChange = () => {
      setSecondaryMode(getSavedSecondaryLabelMode());
    };
    window.addEventListener('taka_secondary_label_changed', handleCloudOrModeChange);
    return () => window.removeEventListener('taka_secondary_label_changed', handleCloudOrModeChange);
  }, []);

  const handleModeChange = (next: SecondaryLabelMode) => {
    setSecondaryMode(next);
    try {
      localStorage.setItem(SECONDARY_LABEL_STORAGE_KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent('taka_secondary_label_changed', { detail: next }));
  };

  const kpis = useMemo(() => {
    const normStore = String(activeStore || 'HCM').toUpperCase().trim();
    const normLoc = String(activeLocation || 'L1').toUpperCase().trim();
    const isAllLoc = !normLoc || normLoc === 'ALL';

    const partitionKey = `${normStore}_${normLoc}`;
    const partitionUnits =
      storeLocationData?.[partitionKey]?.mapUnits || mapUnits || [];
    const totalCadPolygons = Array.isArray(partitionUnits) ? partitionUnits.length : 0;

    const floorUnits = (unitInfo || []).filter((u: any) => {
      const s = String(u.store || 'HCM').toUpperCase().trim();
      const f = String(u.floor || u.location || '').toUpperCase().trim();
      return s === normStore && (isAllLoc || !f || f === normLoc);
    });

    const totalAreaM2 = floorUnits.reduce(
      (sum: number, u: any) => sum + (Number(u.size ?? u.area ?? 0) || 0),
      0
    );

    const floorSales = (sales || []).filter((sItem: any) => {
      const s = String(sItem.store || 'HCM').toUpperCase().trim();
      const f = String(sItem.floor || sItem.location || '').toUpperCase().trim();
      return s === normStore && (isAllLoc || !f || f === normLoc);
    });
    const totalSales = floorSales.reduce(
      (sum: number, sItem: any) => sum + (Number(sItem.salesAmount ?? sItem.sales ?? 0) || 0),
      0
    );

    const floorProfits = (profits || []).filter((pItem: any) => {
      const s = String(pItem.store || 'HCM').toUpperCase().trim();
      const f = String(pItem.floor || pItem.location || '').toUpperCase().trim();
      return s === normStore && (isAllLoc || !f || f === normLoc);
    });
    const totalProfit = floorProfits.reduce(
      (sum: number, pItem: any) => sum + (Number(pItem.profitAmount ?? pItem.profit ?? 0) || 0),
      0
    );

    const avgMargin =
      totalSales > 0
        ? (totalProfit / totalSales) * 100
        : floorProfits.length > 0
        ? floorProfits.reduce((sum: number, p: any) => sum + (Number(p.margin ?? 0) || 0), 0) /
          floorProfits.length
        : 0;

    const floorProj = (projectStatus || []).filter((p: any) => {
      const s = String(p.store || 'HCM').toUpperCase().trim();
      const f = String(p.floor || p.location || '').toUpperCase().trim();
      return s === normStore && (isAllLoc || !f || f === normLoc);
    });
    const completedCount = floorProj.filter((p: any) =>
      String(p.actStatus || p.projectStatus || p.status || '')
        .toLowerCase()
        .includes('complete')
    ).length;

    const matchedCount = floorUnits.length;
    const denominator = Math.max(totalCadPolygons, matchedCount, 1);
    const occupancyPct = Math.min(100, Math.round((matchedCount / denominator) * 100));

    return {
      totalCadPolygons,
      matchedCount,
      occupancyPct,
      totalAreaM2,
      totalSales,
      totalProfit,
      avgMargin,
      completedCount,
      totalProjCount: floorProj.length,
    };
  }, [
    activeStore,
    activeLocation,
    activeYear,
    unitInfo,
    sales,
    profits,
    projectStatus,
    storeLocationData,
    mapUnits,
  ]);

  const handleSnapshotExport = () => {
    window.dispatchEvent(new CustomEvent('export-png'));
    setToast({
      title: 'Snapshot Mặt Bằng',
      message: `Đang kết xuất ảnh mặt bằng ${activeStore} • ${activeLocation} độ phân giải cao...`,
      type: 'info',
    });
  };

  const handleFitScreen = () => {
    window.dispatchEvent(new CustomEvent('taka-fit-screen'));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 mb-1.5 rounded-xl bg-white/90 dark:bg-[#18181b]/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs hide-on-actual-print print:hidden">
      {/* Left: Real-time Floor KPI Scorecard Pills */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div
          className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          title="Số lượng Unit có dữ liệu trên tổng số ô mặt bằng"
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">Units:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {kpis.matchedCount}
            {kpis.totalCadPolygons > 0 ? `/${kpis.totalCadPolygons}` : ''}
          </span>
          {kpis.totalCadPolygons > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
              {kpis.occupancyPct}%
            </span>
          )}
        </div>

        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div
          className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          title="Tổng diện tích hợp đồng của tầng đang chọn"
        >
          <Ruler className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">Diện tích:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {kpis.totalAreaM2.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²
          </span>
        </div>

        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div
          className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          title="Tiến độ hoàn thành dự án trên tầng"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">Hoàn thành:</span>
          <span className="font-bold text-sky-700 dark:text-sky-400">
            {kpis.completedCount}/{kpis.totalProjCount}
          </span>
        </div>

        {kpis.totalSales > 0 && (
          <>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />
            <div
              className="hidden md:flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
              title="Tổng doanh thu & Lợi nhuận gộp trung bình của tầng"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Sales:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {formatCompactVnd(kpis.totalSales)}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">
                Margin {kpis.avgMargin.toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Dual-Metric Polygon Label Selector + Fit Screen (F) + Snapshot PNG */}
      <div className="flex items-center gap-1.5 ml-auto">
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700"
          title="Hiển thị thêm chỉ số phụ (Dual-Metric Label) trực tiếp dưới mã Unit trên mặt bằng"
        >
          <Tags className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
          <select
            value={secondaryMode}
            onChange={(e) => handleModeChange(e.target.value as SecondaryLabelMode)}
            className="bg-transparent border-none text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="none">Nhãn phụ: Tắt</option>
            <option value="brand">Nhãn phụ: + Tên Brand</option>
            <option value="area">Nhãn phụ: + Diện tích (m²)</option>
            <option value="sales">Nhãn phụ: + Doanh thu</option>
            <option value="margin">Nhãn phụ: + Margin (%)</option>
            <option value="status">Nhãn phụ: + Trạng thái</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleFitScreen}
          title="Căn vừa màn hình (Phím tắt: F)"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
        >
          <Maximize className="w-3 h-3" />
          <span className="hidden sm:inline">Fit (F)</span>
        </button>

        <button
          type="button"
          onClick={handleSnapshotExport}
          title="Xuất nhanh ảnh mặt bằng độ phân giải cao (PNG Snapshot)"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all active:scale-95 cursor-pointer"
        >
          <Camera className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Snapshot PNG</span>
        </button>
      </div>
    </div>
  );
});
