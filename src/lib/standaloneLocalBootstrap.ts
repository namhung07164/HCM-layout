import { getLocalProjects } from './localDb';
import { useAppStore } from '../store/useAppStore';

let bootstrapInFlightPromise: Promise<{ projectCount: number }> | null = null;

/**
 * Nạp dữ liệu cục bộ từ Dexie Local-First DB (0 network, 0 Firestore)
 */
export function bootstrapLocalStore(): Promise<{ projectCount: number }> {
  if (bootstrapInFlightPromise) return bootstrapInFlightPromise;

  bootstrapInFlightPromise = (async () => {
    try {
      const store = useAppStore.getState();
      const projects = await getLocalProjects('all');
      const validProjects = projects.filter((p) => p && !p.isDeleted);

      if (validProjects.length > 0 && (!store.projects || store.projects.length === 0)) {
        store.setProjects(validProjects);
      }
      return { projectCount: validProjects.length };
    } catch (err) {
      console.warn('[standaloneLocalBootstrap] local store boot error:', err);
      return { projectCount: 0 };
    } finally {
      bootstrapInFlightPromise = null;
    }
  })();

  return bootstrapInFlightPromise;
}
