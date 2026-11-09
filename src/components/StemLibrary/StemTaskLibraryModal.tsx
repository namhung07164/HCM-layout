import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import {
  GripHorizontal,
  X,
  Zap,
  AlertTriangle,
  Calendar,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Layers,
  Building2,
  Plus,
  GitBranch,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getZIndexClass, getZIndexValue, useOverlayStack } from '../../lib/zIndexManager';
import {
  StemPartsBinColumn,
  StemPresetTopBar,
  StemN8nFlowCanvas,
} from './StemWorkbenchSubcomponents';
import { StemPresetEditorModal } from './StemPresetEditorModal';
import { StemPresetPackage } from './stemLibraryTypes';
import { useStemWorkbenchState } from './useStemWorkbenchState';

interface StemTaskLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProjectId?: string;
  initialProjectCode?: string;
}

export const StemTaskLibraryModal: React.FC<StemTaskLibraryModalProps> = ({
  isOpen,
  onClose,
  initialProjectId,
  initialProjectCode,
}) => {
  const dragControls = useDragControls();
  const [isPartsDrawerOpen, setIsPartsDrawerOpen] = useState(false);
  const [inspectingPreset, setInspectingPreset] = useState<StemPresetPackage | null>(null);
  const zInfo = useOverlayStack({
    layer: 'MODAL_MODULAR',
    isOpen,
    onClose,
    closeOnTabChange: true,
  });
  const {
    isAdmin,
    projects,
    targetProject,
    setSelectedProjectId,
    existingProjectTasks,
    targetParentTaskId,
    setTargetParentTaskId,
    presets,
    partsBin,
    activePresetId,
    anchorMode,
    setAnchorMode,
    customAnchorDate,
    setCustomAnchorDate,
    appendOnPresetClick,
    setAppendOnPresetClick,
    setWorkbenchBlocks,
    isSubmitting,
    errorMsg,
    schedule,
    handleSelectPreset,
    handleUpdatePreset,
    handleResetBuiltInPreset,
    hasBuiltInPresetOverride,
    handleDeleteCustomPreset,
    handleAddPart,
    handleCycleConnector,
    handleChangeDuration,
    handleChangeName,
    handleChangeParty,
    handleToggleDelegation,
    handleChangeParentBlock,
    handleMoveOrder,
    handleRemoveBlock,
    handleImportCsvToWorkbench,
    handleSaveCurrentCanvasAsPreset,
    handleAutoParallelOptimize,
    handleApplyToProject,
  } = useStemWorkbenchState({
    isOpen,
    onClose,
    initialProjectId,
    initialProjectCode,
  });

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{ zIndex: zInfo.zValue || getZIndexValue('MODAL_MODULAR') }}
      className={cn(
        'fixed inset-0 z-[250000] flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs',
        getZIndexClass('MODAL_MODULAR')
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative z-10 w-full max-w-5xl max-h-[92vh] bg-white dark:bg-[#131316] border border-slate-200 dark:border-[#2e2e32] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Draggable Modal Header */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="modal-handle px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="w-7 h-7 rounded-xl bg-[#ff6d5a]/20 border border-[#ff6d5a]/40 flex items-center justify-center text-[#ff6d5a] shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate flex items-center gap-2">
                <span>⚡ STEM Task Workflow Builder</span>
                <span className="hidden sm:inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  n8n Node Flow
                </span>
              </h2>
            </div>
          </div>

          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <select
                value={targetProject?.id || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                aria-label="Target Project"
                className="text-xs font-bold text-white bg-transparent focus:outline-none max-w-[160px] sm:max-w-[260px] truncate cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    [{p.store || 'HCM'} • {p.year || ''}] {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close STEM Workbench"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500/80 text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zone 1: Desktop-Friendly Workflow Templates Bar + CSV Import */}
        <StemPresetTopBar
          presets={presets}
          activePresetId={activePresetId}
          isAdmin={isAdmin}
          onSelectPreset={handleSelectPreset}
          onInspectPreset={(preset) => setInspectingPreset(preset)}
          onDeleteCustomPreset={handleDeleteCustomPreset}
          onImportCsv={handleImportCsvToWorkbench}
          onSaveCanvasAsPreset={schedule.blocks.length > 0 ? handleSaveCurrentCanvasAsPreset : undefined}
        />

        {/* Compact Schedule, Anchor & Root Parent Task Control Strip */}
        <div className="px-3.5 py-2 bg-slate-50/70 dark:bg-[#19191d] border-b border-slate-200 dark:border-[#2e2e32] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-[#252529] p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setAnchorMode('forward')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95',
                  anchorMode === 'forward'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-[#a3a3a3] hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Chế độ Tiến (Forward)
              </button>
              <button
                type="button"
                onClick={() => setAnchorMode('backward')}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95',
                  anchorMode === 'backward'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-[#a3a3a3] hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Chế độ Lùi (Opening)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#9e9ea2] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {anchorMode === 'forward' ? 'Mốc bắt đầu:' : 'Khai trương:'}
              </span>
              <input
                type="date"
                value={customAnchorDate}
                onChange={(e) => setCustomAnchorDate(e.target.value)}
                className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-[#3c3c42] bg-white dark:bg-[#222226] text-xs font-mono font-bold text-slate-800 dark:text-white"
              />
            </div>

            {existingProjectTasks.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#9e9ea2] flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-purple-500" />
                  <span>Parent Task:</span>
                </span>
                <select
                  value={targetParentTaskId}
                  onChange={(e) => setTargetParentTaskId(e.target.value)}
                  className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-[#3c3c42] bg-white dark:bg-[#222226] text-[11px] font-bold text-slate-800 dark:text-white max-w-[180px] truncate cursor-pointer"
                  title="Chọn Task Cha trong dự án (Tùy chọn) để gắn toàn bộ sơ đồ này làm con"
                >
                  <option value="">-- Không (Root Dự án) --</option>
                  {existingProjectTasks.map((pt, pIdx) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.taskCodePhu ? `[${pt.taskCodePhu}] ` : `[#${pIdx + 1}] `}
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {schedule.blocks.length > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-[#26262b] text-slate-700 dark:text-[#d4d4d8] font-mono text-[11px] font-bold flex items-center gap-1">
                <span>{schedule.earliestStart.slice(0, 10)}</span>
                <ArrowRight className="w-3 h-3" />
                <span>{schedule.latestFinish.slice(0, 10)}</span>
                <span className="text-blue-600 dark:text-blue-400">
                  ({schedule.totalSpanDays}d)
                </span>
              </span>
            )}

            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-[#b3b3b3] cursor-pointer">
              <input
                type="checkbox"
                checked={appendOnPresetClick}
                onChange={(e) => setAppendOnPresetClick(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Nối thêm mẫu</span>
            </label>

            <button
              type="button"
              onClick={() => setWorkbenchBlocks([])}
              title="Xóa trắng bàn lắp ghép"
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Main Workspace: Collapsible Lego Parts Drawer + Full-Bleed n8n Flow Canvas */}
        <div className="flex-1 flex flex-col md:flex-row min-h-[340px] overflow-hidden relative">
          {isPartsDrawerOpen && (
            <StemPartsBinColumn parts={partsBin} onAddPart={handleAddPart} />
          )}

          {schedule.blocks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#2d2d35_1.2px,transparent_1.2px)] [background-size:18px_18px]">
              <div className="p-6 rounded-2xl bg-white/95 dark:bg-[#1c1c21]/95 border border-slate-200 dark:border-[#2e2e34] shadow-lg max-w-md flex flex-col items-center">
                <Layers className="w-10 h-10 text-[#ff6d5a] mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Workflow Canvas đang trống
                </p>
                <p className="text-xs text-slate-500 dark:text-[#a3a3a3] mt-1">
                  Chọn 1 Gói mẫu chuẩn, bấm [Import CSV lên Bàn Lắp] hoặc bấm [+ Thêm Khối] để thêm các Node công việc lên sơ đồ n8n.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPartsDrawerOpen(true)}
                  className="mt-3 px-3.5 py-1.5 rounded-full bg-[#ff6d5a] hover:bg-[#ff5640] text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mở Kho Khối Lẻ (+ Node)</span>
                </button>
              </div>
            </div>
          ) : (
            <StemN8nFlowCanvas
              blocks={schedule.blocks}
              anchorMode={anchorMode}
              isPartsDrawerOpen={isPartsDrawerOpen}
              existingProjectTasks={existingProjectTasks}
              onTogglePartsDrawer={() => setIsPartsDrawerOpen((v) => !v)}
              onCycleConnector={handleCycleConnector}
              onChangeDuration={handleChangeDuration}
              onChangeName={handleChangeName}
              onChangeParty={handleChangeParty}
              onToggleDelegation={handleToggleDelegation}
              onChangeParentBlock={handleChangeParentBlock}
              onMoveOrder={handleMoveOrder}
              onRemoveBlock={handleRemoveBlock}
            />
          )}
        </div>

        {/* Modal Footer: Opening Risk Warning & Apply Action */}
        <div className="p-3 bg-slate-50 dark:bg-[#18181b] border-t border-slate-200 dark:border-[#2e2e32] space-y-2 shrink-0">
          {schedule.risk.hasRisk && (
            <div
              className={cn(
                'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl text-xs border font-medium transition-all',
                schedule.risk.level === 'critical'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
              )}
            >
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle
                  className={cn(
                    'w-4 h-4 shrink-0 mt-0.5',
                    schedule.risk.level === 'critical' ? 'text-red-500 animate-pulse' : 'text-amber-500'
                  )}
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-[11px] uppercase tracking-wide">
                      Cảnh báo Rủi ro Trễ Ngày Khai Trương ({schedule.risk.daysLate} ngày)
                    </span>
                  </div>
                  {schedule.risk.reasons.map((r, i) => (
                    <p key={i} className="text-[11px] leading-snug">
                      • {r}
                    </p>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoParallelOptimize}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 touch-manipulation"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Chuyển MEP/IT sang ⚡ SS</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500 dark:text-[#9e9ea2] flex items-center gap-2">
              <span>
                Mã tự động:{' '}
                <strong className="font-mono text-slate-800 dark:text-white">
                  {targetProject?.code || 'PROJ'}#{schedule.nextStartIndex} → #
                  {schedule.nextStartIndex + Math.max(0, schedule.blocks.length - 1)}
                </strong>
              </span>
              <span>•</span>
              <span>
                Ủy quyền (Delegation):{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {schedule.blocks.filter((b) => b.delegation).length} nhóm
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#343438] text-xs font-bold text-slate-600 dark:text-[#c3c3c3] hover:bg-slate-100 dark:hover:bg-[#26262a] cursor-pointer"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                disabled={!targetProject || schedule.blocks.length === 0 || isSubmitting}
                onClick={handleApplyToProject}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 touch-manipulation"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Đang hàn mạch...'
                    : `Áp dụng vào Dự án (${schedule.blocks.length} công việc)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {inspectingPreset && (
        <StemPresetEditorModal
          isOpen={Boolean(inspectingPreset)}
          onClose={() => setInspectingPreset(null)}
          preset={inspectingPreset}
          isAdmin={Boolean(isAdmin)}
          hasOverride={hasBuiltInPresetOverride(inspectingPreset.id)}
          onSavePreset={handleUpdatePreset}
          onResetBuiltIn={handleResetBuiltInPreset}
          onDeleteCustom={handleDeleteCustomPreset}
          onApplyToCanvas={handleSelectPreset}
        />
      )}
    </div>,
    document.body
  );
};

export default StemTaskLibraryModal;
