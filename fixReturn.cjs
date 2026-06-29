const fs = require('fs');

let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

const startIdx = content.indexOf('const contextValue = React.useMemo(');
const exportUseData = content.indexOf('export function useData()');

if (startIdx !== -1 && exportUseData !== -1) {
    const toRemove = content.slice(startIdx, exportUseData);
    content = content.replace(toRemove, 'return <>{children}</>;\n}\n\n');
    content = content.replace(/export function useData\(\) \{[\s\S]*?\}/, `export function useData() {
  return useDataStore();
}`);
    fs.writeFileSync('src/DataContext.tsx', content);
    console.log('Fixed DataProvider return');
} else {
    console.log('Could not find start/end');
}
