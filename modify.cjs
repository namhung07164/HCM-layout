const fs = require('fs');
let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace("import { ClassInfo,", "import { ClassInfo, ActualClassInfo,");

content = content.replace(
  "export interface DataContextType {",
  "export interface DataContextType {\n  actualClassInfo: ActualClassInfo[];\n  setActualClassInfo: (data: ActualClassInfo[]) => void;"
);

content = content.replace(
  "const [classInfo, setClassInfoState] = useState<ClassInfo[]>([]);",
  "const [classInfo, setClassInfoState] = useState<ClassInfo[]>([]);\n  const [actualClassInfo, setActualClassInfoState] = useState<ActualClassInfo[]>([]);"
);

content = content.replace(
  "if (parsed.classInfo) setClassInfoState(parsed.classInfo);",
  "if (parsed.classInfo) setClassInfoState(parsed.classInfo);\n      if (parsed.actualClassInfo) setActualClassInfoState(parsed.actualClassInfo);"
);

content = content.replace(
  "setClassInfoState(data.classInfo || []);",
  "setClassInfoState(data.classInfo || []);\n        setActualClassInfoState(data.actualClassInfo || []);"
);

content = content.replace(
  "const saveToHandlers = async (",
  "const saveToHandlers = async ("
);

// We need a more robust way for saveToHandlers.
content = content.replace(
  "saveToHandlers(classInfo, sales, unitInfo, profits",
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits"
);
content = content.replace(
  "saveToHandlers(classInfo, sales, unitInfo, profits",
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits"
);
content = content.replace(
  "saveToHandlers(classInfo, sales, unitInfo, profits",
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits"
);
content = content.replace(
  "saveToHandlers(classInfo, sales, unitInfo, profits",
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits"
);

content = content.replace(
  "c: ClassInfo[], s: SalesInfo[]",
  "c: ClassInfo[], ac: ActualClassInfo[], s: SalesInfo[]"
);

content = content.replace(
  "classInfo: c, \n        sales: s,",
  "classInfo: c, \n        actualClassInfo: ac,\n        sales: s,"
);
content = content.replace(
  "classInfo: c, \n            sales: s,",
  "classInfo: c, \n            actualClassInfo: ac,\n            sales: s,"
);

content = content.replace(
  "const setClassInfo = (data: ClassInfo[]) => {",
  "const setActualClassInfo = (data: ActualClassInfo[]) => {\n    setActualClassInfoState(data);\n  };\n\n  const setClassInfo = (data: ClassInfo[]) => {"
);

content = content.replace(
  "// Auto-sync unitInfo when units or classInfo change\n  useEffect(() => {\n    if (isLoading) return;\n    if (units.length > 0 && classInfo.length > 0) {",
  "// Auto-sync unitInfo when units or classInfo change\n  useEffect(() => {\n    if (isLoading) return;\n    if (units.length > 0 && classInfo.length > 0) {"
);

content = content.replace(
  "return (\n    <DataContext.Provider value={{",
  "return (\n    <DataContext.Provider value={{\n      actualClassInfo,\n      setActualClassInfo,"
);

fs.writeFileSync('src/DataContext.tsx', content);
console.log("Done");
