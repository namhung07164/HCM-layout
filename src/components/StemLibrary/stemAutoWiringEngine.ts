import { doc } from 'firebase/firestore';
import { db, APP_ID } from '../../lib/firebase';
import { writeBatch } from '../../lib/firestoreWrites';
import { removeUndefinedDeep } from '../../lib/firestoreSanitizer';
import { useAppStore } from '../../store/useAppStore';
import { Project, Task, TaskPredecessor, DelegationGroup } from '../../types';
import { formatToDatetimeLocal, markProjectTasksHydrated } from '../../lib/utils';
import { scheduleDependentTasks } from '../../lib/ganttUtilsParts/scheduleAndReorderEngine';
import { getTasksForProject } from '../../lib/projectDatesService';
import { saveTaskStateUnified } from '../../lib/taskStateService';
import { triggerBatchChangeFlash } from '../../lib/changeFlashService';
import { syncQueueManager } from '../../lib/syncQueue';
import { StemWorkbenchBlock } from './stemLibraryTypes';
import {
  getNextSubtaskStartIndex,
  computeWorkbenchSchedule,
  hasDirectedDependencyCycle,
  type OpeningRiskAnalysis,
  type ComputedWorkbenchSchedule,
} from './stemScheduleCalculator';

export {
  getNextSubtaskStartIndex,
  computeWorkbenchSchedule,
  hasDirectedDependencyCycle,
  type OpeningRiskAnalysis,
  type ComputedWorkbenchSchedule,
};

/**
 * Step 4 Auto-Wiring Execution:
 * Materializes the STEM Workbench blocks into full Taka-PM Tasks with:
 * - Sequential [ProjectCode]#[Index] codes & 4 composite keys (projectId, projectCode, projectYear, projectStore)
 * - 3-field Predecessor compatibility (predecessor string, predecessorTaskIds, predecessors array)
 * - 0ms Zustand optimistic update + Smart Change Flash + Dexie bulkPersistTasks + Firestore writeBatch
 */
