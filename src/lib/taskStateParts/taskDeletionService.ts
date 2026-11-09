import { Task, Project } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import {
  getTasksForProject,
  calculateProjectComputedDates,
  matchProjectCode,
} from '../projectDatesService';
import { markTasksDeleted } from '../taskDeletedTracker';
import { isTaskBelongsToProject as isTaskBelongsToProjectCore } from '../utils';
import { findAffectedProjects } from '../taskStateService';

/**
 * Shared State Handler: Xóa Tasks đồng bộ giữa DetailTab và GeneralTab
 */
export async function deleteTaskStateUnified(
  taskIdsOrTasks: (string | Task)[],
  options?: { syncProjects?: boolean; skipUndo?: boolean }
): Promise<void> {
  if (!taskIdsOrTasks || taskIdsOrTasks.length === 0) return;

  const rawIds: string[] = [];
  const passedTaskObjs: Task[] = [];
  taskIdsOrTasks.forEach((item) => {
    if (typeof item === 'string') rawIds.push(item);
    else if (item && typeof item === 'object') {
      if (item.id) rawIds.push(String(item.id));
      passedTaskObjs.push(item);
    }
  });

  const idSet = new Set(rawIds.map(String));
  const idLowerSet = new Set(rawIds.map((id) => String(id).trim().toLowerCase()));
  const currentTasks = useAppStore.getState().tasks || [];
  const currentProjects = useAppStore.getState().projects || [];

  const tasksToDelete = currentTasks.filter(
    (t) => idSet.has(String(t.id)) || idLowerSet.has(String(t.id || '').trim().toLowerCase())
  );
  const seenDeleteIds = new Set(tasksToDelete.map((t) => String(t.id).trim().toLowerCase()));
  passedTaskObjs.forEach((pt) => {
    const key = String(pt.id || '').trim().toLowerCase();
    if (key && !seenDeleteIds.has(key)) {
      seenDeleteIds.add(key);
      tasksToDelete.push(pt);
    }
  });

  const summaryMatchedProjects: Project[] = [];
  currentProjects.forEach((p) => {
    if (!p || !Array.isArray(p.taskSummaries) || p.taskSummaries.length === 0) return;
    let projectMatched = false;
    p.taskSummaries.forEach((ts: any, idx: number) => {
      if (!ts) return;
      const realTsId = ts.id ? String(ts.id).trim() : '';
      const virtId1 = `ts_${p.id || p.code}_${p.store || 'HCM'}_${p.year || ''}_${idx}`;
      const virtId2 = `ts_${p.id}_${idx}`;
      if (
        (realTsId && idLowerSet.has(realTsId.toLowerCase())) ||
        idLowerSet.has(virtId1.toLowerCase()) ||
        idLowerSet.has(virtId2.toLowerCase())
      ) {
        projectMatched = true;
        if (realTsId && !realTsId.startsWith('ts_')) {
          idSet.add(realTsId);
          idLowerSet.add(realTsId.toLowerCase());
          if (!rawIds.includes(realTsId)) rawIds.push(realTsId);
        }
        const effectiveId = realTsId || virtId1;
        const effLower = effectiveId.toLowerCase();
        if (!seenDeleteIds.has(effLower)) {
          seenDeleteIds.add(effLower);
          tasksToDelete.push({
            id: effectiveId, name: ts.name || '', start: ts.start || '', finish: ts.finish || '',
            projectId: p.id, projectCode: p.code || '', projectStore: p.store || 'HCM',
            projectYear: p.year ? String(p.year) : '', taskCodePhu: ts.taskCodePhu,
            parentTaskId: ts.parentTaskId, orderIndex: ts.orderIndex ?? idx,
          } as Task);
        }
      }
    });
    if (projectMatched) summaryMatchedProjects.push(p);
  });

  const affectedProjectsMap = new Map<string, Project>();
  findAffectedProjects(tasksToDelete, currentProjects).forEach((ap) => {
    if (ap?.id) affectedProjectsMap.set(String(ap.id), ap);
  });
  summaryMatchedProjects.forEach((sp) => {
    if (sp?.id) affectedProjectsMap.set(String(sp.id), sp);
  });
  const affectedProjects = Array.from(affectedProjectsMap.values());
  const affectedProjectIds = new Set<string>(affectedProjectsMap.keys());
  tasksToDelete.forEach((dt) => {
    if (dt.projectId) affectedProjectIds.add(String(dt.projectId));
  });

  const deletedTaskIds = new Set<string>();
  const deletedTaskCodes = new Set<string>();
  tasksToDelete.forEach((t) => {
    if (t.id) {
      deletedTaskIds.add(String(t.id).trim().toLowerCase());
      markTasksDeleted([String(t.id).trim()], t.projectId ? String(t.projectId) : undefined);
    }
    if (t.taskCodePhu) deletedTaskCodes.add(String(t.taskCodePhu).trim().toLowerCase());
  });
  rawIds.forEach((id) => {
    deletedTaskIds.add(String(id).trim().toLowerCase());
    markTasksDeleted([String(id).trim()]);
  });

  const isParentMatchedByDeleted = (rawParentVal: any, childTaskOrProj?: any): boolean => {
    if (!rawParentVal) return false;
    const cleanParent = String(rawParentVal).trim().toLowerCase();
    if (deletedTaskIds.has(cleanParent)) return true;
    if (deletedTaskCodes.has(cleanParent)) {
      return tasksToDelete.some((dt) => {
        if (!dt.taskCodePhu || String(dt.taskCodePhu).trim().toLowerCase() !== cleanParent) return false;
        if (!childTaskOrProj) return true;
        return isTaskBelongsToProjectCore(childTaskOrProj, {
          id: dt.projectId, code: dt.projectCode, store: dt.projectStore, year: dt.projectYear,
        });
      });
    }
    return false;
  };

  const now = new Date().toISOString();
  const tasksAfterDeletion = currentTasks.filter(
    (t) => !idSet.has(String(t.id)) && !deletedTaskIds.has(String(t.id || '').trim().toLowerCase())
  );

  const unlinkedChildTasks: Task[] = [];
  const unlinkedChildIdSet = new Set<string>();
  const modifiedNeighborsBeforeDeletion: Task[] = [];
  const cleanedTasks = tasksAfterDeletion.map((t) => {
    let updated = t;
    const rawParent = t.parentTaskId || (t as any).parentId;
    if (rawParent && isParentMatchedByDeleted(rawParent, t)) {
      updated = { ...updated, parentTaskId: undefined, updatedAt: now };
      delete (updated as any).parentId;
      unlinkedChildTasks.push(updated);
      unlinkedChildIdSet.add(String(updated.id));
    }

    if (updated.predecessor && typeof updated.predecessor === 'string') {
      const predParts = updated.predecessor.split(',').map((p) => p.trim()).filter(Boolean);
      const filteredParts = predParts.filter((part) => {
        const codeOnly = part.replace(/(?:SS|FF|SF|FS)?\s*(?:[+-]\d+[dwmy]?)?$/i, '').trim().toLowerCase();
        const isDeletedPred = tasksToDelete.some((dt) => {
          if (!isTaskBelongsToProjectCore(t, { id: dt.projectId, code: dt.projectCode, store: dt.projectStore, year: dt.projectYear })) {
            return false;
          }
          return (
            (dt.taskCodePhu && String(dt.taskCodePhu).trim().toLowerCase() === codeOnly) ||
            (dt.id && String(dt.id).trim().toLowerCase() === codeOnly)
          );
        });
        return !isDeletedPred;
      });
      const newPred = filteredParts.join(', ');
      if (newPred !== updated.predecessor) updated = { ...updated, predecessor: newPred, updatedAt: now };
    }

    if (updated !== t) modifiedNeighborsBeforeDeletion.push(t);
    return updated;
  });

  useAppStore.getState().setTasks(cleanedTasks);

  const modifiedProjectsForDexie: Project[] = [];
  const delegationGroups = useAppStore.getState().delegationGroups || [];
  const origProjectsById = new Map<string, Project>();
  currentProjects.forEach((op) => { if (op.id) origProjectsById.set(op.id, op); });

  const updatedProjects = currentProjects.map((p) => {
    const pIdStr = p.id ? String(p.id) : '';
    if (affectedProjectIds.size > 0 && !affectedProjectIds.has(pIdStr)) return p;

    let summaryModified = false;
    let newSummaries = p.taskSummaries ? [...p.taskSummaries] : [];

    if (p.taskSummaries && p.taskSummaries.length > 0) {
      newSummaries = p.taskSummaries
        .filter((ts, idx) => {
          const tsId = ts?.id ? String(ts.id).trim().toLowerCase() : '';
          const virtId1 = `ts_${p.id || p.code}_${p.store || 'HCM'}_${p.year || ''}_${idx}`.toLowerCase();
          const virtId2 = `ts_${p.id}_${idx}`.toLowerCase();
          if ((tsId && deletedTaskIds.has(tsId)) || deletedTaskIds.has(virtId1) || deletedTaskIds.has(virtId2)) {
            if (tsId && !tsId.startsWith('ts_')) {
              idSet.add(String(ts.id));
              deletedTaskIds.add(tsId);
              markTasksDeleted([String(ts.id)], pIdStr);
            }
            summaryModified = true;
            return false;
          }
          const matchedDeleted = tasksToDelete.some((dt) => {
            if (dt.projectId && p.id && String(dt.projectId) !== String(p.id)) return false;
            if (!dt.projectId && !isTaskBelongsToProjectCore(dt, p)) return false;
            const dtId = dt.id ? String(dt.id).trim().toLowerCase() : '';
            if (dtId && tsId && dtId === tsId) return true;
            const tsName = String(ts?.name || '').trim().toLowerCase();
            const dtName = String(dt.name || '').trim().toLowerCase();
            const tsCode = String(ts?.taskCodePhu || '').trim().toLowerCase();
            const dtCode = String(dt.taskCodePhu || '').trim().toLowerCase();
            if (tsName && dtName && tsName === dtName && (!tsCode || !dtCode || tsCode === dtCode)) {
              if (!tsId || tsId.startsWith('ts_') || dtId.startsWith('ts_')) {
                if (tsId && !tsId.startsWith('ts_')) {
                  idSet.add(String(ts.id));
                  deletedTaskIds.add(tsId);
                  markTasksDeleted([String(ts.id)], pIdStr);
                }
                return true;
              }
            }
            return false;
          });
          if (matchedDeleted) {
            summaryModified = true;
            return false;
          }
          return true;
        })
        .map((ts: any) => {
          const rawP = ts?.parentTaskId || ts?.parentId;
          if (rawP && isParentMatchedByDeleted(rawP, p)) {
            summaryModified = true;
            const copy = { ...ts };
            delete copy.parentTaskId;
            delete copy.parentId;
            return copy;
          }
          return ts;
        });
    }

    if (summaryModified || affectedProjectIds.has(pIdStr)) {
      const pForCalc = { ...p, taskSummaries: newSummaries, taskCount: newSummaries.length };
      const remainingProjTasks = getTasksForProject(pForCalc, cleanedTasks);
      const computed = calculateProjectComputedDates(pForCalc, remainingProjTasks, delegationGroups);
      const nextProj: Project = {
        ...p,
        ...computed,
        taskCount: computed.taskCount !== undefined ? computed.taskCount : remainingProjTasks.length,
        taskSummaries: computed.taskSummaries || newSummaries,
        updatedAt: now,
      };
      modifiedProjectsForDexie.push(nextProj);
      return nextProj;
    }
    return p;
  });

  useAppStore.getState().setProjects(updatedProjects);

  try {
    const { localDb } = await import('../localDb');
    if (affectedProjects.length > 0) {
      for (const ap of affectedProjects) {
        if (!ap?.id) continue;
        const codeKeys = [String(ap.id), String(ap.code || '').trim()].filter(Boolean);
        const [byId, byCode] = await Promise.all([
          localDb.tasks.where('projectId').equals(String(ap.id)).toArray().catch(() => []),
          localDb.tasks.where('projectCode').anyOf(codeKeys).toArray().catch(() => []),
        ]);
        const dexieTasksMap = new Map<string, Task>();
        byId.forEach((dt) => { if (dt?.id) dexieTasksMap.set(String(dt.id), dt); });
        byCode.forEach((dt) => { if (dt?.id && isTaskBelongsToProjectCore(dt, ap)) dexieTasksMap.set(String(dt.id), dt); });

        for (const dt of dexieTasksMap.values()) {
          const dtIdStr = String(dt.id);
          const dtIdLower = dtIdStr.trim().toLowerCase();
          if (idSet.has(dtIdStr) || deletedTaskIds.has(dtIdLower)) {
            idSet.add(dtIdStr);
            if (!seenDeleteIds.has(dtIdLower)) {
              seenDeleteIds.add(dtIdLower);
              tasksToDelete.push(dt);
            }
            continue;
          }
          const matchedVirtual = tasksToDelete.some(
            (v) =>
              String(v.id || '').startsWith('ts_') &&
              isTaskBelongsToProjectCore(dt, ap) &&
              String(v.name || '').trim().toLowerCase() === String(dt.name || '').trim().toLowerCase() &&
              (!v.taskCodePhu || !dt.taskCodePhu || String(v.taskCodePhu).trim().toLowerCase() === String(dt.taskCodePhu).trim().toLowerCase())
          );
          if (matchedVirtual) {
            idSet.add(dtIdStr);
            deletedTaskIds.add(dtIdLower);
            markTasksDeleted([dtIdStr], String(ap.id));
            tasksToDelete.push(dt);
            continue;
          }
          const rawP = dt.parentTaskId || (dt as any).parentId;
          if (rawP && !unlinkedChildIdSet.has(dtIdStr) && isParentMatchedByDeleted(rawP, dt)) {
            unlinkedChildIdSet.add(dtIdStr);
            unlinkedChildTasks.push({ ...dt, parentTaskId: undefined, updatedAt: now });
          }
        }
      }
    }
    await localDb.tasks.bulkDelete(Array.from(idSet));
    if (modifiedProjectsForDexie.length > 0) await localDb.projects.bulkPut(modifiedProjectsForDexie);
    if (unlinkedChildTasks.length > 0) {
      await Promise.all(
        unlinkedChildTasks.map((c) => (localDb.tasks.update as any)(c.id, { parentTaskId: null, parentId: null, updatedAt: now }))
      );
    }
  } catch (e) {
    console.warn('[taskStateService] Dexie bulkDelete tasks error:', e);
  }

  try {
    const { extractStorageUrls, deleteStorageFiles } = await import('../storageUtils');
    const urls: string[] = [];
    tasksToDelete.forEach((t) => {
      const extracted = extractStorageUrls(t);
      if (extracted.length > 0) urls.push(...extracted);
    });
    if (urls.length > 0) deleteStorageFiles(urls).catch(() => {});
  } catch {}

  try {
    const { doc, deleteField } = await import('firebase/firestore');
    const { writeBatch } = await import('../firestoreWrites');
    const { db, APP_ID } = await import('../firebase');
    const { recordBatchDeltas } = await import('../deltaSyncService');
    const { markExplicitDelta } = await import('../autoDeltaQueue');
    const { resetStalledFirestoreConnection } = await import('../syncResilience');

    const allIdsToDelete = new Set<string>();
    idSet.forEach((id) => { const s = String(id || '').trim(); if (s && !s.startsWith('ts_')) allIdsToDelete.add(s); });
    tasksToDelete.forEach((t) => { const s = String(t?.id || '').trim(); if (s && !s.startsWith('ts_')) allIdsToDelete.add(s); });

    const deletedByIdMap = new Map<string, Task>();
    tasksToDelete.forEach((t) => { if (t?.id) deletedByIdMap.set(String(t.id).trim(), t); });

    const fallbackProj = affectedProjects[0];
    const sanitizeSummaries = (list: any[]) =>
      (list || []).map((ts: any) => {
        const item: Record<string, any> = {};
        if (ts && typeof ts === 'object') {
          for (const [k, v] of Object.entries(ts)) {
            if (v !== undefined && v !== null && v !== '' && v !== false && k !== '_isVirtualSummary') item[k] = v;
          }
        }
        return item;
      });

    const realUnlinkedChildren = unlinkedChildTasks.filter(
      (c) => c?.id && !String(c.id).startsWith('ts_') && !(c as any)._isVirtualSummary
    );
    const changedProjectsToSync = updatedProjects.filter((up) => {
      const orig = origProjectsById.get(up.id);
      return orig && orig !== up;
    });

    const currentUser = useAppStore.getState().currentUser;
    const deltaItems: any[] = [
      ...Array.from(allIdsToDelete).map((id) => {
        const dt = deletedByIdMap.get(String(id));
        const pId = dt?.projectId || fallbackProj?.id;
        const pCode = dt?.projectCode || fallbackProj?.code;
        const pStore = dt?.projectStore || fallbackProj?.store;
        const pYear = dt?.projectYear ?? fallbackProj?.year;
        return {
          docId: id, collectionName: 'taka_tasks', action: 'delete', isPatch: false,
          data: {
            id, isDeleted: true,
            ...(pId ? { projectId: String(pId) } : {}),
            ...(pCode ? { projectCode: String(pCode) } : {}),
            ...(pStore ? { projectStore: String(pStore) } : {}),
            ...(pYear !== undefined && pYear !== null ? { projectYear: pYear } : {}),
            ...(dt?.taskCodePhu ? { taskCodePhu: dt.taskCodePhu } : {}),
            ...(dt?.name ? { name: dt.name } : {}),
          },
          ...(pId ? { projectId: String(pId) } : {}),
          ...(pCode ? { projectCode: String(pCode) } : {}),
          ...(pStore ? { projectStore: String(pStore) } : {}),
          ...(pYear !== undefined && pYear !== null ? { year: String(pYear) } : {}),
        };
      }),
      ...realUnlinkedChildren.map((c) => ({
        docId: c.id, collectionName: 'taka_tasks', action: 'update', isPatch: true,
        data: { parentTaskId: null, parentId: null, updatedAt: now },
        ...(c.projectId ? { projectId: String(c.projectId) } : {}),
        ...(c.projectCode ? { projectCode: String(c.projectCode) } : {}),
        ...(c.projectStore ? { projectStore: String(c.projectStore) } : {}),
        ...(c.projectYear ? { year: String(c.projectYear) } : {}),
      })),
      ...changedProjectsToSync.map((up) => {
        const cleanSummaries = sanitizeSummaries(up.taskSummaries || []);
        return {
          docId: up.id, collectionName: 'taka_projects', action: 'update', isPatch: true,
          data: {
            taskSummaries: cleanSummaries, taskCount: cleanSummaries.length,
            computedTakStart: up.computedTakStart || '', computedTakCompl: up.computedTakCompl || '',
            computedOpening: up.computedOpening || '', computedPlanProgress: up.computedPlanProgress ?? 0,
            computedActProgress: up.computedActProgress ?? 0, updatedAt: up.updatedAt || now,
          },
          projectId: String(up.id), projectCode: String(up.code || ''), projectStore: String(up.store || ''), year: String(up.year || ''),
        };
      }),
    ];

    markExplicitDelta(deltaItems);

    const batch = writeBatch(db);
    allIdsToDelete.forEach((id) => {
      batch.delete(doc(db, 'artifacts', APP_ID, 'public', 'data', 'taka_tasks', id));
    });
    realUnlinkedChildren.forEach((c) => {
      batch.set(doc(db, 'artifacts', APP_ID, 'public', 'data', 'taka_tasks', c.id), { parentTaskId: deleteField(), parentId: null, updatedAt: now }, { merge: true });
    });
    changedProjectsToSync.forEach((up) => {
      const cleanSummaries = sanitizeSummaries(up.taskSummaries || []);
      batch.set(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'taka_projects', up.id),
        {
          taskSummaries: cleanSummaries, taskCount: cleanSummaries.length,
          computedTakStart: up.computedTakStart || '', computedTakCompl: up.computedTakCompl || '',
          computedOpening: up.computedOpening || '', computedPlanProgress: up.computedPlanProgress ?? 0,
          computedActProgress: up.computedActProgress ?? 0, updatedAt: up.updatedAt || now,
        },
        { merge: true }
      );
    });

    const commitWithWake = async () => {
      let wakeTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        wakeTimer = null;
        resetStalledFirestoreConnection().catch(() => {});
      }, 3500);
      try {
        await batch.commit();
      } finally {
        if (wakeTimer) clearTimeout(wakeTimer);
      }
    };

    await Promise.all([
      commitWithWake(),
      recordBatchDeltas(deltaItems, currentUser?.email || currentUser?.username),
    ]);
  } catch (e) {
    console.warn('[taskStateService] Failed to persist task deletion to Firestore:', e);
  }

  const realTasksDeleted = tasksToDelete.filter(
    (t) => t && t.id && !String(t.id).startsWith('ts_') && !(t as any)._isVirtualSummary
  );
  if (!options?.skipUndo && realTasksDeleted.length > 0) {
    const relatedDelGroups = delegationGroups.filter((d) =>
      realTasksDeleted.some((t) => d.parentTaskId === t.id || d.id === `del_${t.id}`)
    );
    const { undoManager } = await import('../undoManager');
    const { restoreTasksSnapshot } = await import('../undoStateHelpers');
    const desc =
      realTasksDeleted.length === 1
        ? `Delete Task: ${realTasksDeleted[0].name || realTasksDeleted[0].taskCodePhu || realTasksDeleted[0].id}`
        : `Delete ${realTasksDeleted.length} Tasks`;
    undoManager.push({
      description: desc,
      revert: async () => {
        await restoreTasksSnapshot({
          tasksToRestore: [...realTasksDeleted, ...modifiedNeighborsBeforeDeletion],
          delegationsToRestore: relatedDelGroups,
        });
      },
      redo: async () => {
        await deleteTaskStateUnified(realTasksDeleted, { skipUndo: true });
      },
    });
  }
}

export { deleteProjectStateUnified } from './projectDeletionService';

