import React, { useState, useMemo, useRef } from 'react';
import { Plus, Sparkles, X, Eye, Edit3, Upload, BookmarkPlus } from 'lucide-react';
import { DebouncedSearchInput } from '../DebouncedSearchInput';
import { cn } from '../../lib/utils';
import {
  STEM_DEPARTMENTS,
  StemDepartmentId,
  StemLibraryBlockTemplate,
  StemPresetPackage,
} from './stemLibraryTypes';
import { computeEffectivePresetDays } from './stemCsvImportParser';

const PRESET_THEME_CLASSES: Record<StemPresetPackage['themeColor'], string> = {
  amber:
    'border-amber-200/90 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/25 hover:border-amber-400 dark:hover:border-amber-600 text-amber-900 dark:text-amber-200',
  rose:
    'border-rose-200/90 dark:border-rose-800/60 bg-gradient-to-br from-rose-50/90 to-pink-50/60 dark:from-rose-950/40 dark:to-pink-950/25 hover:border-rose-400 dark:hover:border-rose-600 text-rose-900 dark:text-rose-200',
  purple:
    'border-purple-200/90 dark:border-purple-800/60 bg-gradient-to-br from-purple-50/90 to-indigo-50/60 dark:from-purple-950/40 dark:to-indigo-950/25 hover:border-purple-400 dark:hover:border-purple-600 text-purple-900 dark:text-purple-200',
  emerald:
    'border-emerald-200/90 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/90 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/25 hover:border-emerald-400 dark:hover:border-emerald-600 text-emerald-900 dark:text-emerald-200',
  blue:
    'border-blue-200/90 dark:border-blue-800/60 bg-gradient-to-br from-blue-50/90 to-sky-50/60 dark:from-blue-950/40 dark:to-sky-950/25 hover:border-blue-400 dark:hover:border-blue-600 text-blue-900 dark:text-blue-200',
  cyan:
    'border-cyan-200/90 dark:border-cyan-800/60 bg-gradient-to-br from-cyan-50/90 to-blue-50/60 dark:from-cyan-950/40 dark:to-blue-950/25 hover:border-cyan-400 dark:hover:border-cyan-600 text-cyan-900 dark:text-cyan-200',
};

interface StemPresetTopBarProps {
  presets: StemPresetPackage[];
  activePresetId: string | null;
  isAdmin?: boolean;
  onSelectPreset: (preset: StemPresetPackage) => void;
  onInspectPreset?: (preset: StemPresetPackage) => void;
  onDeleteCustomPreset?: (presetId: string) => void;
  onImportCsv?: (csvText: string, fileName?: string, alsoSaveAsPreset?: boolean) => Promise<void>;
  onSaveCanvasAsPreset?: () => Promise<void>;
}

