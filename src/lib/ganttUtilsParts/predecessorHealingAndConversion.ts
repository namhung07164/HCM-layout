import { Task, Project } from '../../types';
import { parsePredecessorToken } from '../predecessorMatchUtils';
import { normalizeDashes } from '../utils';
import {
  sortGroupTasks,
  buildTaskNoMap,
  computeTaskCode,
  computeAllTaskCodes,
  extractExplicitSubtaskNumber,
} from './taskSortingAndCodes';
import { splitPredecessors } from './predecessorParsingAndCascades';

function selectBestMatchingTask(
  task: Task,
  code: string,
  matchingTasks: Task[],
  hardLinkedId?: string
): Task | undefined {
  if (!matchingTasks || matchingTasks.length === 0) return undefined;
  if (matchingTasks.length === 1) return matchingTasks[0];

  const ctxPCode = String(task.projectCode || '').trim().toLowerCase();
  const ctxYear =
    task.projectYear !== undefined && task.projectYear !== null
      ? String(task.projectYear).trim().toLowerCase()
      : '';
  const ctxStore = String(task.projectStore || '').trim().toLowerCase();
  const ctxLoc = String(task.location || '').trim().toLowerCase();
  const ctxProjId = task.projectId || '';
  const codeSubMatch = code.match(/[#-](\d+)$/);
  const targetSubNum = codeSubMatch ? codeSubMatch[1] : null;

  let bestScore = -Infinity;
  let targetTask: Task | undefined;
  for (const cand of matchingTasks) {
    if (!cand) continue;
    let candScore = 0;
    if (hardLinkedId && String(cand.id) === String(hardLinkedId)) candScore += 50000;
    if (targetSubNum) {
      const candCode = String(cand.taskCodePhu || '').trim();
      const candSubMatch = candCode.match(/[#-](\d+)$/);
      if (candSubMatch) {
        if (candSubMatch[1] === targetSubNum) candScore += 25000;
        else candScore -= 50000;
      }
    }
    if (ctxProjId && cand.projectId && ctxProjId === cand.projectId) candScore += 10000;
    if (ctxPCode && cand.projectCode && ctxPCode === String(cand.projectCode).trim().toLowerCase()) candScore += 5000;
    if (ctxYear && cand.projectYear) {
      if (ctxYear === String(cand.projectYear).trim().toLowerCase()) candScore += 3000;
      else candScore -= 4000;
    }
    if (ctxStore && cand.projectStore) {
      if (ctxStore === String(cand.projectStore).trim().toLowerCase()) candScore += 1500;
      else candScore -= 2000;
    }
    if (ctxLoc && cand.location) {
      if (ctxLoc === String(cand.location).trim().toLowerCase()) candScore += 500;
      else candScore -= 500;
    }
    if (candScore > bestScore) {
      bestScore = candScore;
      targetTask = cand;
    }
  }
  return targetTask;
}

/**
 * Normalizes and heals a task's predecessor string by resolving legacy, shortened,
 * or out-of-sync task codes.
 */
export function normalizeAndHealTaskPredecessors(
  task: Task,
  allTasks: Task[],
  projects: Project[],
  cachedTaskNoMap?: Map<string, Task[]>,
  cachedKnownCodes?: Set<string>,
  cachedTaskCodeMap?: Map<string, string>,
  cachedSortedEntries?: Array<[string, Task[]]>
): { changed: boolean; newPredecessor: string } {
  if (!task || !task.predecessor || typeof task.predecessor !== 'string' || !task.predecessor.trim()) {
    return { changed: false, newPredecessor: task?.predecessor || '' };
  }

  const updatedAllTasks = allTasks || [];
  const taskNoMap = cachedTaskNoMap || buildTaskNoMap(projects, updatedAllTasks);
  const knownCodes = cachedKnownCodes || (() => {
    const set = new Set<string>();
    for (const k of taskNoMap.keys()) set.add(k.toLowerCase());
    updatedAllTasks.forEach(t => {
      if (t.taskCodePhu) set.add(t.taskCodePhu.toLowerCase());
      if (t.projectCode) set.add(t.projectCode.toLowerCase());
    });
    return set;
  })();

  const tokens = splitPredecessors(task.predecessor, knownCodes);
  let changed = false;
  let lazySortedEntries: Array<[string, Task[]]> | null = cachedSortedEntries || null;

  const resolveCanonicalTargetCode = (targetTask: Task): string => {
    if (
      targetTask.taskCodePhu &&
      extractExplicitSubtaskNumber(targetTask.taskCodePhu, targetTask.projectCode) !== null
    ) {
      return String(targetTask.taskCodePhu).trim();
    }
    if (cachedTaskCodeMap && targetTask.id) {
      const fromMap = cachedTaskCodeMap.get(targetTask.id);
      if (fromMap) return fromMap;
    }
    return computeTaskCode(projects, updatedAllTasks, targetTask) || targetTask.taskCodePhu || '';
  };

  const resolvedTokens = tokens.map((token, tokIdx) => {
    const rawToken = token.trim();
    if (!rawToken) return token;

    const lowerToken = rawToken.toLowerCase();
    const hardLinkedId = task.predecessorTaskIds?.[tokIdx] || task.predecessors?.[tokIdx]?.taskId;

    // Fast path O(1): direct lookup of parsed token query in taskNoMap
    const parsedFast = parsePredecessorToken(rawToken);
    if (parsedFast.query) {
      const qLower = parsedFast.query.trim().toLowerCase();
      const qNorm = normalizeDashes(qLower);
      const fastMatches = taskNoMap.get(qLower) || (qNorm !== qLower ? taskNoMap.get(qNorm) : undefined);
      if (fastMatches && fastMatches.length > 0) {
        const targetTask = selectBestMatchingTask(task, qLower, fastMatches, hardLinkedId);
        if (targetTask) {
          const currentTargetCode = resolveCanonicalTargetCode(targetTask);
          if (currentTargetCode && currentTargetCode.trim().toLowerCase() !== qLower) {
            changed = true;
            const rawSuffix = rawToken.substring(parsedFast.query.length);
            return `${currentTargetCode.trim()}${rawSuffix}`;
          }
        }
        return token;
      }
    }

    // Fallback prefix scan only when direct O(1) lookup misses
    if (!lazySortedEntries) {
      lazySortedEntries = Array.from(taskNoMap.entries()).sort((a, b) => b[0].length - a[0].length);
    }

    for (const [code, matchingTasks] of lazySortedEntries) {
      if (lowerToken.startsWith(code)) {
        const remainder = lowerToken.substring(code.length);
        if (remainder.length === 0 || /^(\s*(?:fs|ss|ff|sf)|\s*[+-]|\s+\d|$)/i.test(remainder)) {
          const targetTask = selectBestMatchingTask(task, code, matchingTasks, hardLinkedId);
          if (targetTask) {
            const currentTargetCode = resolveCanonicalTargetCode(targetTask);
            if (currentTargetCode && currentTargetCode.trim().toLowerCase() !== code) {
              changed = true;
              return `${currentTargetCode.trim()}${rawToken.substring(code.length)}`;
            }
          }
          return token;
        }
      }
    }

    const suffixMatch = rawToken.match(/\s*((?:FS|SS|FF|SF)\s*(?:[+-]\s*\d+(?:\.\d+)?|\s+\d+(?:\.\d+)?)?|\+\s*\d+(?:\.\d+)?|\s+-\s*\d+(?:\.\d+)?|\s+\d+(?:\.\d+)?)\s*$/i);
    let lagSuffix = "";
    let baseToken = rawToken;

    if (suffixMatch && suffixMatch.index !== undefined && suffixMatch[0].trim()) {
      lagSuffix = suffixMatch[1].trim();
      baseToken = rawToken.substring(0, suffixMatch.index).trim();
    }

    let codePrefix = "";
    let subIndexNum: number | null = null;

    if (/^\d+$/.test(baseToken)) {
      subIndexNum = parseInt(baseToken, 10);
      codePrefix = "";
    } else {
      const matchPrefix = baseToken.match(/^(.+)[-_\s]+(\d+)$/);
      if (matchPrefix) {
        codePrefix = matchPrefix[1].trim();
        subIndexNum = parseInt(matchPrefix[2], 10);
      } else {
        codePrefix = baseToken;
      }
    }

    if (subIndexNum !== null && !isNaN(subIndexNum)) {
      const currentPCode = String(task.projectCode || '').trim();
      const currentPCodeLower = currentPCode.toLowerCase();
      const pCodeParts = currentPCodeLower.split(/[,;/]+/).map(p => p.trim()).filter(Boolean);
      const isMatchingCurrentProject =
        !codePrefix ||
        codePrefix.toLowerCase() === currentPCodeLower ||
        pCodeParts.some(part => part === codePrefix.toLowerCase() || part.startsWith(codePrefix.toLowerCase()) || codePrefix.toLowerCase().startsWith(part));

      const formatHealedToken = (newCode: string) =>
        `${newCode}${lagSuffix ? (lagSuffix.startsWith('+') || lagSuffix.startsWith('-') || /^[a-z]/i.test(lagSuffix) ? lagSuffix : ` ${lagSuffix}`) : ''}`;

      if (isMatchingCurrentProject) {
        const sameProjectTasks = sortGroupTasks(
          updatedAllTasks.filter(t => {
            if (!t) return false;
            const tPCode = String(t.projectCode || '').trim().toLowerCase();
            const sameProj = tPCode === currentPCodeLower || pCodeParts.some(p => p && (tPCode === p || tPCode.includes(p)));
            if (!sameProj) return false;
            if (task.projectYear && t.projectYear && String(t.projectYear) !== String(task.projectYear)) return false;
            if (task.projectStore && t.projectStore && String(t.projectStore) !== String(task.projectStore)) return false;
            return true;
          })
        );
        const targetTask =
          sameProjectTasks.find(t => {
            const code = resolveCanonicalTargetCode(t);
            return code.endsWith(`#${subIndexNum}`) || code.endsWith(`-${subIndexNum}`);
          }) || (subIndexNum >= 1 && subIndexNum <= sameProjectTasks.length ? sameProjectTasks[subIndexNum - 1] : undefined);

        if (targetTask) {
          const newCode = (resolveCanonicalTargetCode(targetTask) || `${currentPCode}#${subIndexNum}`).trim();
          if (newCode) {
            changed = true;
            return formatHealedToken(newCode);
          }
        }
      }

      if (codePrefix) {
        const lowerPrefix = codePrefix.toLowerCase();
        const matchedProj = projects.find(p => {
          if (!p || !p.code) return false;
          const pLower = p.code.toLowerCase();
          const parts = pLower.split(/[,;/]+/).map(item => item.trim()).filter(Boolean);
          return pLower === lowerPrefix || parts.some(part => part === lowerPrefix || part.startsWith(lowerPrefix) || lowerPrefix.startsWith(part));
        });

        if (matchedProj) {
          const targetTasks = sortGroupTasks(
            updatedAllTasks.filter(
              t =>
                t &&
                String(t.projectCode || '').trim().toLowerCase() === String(matchedProj.code).trim().toLowerCase() &&
                (matchedProj.year ? String(t.projectYear || '') === String(matchedProj.year) : true) &&
                (matchedProj.store ? String(t.projectStore || '') === String(matchedProj.store) : true)
            )
          );
          const targetTask =
            targetTasks.find(t => {
              const code = resolveCanonicalTargetCode(t);
              return code.endsWith(`#${subIndexNum}`) || code.endsWith(`-${subIndexNum}`);
            }) || (subIndexNum >= 1 && subIndexNum <= targetTasks.length ? targetTasks[subIndexNum - 1] : undefined);

          if (targetTask) {
            const newCode = (resolveCanonicalTargetCode(targetTask) || `${matchedProj.code}#${subIndexNum}`).trim();
            if (newCode) {
              changed = true;
              return formatHealedToken(newCode);
            }
          }
        }
      }
    }

    return token;
  });

  const newPredecessor = resolvedTokens.join(', ');
  return {
    changed: changed || newPredecessor !== task.predecessor,
    newPredecessor,
  };
}

/**
 * Sweeps through all tasks and heals any out-of-sync or legacy predecessor codes,
 * including parent tasks' auto-rollup SS/FF predecessor codes.
 */
export function healAllTasksPredecessors(
  allTasks: Task[],
  projects: Project[]
): {
  updatedTasks: Task[];
  changedCount: number;
  updatesToSave: { id: string; predecessor?: string; taskCodePhu?: string; updatedAt: string }[];
} {
  const updatesToSave: { id: string; predecessor?: string; taskCodePhu?: string; updatedAt: string }[] = [];
  let changedCount = 0;
  const safeTasks = Array.isArray(allTasks) ? allTasks : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  const taskCodeMap = computeAllTaskCodes(safeProjects, safeTasks);
  const taskByIdLower = new Map<string, Task>();
  const taskByCodeLower = new Map<string, Task>();

  safeTasks.forEach(t => {
    if (!t || !t.id || t.isDeleted) return;
    taskByIdLower.set(String(t.id).trim().toLowerCase(), t);
    const canonical = taskCodeMap.get(t.id);
    if (canonical) taskByCodeLower.set(canonical.trim().toLowerCase(), t);
    if (t.taskCodePhu) taskByCodeLower.set(String(t.taskCodePhu).trim().toLowerCase(), t);
  });

  const childrenByParentId = new Map<string, Task[]>();
  safeTasks.forEach(t => {
    if (!t || !t.id || t.isDeleted) return;
    const rawParent = t.parentTaskId || (t as any).parentId;
    if (!rawParent) return;
    const rawParentLower = String(rawParent).trim().toLowerCase();
    const resolvedParent = taskByIdLower.get(rawParentLower) || taskByCodeLower.get(rawParentLower);
    if (resolvedParent && resolvedParent.id !== t.id) {
      const list = childrenByParentId.get(resolvedParent.id) || [];
      list.push(t);
      childrenByParentId.set(resolvedParent.id, list);
    }
  });

  const taskNoMap = buildTaskNoMap(safeProjects, safeTasks);
  const knownCodes = new Set<string>();
  for (const k of taskNoMap.keys()) knownCodes.add(k.toLowerCase());
  safeTasks.forEach(t => {
    if (t.taskCodePhu) knownCodes.add(t.taskCodePhu.toLowerCase());
    if (t.projectCode) knownCodes.add(t.projectCode.toLowerCase());
  });

  let sharedSortedEntries: Array<[string, Task[]]> | undefined;
  const getTaskEffectiveCode = (t: Task): string => {
    if (t.taskCodePhu && extractExplicitSubtaskNumber(t.taskCodePhu, t.projectCode) !== null) {
      return String(t.taskCodePhu).trim();
    }
    return taskCodeMap.get(t.id) || t.taskCodePhu || '';
  };

  const updatedTasks = safeTasks.map(t => {
    let taskChanged = false;
    let newPred = t.predecessor || '';
    const originalTask = t;

    const newPhu = getTaskEffectiveCode(t);
    if (newPhu && t.taskCodePhu && newPhu !== t.taskCodePhu) {
      taskChanged = true;
    }

    const children = childrenByParentId.get(t.id);
    if (children && children.length > 0) {
      const validChildren = children.filter(c => c && !c.isDeleted && (c.start || c.finish));
      if (validChildren.length > 0) {
        let earliestChild = validChildren[0];
        let latestChild = validChildren[0];
        let minStartStr = String(earliestChild.start || earliestChild.finish || '9999-12-31');
        let maxFinishStr = String(latestChild.finish || latestChild.start || '');
        for (const c of validChildren) {
          const sStr = String(c.start || c.finish || '9999-12-31');
          const fStr = String(c.finish || c.start || '');
          if (sStr < minStartStr) {
            minStartStr = sStr;
            earliestChild = c;
          }
          if (fStr > maxFinishStr) {
            maxFinishStr = fStr;
            latestChild = c;
          }
        }
        const eCode = getTaskEffectiveCode(earliestChild) || earliestChild.id;
        const lCode = getTaskEffectiveCode(latestChild) || latestChild.id;
        const canonicalParentPred = `${eCode}SS, ${lCode}FF`;
        if (canonicalParentPred !== newPred) {
          newPred = canonicalParentPred;
          taskChanged = true;
        }
      }
    } else if (t.predecessor) {
      const hasStaleAutoRollupPred = /^[^,]+SS\s*,\s*[^,]+FF$/i.test(t.predecessor.trim()) && Boolean(t.isModularParent);
      if (hasStaleAutoRollupPred) {
        newPred = '';
        taskChanged = true;
      } else {
        if (!sharedSortedEntries) {
          sharedSortedEntries = Array.from(taskNoMap.entries()).sort((a, b) => b[0].length - a[0].length);
        }
        const { changed, newPredecessor } = normalizeAndHealTaskPredecessors(
          { ...t, taskCodePhu: newPhu },
          safeTasks,
          safeProjects,
          taskNoMap,
          knownCodes,
          taskCodeMap,
          sharedSortedEntries
        );
        if (changed && newPredecessor !== t.predecessor) {
          newPred = newPredecessor;
          taskChanged = true;
        }
      }
    }

    if (taskChanged) {
      changedCount++;
      const updatedAt = new Date().toISOString();
      const origPhu = originalTask.taskCodePhu || '';
      const origPred = originalTask.predecessor || '';

      const updatePayload: { id: string; predecessor?: string; taskCodePhu?: string; updatedAt: string } = {
        id: t.id,
        updatedAt,
      };
      if (newPred !== origPred) updatePayload.predecessor = newPred;
      if (newPhu !== origPhu) updatePayload.taskCodePhu = newPhu;

      updatesToSave.push(updatePayload);
      return {
        ...t,
        taskCodePhu: newPhu,
        predecessor: newPred,
        updatedAt,
      };
    }
    return t;
  });

  return {
    updatedTasks,
    changedCount,
    updatesToSave
  };
}

export function convertAllSubtaskCodesAndPredecessorsToHash(
  allTasks: Task[],
  allProjects: Project[]
): {
  updatedTasks: Task[];
  changedCount: number;
  updatesToSave: Array<{ id: string; predecessor?: string; taskCodePhu?: string; updatedAt: string }>;
} {
  const canonicalTaskCodes = computeAllTaskCodes(allProjects, allTasks);
  const taskOldToNewCodeMap = new Map<string, string>();
  const buildScopedOldKey = (t: Task, codeLower: string) =>
    `${String(t.projectId || '').trim()}__${String(t.projectCode || '').trim().toLowerCase()}__${String(t.projectYear || '').trim()}__${String(t.projectStore || '').trim().toUpperCase()}__${codeLower}`;

  const updatedTasksWithCodes = (allTasks || []).map((t, idx) => {
    const oldCode = (t.taskCodePhu || '').trim();
    const newCode = canonicalTaskCodes.get(t.id) || oldCode;
    if (oldCode && oldCode.toLowerCase() !== newCode.toLowerCase()) {
      taskOldToNewCodeMap.set(buildScopedOldKey(t, oldCode.toLowerCase()), newCode);
      if (!taskOldToNewCodeMap.has(oldCode.toLowerCase())) {
        taskOldToNewCodeMap.set(oldCode.toLowerCase(), newCode);
      }
    }
    return {
      ...t,
      orderIndex: t.orderIndex !== undefined && t.orderIndex !== null ? t.orderIndex : idx,
      taskCodePhu: newCode,
    };
  });

  let changedCount = 0;
  const updatesToSave: Array<{ id: string; predecessor?: string; taskCodePhu?: string; updatedAt: string }> = [];
  const formatWithSuffix = (base: string, suffix?: string) => {
    const s = suffix ? (suffix.startsWith('+') || suffix.startsWith('-') || /^[a-zA-Z]/.test(suffix) ? suffix : ` ${suffix}`) : '';
    return `${base}${s}`;
  };

  const finalTasks = updatedTasksWithCodes.map((t, idx) => {
    const originalTask = allTasks[idx];
    let predChanged = false;
    let newPred = t.predecessor || '';
    const oldPred = t.predecessor || '';

    if (oldPred && oldPred.trim()) {
      const tokens = splitPredecessors(oldPred);
      const convertedTokens = tokens.map(rawToken => {
        const token = rawToken.trim();
        if (!token) return token;
        const { query, suffix } = parsePredecessorToken(token);
        const queryLower = query.toLowerCase();
        const mapped = taskOldToNewCodeMap.get(buildScopedOldKey(t, queryLower)) || taskOldToNewCodeMap.get(queryLower);
        if (mapped) return formatWithSuffix(mapped, suffix);

        const dashMatch = query.match(/^(.*)-(\d+)$/);
        if (dashMatch) {
          const [, prefix, digits] = dashMatch;
          const matchedProj = (allProjects || []).find(p => p.code && p.code.toLowerCase() === prefix.toLowerCase());
          const isKnownProj = Boolean(matchedProj) || (t.projectCode && prefix.toLowerCase() === String(t.projectCode).trim().toLowerCase());
          if (isKnownProj) {
            return formatWithSuffix(`${matchedProj?.code || prefix}#${digits}`, suffix);
          }
        }
        return formatWithSuffix(query, suffix);
      });
      newPred = convertedTokens.join(', ');
      if (newPred !== oldPred) predChanged = true;
    }

    const codeChanged = (t.taskCodePhu || '') !== (originalTask.taskCodePhu || '');
    if (codeChanged || predChanged) {
      changedCount++;
      const updatedAt = new Date().toISOString();
      const updatePayload: { id: string; predecessor?: string; taskCodePhu?: string; updatedAt: string } = { id: t.id, updatedAt };
      if (codeChanged) updatePayload.taskCodePhu = t.taskCodePhu;
      if (predChanged) updatePayload.predecessor = newPred;
      updatesToSave.push(updatePayload);
      return { ...t, predecessor: newPred, updatedAt };
    }
    return t;
  });

  return { updatedTasks: finalTasks, changedCount, updatesToSave };
}
