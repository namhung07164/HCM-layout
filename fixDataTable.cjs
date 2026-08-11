const fs = require('fs');

let content = fs.readFileSync('src/components/DataTable.tsx', 'utf8');
const lines = content.split('\n');

const newLines = [
  ...lines.slice(0, 171),
  '  const { isSaving, isAppLocked, setIsAppLocked } = useDataStore(useShallow(state => ({',
  '    isSaving: state.isSaving,',
  '    isAppLocked: state.isAppLocked,',
  '    setIsAppLocked: state.setIsAppLocked',
  '  })));',
  ...lines.slice(273)
];

fs.writeFileSync('src/components/DataTable.tsx', newLines.join('\n'));
