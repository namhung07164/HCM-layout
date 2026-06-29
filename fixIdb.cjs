const fs = require('fs');
let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace(/import \{ get, set \} from 'idb-keyval';/, "import { get as idbGet, set as idbSet } from 'idb-keyval';");
content = content.replace(/await set\('dirHandle'/g, "await idbSet('dirHandle'");
content = content.replace(/await get\('dirHandle'/g, "await idbGet('dirHandle'");
content = content.replace(/state\.setSpreadsheetId\(sid\)/g, "set({ spreadsheetId: sid })");

fs.writeFileSync('src/DataContext.tsx', content);
