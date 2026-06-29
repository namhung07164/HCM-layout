const fs = require('fs');

let content = fs.readFileSync('src/DataContext.tsx', 'utf8');

content = content.replace(/setIsLoading\(([^)]+)\)/g, "set({ isLoading: $1 })");
content = content.replace(/setHasLocalFolder\(([^)]+)\)/g, "set({ hasLocalFolder: $1 })");
content = content.replace(/setClassInfoState\(([^)]+)\)/g, "set({ classInfo: $1 })");
content = content.replace(/setActualClassInfoState\(([^)]+)\)/g, "set({ actualClassInfo: $1 })");
content = content.replace(/setUnitInfoState\(([^)]+)\)/g, "set({ unitInfo: $1 })");
content = content.replace(/setMdStatusState\(([^)]+)\)/g, "set({ mdStatus: $1 })");
content = content.replace(/setSubFeesState\(([^)]+)\)/g, "set({ subFees: $1 })");
content = content.replace(/setProjectStatusState\(([^)]+)\)/g, "set({ projectStatus: $1 })");
content = content.replace(/setProjectLinkState\(([^)]+)\)/g, "set({ projectLink: $1 })");
content = content.replace(/setBasePlanState\(([^)]+)\)/g, "set({ basePlan: $1 })");
content = content.replace(/setUnitsState\(([^)]+)\)/g, "set({ units: $1 })");
content = content.replace(/setMapUnitsState\(([^)]+)\)/g, "set({ mapUnits: $1 })");
content = content.replace(/setMapVersionsState\(([^)]+)\)/g, "set({ mapVersions: $1 })");
content = content.replace(/setActiveMapVersionIdState\(([^)]+)\)/g, "set({ activeMapVersionId: $1 })");
content = content.replace(/setReviewSelectedLabelsState\(([^)]+)\)/g, "set({ reviewSelectedLabels: $1 })");
content = content.replace(/setSalesState\(([^)]+)\)/g, "set({ sales: $1 })");
content = content.replace(/setProfitsState\(([^)]+)\)/g, "set({ profits: $1 })");
content = content.replace(/setLastBackup\(([^)]+)\)/g, "set({ lastBackup: $1 })");
content = content.replace(/setIsSaving\(([^)]+)\)/g, "set({ isSaving: $1 })");
content = content.replace(/setNeedsPermission\(([^)]+)\)/g, "set({ needsPermission: $1 })");

// Ensure triggerManualLoad etc. are injected
content = content.replace(/const saveTimeoutRef/g, `
  useEffect(() => {
    set({
      triggerManualLoad,
      triggerManualBackup,
      selectLocalFolder,
      requestFolderPermission,
      syncWithGoogleSheets
    });
  }, []);
  const saveTimeoutRef`);

fs.writeFileSync('src/DataContext.tsx', content);
console.log('Fixed DataContext state setters');
