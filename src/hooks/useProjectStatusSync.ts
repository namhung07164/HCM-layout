import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, defaultDb } from '../lib/firebase';
import { ProjectStatusInfo } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const parseDate = (val: any) => {
  if (!val) return null;
  if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();
  if (typeof val === 'number') return new Date(val); 
  
  if (typeof val === 'string') {
     const d = new Date(val);
     if (!isNaN(d.getTime())) return d;
  }
  return null;
}

const formatDateToMMM_DD_YYYY = (date: Date | null) => {
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const getFieldValue = (obj: any, possibleKeys: string[]) => {
  if (!obj) return null;
  const keys = Object.keys(obj);
  for (const key of keys) {
    if (possibleKeys.includes(key.toLowerCase().trim())) {
      return obj[key];
    }
  }
  return null;
};

const getStatus = (start: any, handover: any, opening: any, code: any) => {
  if (code && String(code).toLowerCase().includes('cancel')) return 'Canceled';
  if (!start) return 'Upcoming';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dStart = new Date(start);
  if (isNaN(dStart.getTime())) return 'Upcoming';
  
  const dHandover = handover ? new Date(handover) : null;
  const dOpening = opening ? new Date(opening) : null;
  
  const dEnd = (dOpening && dHandover) 
    ? (dOpening > dHandover ? dOpening : dHandover)
    : (dOpening || dHandover);
  
  if (today < dStart) return 'Upcoming';
  if (dEnd && today > dEnd) return 'Completed';
  if (dHandover && dOpening && today >= dHandover && today <= dOpening) return 'Handover';
  
  return 'On process';
};

export function useProjectStatusSync(validUnits: string[], activeStore: string) {
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let projectsLoaded = false;
    let tasksLoaded = false;

    const checkLoading = () => {
      if (projectsLoaded && tasksLoaded) {
        setLoading(false);
      }
    };

    const unsubProjects = onSnapshot(collection(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_projects'), (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Raw taka_projects loaded from Firebase:", projects);
      setRawProjects(projects);
      projectsLoaded = true;
      setError(null);
      checkLoading();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'artifacts/taka-projects-app-v1/public/data/taka_projects');
      setError('Cannot read taka_projects from Firebase. Please check firebaseConfig.');
      projectsLoaded = true;
      checkLoading();
    });

    const unsubTasks = onSnapshot(collection(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_tasks'), (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Raw taka_tasks loaded from Firebase:", tasks.length);
      setRawTasks(tasks);
      tasksLoaded = true;
      checkLoading();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'artifacts/taka-projects-app-v1/public/data/taka_tasks');
      setError('Cannot read taka_tasks from Firebase. Please check firebaseConfig.');
      tasksLoaded = true;
      checkLoading();
    });

    return () => {
      unsubProjects();
      unsubTasks();
    };
  }, []);

  const projectStatus = useMemo(() => {
    // Only map projects that have a code matching units from the Summary tab
    // Also restrict strictly to activeStore
    const filteredProjects = rawProjects.filter(p => {
      const code = String(p.code || p.CODE || '').trim();
      const store = String(p.store || p.STORE || '').trim().toUpperCase();
      return validUnits.includes(code) && store === activeStore;
    });

    return filteredProjects.map(p => {
      const code = String(p.code || p.CODE || '').trim();
      const pYear = String(p.year || p.YEAR || '').trim();
      const pStore = String(p.store || p.STORE || '').trim();

      const projectTasks = rawTasks.filter(t => 
        t.projectCode === code && 
        (String(t.projectYear || '').trim() === pYear || (!t.projectYear && !pYear)) &&
        (String(t.projectStore || '').trim() === pStore || (!t.projectStore && !pStore))
      );

      let computedTakStart = p.start;
      let computedTakCompl: string | undefined = undefined;

      if (projectTasks.length > 0) {
        const validStarts = projectTasks.map(t => t.start).filter(Boolean).sort();
        if (validStarts.length > 0) {
          computedTakStart = validStarts[0];
        }

        const validFinishes = projectTasks.map(t => t.finish).filter(Boolean).sort((a, b) => (b || '').localeCompare(a || ''));
        if (validFinishes.length > 0) {
          computedTakCompl = validFinishes[0];
        }
      }

      const now = new Date();
      const activeTasks = projectTasks.filter(t => {
        if (!t.start || !t.finish) return false;
        const tStart = new Date(t.start);
        const tFinish = new Date(t.finish);
        return now >= tStart && now <= tFinish;
      });

      let taskLines: string[] = [];
      activeTasks.forEach(t => {
        if (t.name) {
          taskLines.push(...t.name.split('\n').filter((l: string) => l.trim() !== ''));
        }
      });
      const detailString = taskLines.length > 0 ? taskLines.join('\n') : (p.detail || '');

      const computedOpening = p.opening;
      const statusStr = getStatus(computedTakStart, computedTakCompl, computedOpening, code);

      const finalStartDate = parseDate(computedTakStart);
      const finalEndDate = parseDate(computedTakCompl);

      return {
        id: p.id,
        update: String(p.year || p.YEAR || new Date().getFullYear()), 
        projectName: p.project || p.PROJECT || p.name || 'Unnamed Project',
        unit: p.code || p.CODE || 'N/A',
        status: statusStr,
        startDate: formatDateToMMM_DD_YYYY(finalStartDate),
        endDate: formatDateToMMM_DD_YYYY(finalEndDate),
        task: String(detailString),
        delegationStatus: '',
        party: p.store || p.STORE || '',
        flowStatus: p.location || p.LOCATION || ''
      };
    });
  }, [rawProjects, rawTasks, validUnits]);

  return { projectStatus, loading, error };
}
