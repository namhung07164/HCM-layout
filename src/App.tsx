import React, { Suspense, useEffect } from "react";
import { motion } from "motion/react";
import { TabErrorBoundary } from "./components/TabErrorBoundary";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { useAppStore } from "./store/useAppStore";
import { StandaloneHeader } from "./components/StandaloneHeader";
import { AppPrintStyles } from "./components/AppParts/AppPrintStyles";
import { AppGlobalOverlays } from "./components/AppParts/AppGlobalOverlays";
import { hydrateSavedComparisonRows } from "./lib/standaloneComparisonService";
import { getCachedLayoutConfigFromDisk } from "./lib/layoutConfigCache";
import { useDataStore } from "./components/PictureMapping/DataContext";

const LayoutTab = lazyWithRetry(() => import("./components/LayoutTab"), "LayoutTab");
const PictureMappingTab = lazyWithRetry(
  () => import("./components/PictureMappingTab").then((m) => ({ default: m.PictureMappingTab })),
  "PictureMappingTab"
);

export default function App() {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const isFocusMode = useAppStore((state) => state.isFocusMode);
  const setIsFocusMode = useAppStore((state) => state.setIsFocusMode);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const toast = useAppStore((state) => state.toast);
  const setToast = useAppStore((state) => state.setToast);
  const layoutTabFilters = useAppStore((state) => state.layoutTabFilters);
  const setLayoutTabFilters = useAppStore((state) => state.setLayoutTabFilters);
  const quickNavTarget = useAppStore((state) => state.quickNavTarget);
  const setQuickNavTarget = useAppStore((state) => state.setQuickNavTarget);
  const isCommandPaletteOpen = useAppStore((state) => state.isCommandPaletteOpen);
  const setIsCommandPaletteOpen = useAppStore((state) => state.setIsCommandPaletteOpen);
  const isPrintPreview = useAppStore((state) => state.isPrintPreview);
  const setIsPrintPreview = useAppStore((state) => state.setIsPrintPreview);
  const showTour = useAppStore((state) => state.showTour);
  const setShowTour = useAppStore((state) => state.setShowTour);
  const isExportingPDF = useAppStore((state) => state.isExportingPDF);
  const printPaperSize = useAppStore((state) => state.printPaperSize);
  const printOrientation = useAppStore((state) => state.printOrientation);
  const printScaleCustom = useAppStore((state) => state.printScaleCustom);
  const printScaleMode = useAppStore((state) => state.printScaleMode);

  // Hydrate standalone local data & sync with Cloud R2 on boot
  useEffect(() => {
    hydrateSavedComparisonRows();
    getCachedLayoutConfigFromDisk()
      .then((diskConfig) => {
        if (diskConfig && diskConfig.storeLocationData && Object.keys(diskConfig.storeLocationData).length > 0) {
          useDataStore.getState().setLoadedCloudData(diskConfig);
        }
      })
      .catch(() => {});

    // Initialize lifecycle listeners to auto-save to Cloud R2 & cache on app exit
    import("./lib/r2UnifiedSyncService").then(({ initAutoSaveOnAppClose, loadUnifiedDataFromCloudR2 }) => {
      initAutoSaveOnAppClose();
      // Auto load cloud in background
      loadUnifiedDataFromCloudR2({ silent: true }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Ensure activeTab is strictly either layout or picture_mapping
  useEffect(() => {
    if (activeTab !== "layout" && activeTab !== "picture_mapping") {
      setActiveTab("layout");
    }
  }, [activeTab, setActiveTab]);

  // Apply Dark/Light theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#0e0e11] text-slate-900 dark:text-[#e3e3e3] font-sans selection:bg-indigo-500 selection:text-white">
      <AppPrintStyles
        printPaperSize={printPaperSize}
        printOrientation={printOrientation}
        activeTab={activeTab}
        printScale={printScaleCustom}
        isPrintPreview={isPrintPreview}
        printWidth={297}
        printHeight={210}
        printScaleMode={printScaleMode}
      />

      {!isFocusMode && (
        <StandaloneHeader
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          theme={theme}
          onToggleTheme={toggleTheme}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        />
      )}

      <main className="flex-grow flex flex-col min-h-0 relative z-[10]">
        <TabErrorBoundary tabKey={activeTab}>
          <Suspense
            fallback={
              <div className="flex-1 w-full h-full p-6 animate-pulse bg-slate-50 dark:bg-[#0e0e11]">
                <div className="h-[500px] w-full bg-slate-200 dark:bg-[#18181a] rounded-2xl" />
              </div>
            }
          >
            <motion.div
              key={activeTab}
              initial={{ opacity: 0.96 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.08 }}
              className="flex flex-col flex-grow min-h-0"
            >
              {activeTab === "picture_mapping" ? (
                <PictureMappingTab />
              ) : (
                <LayoutTab
                  initialStore={layoutTabFilters?.store}
                  initialLocation={layoutTabFilters?.location}
                  initialProjectCode={layoutTabFilters?.projectCode}
                  onClearFocus={() => setLayoutTabFilters(null)}
                />
              )}
            </motion.div>
          </Suspense>
        </TabErrorBoundary>
      </main>

      <AppGlobalOverlays
        quickNavTarget={quickNavTarget}
        setQuickNavTarget={setQuickNavTarget}
        handleQuickNavigate={(targetTab) => setActiveTab(targetTab as any)}
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        handleTabChange={(tab) => setActiveTab(tab as any)}
        toggleTheme={toggleTheme}
        isFocusMode={isFocusMode}
        setIsFocusMode={setIsFocusMode}
        isPrintPreview={isPrintPreview}
        setIsPrintPreview={setIsPrintPreview}
        toast={toast}
        setToast={setToast}
        showTour={showTour}
        handleCloseTour={() => setShowTour(false)}
        isExportingPDF={isExportingPDF}
      />
    </div>
  );
}
