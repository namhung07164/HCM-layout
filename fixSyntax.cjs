const fs = require('fs');

let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace(/results\['Brand Info'\] }\)\)\);/g, "results['Brand Info'])));");
content = content.replace(/results\['Class Info'\] }\)\)\);/g, "results['Class Info'])));");
content = content.replace(/results\['MD Status'\] }\)\);/g, "results['MD Status'])));");
content = content.replace(/results\['Sub Fees'\] }\)\);/g, "results['Sub Fees'])));");
content = content.replace(/results\['Project Status'\] }\)\);/g, "results['Project Status'])));");
content = content.replace(/results\['Project Link'\] }\)\);/g, "results['Project Link'])));");
content = content.replace(/\(s: any }\)/g, "(s: any)");
content = content.replace(/\(p: any }\)/g, "(p: any)");
content = content.replace(/\(b: any }\)/g, "(b: any)");
content = content.replace(/\(u: any }\)/g, "(u: any)");

fs.writeFileSync('src/DataContext.tsx', content);
