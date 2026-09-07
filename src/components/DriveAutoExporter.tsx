import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useState } from 'react';
import { db, defaultDb } from '../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useDataStore } from '../DataContext';
import { useSummaryData } from '../lib/summaryData';
import { ExportAllManager } from './DataMapping/ReviewTab';
import { useDynamicRules } from '../hooks/useDynamicRules';
import { MapVersion } from './DataMapping/types';
import { uploadFilesToR2 } from '../lib/r2Upload';

export default function DriveAutoExporter() {
  const {  mapVersions, mapUnits, setMapVersions, activeMapVersionId, setMapUnits, store, reviewSelectedLabels  } = useDataStore(useShallow(state => ({
    mapVersions: state.mapVersions,
    mapUnits: state.mapUnits,
    setMapVersions: state.setMapVersions,
    activeMapVersionId: state.activeMapVersionId,
    setMapUnits: state.setMapUnits,
    store: state.store,
    reviewSelectedLabels: state.reviewSelectedLabels,
  })));
  const summaryData = useSummaryData();
  const [triggerExport, setTriggerExport] = useState(false);
  const [exportingVersions, setExportingVersions] = useState<MapVersion[] | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<boolean>(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  
  const { calculateNextVersions } = useDynamicRules(mapUnits, summaryData);

  useEffect(() => {
    console.log("DriveAutoExporter: Setting up layout_trigger snapshot listener");
    const unsub = onSnapshot(doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_settings', 'layout_trigger'), (docSnap) => {
      setLastCheck(new Date().toLocaleTimeString());
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("DriveAutoExporter: snapshot received", data);
        setTriggerStatus(!!data.is_ready_to_export);
        if (data.is_ready_to_export === true) {
          console.log("DriveAutoExporter: Triggering export sequence!");
          setTriggerExport(true);
        }
      } else {
        console.log("DriveAutoExporter: document does not exist");
      }
    }, (error) => {
      console.error("DriveAutoExporter: error listening to layout_trigger:", error);
    });
    return () => unsub();
  }, []); // run once on mount

  useEffect(() => {
    if (triggerExport && !exportingVersions && mapVersions && mapVersions.length > 0) {
      console.log("DriveAutoExporter: Processing dynamic rules before export");
      const { nextVersions, hasChanges } = calculateNextVersions(mapVersions);
      
      setExportingVersions(nextVersions);
      
      if (hasChanges) {
        console.log("DriveAutoExporter: Applying updated dynamic rules to global mapVersions state");
        setMapVersions(nextVersions);
      }
      
      // Update unit styles for the current active version, just like Apply Rules To All
      if (activeMapVersionId) {
        const v = nextVersions.find(ver => ver.id === activeMapVersionId);
        if (v) {
          let colorChanges = false;
          const nextUnits = [...mapUnits];
          nextUnits.forEach((u, idx) => {
            let assignedColor = "#3b82f6"; // Default color
            v.groups.forEach((g) => {
              if (v.groupMappings[g.id]?.includes(u.id)) {
                assignedColor = g.color;
              }
            });
            if (u.fill !== assignedColor) {
              nextUnits[idx] = { ...u, fill: assignedColor };
              colorChanges = true;
            }
          });

          if (colorChanges) {
            setMapUnits(nextUnits);
          }
        }
      }
    }
  }, [triggerExport, exportingVersions, mapVersions, calculateNextVersions, setMapVersions, activeMapVersionId, mapUnits, setMapUnits]);

  const handleExportComplete = async (success: boolean, data?: any) => {
    console.log("R2AutoExporter: ExportAllManager completed with status =", success);
    setTriggerExport(false);
    setExportingVersions(null);

    // If it was successful and we have data for R2
    if (success && data) {
      try {
        console.log("R2AutoExporter: Uploading to R2 with fallback proxy & retries...");
        const filesToUpload = Array.isArray(data) ? data : [{ blob: data as Blob, name: 'Data_Mapping_Export' }];
        const uploadResult = await uploadFilesToR2(filesToUpload, ({ statusText }) => {
          console.log(`R2AutoExporter progress: ${statusText}`);
        });

        if (uploadResult.failedCount > 0) {
          console.error(`R2AutoExporter: ${uploadResult.failedCount} files failed to upload.`);
          success = false;
        } else {
          console.log('R2AutoExporter: Successfully uploaded all files to Cloudflare R2!');
        }
      } catch (err: any) {
        console.error('R2AutoExporter: Upload failed', err);
        success = false;
      }
    }

    if (!success) {
      console.error('Auto-export failed. Releasing lock on layout_trigger.');
      try {
        await updateDoc(doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_settings', 'layout_trigger'), {
          is_ready_to_export: false
        });
      } catch (e) {
        console.error('Failed to clear layout_trigger on error', e);
      }
      return;
    }
    
    try {
      console.log("R2AutoExporter: Updating layout_trigger with completion status...");
      await updateDoc(doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_settings', 'layout_trigger'), {
        is_ready_to_export: false,
        export_completed_at: Date.now()
      });
      console.log('Successfully updated layout_trigger after auto-export.');
    } catch (error) {
      console.error('Failed to update layout_trigger:', error);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl max-w-xs text-xs font-mono">
        <div className="font-semibold text-slate-300 mb-1 border-b border-slate-800 pb-1 flex justify-between items-center">
          <span>R2AutoExporter</span>
          <span className={`w-2 h-2 rounded-full ${triggerStatus ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
        </div>
        <div className="text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>is_ready_to_export:</span>
            <span className={triggerStatus ? 'text-amber-400 font-bold' : 'text-slate-500'}>
              {triggerStatus ? 'true' : 'false'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Last check:</span>
            <span className="text-slate-500">{lastCheck || 'waiting...'}</span>
          </div>
          <div className="flex justify-between">
            <span>Exporting:</span>
            <span className={triggerExport ? 'text-brand-400 font-bold' : 'text-slate-500'}>
              {triggerExport ? 'Active' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {triggerExport && exportingVersions && exportingVersions.length > 0 && (
        <ExportAllManager 
          versions={exportingVersions.filter(v => {
            try {
              const savedSelStr = localStorage.getItem('export_selected_versions');
              if (savedSelStr) {
                const savedSel = JSON.parse(savedSelStr);
                return !!savedSel[v.id];
              }
            } catch (e) {}
            return true;
          })}
          units={mapUnits}
          summaryData={summaryData}
          format="r2_jpeg"
          paperSize={(localStorage.getItem('export_paper_size') as any) || 'a4'}
          quality={(localStorage.getItem('export_quality') as any) || 'medium'}
          selectedLabels={reviewSelectedLabels}
          onComplete={handleExportComplete}
        />
      )}
    </>
  );
}

