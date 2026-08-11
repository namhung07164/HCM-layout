const fs = require('fs');

let code = fs.readFileSync('src/components/UnitInfoTab.tsx', 'utf8');

const normalizeFunc = `
function normalizeUnit(u: string | undefined): string {
  return (u || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
`;

if (!code.includes('function normalizeUnit')) {
  code = code.replace('function stringSimilarity', normalizeFunc + 'function stringSimilarity');
}

// In useEffect
const oldEffectProjMatch = `const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === row.unit.toLowerCase().trim());`;
const newEffectProjMatch = `const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(row.unit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(row.unit)));`;
code = code.split(oldEffectProjMatch).join(newEffectProjMatch);

// In handleDataChange
const oldHandleProjMatch = `const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === row.unit.toLowerCase().trim());`;
const newHandleProjMatch = `const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(row.unit) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(row.unit)));`;
code = code.split(oldHandleProjMatch).join(newHandleProjMatch);

// In commitUnit
const oldCommitProjMatch = `const matchedProj = projectStatus.find(p => p.unit?.toLowerCase().trim() === finalUnitName.toLowerCase().trim());`;
const newCommitProjMatch = `const matchedProj = projectStatus.find(p => normalizeUnit(p.unit) === normalizeUnit(finalUnitName) || (p.unitLink && normalizeUnit(p.unitLink) === normalizeUnit(finalUnitName)));`;
code = code.split(oldCommitProjMatch).join(newCommitProjMatch);

fs.writeFileSync('src/components/UnitInfoTab.tsx', code);
console.log('patched normalize');
