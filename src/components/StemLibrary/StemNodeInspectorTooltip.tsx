import React from 'react';
import { motion, useDragControls } from 'motion/react';
import {
  Plus,
  Minus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  GripHorizontal,
  Zap,
  Calendar,
  Link2,
  GitBranch,
} from 'lucide-react';
import { Task } from '../../types';
import { cn } from '../../lib/utils';
import {
  STEM_CONNECTOR_META,
  STEM_DEPARTMENTS,
  STEM_PARTY_OPTIONS,
  StemConnectorType,
  StemWorkbenchBlock,
} from './stemLibraryTypes';

const CONNECTOR_CYCLE_ORDER: StemConnectorType[] = ['FS', 'SS', 'FF', 'NONE'];

function formatShortDate(isoStr?: string): string {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

export interface StemNodeInspectorTooltipProps {
  block: StemWorkbenchBlock;
  index: number;
  totalCount: number;
  allBlocks?: StemWorkbenchBlock[];
  existingProjectTasks?: Task[];
  onClose: () => void;
  onCycleConnector: (instanceId: string, explicitType?: StemConnectorType) => void;
  onChangeDuration: (instanceId: string, nextDuration: number) => void;
  onChangeName: (instanceId: string, nextName: string) => void;
  onChangeParty: (instanceId: string, nextParty: string) => void;
  onToggleDelegation: (instanceId: string) => void;
  onChangeParentBlock?: (
    instanceId: string,
    nextParent: { parentBlockIndex?: number | null; parentTaskId?: string }
  ) => void;
  onMoveOrder: (index: number, direction: 'up' | 'down') => void;
  onRemoveBlock: (instanceId: string) => void;
}

export const StemNodeInspectorTooltip: React.FC<StemNodeInspectorTooltipProps> = React.memo(
  ({
    block,
    index,
    totalCount,
    allBlocks = [],
    existingProjectTasks = [],
    onClose,
    onCycleConnector,
    onChangeDuration,
    onChangeName,
    onChangeParty,
    onToggleDelegation,
    onChangeParentBlock,
    onMoveOrder,
    onRemoveBlock,
  }) => {
    const tooltipDragControls = useDragControls();

    const currentParentValue =
      typeof block.parentBlockIndex === 'number' && block.parentBlockIndex >= 0
        ? `wb:${block.parentBlockIndex}`
        : block.parentTaskId
          ? `ext:${block.parentTaskId}`
          : '';

    return (
      <motion.div
        drag
        dragControls={tooltipDragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 z-40 w-[calc(100%-1.5rem)] sm:w-[370px] bg-white/98 dark:bg-[#1c1c22]/98 border border-blue-300 dark:border-blue-800/80 rounded-2xl shadow-2xl p-3 space-y-2 backdrop-blur-md"
      >
        {/* Tooltip Draggable Header */}
        <div
          onPointerDown={(e) => tooltipDragControls.start(e)}
          className="modal-handle flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#2c2c34] cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10.5px] font-extrabold shrink-0">
              {block.previewCode || `#${index + 1}`}
            </span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-bold border truncate',
                STEM_DEPARTMENTS[block.department]?.badgeClass
              )}
            >
              {STEM_DEPARTMENTS[block.department]?.shortLabel}
            </span>
            {block.isModularParent && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9.5px] font-extrabold shrink-0">
                PARENT
              </span>
            )}
          </div>

          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 shrink-0"
          >
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveOrder(index, 'up')}
              title="Đưa khối lên trước"
              className="p-1 rounded-lg border border-slate-200 dark:border-[#34343c] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a32] disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={() => onMoveOrder(index, 'down')}
              title="Đưa khối ra sau"
              className="p-1 rounded-lg border border-slate-200 dark:border-[#34343c] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a32] disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                onRemoveBlock(block.instanceId);
                onClose();
              }}
              title="Xóa khối này"
              className="p-1 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng Tooltip"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editable Task Name */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Tên công việc (Task Name)
          </label>
          <input
            type="text"
            value={block.name}
            onChange={(e) => onChangeName(block.instanceId, e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#36363e] bg-slate-50 dark:bg-[#141418] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Parent Task / Node Selector */}
        {onChangeParentBlock && (
          <div>
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1">
              <GitBranch className="w-3 h-3" />
              <span>Task Cha (Parent Task / Node ID)</span>
            </label>
            <select
              value={currentParentValue}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  onChangeParentBlock(block.instanceId, {
                    parentBlockIndex: null,
                    parentTaskId: undefined,
                  });
                } else if (val.startsWith('wb:')) {
                  const pIdx = Number(val.slice(3));
                  onChangeParentBlock(block.instanceId, {
                    parentBlockIndex: !isNaN(pIdx) ? pIdx : null,
                    parentTaskId: undefined,
                  });
                } else if (val.startsWith('ext:')) {
                  onChangeParentBlock(block.instanceId, {
                    parentBlockIndex: null,
                    parentTaskId: val.slice(4),
                  });
                }
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-[#181822] text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">— Không có (Root Task) —</option>
              <optgroup label="Node trong Sơ đồ này (Workflow Nodes)">
                {allBlocks.map((other, oIdx) => {
                  if (oIdx === index || other.parentBlockIndex === index) return null;
                  return (
                    <option key={`wb-${oIdx}`} value={`wb:${oIdx}`}>
                      #{oIdx + 1} ({other.previewCode || `#${oIdx + 1}`}) — {other.name}
                    </option>
                  );
                })}
              </optgroup>
              {existingProjectTasks.length > 0 && (
                <optgroup label="Task có sẵn trong Dự án (Existing Project Tasks)">
                  {existingProjectTasks.map((et) => (
                    <option key={et.id} value={`ext:${et.id}`}>
                      [{et.taskCodePhu || 'Task'}] {et.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {block.parentTaskId &&
                !existingProjectTasks.some((et) => et.id === block.parentTaskId) && (
                  <option value={`ext:${block.parentTaskId}`}>
                    [CSV Parent Ref] {block.parentTaskId}
                  </option>
                )}
            </select>
          </div>
        )}

        {/* Duration & Computed Dates Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-[#25252c] rounded-xl border border-slate-200 dark:border-[#383842] p-0.5">
            <button
              type="button"
              disabled={Boolean(block.isModularParent)}
              onClick={() => onChangeDuration(block.instanceId, Math.max(0, block.duration - 1))}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#32323a] disabled:opacity-40 cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <div className="flex items-center px-2">
              <input
                type="number"
                min="0"
                step="0.5"
                readOnly={Boolean(block.isModularParent)}
                value={block.duration}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    onChangeDuration(block.instanceId, val);
                  }
                }}
                className="w-10 text-center text-xs font-mono font-extrabold bg-transparent text-slate-800 dark:text-white focus:outline-none"
              />
              <span className="text-[10px] font-semibold text-slate-500">ngày</span>
            </div>
            <button
              type="button"
              disabled={Boolean(block.isModularParent)}
              onClick={() => onChangeDuration(block.instanceId, block.duration + 1)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#32323a] disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#25252c] font-mono text-[11px] font-bold">
            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-blue-600 dark:text-blue-400">
              {formatShortDate(block.computedStart)}
            </span>
            <span className="text-slate-400">→</span>
            <span className="text-rose-600 dark:text-rose-400">
              {formatShortDate(block.computedFinish)}
            </span>
          </div>
        </div>

        {/* Dependency Connector Selector (Only for non-parent nodes with index > 0) */}
        {index > 0 && !block.isModularParent && (
          <div>
            <label className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                <span>Khớp nối (Predecessor Link)</span>
              </span>
              {block.externalPredecessor && (
                <span className="font-mono text-[9.5px] text-amber-600 dark:text-amber-400">
                  Ref: {block.externalPredecessor}
                </span>
              )}
            </label>
            <div className="grid grid-cols-4 gap-1">
              {CONNECTOR_CYCLE_ORDER.map((cType) => {
                const meta = STEM_CONNECTOR_META[cType];
                const active = block.connectorToPrev === cType;
                return (
                  <button
                    key={cType}
                    type="button"
                    onClick={() => onCycleConnector(block.instanceId, cType)}
                    className={cn(
                      'py-1 px-1.5 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer',
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-[#25252c] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#36363e] hover:bg-slate-100'
                    )}
                  >
                    {meta.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PIC Party & Delegation Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-1 bg-slate-100 dark:bg-[#25252c] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-[#36363e]">
            <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400">PIC:</span>
            <select
              value={block.party}
              onChange={(e) => onChangeParty(block.instanceId, e.target.value)}
              aria-label="PIC Party"
              className="flex-1 text-xs font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none cursor-pointer"
            >
              {STEM_PARTY_OPTIONS.map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-[#1e1e24]">
                  {p}
                </option>
              ))}
              {!STEM_PARTY_OPTIONS.includes(block.party) && (
                <option value={block.party} className="bg-white dark:bg-[#1e1e24]">
                  {block.party}
                </option>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() => onToggleDelegation(block.instanceId)}
            className={cn(
              'px-2.5 py-1 rounded-xl text-[10.5px] font-extrabold border transition-colors cursor-pointer active:scale-95',
              block.delegation
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-[#25252c] text-slate-400 border-slate-200 dark:border-[#36363e]'
            )}
          >
            <Zap className="w-3 h-3 inline mr-0.5" />
            Deleg: {block.delegation ? 'ON' : 'OFF'}
          </button>
        </div>
      </motion.div>
    );
  }
);