export const StemPresetTopBar: React.FC<StemPresetTopBarProps> = React.memo(
  ({
    presets,
    activePresetId,
    isAdmin,
    onSelectPreset,
    onInspectPreset,
    onDeleteCustomPreset,
    onImportCsv,
    onSaveCanvasAsPreset,
  }) => {
    const csvInputRef = useRef<HTMLInputElement | null>(null);
    const [saveOnCsvImport, setSaveOnCsvImport] = useState(true);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !onImportCsv) return;
      try {
        const text = await file.text();
        await onImportCsv(text, file.name, saveOnCsvImport);
      } catch (err) {
        console.warn('[StemPresetTopBar] CSV read failed:', err);
      }
    };

    return (
      <div className="px-3.5 py-2.5 bg-slate-50/95 dark:bg-[#18181b] border-b border-slate-200/80 dark:border-[#2e2e32] flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9e9ea2] flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Workflow Templates ({presets.length}) — Click to Load</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {onImportCsv && (
              <>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSaveOnCsvImport(false);
                    csvInputRef.current?.click();
                  }}
                  title="Nạp file CSV (hỗ trợ cả Parent Task Code & Predecessor) thẳng lên bàn lắp ghép"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 touch-manipulation"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import CSV lên Bàn Lắp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaveOnCsvImport(true);
                    csvInputRef.current?.click();
                  }}
                  title="Import file CSV và tự động đóng gói lưu thành Gói Mẫu mới trong Thư viện"
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 touch-manipulation"
                >
                  <BookmarkPlus className="w-3 h-3" />
                  <span>Import CSV vào Thư Viện</span>
                </button>
              </>
            )}

            {onSaveCanvasAsPreset && (
              <button
                type="button"
                onClick={() => onSaveCanvasAsPreset()}
                title="Lưu sơ đồ hiện tại trên Canvas thành Gói Mẫu trong Thư viện"
                className="px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 touch-manipulation"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>Lưu Sơ Đồ thành Mẫu</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop-friendly wrapping grid: all templates visible at once on desktop, horizontal scroll on mobile */}
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-2 overflow-x-auto sm:overflow-visible pb-0.5 sm:pb-0">
          {presets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            const totalDays = computeEffectivePresetDays(preset.blocks);
            const hasParentHierarchy = preset.blocks.some(
              (b) => b.isModularParent || typeof b.parentBlockIndex === 'number' || Boolean(b.parentTaskId)
            );
            return (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                role="button"
                tabIndex={0}
                title={`${preset.subtitle} (~${totalDays}d)`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectPreset(preset);
                  }
                }}
                className={cn(
                  'group relative shrink-0 sm:shrink px-3 py-2 rounded-xl border text-left transition-all cursor-pointer select-none active:scale-98 touch-manipulation flex items-center justify-between gap-2 min-w-[230px] sm:min-w-0',
                  PRESET_THEME_CLASSES[preset.themeColor] || PRESET_THEME_CLASSES.blue,
                  isSelected && 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-sm'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-base leading-none shrink-0">{preset.emoji || '📦'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs truncate flex items-center gap-1">
                      <span className="truncate">{preset.title}</span>
                      {hasParentHierarchy && (
                        <span
                          title="Contains Parent-Child Task Hierarchy"
                          className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[9px] font-mono shrink-0"
                        >
                          Tree
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-75 truncate">{preset.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-white/85 dark:bg-black/45 border border-black/5 dark:border-white/10 whitespace-nowrap">
                    {preset.blocks.length}n • {totalDays}d
                  </span>

                  {onInspectPreset && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectPreset(preset);
                      }}
                      title={
                        isAdmin
                          ? 'Review & Edit Template Content (Admin)'
                          : 'Review Template Content'
                      }
                      className="p-1 rounded-lg bg-white/75 hover:bg-white dark:bg-black/40 dark:hover:bg-black/70 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/15 transition-colors cursor-pointer active:scale-90"
                    >
                      {isAdmin ? (
                        <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {!preset.isBuiltIn && onDeleteCustomPreset && isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomPreset(preset.id);
                      }}
                      title="Delete custom preset"
                      className="p-1 rounded-lg bg-white/70 hover:bg-red-500 hover:text-white dark:bg-black/40 text-slate-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

interface StemPartsBinColumnProps {
  parts: StemLibraryBlockTemplate[];
  onAddPart: (part: StemLibraryBlockTemplate) => void;
}

export const StemPartsBinColumn: React.FC<StemPartsBinColumnProps> = React.memo(
  ({ parts, onAddPart }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [customName, setCustomName] = useState('');
    const [customDays, setCustomDays] = useState('3');
    const [customDept, setCustomDept] = useState<StemDepartmentId>('interior_hoarding');

    const filteredPartsByDept = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      const map: Record<StemDepartmentId, StemLibraryBlockTemplate[]> = {
        prep_bql: [],
        mep_pccc: [],
        interior_hoarding: [],
        it_pos_handover: [],
      };
      parts.forEach((p) => {
        if (
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.party.toLowerCase().includes(q) ||
          STEM_DEPARTMENTS[p.department]?.shortLabel.toLowerCase().includes(q)
        ) {
          map[p.department]?.push(p);
        }
      });
      return map;
    }, [parts, searchQuery]);

    const handleAddCustomBlock = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = customName.trim();
      if (!trimmed) return;
      const dur = Math.max(0.5, parseFloat(customDays) || 2);
      onAddPart({
        id: `adhoc-${Date.now()}`,
        name: trimmed,
        defaultDuration: dur,
        department: customDept,
        party:
          customDept === 'prep_bql'
            ? 'PMO'
            : customDept === 'mep_pccc'
              ? 'MEP Contractor'
              : customDept === 'interior_hoarding'
                ? 'Thạch Cao SG'
                : 'IT Store',
        delegation: customDept !== 'prep_bql',
        defaultConnector: 'FS',
      });
      setCustomName('');
    };

    return (
      <div className="w-full md:w-[35%] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#2e2e32] bg-slate-50/50 dark:bg-[#161618] flex flex-col min-h-0">
        <div className="p-3 border-b border-slate-200/80 dark:border-[#2e2e32] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#c3c3c3]">
              Zone 2 — Kho Khối Lẻ (Lego Parts Bin)
            </span>
            <span className="text-[10px] font-semibold text-slate-400">{parts.length} khối</span>
          </div>

          <DebouncedSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Tìm tên công việc, bộ phận..."
            debounceMs={180}
            showAssistant={false}
            inputClassName="py-1.5 text-xs"
          />

          <form onSubmit={handleAddCustomBlock} className="flex items-center gap-1 pt-0.5">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="+ Tạo nhanh khối tùy chỉnh..."
              className="flex-1 min-w-0 px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#1e1e20] border border-slate-200 dark:border-[#38383a] text-slate-800 dark:text-[#e3e3e3]"
            />
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              title="Số ngày"
              className="w-12 px-1.5 py-1 text-xs text-center rounded-lg bg-white dark:bg-[#1e1e20] border border-slate-200 dark:border-[#38383a] text-slate-800 dark:text-[#e3e3e3]"
            />
            <select
              value={customDept}
              onChange={(e) => setCustomDept(e.target.value as StemDepartmentId)}
              aria-label="Chọn ngăn bộ phận"
              className="w-20 px-1 py-1 text-[10px] rounded-lg bg-white dark:bg-[#1e1e20] border border-slate-200 dark:border-[#38383a] text-slate-700 dark:text-[#c3c3c3]"
            >
              <option value="prep_bql">BQL</option>
              <option value="mep_pccc">MEP</option>
              <option value="interior_hoarding">Nội thất</option>
              <option value="it_pos_handover">IT/POS</option>
            </select>
            <button
              type="submit"
              disabled={!customName.trim()}
              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer active:scale-95 touch-manipulation"
            >
              +
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
          {(Object.keys(STEM_DEPARTMENTS) as StemDepartmentId[]).map((deptId) => {
            const dept = STEM_DEPARTMENTS[deptId];
            const deptParts = filteredPartsByDept[deptId] || [];
            if (deptParts.length === 0) return null;

            return (
              <div
                key={deptId}
                className="rounded-xl border border-slate-200/80 dark:border-[#2e2e32] bg-white dark:bg-[#1c1c1f] overflow-hidden shadow-2xs"
              >
                <div
                  className={cn(
                    'px-2.5 py-1.5 text-[11px] font-bold flex items-center justify-between border-b border-slate-100 dark:border-[#2a2a2d]',
                    dept.headerBgClass
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', dept.dotClass)} />
                    <span className="truncate">{dept.label}</span>
                  </span>
                  <span className="text-[10px] opacity-75 shrink-0">{deptParts.length}</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-[#262629]">
                  {deptParts.map((part) => (
                    <div
                      key={part.id}
                      className="px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-[#242428] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 dark:text-[#e3e3e3] truncate">
                          {part.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 dark:text-[#838383]">
                            PIC: {part.party}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#2a2a2e] text-slate-700 dark:text-[#c3c3c3]">
                          {part.defaultDuration}d
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddPart(part)}
                          title="Nhặt sang bàn lắp ghép"
                          className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-2xs cursor-pointer active:scale-90 touch-manipulation transition-transform"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