export async function applyStemWorkbenchToProject(params: {
  project: Project;
  computedBlocks: StemWorkbenchBlock[];
  userEmail?: string;
  targetParentTaskId?: string;
}): Promise<{ createdTasks: Task[]; createdDelegationCount: number }> {
  const { project, computedBlocks, userEmail, targetParentTaskId } = params;
  if (!project || !computedBlocks.length) {
    return { createdTasks: [], createdDelegationCount: 0 };
  }

  const state = useAppStore.getState();
  const allTasks = state.tasks || [];
  const allProjects = state.projects || [];
  const existingProjTasks = getTasksForProject(project, allTasks).filter((t) => !t.isDeleted);
  const startSubtaskNum = getNextSubtaskStartIndex(project, allTasks);
  const baseOrderIndex = existingProjTasks.length;

  const nowIso = new Date().toISOString();
  const cleanCode = String(project.code || '').trim();
  const safeYear =
    project.year !== undefined && project.year !== null && !isNaN(Number(project.year))
      ? Number(project.year)
      : new Date().getFullYear();
  const safeStore = String(project.store || 'HCM').trim();

  const blockIds = computedBlocks.map(
    (_, idx) => `task_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`
  );

  // Identify which blocks in the workbench are modular parents
  const parentBlockIndices = new Set<number>();
  computedBlocks.forEach((b, idx) => {
    if (b.isModularParent) parentBlockIndices.add(idx);
    if (
      typeof b.parentBlockIndex === 'number' &&
      b.parentBlockIndex >= 0 &&
      b.parentBlockIndex < computedBlocks.length
    ) {
      parentBlockIndices.add(b.parentBlockIndex);
    }
  });

  // Lookup existing project tasks by ID, taskCodePhu, #suffix, or name for external parentTaskId resolution
  const resolveExistingParentTaskId = (rawRef?: string): string | undefined => {
    if (!rawRef) return undefined;
    const clean = String(rawRef).trim();
    if (!clean) return undefined;
    const lower = clean.toLowerCase();
    const hashMatch = lower.match(/#(\d+)$/);
    const targetSuffix = hashMatch ? `#${hashMatch[1]}` : '';

    for (const et of existingProjTasks) {
      if (!et || et.isDeleted) continue;
      if (String(et.id).trim() === clean || String(et.id).trim().toLowerCase() === lower) {
        return et.id;
      }
      if (et.taskCodePhu && String(et.taskCodePhu).trim().toLowerCase() === lower) {
        return et.id;
      }
      if (
        targetSuffix &&
        et.taskCodePhu &&
        String(et.taskCodePhu).trim().toLowerCase().endsWith(targetSuffix)
      ) {
        return et.id;
      }
      if (et.name && String(et.name).trim().toLowerCase() === lower) {
        return et.id;
      }
    }
    return clean;
  };

  // Lookup external task ID by taskCodePhu across allTasks for externalPredecessor
  const allTasksByCodeLower = new Map<string, Task>();
  for (const t of allTasks) {
    if (t && !t.isDeleted && t.taskCodePhu) {
      allTasksByCodeLower.set(String(t.taskCodePhu).trim().toLowerCase(), t);
    }
  }

  const touchedExternalParentIds = new Set<string>();

  const newTasks: Task[] = computedBlocks.map((blk, idx) => {
    const subtaskNumber = startSubtaskNum + idx;
    const taskCodePhu = `${cleanCode}#${subtaskNumber}`;
    const isParentBlock = parentBlockIndices.has(idx);

    // Resolve Parent Task ID (Priority: 1. Internal parentBlockIndex -> 2. Block parentTaskId -> 3. Global targetParentTaskId for root blocks)
    let resolvedParentTaskId: string | undefined;
    if (
      typeof blk.parentBlockIndex === 'number' &&
      blk.parentBlockIndex >= 0 &&
      blk.parentBlockIndex < blockIds.length &&
      blk.parentBlockIndex !== idx
    ) {
      resolvedParentTaskId = blockIds[blk.parentBlockIndex];
    } else if (blk.parentTaskId) {
      resolvedParentTaskId = resolveExistingParentTaskId(blk.parentTaskId);
      if (resolvedParentTaskId) touchedExternalParentIds.add(resolvedParentTaskId);
    } else if (targetParentTaskId) {
      resolvedParentTaskId = resolveExistingParentTaskId(targetParentTaskId);
      if (resolvedParentTaskId) touchedExternalParentIds.add(resolvedParentTaskId);
    }

    let predecessorStr = '';
    let predecessorTaskIds: string[] = [];
    let predecessorsObj: TaskPredecessor[] = [];

    if (!isParentBlock) {
      if (blk.externalPredecessor && String(blk.externalPredecessor).trim()) {
        predecessorStr = String(blk.externalPredecessor).trim();
        const strippedCode = predecessorStr
          .replace(/(FS|SS|FF|SF)([+-]\d+(\.\d+)?d?)?$/i, '')
          .trim()
          .toLowerCase();
        const extTask = allTasksByCodeLower.get(strippedCode);
        if (extTask?.id) {
          predecessorTaskIds = [extTask.id];
          predecessorsObj = [
            {
              taskId: extTask.id,
              type: blk.connectorToPrev === 'NONE' ? 'FS' : blk.connectorToPrev,
              lagDays: blk.lagDays || 0,
            },
          ];
        }
      } else if (blk.connectorToPrev !== 'NONE') {
        let prevIdx = -1;
        if (
          typeof blk.predecessorBlockIndex === 'number' &&
          blk.predecessorBlockIndex >= 0 &&
          blk.predecessorBlockIndex < idx &&
          !parentBlockIndices.has(blk.predecessorBlockIndex)
        ) {
          prevIdx = blk.predecessorBlockIndex;
        } else {
          for (let k = idx - 1; k >= 0; k--) {
            if (!parentBlockIndices.has(k)) {
              prevIdx = k;
              break;
            }
          }
        }

        if (prevIdx >= 0) {
          const prevTaskId = blockIds[prevIdx];
          const prevTaskCode = `${cleanCode}#${startSubtaskNum + prevIdx}`;
          const relSuffix = blk.connectorToPrev === 'FS' ? '' : blk.connectorToPrev;
          const lagSuffix =
            blk.lagDays && blk.lagDays !== 0
              ? blk.lagDays > 0
                ? `+${blk.lagDays}`
                : `${blk.lagDays}`
              : '';

          predecessorStr = `${prevTaskCode}${relSuffix}${lagSuffix}`;
          predecessorTaskIds = [prevTaskId];
          predecessorsObj = [
            {
              taskId: prevTaskId,
              type: blk.connectorToPrev,
              lagDays: blk.lagDays || 0,
            },
          ];
        }
      }
    }

    return {
      id: blockIds[idx],
      projectId: project.id,
      projectCode: cleanCode,
      projectYear: safeYear,
      projectStore: safeStore,
      location: project.location || 'L1',
      taskCodePhu,
      orderIndex: baseOrderIndex + idx,
      name: blk.name.trim(),
      start: blk.computedStart || formatToDatetimeLocal(new Date()),
      finish: blk.computedFinish || formatToDatetimeLocal(new Date()),
      duration: String(blk.duration),
      durationManual: !isParentBlock,
      finishManual: false,
      predecessor: predecessorStr,
      predecessorTaskIds,
      predecessors: predecessorsObj,
      ...(resolvedParentTaskId ? { parentTaskId: resolvedParentTaskId } : {}),
      ...(isParentBlock ? { isModularParent: true } : {}),
      party: blk.party || 'PMO',
      delegation: Boolean(blk.delegation),
      runningStatus: 'Upcoming',
      progress: 0,
      approval: 'Pending',
      realtimeUpdate: Boolean(predecessorStr),
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: userEmail || 'PM',
      isDeleted: false,
    };
  });

  if (hasDirectedDependencyCycle([...existingProjTasks, ...newTasks])) {
    throw new Error('Detected circular dependency in workbench blocks. Please review connectors.');
  }

  const combinedTasks = [...allTasks, ...newTasks];
  const firstLeafTask = newTasks.find((t) => !t.isModularParent) || newTasks[0];
  const cascadedUpdates =
    firstLeafTask ? scheduleDependentTasks(firstLeafTask, combinedTasks, allProjects) : [];
  if (cascadedUpdates.length > 0) {
    const cascadeMap = new Map(cascadedUpdates.map((u) => [u.id, u]));
    for (let i = 0; i < newTasks.length; i++) {
      const updated = cascadeMap.get(newTasks[i].id);
      if (updated) {
        newTasks[i] = { ...newTasks[i], start: updated.start, finish: updated.finish };
      }
    }
  }

  // Roll up parent task dates (for internal parent blocks AND any external parent tasks in the project)
  const { rollupParentTaskDates } = await import('../../lib/taskImportService');
  const mergedProjectTasks = [
    ...existingProjTasks.map((et) =>
      touchedExternalParentIds.has(et.id) ? { ...et, isModularParent: true, updatedAt: nowIso } : et
    ),
    ...newTasks,
  ];
  const { updatedParents, allTasksMap } = rollupParentTaskDates(
    mergedProjectTasks,
    undefined,
    [project]
  );

  for (let i = 0; i < newTasks.length; i++) {
    const rolled = allTasksMap.get(newTasks[i].id);
    if (rolled) {
      newTasks[i] = {
        ...newTasks[i],
        start: rolled.start,
        finish: rolled.finish,
        duration: rolled.duration,
        ...(rolled.isModularParent !== undefined ? { isModularParent: Boolean(rolled.isModularParent) } : {}),
      };
    }
  }

  const externalParentsToSave: Task[] = updatedParents.filter(
    (up) => touchedExternalParentIds.has(up.id) && !blockIds.includes(up.id)
  );
  const allTasksToSave = [...newTasks, ...externalParentsToSave];

  const newDelegationGroups: DelegationGroup[] = newTasks
    .filter((t) => t.delegation)
    .map((t, idx) => ({
      id: `del_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      parentTaskId: t.id,
      name: t.name,
      projectCode: cleanCode,
      projectStore: safeStore,
      projectYear: safeYear,
      subTasks: [],
      updatedAt: nowIso,
      createdBy: userEmail || 'PM',
      actStatus: 'Not Started',
      plStatus: 'On Track',
      isDeleted: false,
    }));

  // 1. 0ms Optimistic UI Update via saveTaskStateUnified + DelegationGroups
  if (project.id) markProjectTasksHydrated(String(project.id));
  await saveTaskStateUnified(allTasksToSave);
  if (newDelegationGroups.length > 0) {
    const currDel = useAppStore.getState().delegationGroups || [];
    useAppStore.getState().setDelegationGroups([...currDel, ...newDelegationGroups]);
  }

  // 2. Trigger Smart Change Flash (emerald green highlight on newly wired rows & project)
  triggerBatchChangeFlash([
    ...allTasksToSave.map((t) => ({
      docId: t.id,
      collectionName: 'taka_tasks',
      updatedBy: userEmail || 'STEM Builder',
    })),
    ...(project.id
      ? [{ docId: project.id, collectionName: 'taka_projects', updatedBy: userEmail || 'STEM Builder' }]
      : []),
  ]);

  // 3. Persist to Local-First Dexie cache non-blocking
  setTimeout(() => {
    import('../../lib/localDb')
      .then(({ bulkPersistTasks }) => bulkPersistTasks(allTasksToSave))
      .catch(() => {});
  }, 0);

  // 4. Commit sanitized payloads to Firestore via writeBatch wrapper (auto-emits taka_deltas) with Offline Queue fallback
  try {
    const batch = writeBatch(db);
    for (const task of allTasksToSave) {
      const cleanTask = removeUndefinedDeep(task);
      const taskRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'taka_tasks', cleanTask.id);
      batch.set(taskRef, cleanTask, { merge: true });
    }
    for (const delGroup of newDelegationGroups) {
      const cleanDel = removeUndefinedDeep(delGroup);
      const delRef = doc(
        db,
        'artifacts',
        APP_ID,
        'public',
        'data',
        'taka_delegation_groups',
        cleanDel.id
      );
      batch.set(delRef, cleanDel, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn('[StemAutoWiring] Firestore batch failed, queueing offline writes:', err);
    for (const task of allTasksToSave) {
      syncQueueManager.addToQueue('taka_tasks', task.id, 'set', removeUndefinedDeep(task)).catch(() => {});
    }
  }

  // 5. Register 0ms Local-First + Firestore Undo & Redo
  const { undoManager } = await import('../../lib/undoManager');
  const { restoreTasksSnapshot } = await import('../../lib/undoStateHelpers');
  undoManager.push({
    description: `STEM Auto-Wire (${newTasks.length} tasks) → ${cleanCode}`,
    revert: async () => {
      await restoreTasksSnapshot({
        taskIdsToDelete: newTasks.map((t) => t.id),
        delegationIdsToDelete: newDelegationGroups.map((d) => d.id),
      });
    },
    redo: async () => {
      await restoreTasksSnapshot({
        tasksToRestore: allTasksToSave,
        delegationsToRestore: newDelegationGroups,
      });
    },
  });

  return {
    createdTasks: newTasks,
    createdDelegationCount: newDelegationGroups.length,
  };
}
