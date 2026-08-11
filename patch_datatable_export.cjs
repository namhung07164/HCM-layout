const fs = require('fs');
let code = fs.readFileSync('src/components/DataTable.tsx', 'utf8');

code = code.replace(/export default function DataTable<T extends Record<string, any>>\(\{/, 'function DataTable<T extends Record<string, any>>({');

code += '\nexport default React.memo(DataTable) as typeof DataTable;\n';

fs.writeFileSync('src/components/DataTable.tsx', code);
console.log('patched DataTable export');
