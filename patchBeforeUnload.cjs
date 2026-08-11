const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

const oldEffect = `  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToHandlers = async (`;

const newEffect = `  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || useDataStore.getState().isSaving) {
        e.preventDefault();
        e.returnValue = 'Data is currently saving. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const saveToHandlers = async (`;

code = code.replace(oldEffect, newEffect);

code = code.replace(
  "    if (saveTimeoutRef.current) {\n      clearTimeout(saveTimeoutRef.current);\n    }",
  "    isDirtyRef.current = true;\n    if (saveTimeoutRef.current) {\n      clearTimeout(saveTimeoutRef.current);\n    }"
);

code = code.replace(
  "saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors);",
  "isDirtyRef.current = false;\n      saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, reviewSelectedLabels, reviewLabelColors);"
);

fs.writeFileSync('src/DataContext.tsx', code);
