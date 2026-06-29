const fs = require('fs');

let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace("if (results['Brand Info']) set({ classInfo: mapClassInfo(parseSheetData(results['Brand Info'])));", "if (results['Brand Info']) set({ classInfo: mapClassInfo(parseSheetData(results['Brand Info']))});");

content = content.replace("else if (results['Class Info'] && !results['Brand Info']) set({ classInfo: mapClassInfo(parseSheetData(results['Class Info'])));", "else if (results['Class Info'] && !results['Brand Info']) set({ classInfo: mapClassInfo(parseSheetData(results['Class Info']))});");

content = content.replace("if (results['MD Status']) set({ mdStatus: parseSheetData(results['MD Status'])));", "if (results['MD Status']) set({ mdStatus: parseSheetData(results['MD Status']) });");

content = content.replace("if (results['Sub Fees']) set({ subFees: parseSheetData(results['Sub Fees'])));", "if (results['Sub Fees']) set({ subFees: parseSheetData(results['Sub Fees']) });");

content = content.replace("if (results['Project Status']) set({ projectStatus: parseSheetData(results['Project Status'])));", "if (results['Project Status']) set({ projectStatus: parseSheetData(results['Project Status']) });");

content = content.replace("if (results['Project Link']) set({ projectLink: parseSheetData(results['Project Link'])));", "if (results['Project Link']) set({ projectLink: parseSheetData(results['Project Link']) });");


fs.writeFileSync('src/DataContext.tsx', content);
