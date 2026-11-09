import { Project } from '../../types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, APP_ID } from '../../lib/firebase';
import { normalizeYearString, normalizeStoreCode } from '../../lib/taskDeduplicationService';
import { matchProjectCode } from '../../lib/projectDatesService';
import { normalizeDashes } from '../../lib/utils';
import { isProjectDeletedInTracker } from '../../lib/taskDeletedTracker';
import { useAppStore } from '../../store/useAppStore';

export interface RawImportProjectKey {
  projectCode: string;
  projectYear?: string;
  projectStore?: string;
  isPredecessorRef?: boolean;
}

/**
 * Hydrates projects for import validation from Zustand, Dexie (localDb), and Firestore.
 * This guarantees that when an import file references projects in years or stores not
 * currently loaded in the active view (e.g. year 2027 HN when viewing 2026 HCM),
 * the validator can find the project, hydrate it into the local store, and succeed.
 */
export async function hydrateProjectsForImport(
  keys: RawImportProjectKey[],
  currentProjects: Project[]
): Promise<Project[]> {
  const projectMap = new Map<string, Project>();

  // 1. Index in-memory projects (combine currentProjects prop + latest Zustand store)
  const storeProjectsNow = useAppStore.getState().projects || [];
  for (const list of [currentProjects || [], storeProjectsNow]) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p && p.id && !p.isDeleted && !isProjectDeletedInTracker(p.id)) {
        projectMap.set(String(p.id).trim(), p);
      }
    }
  }

  // Deduplicate incoming keys first
  const uniqueKeysMap = new Map<string, RawImportProjectKey>();
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!k || !k.projectCode) continue;
    const cleanCode = normalizeDashes(k.projectCode).trim();
    if (!cleanCode) continue;
    const dedupKey = `${cleanCode.toLowerCase()}|${normalizeYearString(k.projectYear)}|${normalizeStoreCode(k.projectStore)}|${k.isPredecessorRef ? '1' : '0'}`;
    if (!uniqueKeysMap.has(dedupKey)) {
      uniqueKeysMap.set(dedupKey, {
        ...k,
        projectCode: cleanCode,
      });
    }
  }
  const deduplicatedKeys = Array.from(uniqueKeysMap.values());

  const matchesKey = (p: Project, k: RawImportProjectKey): boolean => {
    if (!p || p.isDeleted || (p.id && isProjectDeletedInTracker(p.id))) return false;
    const pCodeMatch =
      matchProjectCode(p.code, k.projectCode) ||
      (p.linkCodes ? matchProjectCode(p.linkCodes, k.projectCode) : false);
    if (!pCodeMatch) return false;
    const pStore = normalizeStoreCode(p.store);
    const kStore = normalizeStoreCode(k.projectStore);
    if (pStore && kStore && pStore !== kStore) return false;
    if (!k.isPredecessorRef) {
      const pYear = normalizeYearString(p.year);
      const kYear = normalizeYearString(k.projectYear);
      if (pYear && kYear && pYear !== kYear) return false;
    }
    return true;
  };

  const missingKeys: RawImportProjectKey[] = [];
  const projectList = Array.from(projectMap.values());

  for (let i = 0; i < deduplicatedKeys.length; i++) {
    const k = deduplicatedKeys[i];
    let found = false;
    for (let j = 0; j < projectList.length; j++) {
      if (matchesKey(projectList[j], k)) {
        found = true;
        break;
      }
    }
    if (!found) {
      missingKeys.push(k);
    }
  }

  if (missingKeys.length === 0) {
    return projectList;
  }

  // 2. Check Dexie localDb for missing project years / codes
  try {
    const { getLocalProjects, bulkPersistProjects } = await import('../../lib/localDb');
    const allLocal = await getLocalProjects('all');
    let addedFromLocal = false;
    for (let i = 0; i < allLocal.length; i++) {
      const p = allLocal[i];
      if (p && p.id && !p.isDeleted && !isProjectDeletedInTracker(p.id)) {
        const pid = String(p.id).trim();
        if (!projectMap.has(pid)) {
          projectMap.set(pid, p);
          addedFromLocal = true;
        }
      }
    }

    const updatedProjectList = addedFromLocal ? Array.from(projectMap.values()) : projectList;
    if (addedFromLocal) {
      useAppStore.getState().setProjects([...updatedProjectList].sort((a, b) => (a.no || 0) - (b.no || 0)));
    }
    const stillMissing: RawImportProjectKey[] = [];
    for (let i = 0; i < missingKeys.length; i++) {
      const k = missingKeys[i];
      let found = false;
      for (let j = 0; j < updatedProjectList.length; j++) {
        if (matchesKey(updatedProjectList[j], k)) {
          found = true;
          break;
        }
      }
      if (!found) {
        stillMissing.push(k);
      }
    }

    // 3. If still missing from localDb, query Firestore taka_projects directly
    if (stillMissing.length > 0) {
      const colRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'taka_projects');
      const fetchPromises: Promise<any>[] = [];

      const queriedYears = new Set<string>();
      const queriedCodes = new Set<string>();

      for (let i = 0; i < stillMissing.length; i++) {
        const k = stillMissing[i];
        const cleanCode = normalizeDashes(k.projectCode).trim();
        const cleanYear = !k.isPredecessorRef ? normalizeYearString(k.projectYear) : '';

        // A. Single-field queries on year only if non-predecessor target project year is missing
        if (cleanYear && !queriedYears.has(cleanYear)) {
          queriedYears.add(cleanYear);
          fetchPromises.push(
            getDocs(query(colRef, where('year', '==', cleanYear))).catch(() => null)
          );
          if (!isNaN(Number(cleanYear))) {
            fetchPromises.push(
              getDocs(query(colRef, where('year', '==', Number(cleanYear)))).catch(() => null)
            );
          }
        }

        // B. Single-field query on code variants (both hyphen, en-dash, upper, lower)
        if (cleanCode && !queriedCodes.has(cleanCode.toLowerCase())) {
          queriedCodes.add(cleanCode.toLowerCase());
          const dashHyphen = cleanCode.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');
          const dashEn = cleanCode.replace(/-/g, '–');
          const codeVariants = Array.from(
            new Set([
              cleanCode,
              cleanCode.toUpperCase(),
              cleanCode.toLowerCase(),
              dashHyphen,
              dashHyphen.toUpperCase(),
              dashHyphen.toLowerCase(),
              dashEn,
              dashEn.toUpperCase(),
              dashEn.toLowerCase(),
            ])
          ).slice(0, 10);
          fetchPromises.push(
            getDocs(
              codeVariants.length > 1
                ? query(colRef, where('code', 'in', codeVariants))
                : query(colRef, where('code', '==', codeVariants[0]))
            ).catch(() => null)
          );
        }
      }

      const snapshots = await Promise.all(fetchPromises);
      const newlyFetched: Project[] = [];
      snapshots.forEach((snap) => {
        if (!snap) return;
        snap.forEach((docSnap: any) => {
          const data = { id: docSnap.id, ...docSnap.data() } as Project;
          if (data && !data.isDeleted && !isProjectDeletedInTracker(data.id)) {
            if (!projectMap.has(data.id)) {
              newlyFetched.push(data);
            }
            projectMap.set(data.id, data);
          }
        });
      });

      if (newlyFetched.length > 0) {
        bulkPersistProjects(newlyFetched).catch(() => {});
        const storeProjects = useAppStore.getState().projects || [];
        const mergedById = new Map<string, Project>(storeProjects.map((p) => [p.id, p]));
        newlyFetched.forEach((p) => mergedById.set(p.id, p));
        const mergedList = Array.from(mergedById.values()).sort((a, b) => (a.no || 0) - (b.no || 0));
        useAppStore.getState().setProjects(mergedList);
      }
    }
  } catch (err) {
    console.warn('[hydrateProjectsForImport] error hydrating projects:', err);
  }

  return Array.from(projectMap.values());
}
