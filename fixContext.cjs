const fs = require('fs');
let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace(/reviewSelectedLabels: string\[\];/g, 'reviewSelectedLabels: string[];\n  reviewLabelColors: Record<string, string>;');
content = content.replace(/setReviewSelectedLabels: \(labels: string\[\]\) => void;/g, 'setReviewSelectedLabels: (labels: string[]) => void;\n  setReviewLabelColors: (colors: Record<string, string>) => void;');
content = content.replace(/reviewSelectedLabels: \['Unit ID', 'Size SQM'\],/g, "reviewSelectedLabels: ['Unit ID', 'Size SQM'],\n  reviewLabelColors: {},");
content = content.replace(/setReviewSelectedLabels: \(labels\) => set\(\{ reviewSelectedLabels: labels \}\)/g, 'setReviewSelectedLabels: (labels) => set({ reviewSelectedLabels: labels }),\n  setReviewLabelColors: (colors) => set({ reviewLabelColors: colors })');

content = content.replace(/reviewSelectedLabels\n  } = state;/g, 'reviewSelectedLabels,\n      reviewLabelColors\n  } = state;');

// parsed.reviewLabelColors
content = content.replace(/if \(parsed\.reviewSelectedLabels\) set\(\{ reviewSelectedLabels: parsed\.reviewSelectedLabels \}\);/g, 'if (parsed.reviewSelectedLabels) set({ reviewSelectedLabels: parsed.reviewSelectedLabels });\n      if (parsed.reviewLabelColors) set({ reviewLabelColors: parsed.reviewLabelColors });');
content = content.replace(/if \(data\.reviewSelectedLabels\) set\(\{ reviewSelectedLabels: data\.reviewSelectedLabels \}\);/g, 'if (data.reviewSelectedLabels) set({ reviewSelectedLabels: data.reviewSelectedLabels });\n        if (data.reviewLabelColors) set({ reviewLabelColors: data.reviewLabelColors });');

// rsl
content = content.replace(/reviewSelectedLabels: rsl,/g, 'reviewSelectedLabels: rsl,\n          reviewLabelColors: rlc,');

// rsl in saveToHandlers
content = content.replace(/mu: UnitShape\[\], mv: MapVersion\[\], amvId: string \| null, rsl: string\[\],/g, 'mu: UnitShape[], mv: MapVersion[], amvId: string | null, rsl: string[], rlc: Record<string, string>,');

content = content.replace(/saveToHandlers\(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels\);/g, 'saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors);');

content = content.replace(/, reviewSelectedLabels\]\);/g, ', reviewSelectedLabels, reviewLabelColors]);');

content = content.replace(/saveToHandlers\(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, undefined, true\);/g, 'saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors, undefined, true);');

fs.writeFileSync('src/DataContext.tsx', content);
