import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { setDoc } from '../../lib/firestoreWrites';
import { db, APP_ID } from '../../lib/firebase';
import { useDataStore } from '../PictureMapping/DataContext';
import { useAppStore } from '../../store/useAppStore';

// Dedicated isolated storage keys for HCM Layout App (completely decoupled from PM or other apps)
export const CUSTOM_PAINT_CATEGORIES_STORAGE_KEY = 'hcm_layout_custom_paint_categories';
export const ACTIVE_PAINT_FILTER_STORAGE_KEY = 'hcm_layout_active_paint_filter';
export const PAINT_GROUP_MAPPINGS_STORAGE_KEY = 'hcm_layout_paint_group_mappings';

// Firestore collection & document name isolated for Layout App
export const LAYOUT_PAINT_CATEGORIES_DOC = 'hcm_layout_paint_categories';

export const DEFAULT_PRESET_CATEGORIES = [
  'Progress',
  'Shop type',
  'Status',
  'Timeline',
];

export interface PaintCategoriesConfig {
  categories: string[];
  groupMappings?: Record<string, string>;
  activePaintFilter?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Memory cache to avoid redundant JSON parsing
let cachedCategories: string[] | null = null;
let cachedActiveFilter: string | null = null;
let cachedGroupMappings: Record<string, string> | null = null;

// Shared singleton Firestore listener state (Anti-Read-Storm)
type ConfigSubscriber = (config: PaintCategoriesConfig) => void;
const subscribers = new Set<ConfigSubscriber>();
let sharedFirestoreUnsub: Unsubscribe | null = null;
let hasSeededInitialDoc = false;

/**
 * Get locally cached paint categories (0ms read) - Isolated for Layout App
 */
export function getSavedCustomPaintCategories(): string[] {
  if (cachedCategories && cachedCategories.length > 0) {
    return cachedCategories;
  }
  try {
    let raw = localStorage.getItem(CUSTOM_PAINT_CATEGORIES_STORAGE_KEY);
    // Legacy fallback check if fresh layout app key not populated yet
    if (!raw) {
      raw = localStorage.getItem('taka_layout_custom_paint_categories');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedCategories = parsed.map((c: any) => String(c || '').trim()).filter(Boolean);
        if (cachedCategories.length > 0) {
          return cachedCategories;
        }
      }
    }
  } catch {
    // fallback
  }
  cachedCategories = [...DEFAULT_PRESET_CATEGORIES];
  return cachedCategories;
}

/**
 * Get locally cached active paint filter (Device-local UI state only, defaults to 'all' to show all rules)
 */
export function getSavedActivePaintFilter(): string {
  if (cachedActiveFilter) return cachedActiveFilter;
  try {
    let raw = localStorage.getItem(ACTIVE_PAINT_FILTER_STORAGE_KEY);
    if (!raw) {
      // Legacy fallback
      raw = localStorage.getItem('taka_layout_active_paint_filter');
    }
    if (raw && typeof raw === 'string' && raw.trim()) {
      cachedActiveFilter = raw.trim();
      return cachedActiveFilter;
    }
  } catch {
    // fallback
  }
  // Default to 'all' so by default all dynamic colors appear on the layout
  cachedActiveFilter = 'all';
  return cachedActiveFilter;
}

/**
 * Save active paint filter locally on this device only (isolated to HCM Layout App)
 */
