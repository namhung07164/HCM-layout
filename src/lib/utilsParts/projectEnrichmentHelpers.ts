import { Project } from "../../types";
import { parseDateTime } from "./commonAndDateUtils";

const statusPriority: Record<string, number> = {
  'On process': 1,
  'Handover': 2,
  'Upcoming': 3,
  'Completed': 4,
  'Canceled': 5,
};

export function sortEnrichedProjects(enrichedProjects: Project[]): Project[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  // Pre-compute finish timestamps in O(P) for 'On process' projects before sorting
  const onProcessFinishDiffMap = new WeakMap<Project, number>();
  for (let i = 0; i < enrichedProjects.length; i++) {
    const ep = enrichedProjects[i];
    if ((ep.computedStatus || 'Upcoming') === 'On process') {
      const parsed = parseDateTime(ep.computedTakCompl || ep.computedOpening || ep.opening || '9999-12-31');
      if (parsed) onProcessFinishDiffMap.set(ep, Math.abs(parsed.getTime() - todayTime));
    }
  }

  enrichedProjects.sort((a, b) => {
    const statusA = a.computedStatus || 'Upcoming';
    const statusB = b.computedStatus || 'Upcoming';
    const priorityA = statusPriority[statusA] || 99;
    const priorityB = statusPriority[statusB] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;

    if (statusA === 'On process') {
      const diffA = onProcessFinishDiffMap.get(a);
      const diffB = onProcessFinishDiffMap.get(b);
      if (diffA !== undefined && diffB !== undefined && diffA !== diffB) return diffA - diffB;
    }

    const startA = a.computedTakStart || '9999-12-31';
    const startB = b.computedTakStart || '9999-12-31';
    if (startA < startB) return -1;
    if (startA > startB) return 1;

    return (
      String(a.code || '').localeCompare(String(b.code || '')) ||
      String(a.year || '').localeCompare(String(b.year || ''))
    );
  });

  return enrichedProjects;
}

export function resolveProjectDatesFromSource(
  p: Project,
  sourceItems: Array<{ start?: string; finish?: string; name?: string }>,
  isRealTasks: boolean
): { computedTakStart: string; computedTakCompl?: string; computedOpening: string } {
  let computedTakStart = p.computedTakStart || p.start;
  let computedTakCompl: string | undefined =
    p.computedTakCompl || p.handover || (p as any).takCompl || undefined;
  let computedOpening = p.computedOpening || (p.openingMode === 'manual' ? p.opening : '');

  let minStart: string | undefined = undefined;
  let maxCompl: string | undefined = undefined;
  let hasOpeningTask = false;

  for (let i = 0; i < sourceItems.length; i++) {
    const t = sourceItems[i];
    if (t.start && (!minStart || t.start < minStart)) {
      minStart = t.start;
    }
    if (t.finish && (!maxCompl || t.finish > maxCompl)) {
      maxCompl = t.finish;
    }
    const name = t.name ? String(t.name).toLowerCase() : "";
    if ((name.includes("opening") || name.includes("open")) && t.finish) {
      if (!hasOpeningTask || t.finish > computedOpening) {
        computedOpening = t.finish;
        hasOpeningTask = true;
      }
    }
  }

  if (minStart) computedTakStart = minStart;
  if (maxCompl) computedTakCompl = maxCompl;
  if (!hasOpeningTask && p.openingMode !== 'manual') {
    computedOpening = '';
  }

  return { computedTakStart, computedTakCompl, computedOpening };
}

/**
 * Synchronizes project linkCodes when a project code is updated.
 * Ensures the project's own code in linkCodes is updated from oldCode to newCode,
 * preserving any additional linked codes.
 */
export function updateLinkCodesOnProjectCodeChange(
  currentLinkCodes: string | null | undefined,
  oldCode: string | null | undefined,
  newCode: string | null | undefined
): string {
  const cleanNew = String(newCode || '').replace(/\s+/g, '').trim();
  const cleanOld = String(oldCode || '').replace(/\s+/g, '').trim().toLowerCase();
  if (!cleanNew) return '';
  if (!currentLinkCodes || !String(currentLinkCodes).trim()) return cleanNew;

  const rawParts = String(currentLinkCodes)
    .split(/[\r\n\t,;+/&|]+|\s{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);

  if (rawParts.length === 0) return cleanNew;

  let replaced = false;
  const result: string[] = [];

  for (const part of rawParts) {
    const partClean = part.replace(/\s+/g, '').toLowerCase();
    if (cleanOld && partClean === cleanOld) {
      if (!result.includes(cleanNew)) {
        result.push(cleanNew);
      }
      replaced = true;
    } else {
      if (!result.includes(part)) {
        result.push(part);
      }
    }
  }

  // If oldCode was not found, ensure cleanNew is present at the beginning
  if (!replaced) {
    const hasNew = result.some((r) => r.replace(/\s+/g, '').toLowerCase() === cleanNew.toLowerCase());
    if (!hasNew) {
      result.unshift(cleanNew);
    }
  }

  return result.join(', ');
}
