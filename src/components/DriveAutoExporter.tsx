import React, { useEffect, useState } from 'react';
import { db, defaultDb } from '../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useData } from '../DataContext';
import { useSummaryData } from '../lib/summaryData';
import { ExportAllManager } from './DataMapping/ReviewTab';
import { useDynamicRules } from '../hooks/useDynamicRules';
import { MapVersion } from './DataMapping/types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default function DriveAutoExporter() {
  const { mapVersions, mapUnits, profits, subFees, mdStatus, projectStatus, setMapVersions, activeMapVersionId, setMapUnits } = useData();
  const summaryData = useSummaryData();
  const [triggerExport, setTriggerExport] = useState(false);
  const [exportingVersions, setExportingVersions] = useState<MapVersion[] | null>(null);
  const [triggerStatus, setTriggerStatus] = useState<boolean>(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  
  const { calculateNextVersions } = useDynamicRules(mapUnits, summaryData, profits, subFees, mdStatus, projectStatus);

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
        console.log("R2AutoExporter: Uploading to R2...");
        const accountId = localStorage.getItem('r2_account_id') || '';
        const accessKeyId = localStorage.getItem('r2_access_key') || '';
        const secretAccessKey = localStorage.getItem('r2_secret_key') || '';
        const bucketName = localStorage.getItem('r2_bucket_name') || '';

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
            throw new Error('Missing R2 credentials in settings.');
        }

        const s3 = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const filesToUpload = Array.isArray(data) ? data : [{blob: data as Blob, name: 'Data_Mapping_Export'}];

        for (const file of filesToUpload) {
            const safeName = (file.name || 'Export').replace(/[\/\\]/g, '_').replace(/\s+/g, '_') + '.jpeg';
            
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: safeName,
                ContentType: 'image/jpeg',
            });

            const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

            let response;
            try {
                response = await fetch(signedUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'image/jpeg'
                    },
                    body: file.blob
                });
            } catch (netErr: any) {
                throw new Error(`Network/CORS error for ${safeName}. Vui lòng kiểm tra cấu hình CORS trên bucket R2 của bạn. Chi tiết: ${netErr.message}`);
            }

            if (!response.ok) {
                const textRes = await response.text().catch(() => '');
                throw new Error(`Upload failed for ${safeName}: Status ${response.status} - ${textRes.substring(0, 50)}`);
            }
        }

        console.log('R2AutoExporter: Successfully uploaded all files to Cloudflare R2!');
      } catch (err: any) {
        console.error('R2AutoExporter: Upload failed', err);
        success = false; // Mark as failed to handle error clearing
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
            <span className={triggerExport ? 'text-blue-400 font-bold' : 'text-slate-500'}>
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
          selectedLabels={(() => {
            try {
              const saved = localStorage.getItem('review_selected_labels');
              if (saved) return JSON.parse(saved);
            } catch(e) {}
            return ['Unit ID', 'Size SQM'];
          })()}
          onComplete={handleExportComplete}
        />
      )}
    </>
  );
}