export function saveActivePaintFilterLocal(activeCategory: string): void {
  const trimmed = String(activeCategory || '').trim();
  if (!trimmed) return;
  cachedActiveFilter = trimmed;
  try {
    localStorage.setItem(ACTIVE_PAINT_FILTER_STORAGE_KEY, trimmed);
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Get locally cached condition group mappings (Isolated for HCM Layout App)
 */
export function getSavedPaintGroupMappings(): Record<string, string> {
  if (cachedGroupMappings) return cachedGroupMappings;
  try {
    let raw = localStorage.getItem(PAINT_GROUP_MAPPINGS_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem('taka_layout_paint_group_mappings');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        cachedGroupMappings = parsed;
        return cachedGroupMappings;
      }
    }
  } catch {
    // fallback
  }
  cachedGroupMappings = {};
  return cachedGroupMappings;
}

/**
 * Resolve effective paint category for a condition group
 */
export function resolveGroupPaintCategory(
  group: any,
  groupMappings?: Record<string, string>
): string {
  if (!group) return '';
  const mappings = groupMappings || getSavedPaintGroupMappings();

  if (group.id && mappings[group.id]) {
    return String(mappings[group.id] || '').trim();
  }
  if (group.name && mappings[group.name]) {
    return String(mappings[group.name] || '').trim();
  }
  const direct = group.paintCategory || group.category || '';
  return String(direct || '').trim();
}

/**
 * Notify all in-memory subscribers (0ms)
 */
function notifySubscribers(config: PaintCategoriesConfig) {
  subscribers.forEach((cb) => {
    try {
      cb(config);
    } catch (err) {
      console.error('[layoutPaintCategoriesService] Subscriber error:', err);
    }
  });
}

/**
 * Save paint categories filter data (categories list & condition mappings) to LocalStorage + Cloud Firestore
 * Isolated to 'hcm_layout_paint_categories' so it NEVER interferes with other apps!
 */
export async function savePaintCategoriesConfig(
  config: Partial<PaintCategoriesConfig>,
  currentEmail?: string
): Promise<void> {
  try {
    // 1. Optimistic local cache update (0ms)
    if (config.categories && Array.isArray(config.categories)) {
      const cleaned = Array.from(
        new Set(config.categories.map((c) => String(c || '').trim()).filter(Boolean))
      );
      cachedCategories = cleaned;
      localStorage.setItem(CUSTOM_PAINT_CATEGORIES_STORAGE_KEY, JSON.stringify(cleaned));
    }
    if (config.groupMappings !== undefined) {
      cachedGroupMappings = config.groupMappings;
      localStorage.setItem(PAINT_GROUP_MAPPINGS_STORAGE_KEY, JSON.stringify(config.groupMappings));
    }
    if (config.activePaintFilter !== undefined) {
      const trimmedFilter = String(config.activePaintFilter || '').trim();
      cachedActiveFilter = trimmedFilter;
      try {
        localStorage.setItem(ACTIVE_PAINT_FILTER_STORAGE_KEY, trimmedFilter);
      } catch {}
      try {
        useAppStore.getState().setLayoutPaintCategory(trimmedFilter);
      } catch {}
    }

    const currentConfigSnapshot: PaintCategoriesConfig = {
      categories: cachedCategories || getSavedCustomPaintCategories(),
      groupMappings: cachedGroupMappings || getSavedPaintGroupMappings(),
      activePaintFilter: cachedActiveFilter || getSavedActivePaintFilter(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentEmail || 'system',
    };

    // Immediate in-memory notification to all mounted Layout components (0ms)
    notifySubscribers(currentConfigSnapshot);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('taka_paint_categories_updated', {
          detail: currentConfigSnapshot,
        })
      );
    }

    // 2. Cloud Firestore Persistence (Isolated: taka_config/hcm_layout_paint_categories)
    const paintCategoriesDocRef = doc(
      db,
      'artifacts',
      APP_ID,
      'public',
      'data',
      'taka_config',
      LAYOUT_PAINT_CATEGORIES_DOC
    );

    const payload: Record<string, any> = {
      updatedAt: currentConfigSnapshot.updatedAt,
      updatedBy: currentConfigSnapshot.updatedBy,
    };

    if (config.categories !== undefined) {
      payload.categories = cachedCategories;
    }
    if (config.groupMappings !== undefined) {
      payload.groupMappings = cachedGroupMappings;
    }
    // Note: activePaintFilter is kept device-local so different tabs/apps don't force-override each other

    await setDoc(paintCategoriesDocRef, payload, { merge: true });

    // 3. Touch layout versions document to alert snapshot listeners
    const versionsDocRef = doc(
      db,
      'artifacts',
      APP_ID,
      'public',
      'data',
      'taka_config',
      'hcm_layout_versions'
    );
    await setDoc(
      versionsDocRef,
      {
        layoutPaintCategoriesVersion: Date.now(),
        updatedAt: currentConfigSnapshot.updatedAt,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[layoutPaintCategoriesService] Cloud save failed:', err);
  }
}

/**
 * Apply cloud group mappings onto local versions in DataStore
 */
export function applyGroupMappingsToVersions(
  groupMappings: Record<string, string>,
  targetStore: 'HCM' | 'HN'
) {
  if (!groupMappings || Object.keys(groupMappings).length === 0) return;

  try {
    const dataStore = useDataStore.getState();
    const versions = dataStore.getAllStoreVersions?.(targetStore);
    if (!Array.isArray(versions) || versions.length === 0) return;

    let hasChanges = false;
    const updated = versions.map((v) => {
      if (!Array.isArray(v.groups) || v.groups.length === 0) return v;
      let versionChanged = false;
      const nextGroups = v.groups.map((g: any) => {
        const resolved = resolveGroupPaintCategory(g, groupMappings);
        if (resolved && (g.paintCategory !== resolved || g.category !== resolved)) {
          versionChanged = true;
          return {
            ...g,
            paintCategory: resolved,
            category: resolved,
          };
        }
        return g;
      });

      if (versionChanged) {
        hasChanges = true;
        return { ...v, groups: nextGroups };
      }
      return v;
    });

    if (hasChanges && dataStore.updateStoreVersionsAcrossLocations) {
      dataStore.updateStoreVersionsAcrossLocations(updated, targetStore);
    }
  } catch (err) {
    console.warn('[layoutPaintCategoriesService] applyGroupMappings error:', err);
  }
}

function ensureSharedListener() {
  if (sharedFirestoreUnsub) return;

  const paintCategoriesDocRef = doc(
    db,
    'artifacts',
    APP_ID,
    'public',
    'data',
    'taka_config',
    LAYOUT_PAINT_CATEGORIES_DOC
  );

  sharedFirestoreUnsub = onSnapshot(
    paintCategoriesDocRef,
    (snap) => {
      if (!snap.exists()) {
        const initialCategories = getSavedCustomPaintCategories();
        const initialMappings = getSavedPaintGroupMappings();
        const initialConfig: PaintCategoriesConfig = {
          categories: initialCategories,
          groupMappings: initialMappings,
        };
        notifySubscribers(initialConfig);

        // Seed initial document once so layout app has its independent configuration
        if (!hasSeededInitialDoc) {
          hasSeededInitialDoc = true;
          setDoc(
            paintCategoriesDocRef,
            {
              categories: initialCategories,
              groupMappings: initialMappings,
              updatedAt: new Date().toISOString(),
              updatedBy: 'system_init',
            },
            { merge: true }
          ).catch(() => {});
        }
        return;
      }

      const data = snap.data() as PaintCategoriesConfig;
      const categories =
        Array.isArray(data.categories) && data.categories.length > 0
          ? Array.from(new Set(data.categories.map((c) => String(c || '').trim()).filter(Boolean)))
          : getSavedCustomPaintCategories();

      cachedCategories = categories;
      try {
        localStorage.setItem(CUSTOM_PAINT_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      } catch {}

      const groupMappings =
        data.groupMappings && typeof data.groupMappings === 'object'
          ? data.groupMappings
          : getSavedPaintGroupMappings();

      cachedGroupMappings = groupMappings;
      try {
        localStorage.setItem(PAINT_GROUP_MAPPINGS_STORAGE_KEY, JSON.stringify(groupMappings));
      } catch {}

      // Apply mappings to both stores in DataStore if loaded
      applyGroupMappingsToVersions(groupMappings, 'HCM');
      applyGroupMappingsToVersions(groupMappings, 'HN');

      const nextConfig: PaintCategoriesConfig = {
        categories,
        groupMappings,
        activePaintFilter: cachedActiveFilter || getSavedActivePaintFilter(),
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };

      notifySubscribers(nextConfig);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('taka_paint_categories_updated', {
            detail: nextConfig,
          })
        );
      }
    },
    (err) => {
      console.warn('[layoutPaintCategoriesService] onSnapshot error:', err);
    }
  );
}

/**
 * Real-time listener for layout filter data across devices (Isolated to Layout App)
 */
export function subscribePaintCategoriesConfig(
  onUpdate: (config: PaintCategoriesConfig) => void
): Unsubscribe {
  subscribers.add(onUpdate);

  // Immediately deliver cached state on mount (0ms)
  onUpdate({
    categories: getSavedCustomPaintCategories(),
    groupMappings: getSavedPaintGroupMappings(),
    activePaintFilter: getSavedActivePaintFilter(),
  });

  ensureSharedListener();

  return () => {
    subscribers.delete(onUpdate);
  };
}
