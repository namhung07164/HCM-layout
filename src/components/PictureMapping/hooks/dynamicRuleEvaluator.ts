import { UnitShape, GroupRule } from '../components/DataMapping/types';
import { resolveRuleValue } from '../lib/dynamicRuleMatcher';

export function matchRuleAgainstData(rule: GroupRule, data: Record<string, any>): boolean {
  let val: any = resolveRuleValue(rule.field, data);

  const f = String(rule.field || '').toLowerCase().trim();
  if (f.includes('margin') && typeof val === 'number' && val <= 1 && val > 0) {
    val = val * 100;
  }

  const numVal = Number(String(rule.value ?? '').replace(/,/g, '').trim());
  const isNum = !isNaN(numVal) && String(rule.value ?? '').trim() !== '';

  const parsedValNum = Number(String(val ?? '').replace(/,/g, '').trim());
  const valIsNum = !isNaN(parsedValNum) && String(val ?? '').trim() !== '';

  let compareValStr = String(val ?? '').toLowerCase().trim();
  let compareRuleStr = String(rule.value ?? '').toLowerCase().trim();

  if (compareRuleStr === 'in progress') compareRuleStr = 'on process';
  if (compareValStr === 'in progress') compareValStr = 'on process';

  switch (rule.operator) {
    case '>':
      return isNum && valIsNum ? parsedValNum > numVal : false;
    case '<':
      return isNum && valIsNum ? parsedValNum < numVal : false;
    case '>=':
      return isNum && valIsNum ? parsedValNum >= numVal : false;
    case '<=':
      return isNum && valIsNum ? parsedValNum <= numVal : false;
    case '=':
      if (isNum && valIsNum) {
        return parsedValNum === numVal;
      }
      return compareValStr === compareRuleStr;
    case 'contains': {
      const searchTerms = compareRuleStr.split(/\s+/).filter(Boolean);
      return searchTerms.every((term) => compareValStr.includes(term));
    }
    case 'or':
    case 'OR': {
      const orTerms = compareRuleStr
        .split(/[\r\n\t,;+/&|]+|\s{2,}/)
        .map((t) => {
          let tr = t.trim();
          if (tr === 'in progress') tr = 'on process';
          return tr;
        })
        .filter(Boolean);
      if (orTerms.length === 0) {
        const spaceTerms = compareRuleStr.split(/\s+/).filter(Boolean);
        return spaceTerms.some((term) => compareValStr === term || compareValStr.includes(term));
      }
      return orTerms.some((term) => {
        if (compareValStr === term) return true;
        if (compareValStr.includes(term)) return true;
        if (isNum && valIsNum && !isNaN(Number(term)) && parsedValNum === Number(term)) return true;
        return false;
      });
    }
    case 'exclude': {
      const searchTerms = compareRuleStr.split(/\s+/).filter(Boolean);
      return !searchTerms.some((term) => compareValStr.includes(term));
    }
    default:
      return false;
  }
}

export function evaluateRulesOnUnits(
  units: UnitShape[],
  rules: GroupRule[] | undefined,
  dataMap: Record<string, any>
): string[] {
  if (!rules || rules.length === 0) return [];
  const matchedIds: string[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const uName = (u.name || '').toLowerCase();
    const data = uName ? dataMap[uName] : null;
    if (data && rules.every((r) => matchRuleAgainstData(r, data))) {
      matchedIds.push(u.id);
    }
  }
  return matchedIds;
}
