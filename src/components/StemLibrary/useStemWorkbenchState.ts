import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useEnrichedData } from '../../hooks/useEnrichedData';
import { getTasksForProject } from '../../lib/projectDatesService';
import {
  StemAnchorMode,
  StemConnectorType,
  StemLibraryBlockTemplate,
  StemPresetBlockSeed,
  StemPresetPackage,
  StemWorkbenchBlock,
} from './stemLibraryTypes';
import {
  deleteCustomStemPreset,
  getAllStemPartsBin,
  getAllStemPresets,
  hasBuiltInPresetOverride,
  hydrateStemConfigFromFirestoreOnce,
  resetBuiltInStemPreset,
  saveCustomStemPreset,
  subscribeStemLibraryConfig,
  updateStemPreset,
} from './stemLibraryConfigService';
import { parseStemBlocksFromCsvText } from './stemCsvImportParser';
import {
  applyStemWorkbenchToProject,
  computeWorkbenchSchedule,
} from './stemAutoWiringEngine';

const CONNECTOR_CYCLE: StemConnectorType[] = ['FS', 'SS', 'FF', 'NONE'];

export function makeWorkbenchBlocksFromSeeds(
  seeds: StemPresetBlockSeed[],
  prefixId = 'seed',
  indexOffset = 0
): StemWorkbenchBlock[] {
  return seeds.map((b, idx) => {
    const rawDur = Number(b.duration);
    const duration = !isNaN(rawDur) && rawDur >= 0 ? rawDur : b.isModularParent ? 0 : 2;
    const parentBlockIndex =
      typeof b.parentBlockIndex === 'number' && b.parentBlockIndex >= 0
        ? b.parentBlockIndex + indexOffset
        : null;
    const predecessorBlockIndex =
      typeof b.predecessorBlockIndex === 'number' && b.predecessorBlockIndex >= 0
        ? b.predecessorBlockIndex + indexOffset
        : null;
    return {
      instanceId: `wb-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      templateId: `${prefixId}-${idx}`,
      name: b.name,
      duration,
      department: b.department,
      party: b.party || 'PMO',
      delegation: Boolean(b.delegation),
      connectorToPrev: idx === 0 && indexOffset === 0 ? 'FS' : b.connectorToPrev || 'FS',
      lagDays: b.lagDays || 0,
      parentBlockIndex,
      ...(b.parentTaskId ? { parentTaskId: b.parentTaskId } : {}),
      ...(b.isModularParent ? { isModularParent: true } : {}),
      ...(predecessorBlockIndex !== null ? { predecessorBlockIndex } : {}),
      ...(b.externalPredecessor ? { externalPredecessor: b.externalPredecessor } : {}),
    };
  });
}

export function makeWorkbenchBlocksFromPreset(
  preset: StemPresetPackage,
  indexOffset = 0
): StemWorkbenchBlock[] {
  return makeWorkbenchBlocksFromSeeds(preset.blocks || [], preset.id, indexOffset);
}

export function useStemWorkbenchState(params: {
  isOpen: boolean;
  onClose: () => void;
  initialProjectId?: string;
  initialProjectCode?: string;
}) {
  const { isOpen, onClose, initialProjectId, initialProjectCode } = params;
  const { enrichedProjects: projects } = useEnrichedData();
  const allTasks = useAppStore((s) => s.tasks);
  const currentUser = useAppStore((s) => s.currentUser);
  const fixedProjectCode = useAppStore((s) => s.fixedProjectCode);
  const detailTabFilterCode = useAppStore((s) => s.detailTabFilterCode);
  const isAdmin = currentUser?.role === 'admin';

  const [configTick, setConfigTick] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [targetParentTaskId, setTargetParentTaskId] = useState<string>('');
  const [activePresetId, setActivePresetId] = useState<string | null>('preset-fnb-12');
  const [anchorMode, setAnchorMode] = useState<StemAnchorMode>('forward');
  const [customAnchorDate, setCustomAnchorDate] = useState<string>('');
  const [workbenchBlocks, setWorkbenchBlocks] = useState<StemWorkbenchBlock[]>(() => {
    const presets = getAllStemPresets();
    return presets.length > 0 ? makeWorkbenchBlocksFromPreset(presets[0]) : [];
  });
  const [appendOnPresetClick, setAppendOnPresetClick] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    hydrateStemConfigFromFirestoreOnce().catch(() => {});
    return subscribeStemLibraryConfig(() => setConfigTick((c) => c + 1));
  }, [isOpen]);

  const presets = useMemo(() => {
    void configTick;
    return getAllStemPresets();
  }, [configTick]);

  const partsBin = useMemo(() => {
    void configTick;
    return getAllStemPartsBin();
  }, [configTick]);

  useEffect(() => {
    if (!isOpen || !projects.length) return;
    if (initialProjectId) {
      const byId = projects.find((p) => p.id === initialProjectId);
      if (byId && byId.id) {
        setSelectedProjectId(byId.id);
        return;
      }
    }
    const targetCode = (fixedProjectCode || initialProjectCode || detailTabFilterCode || '')
      .trim()
      .toLowerCase();
    if (targetCode) {
      const exactMatch = projects.find(
        (p) =>
          String(p.code || '').trim().toLowerCase() === targetCode ||
          String(p.id || '').trim().toLowerCase() === targetCode
      );
      if (exactMatch && exactMatch.id) {
        setSelectedProjectId(exactMatch.id);
        return;
      }
      const fuzzyMatch = projects.find((p) => {
        const pCode = String(p.code || '').trim().toLowerCase();
        const pName = String(p.name || '').trim().toLowerCase();
        const pLinks = String(p.linkCodes || '').trim().toLowerCase();
        return pCode.includes(targetCode) || pName.includes(targetCode) || pLinks.includes(targetCode);
      });
      if (fuzzyMatch && fuzzyMatch.id) {
        setSelectedProjectId(fuzzyMatch.id);
        return;
      }
    }
    if (!selectedProjectId || !projects.some((p) => p.id === selectedProjectId)) {
      if (projects[0]?.id) setSelectedProjectId(projects[0].id);
    }
  }, [isOpen, initialProjectId, initialProjectCode, fixedProjectCode, detailTabFilterCode, projects]);

  const targetProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId]
  );

  const existingProjectTasks = useMemo(
    () =>
      targetProject
        ? getTasksForProject(targetProject, allTasks || []).filter((t) => t && !t.isDeleted)
        : [],
    [targetProject, allTasks]
  );

  useEffect(() => {
    setTargetParentTaskId('');
  }, [targetProject?.id]);

  useEffect(() => {
    if (!targetProject) return;
    if (anchorMode === 'backward') {
      const openingRaw =
        targetProject.opening || targetProject.handover || targetProject.computedTakCompl || '';
      setCustomAnchorDate(openingRaw ? openingRaw.slice(0, 10) : '');
    } else {
      const startRaw = targetProject.computedTakStart || targetProject.handover || '';
      setCustomAnchorDate(startRaw ? startRaw.slice(0, 10) : '');
    }
  }, [targetProject, anchorMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const schedule = useMemo(
    () =>
      computeWorkbenchSchedule(
        workbenchBlocks,
        targetProject,
        allTasks,
        anchorMode,
        customAnchorDate ? `${customAnchorDate}T09:00` : undefined
      ),
    [workbenchBlocks, targetProject, allTasks, anchorMode, customAnchorDate]
  );

  const handleSelectPreset = useCallback(
    (preset: StemPresetPackage) => {
      setActivePresetId(preset.id);
      setWorkbenchBlocks((prev) => {
        const offset = appendOnPresetClick ? prev.length : 0;
        const nextBlocks = makeWorkbenchBlocksFromPreset(preset, offset);
        return appendOnPresetClick ? [...prev, ...nextBlocks] : nextBlocks;
      });
      setErrorMsg(null);
    },
    [appendOnPresetClick]
  );

  const handleImportCsvToWorkbench = useCallback(
    async (csvText: string, fileName?: string, alsoSaveAsPreset = false) => {
      const parsed = parseStemBlocksFromCsvText(csvText, fileName);
      if (parsed.blocks.length === 0) {
        setErrorMsg('No valid task rows found in CSV file.');
        return;
      }
      setErrorMsg(null);
      setWorkbenchBlocks((prev) => {
        const offset = appendOnPresetClick ? prev.length : 0;
        const nextBlocks = makeWorkbenchBlocksFromSeeds(parsed.blocks, 'csv', offset);
        return appendOnPresetClick ? [...prev, ...nextBlocks] : nextBlocks;
      });
      if (alsoSaveAsPreset) {
        const saved = await saveCustomStemPreset(
          {
            title: parsed.suggestedTitle,
            subtitle: parsed.suggestedSubtitle,
            emoji: '📦',
            themeColor: 'blue',
            blocks: parsed.blocks,
          },
          currentUser?.email
        );
        setActivePresetId(saved.id);
        useAppStore.getState().setToast({
          title: 'CSV Imported & Saved to Library',
          message: `Loaded ${parsed.blocks.length} tasks and saved "${saved.title}" to STEM Library.`,
          type: 'success',
        });
      } else {
        setActivePresetId(null);
        useAppStore.getState().setToast({
          title: 'CSV Loaded onto Canvas',
          message: `Loaded ${parsed.blocks.length} tasks (including Parent Task links) onto the n8n Workbench.`,
          type: 'success',
        });
      }
    },
    [appendOnPresetClick, currentUser?.email]
  );

  const handleSaveCurrentCanvasAsPreset = useCallback(
    async (customTitle?: string) => {
      if (workbenchBlocks.length === 0) return;
      const seeds: StemPresetBlockSeed[] = workbenchBlocks.map((b) => ({
        name: b.name,
        duration: b.duration,
        department: b.department,
        party: b.party,
        delegation: b.delegation,
        connectorToPrev: b.connectorToPrev,
        lagDays: b.lagDays,
        parentBlockIndex: b.parentBlockIndex ?? null,
        ...(b.parentTaskId ? { parentTaskId: b.parentTaskId } : {}),
        ...(b.isModularParent ? { isModularParent: true } : {}),
        ...(b.predecessorBlockIndex !== undefined ? { predecessorBlockIndex: b.predecessorBlockIndex } : {}),
        ...(b.externalPredecessor ? { externalPredecessor: b.externalPredecessor } : {}),
      }));
      const projLabel = targetProject?.code || 'Custom';
      const saved = await saveCustomStemPreset(
        {
          title: (customTitle || '').trim() || `Gói ${projLabel} (${seeds.length} khối)`,
          subtitle: `${seeds.length} khối lắp ghép lưu từ STEM Workbench`,
          emoji: '📦',
          themeColor: 'cyan',
          blocks: seeds,
        },
        currentUser?.email
      );
      setActivePresetId(saved.id);
      useAppStore.getState().setToast({
        title: 'Saved to STEM Library',
        message: `Saved template "${saved.title}" (${seeds.length} nodes).`,
        type: 'success',
      });
    },
    [workbenchBlocks, targetProject?.code, currentUser?.email]
  );

  const handleUpdatePreset = useCallback(
    async (updatedPreset: StemPresetPackage) => {
      await updateStemPreset(updatedPreset, currentUser?.email);
      if (activePresetId === updatedPreset.id) {
        setWorkbenchBlocks(makeWorkbenchBlocksFromPreset(updatedPreset));
      }
      useAppStore.getState().setToast({
        title: 'Template Saved',
        message: `Updated "${updatedPreset.emoji} ${updatedPreset.title}" (${updatedPreset.blocks.length} nodes).`,
        type: 'success',
      });
    },
    [activePresetId, currentUser?.email]
  );

  const handleResetBuiltInPreset = useCallback(
    async (presetId: string) => {
      await resetBuiltInStemPreset(presetId, currentUser?.email);
      const freshList = getAllStemPresets();
      const restored = freshList.find((p) => p.id === presetId);
      if (restored && activePresetId === presetId) {
        setWorkbenchBlocks(makeWorkbenchBlocksFromPreset(restored));
      }
      useAppStore.getState().setToast({
        title: 'Template Restored',
        message: 'Restored built-in template to default tasks.',
        type: 'info',
      });
    },
    [activePresetId, currentUser?.email]
  );

  const handleDeleteCustomPreset = useCallback(
    async (presetId: string) => {
      await deleteCustomStemPreset(presetId, currentUser?.email);
      if (activePresetId === presetId) {
        setActivePresetId('preset-fnb-12');
      }
    },
    [activePresetId, currentUser?.email]
  );

  const handleAddPart = useCallback((part: StemLibraryBlockTemplate) => {
    const newBlock: StemWorkbenchBlock = {
      instanceId: `wb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      templateId: part.id,
      name: part.name,
      duration: Number(part.defaultDuration) >= 0 ? Number(part.defaultDuration) : 2,
      department: part.department,
      party: part.party || 'PMO',
      delegation: Boolean(part.delegation),
      connectorToPrev: part.defaultConnector || 'FS',
      lagDays: part.lagDays || 0,
      parentBlockIndex: null,
      isModularParent: Boolean(part.isModularParent),
    };
    setWorkbenchBlocks((prev) => [...prev, newBlock]);
  }, []);

  const handleCycleConnector = useCallback((instanceId: string, explicitType?: StemConnectorType) => {
    setWorkbenchBlocks((prev) =>
      prev.map((blk) => {
        if (blk.instanceId !== instanceId) return blk;
        if (explicitType) return { ...blk, connectorToPrev: explicitType };
        const idx = CONNECTOR_CYCLE.indexOf(blk.connectorToPrev);
        return { ...blk, connectorToPrev: CONNECTOR_CYCLE[(idx + 1) % CONNECTOR_CYCLE.length] };
      })
    );
  }, []);

  const handleChangeDuration = useCallback((instanceId: string, nextDuration: number) => {
    setWorkbenchBlocks((prev) =>
      prev.map((blk) => (blk.instanceId === instanceId ? { ...blk, duration: Math.max(0, nextDuration) } : blk))
    );
  }, []);

  const handleChangeName = useCallback((instanceId: string, nextName: string) => {
    setWorkbenchBlocks((prev) =>
      prev.map((blk) => (blk.instanceId === instanceId ? { ...blk, name: nextName } : blk))
    );
  }, []);

  const handleChangeParty = useCallback((instanceId: string, nextParty: string) => {
    setWorkbenchBlocks((prev) =>
      prev.map((blk) => (blk.instanceId === instanceId ? { ...blk, party: nextParty } : blk))
    );
  }, []);

  const handleToggleDelegation = useCallback((instanceId: string) => {
    setWorkbenchBlocks((prev) =>
      prev.map((blk) => (blk.instanceId === instanceId ? { ...blk, delegation: !blk.delegation } : blk))
    );
  }, []);

  const handleChangeParentBlock = useCallback(
    (instanceId: string, nextParent: { parentBlockIndex?: number | null; parentTaskId?: string }) => {
      setWorkbenchBlocks((prev) => {
        const nextList = prev.map((blk) =>
          blk.instanceId !== instanceId
            ? blk
            : {
                ...blk,
                parentBlockIndex: nextParent.parentBlockIndex !== undefined ? nextParent.parentBlockIndex : null,
                parentTaskId: nextParent.parentTaskId || undefined,
              }
        );
        const parentIdxSet = new Set<number>();
        nextList.forEach((b) => {
          if (typeof b.parentBlockIndex === 'number' && b.parentBlockIndex >= 0) parentIdxSet.add(b.parentBlockIndex);
        });
        return nextList.map((b, i) => ({ ...b, isModularParent: parentIdxSet.has(i) }));
      });
    },
    []
  );

  const handleMoveOrder = useCallback((index: number, direction: 'up' | 'down') => {
    setWorkbenchBlocks((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      const swapRef = (ref?: number | null) => (ref === index ? targetIdx : ref === targetIdx ? index : ref);
      return copy.map((b) => ({
        ...b,
        parentBlockIndex: swapRef(b.parentBlockIndex),
        predecessorBlockIndex: swapRef(b.predecessorBlockIndex),
      }));
    });
  }, []);

  const handleRemoveBlock = useCallback((instanceId: string) => {
    setWorkbenchBlocks((prev) => {
      const rmIdx = prev.findIndex((b) => b.instanceId === instanceId);
      if (rmIdx === -1) return prev;
      const shiftRef = (ref?: number | null) =>
        ref === undefined || ref === null || ref === rmIdx ? null : ref > rmIdx ? ref - 1 : ref;
      return prev
        .filter((_, i) => i !== rmIdx)
        .map((b) => ({
          ...b,
          parentBlockIndex: shiftRef(b.parentBlockIndex),
          predecessorBlockIndex: shiftRef(b.predecessorBlockIndex),
        }));
    });
  }, []);

  const handleAutoParallelOptimize = useCallback(() => {
    setWorkbenchBlocks((prev) =>
      prev.map((b, idx) =>
        idx > 0 && b.connectorToPrev === 'FS' && (b.department === 'mep_pccc' || b.department === 'it_pos_handover')
          ? { ...b, connectorToPrev: 'SS' }
          : b
      )
    );
  }, []);

  const handleApplyToProject = async () => {
    if (!targetProject || schedule.blocks.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await applyStemWorkbenchToProject({
        project: targetProject,
        computedBlocks: schedule.blocks,
        userEmail: currentUser?.email,
        targetParentTaskId: targetParentTaskId || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to wire tasks into project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isAdmin, projects, targetProject, setSelectedProjectId, existingProjectTasks,
    targetParentTaskId, setTargetParentTaskId, presets, partsBin, activePresetId,
    anchorMode, setAnchorMode, customAnchorDate, setCustomAnchorDate,
    appendOnPresetClick, setAppendOnPresetClick, setWorkbenchBlocks,
    isSubmitting, errorMsg, schedule, handleSelectPreset, handleImportCsvToWorkbench,
    handleSaveCurrentCanvasAsPreset, handleUpdatePreset, handleResetBuiltInPreset,
    hasBuiltInPresetOverride, handleDeleteCustomPreset, handleAddPart, handleCycleConnector,
    handleChangeDuration, handleChangeName, handleChangeParty, handleToggleDelegation,
    handleChangeParentBlock, handleMoveOrder, handleRemoveBlock,
    handleAutoParallelOptimize, handleApplyToProject,
  };
}
