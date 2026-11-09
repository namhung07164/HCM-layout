import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import {
  GripHorizontal, X, Plus, Trash2, ArrowUp, ArrowDown,
  Save, RotateCcw, Eye, Edit3, Layers, CheckCircle2, FileUp, GitBranch,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getZIndexClass, getZIndexValue, useOverlayStack } from '../../lib/zIndexManager';
import {
  STEM_CONNECTOR_META, STEM_DEPARTMENTS, STEM_PARTY_OPTIONS,
  StemConnectorType, StemDepartmentId, StemPresetBlockSeed, StemPresetPackage,
} from './stemLibraryTypes';
import { computeEffectivePresetDays, parseStemBlocksFromCsvText } from './stemCsvImportParser';

interface StemPresetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: StemPresetPackage | null;
  isAdmin: boolean;
  hasOverride?: boolean;
  onSavePreset: (updated: StemPresetPackage) => Promise<void>;
  onResetBuiltIn?: (presetId: string) => Promise<void>;
  onDeleteCustom?: (presetId: string) => Promise<void>;
  onApplyToCanvas?: (preset: StemPresetPackage) => void;
}

const EMOJI_OPTIONS = ['📦', '🍔', '👗', '🎪', '🔨', '⚡', '🏗️', '🛍️', '🎨', '🛠️'];
const COLOR_OPTIONS: Array<{ id: StemPresetPackage['themeColor']; label: string; dot: string }> = [
  { id: 'amber', label: 'Amber', dot: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', dot: 'bg-rose-500' },
  { id: 'purple', label: 'Purple', dot: 'bg-purple-500' },
  { id: 'emerald', label: 'Emerald', dot: 'bg-emerald-500' },
  { id: 'blue', label: 'Blue', dot: 'bg-blue-500' },
  { id: 'cyan', label: 'Cyan', dot: 'bg-cyan-500' },
];

export const StemPresetEditorModal: React.FC<StemPresetEditorModalProps> = ({
  isOpen, onClose, preset, isAdmin, hasOverride = false,
  onSavePreset, onResetBuiltIn, onDeleteCustom, onApplyToCanvas,
}) => {
  const dragControls = useDragControls();
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const zInfo = useOverlayStack({ layer: 'MODAL_MODULAR', isOpen, onClose, closeOnTabChange: true });

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [themeColor, setThemeColor] = useState<StemPresetPackage['themeColor']>('amber');
  const [blocks, setBlocks] = useState<StemPresetBlockSeed[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !preset) return;
    setTitle(preset.title || '');
    setSubtitle(preset.subtitle || '');
    setEmoji(preset.emoji || '📦');
    setThemeColor(preset.themeColor || 'amber');
    setBlocks(
      (preset.blocks || []).map((b) => ({
        name: b.name || '',
        duration: Number(b.duration) === 0 ? 0 : Math.max(0.5, Number(b.duration) || 1),
        department: b.department || 'prep_bql',
        party: b.party || 'PMO',
        delegation: Boolean(b.delegation),
        connectorToPrev: b.connectorToPrev || 'FS',
        lagDays: Number(b.lagDays) || 0,
        parentBlockIndex: typeof b.parentBlockIndex === 'number' ? b.parentBlockIndex : null,
        parentTaskId: b.parentTaskId,
        isModularParent: Boolean(b.isModularParent),
        predecessorBlockIndex: typeof b.predecessorBlockIndex === 'number' ? b.predecessorBlockIndex : null,
        externalPredecessor: b.externalPredecessor,
      }))
    );
  }, [isOpen, preset]);

  if (!isOpen || !preset || typeof document === 'undefined') return null;

  const totalDays = computeEffectivePresetDays(blocks);

  const handleUpdateBlock = (idx: number, patch: Partial<StemPresetBlockSeed>) => {
    if (!isAdmin) return;
    setBlocks((prev) => {
      const next = prev.map((b, i) => (i === idx ? { ...b, ...patch } : { ...b }));
      const parentSet = new Set<number>();
      next.forEach((b) => {
        if (typeof b.parentBlockIndex === 'number' && b.parentBlockIndex >= 0) {
          parentSet.add(b.parentBlockIndex);
        }
      });
      return next.map((b, i) => ({ ...b, isModularParent: parentSet.has(i) }));
    });
  };

  const handleMoveBlock = (idx: number, dir: 'up' | 'down') => {
    if (!isAdmin) return;
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= blocks.length) return;
    setBlocks((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return next.map((b) => {
        let pIdx = b.parentBlockIndex;
        if (pIdx === idx) pIdx = target;
        else if (pIdx === target) pIdx = idx;
        return { ...b, parentBlockIndex: pIdx };
      });
    });
  };

  const handleRemoveBlock = (idx: number) => {
    if (!isAdmin) return;
    setBlocks((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((b) => ({
          ...b,
          parentBlockIndex:
            typeof b.parentBlockIndex === 'number'
              ? b.parentBlockIndex === idx
                ? null
                : b.parentBlockIndex > idx
                  ? b.parentBlockIndex - 1
                  : b.parentBlockIndex
              : null,
        }))
    );
  };

  const handleAddBlock = () => {
    if (!isAdmin) return;
    setBlocks((prev) => [
      ...prev,
      {
        name: `New Task Node #${prev.length + 1}`,
        duration: 3,
        department: 'interior_hoarding',
        party: 'PMO',
        delegation: true,
        connectorToPrev: 'FS',
        lagDays: 0,
        parentBlockIndex: null,
      },
    ]);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = parseStemBlocksFromCsvText(text, file.name);
    if (parsed.blocks.length > 0) {
      setBlocks(parsed.blocks);
      if (!title.trim()) setTitle(parsed.suggestedTitle);
      setSubtitle(parsed.suggestedSubtitle);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !title.trim() || blocks.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const updated: StemPresetPackage = {
        ...preset,
        title: title.trim(),
        subtitle: subtitle.trim(),
        emoji,
        themeColor,
        blocks: blocks.map((b, i) => ({
          ...b,
          name: b.name.trim() || `Node #${i + 1}`,
          duration: Number(b.duration) === 0 ? 0 : Math.max(0.5, Number(b.duration) || 1),
          connectorToPrev: i === 0 ? 'FS' : b.connectorToPrev || 'FS',
        })),
      };
      await onSavePreset(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      style={{ zIndex: (zInfo.zValue || getZIndexValue('MODAL_MODULAR')) + 20 }}
      className={cn(
        'fixed inset-0 z-[250050] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs',
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
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#16161a] border border-slate-200 dark:border-[#2e2e36] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="modal-handle px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              {isAdmin ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate flex items-center gap-2">
                <span>
                  {isAdmin ? 'Review & Edit Workflow Template (Admin)' : 'Review Workflow Template'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-amber-200 border border-white/15">
                  {blocks.length} nodes • ~{totalDays}d
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                {preset.isBuiltIn
                  ? 'Built-in Standard Template (Saved to taka_config for all users)'
                  : 'Custom Packaged Template (Supports Parent Task Hierarchy)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Template Inspector"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500/80 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#2a2a30] bg-slate-50/70 dark:bg-[#1b1b20] space-y-3 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-[#a3a3a3] uppercase mb-1">Template Name</label>
                <input
                  type="text" value={title} readOnly={!isAdmin} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#383842] bg-white dark:bg-[#232329] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-[#a3a3a3] uppercase mb-1">Description / Subtitle</label>
                <input
                  type="text" value={subtitle} readOnly={!isAdmin} onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#383842] bg-white dark:bg-[#232329] text-xs text-slate-800 dark:text-[#e3e3e3] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-[#9e9ea2] mr-1">Icon:</span>
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em} type="button" onClick={() => setEmoji(em)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer',
                        emoji === em ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 scale-105' : 'border-slate-200 dark:border-[#34343c] bg-white dark:bg-[#222228]'
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-[#9e9ea2] mr-1">Theme:</span>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id} type="button" onClick={() => setThemeColor(c.id)}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition-all',
                        themeColor === c.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-[#34343c] bg-white dark:bg-[#222228] text-slate-600 dark:text-[#b3b3b3]'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-[#d4d4d8] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Template Task Nodes ({blocks.length})</span>
              </span>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <input ref={csvInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportCsv} />
                  <button
                    type="button" onClick={() => csvInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Import CSV</span>
                  </button>
                  <button
                    type="button" onClick={handleAddBlock}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Node</span>
                  </button>
                </div>
              )}
            </div>

            {blocks.map((blk, idx) => {
              const deptMeta = STEM_DEPARTMENTS[blk.department] || STEM_DEPARTMENTS.prep_bql;
              return (
                <div
                  key={idx}
                  className={cn(
                    'p-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e36] bg-white dark:bg-[#1e1e24] flex flex-wrap sm:flex-nowrap items-center gap-2 shadow-2xs',
                    deptMeta.borderClass
                  )}
                >
                  <span className="w-7 h-6 rounded-md bg-slate-100 dark:bg-[#2a2a32] text-[11px] font-mono font-extrabold text-slate-600 dark:text-[#c3c3c3] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text" value={blk.name} readOnly={!isAdmin}
                    onChange={(e) => handleUpdateBlock(idx, { name: e.target.value })}
                    placeholder="Task name..."
                    className="flex-1 min-w-[150px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#363640] bg-slate-50/60 dark:bg-[#151519] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1 shrink-0" title="Parent Task Node (Hierarchy)">
                    <GitBranch className="w-3 h-3 text-purple-500 shrink-0" />
                    <select
                      value={typeof blk.parentBlockIndex === 'number' ? String(blk.parentBlockIndex) : ''}
                      disabled={!isAdmin}
                      onChange={(e) => handleUpdateBlock(idx, { parentBlockIndex: e.target.value === '' ? null : Number(e.target.value) })}
                      className="w-20 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-[#363640] bg-slate-50 dark:bg-[#151519] text-[11px] font-bold text-purple-700 dark:text-purple-300"
                    >
                      <option value="">Root</option>
                      {blocks.map((other, oIdx) =>
                        oIdx !== idx ? (
                          <option key={oIdx} value={String(oIdx)}>P:#{oIdx + 1} {other.name.slice(0, 12)}</option>
                        ) : null
                      )}
                    </select>
                  </div>
                  <select
                    value={blk.department} disabled={!isAdmin}
                    onChange={(e) => handleUpdateBlock(idx, { department: e.target.value as StemDepartmentId })}
                    className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#363640] bg-slate-50 dark:bg-[#151519] text-[11px] font-bold text-slate-700 dark:text-[#d4d4d8]"
                  >
                    {(Object.keys(STEM_DEPARTMENTS) as StemDepartmentId[]).map((dKey) => (
                      <option key={dKey} value={dKey}>{STEM_DEPARTMENTS[dKey].shortLabel}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number" min="0" step="0.5" value={blk.duration} readOnly={!isAdmin}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleUpdateBlock(idx, { duration: Number.isNaN(val) ? 1 : Math.max(0, val) });
                      }}
                      className="w-14 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-[#363640] bg-slate-50 dark:bg-[#151519] text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] font-bold text-slate-400">d</span>
                  </div>
                  <input
                    type="text" list="stem-preset-party-list" value={blk.party} readOnly={!isAdmin}
                    onChange={(e) => handleUpdateBlock(idx, { party: e.target.value })}
                    placeholder="Party..."
                    className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#363640] bg-slate-50 dark:bg-[#151519] text-xs font-semibold text-slate-800 dark:text-[#e3e3e3]"
                  />
                  <select
                    value={idx === 0 ? 'FS' : blk.connectorToPrev} disabled={!isAdmin || idx === 0}
                    onChange={(e) => handleUpdateBlock(idx, { connectorToPrev: e.target.value as StemConnectorType })}
                    className="w-20 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-[#363640] bg-slate-50 dark:bg-[#151519] text-[11px] font-bold text-slate-700 dark:text-[#d4d4d8]"
                  >
                    {(['FS', 'SS', 'FF', 'NONE'] as StemConnectorType[]).map((cType) => (
                      <option key={cType} value={cType}>{STEM_CONNECTOR_META[cType].shortLabel}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-[#a3a3a3] cursor-pointer shrink-0 px-1">
                    <input
                      type="checkbox" checked={Boolean(blk.delegation)} disabled={!isAdmin}
                      onChange={(e) => handleUpdateBlock(idx, { delegation: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Del</span>
                  </label>
                  {isAdmin && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" disabled={idx === 0} onClick={() => handleMoveBlock(idx, 'up')} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#2c2c34] disabled:opacity-30 text-slate-500 cursor-pointer">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" disabled={idx === blocks.length - 1} onClick={() => handleMoveBlock(idx, 'down')} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#2c2c34] disabled:opacity-30 text-slate-500 cursor-pointer">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleRemoveBlock(idx)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <datalist id="stem-preset-party-list">
              {STEM_PARTY_OPTIONS.map((p) => (<option key={p} value={p} />))}
            </datalist>
          </div>

          <div className="px-4 py-3 bg-slate-50 dark:bg-[#1b1b20] border-t border-slate-200 dark:border-[#2a2a30] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {isAdmin && preset.isBuiltIn && hasOverride && onResetBuiltIn && (
                <button
                  type="button" onClick={async () => { await onResetBuiltIn(preset.id); onClose(); }}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              )}
              {isAdmin && !preset.isBuiltIn && onDeleteCustom && (
                <button
                  type="button" onClick={async () => { await onDeleteCustom(preset.id); onClose(); }}
                  className="px-3 py-1.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-1.5 hover:bg-red-100 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Template</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-[#383842] text-xs font-bold text-slate-600 dark:text-[#c3c3c3] hover:bg-slate-100 dark:hover:bg-[#26262e] cursor-pointer">
                Close
              </button>
              {onApplyToCanvas && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyToCanvas({ ...preset, title: title.trim() || preset.title, subtitle: subtitle.trim() || preset.subtitle, emoji, themeColor, blocks });
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Load into Canvas</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="submit" disabled={!title.trim() || blocks.length === 0 || isSaving}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Template (Admin)'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
};
