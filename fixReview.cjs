const fs = require('fs');

let content = fs.readFileSync('src/components/DataMapping/ReviewOnlyView.tsx', 'utf8');
const lines = content.split('\n');

const newLines = [
  ...lines.slice(0, 159),
  '  const { mapUnits, mapVersions, isLoading } = useDataStore(useShallow(state => ({',
  '    mapUnits: state.mapUnits,',
  '    mapVersions: state.mapVersions,',
  '    isLoading: state.isLoading',
  '  })));',
  ...lines.slice(243)
];

fs.writeFileSync('src/components/DataMapping/ReviewOnlyView.tsx', newLines.join('\n'));
