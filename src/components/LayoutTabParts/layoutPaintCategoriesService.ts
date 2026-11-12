import { useDataStore } from '../PictureMapping/DataContext';
import { useAppStore } from '../../store/useAppStore';
import { triggerBackgroundR2Sync } from '../PictureMapping/lib/dynamicExportService';

// Dedicated isolated storage keys for HCM Layout App (100% Standalone & Zero Firestore)
export const CUSTOM_PAINT_CATEGORIES_STORAGE_KEY = 'hcm_layout_custom_paint_categories';
export const ACTIVE_PAINT_FILTER_STORAGE_KEY = 'hcm_layout_active_paint_filter';
export const PAINT_GROUP_MAPPINGS_STORAGE_KEY = 'hcm_layout_paint_group_mappings';

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

type ConfigSubscriber = (config: PaintCategoriesConfig) => void;
const subscribers = new Set<ConfigSubscriber>();
let isWindowListenerAttached = false;

/**
 * Get locally cached paint categories (0ms read) - Isolated for Layout App (Zero Firestore)
 */
export function getSavedCustomPaintCategories(): string[] {
  if (cachedCategories && cachedCategories.length > 0) {
    return cachedCategories;
  }
  try {
    let raw = localStorage.getItem(CUSTOM_PAINT_CATEGORIES_STORAGE_KEY);
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
      raw = localStorage.getItem('taka_layout_active_paint_filter');
    }
    if (raw && typeof raw === 'string' && raw.trim()) {
      cachedActiveFilter = raw.trim();
      return cachedActiveFilter;
    }
  } catch {
    // fallback
  }
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
 * Save paint categories filter data to LocalStorage + Cloudflare R2 (Zero Firestore)
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
      updatedBy: currentEmail || 'local_user',
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

    // 2. Persist to Cloudflare R2 in background
    try {
      triggerBackgroundR2Sync('HCM');
      triggerBackgroundR2Sync('HN');
    } catch {}
  } catch (err) {
    console.warn('[layoutPaintCategoriesService] Save failed:', err);
  }
}

/**
 * Hydrate paint categories config from Cloud R2 payload into local cache and notify subscribers (without circular R2 upload)
 */
export function hydratePaintCategoriesFromCloud(config?: Partial<PaintCategoriesConfig>): void {
  if (!config || typeof config !== 'object') return;
  try {
    if (Array.isArray(config.categories) && config.categories.length > 0) {
      const cleaned = Array.from(
        new Set(config.categories.map((c) => String(c || '').trim()).filter(Boolean))
      );
      if (cleaned.length > 0) {
        cachedCategories = cleaned;
        localStorage.setItem(CUSTOM_PAINT_CATEGORIES_STORAGE_KEY, JSON.stringify(cleaned));
      }
    }
    if (config.groupMappings && typeof config.groupMappings === 'object') {
      cachedGroupMappings = config.groupMappings;
      localStorage.setItem(PAINT_GROUP_MAPPINGS_STORAGE_KEY, JSON.stringify(config.groupMappings));
    }
    if (typeof config.activePaintFilter === 'string' && config.activePaintFilter.trim()) {
      const trimmedFilter = config.activePaintFilter.trim();
      cachedActiveFilter = trimmedFilter;
      localStorage.setItem(ACTIVE_PAINT_FILTER_STORAGE_KEY, trimmedFilter);
    }

    const snapshot: PaintCategoriesConfig = {
      categories: cachedCategories || getSavedCustomPaintCategories(),
      groupMappings: cachedGroupMappings || getSavedPaintGroupMappings(),
      activePaintFilter: cachedActiveFilter || getSavedActivePaintFilter(),
      updatedAt: config.updatedAt || new Date().toISOString(),
    };
    notifySubscribers(snapshot);
  } catch (err) {
    console.warn('[layoutPaintCategoriesService] Hydrate from cloud failed:', err);
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

/**
 * Listen for paint categories updates across components via local bus (Zero Firestore)
 */
export function subscribePaintCategoriesConfig(
  onUpdate: (config: PaintCategoriesConfig) => void
): () => void {
  subscribers.add(onUpdate);

  // Immediately deliver cached state on mount (0ms)
  onUpdate({
    categories: getSavedCustomPaintCategories(),
    groupMappings: getSavedPaintGroupMappings(),
    activePaintFilter: getSavedActivePaintFilter(),
  });

  if (!isWindowListenerAttached && typeof window !== 'undefined') {
    isWindowListenerAttached = true;
    window.addEventListener('taka_paint_categories_updated', (e: any) => {
      if (e?.detail) {
        notifySubscribers(e.detail);
      }
    });
  }

  return () => {
    subscribers.delete(onUpdate);
  };
}
