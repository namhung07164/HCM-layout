import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ClassInfo, ActualClassInfo, SalesInfo, ProfitInfo, DailySalesProfitInfo, UnitInfo, MDStatusInfo, SubFeeInfo, ProjectStatusInfo, ProjectLinkInfo, BasePlanInfo, UnitDataInfo, StoreRegion } from './types';
import { UnitShape, MapVersion } from './components/DataMapping/types';
import { defaultDb } from './lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { loadPersistentData, savePersistentData } from './lib/sheets';
import { get as idbGet, set as idbSet } from 'idb-keyval';

export interface AppNotification {
  id: string;
  message: string;
  read: boolean;
  timestamp: string;
}

interface DataContextType {
  actualClassInfo: ActualClassInfo[];
  classInfo: ClassInfo[];
  sales: SalesInfo[];
  profits: ProfitInfo[];
  dailySalesProfits: DailySalesProfitInfo[];
  unitInfo: UnitInfo[];
  mdStatus: MDStatusInfo[];
  subFees: SubFeeInfo[];
  projectStatus: ProjectStatusInfo[];
  projectLink: ProjectLinkInfo[];
  basePlan: BasePlanInfo[];
  units: UnitDataInfo[];
  notifications: AppNotification[];
  
  isTasksRequested: boolean;
  setIsTasksRequested: (val: boolean) => void;
  isDelegationRequested: boolean;
  setIsDelegationRequested: (val: boolean) => void;
  
  mapUnits: UnitShape[];
  mapVersions: MapVersion[];
  activeMapVersionId: string | null;
  reviewSelectedLabels: string[];
  reviewLabelColors: Record<string, string>;
  autoUpdateBrandName: boolean;
  setAutoUpdateBrandName: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isNotifOpen: boolean;
  setIsNotifOpen: (open: boolean) => void;
  reviewOnlyMode: boolean;
  setReviewOnlyMode: (mode: boolean) => void;
  store: 'HCM' | 'HN' | null;
  setStore: (store: 'HCM' | 'HN' | null) => void;

  setActualClassInfo: (data: ActualClassInfo[]) => void;
  setClassInfo: (data: ClassInfo[]) => void;
  setSales: (data: SalesInfo[]) => void;
  setProfits: (data: ProfitInfo[]) => void;
  setDailySalesProfits: (data: DailySalesProfitInfo[]) => void;
  setUnitInfo: (data: UnitInfo[]) => void;
  setMdStatus: (data: MDStatusInfo[]) => void;
  setSubFees: (data: SubFeeInfo[]) => void;
  setProjectStatus: (data: ProjectStatusInfo[]) => void;
  setProjectLink: (data: ProjectLinkInfo[]) => void;
  setBasePlan: (data: BasePlanInfo[]) => void;
  setUnits: (data: UnitDataInfo[]) => void;
  setNotifications: (data: AppNotification[]) => void;
  addNotification: (message: string) => void;
  markAllNotificationsRead: () => void;
  
  setMapUnits: (data: UnitShape[]) => void;
  setMapVersions: (data: MapVersion[]) => void;
  setActiveMapVersionId: (id: string | null) => void;

  isLoading: boolean;
  isSaving: boolean;
  lastBackup: string | null;
  triggerManualBackup: () => Promise<void>;
  triggerManualLoad: () => Promise<void>;
  restoreBackup: () => Promise<void>;
  selectLocalFolder: () => Promise<void>;
  hasLocalFolder: boolean;
  needsPermission: boolean;
  setNeedsPermission: (v: boolean) => void;
  requestFolderPermission: () => Promise<void>;
  syncWithGoogleSheets: (spreadsheetId: string) => Promise<void>;
  spreadsheetId: string | null;
  setSpreadsheetId: (id: string | null) => void;
  isAppLocked: boolean;
  setIsAppLocked: (v: boolean) => void;
  setReviewSelectedLabels: (labels: string[]) => void;
  setReviewLabelColors: (colors: Record<string, string>) => void;
}

import { create } from 'zustand';
import { syncFromGoogleSheets } from './services/googleSheets';
import { useProjectStatusSync, updateMdStatusInFirestore } from './hooks/useProjectStatusSync';

export const useDataStore = create<DataContextType>((set, get) => ({
  actualClassInfo: [],
  classInfo: [],
  sales: [],
  profits: [],
  dailySalesProfits: [],
  unitInfo: [],
  mdStatus: [],
  subFees: [],
  projectStatus: [],
  projectLink: [],
  basePlan: [],
  units: [],
  notifications: [],
  isTasksRequested: false,
  setIsTasksRequested: (val) => set({ isTasksRequested: val }),
  isDelegationRequested: false,
  setIsDelegationRequested: (val) => set({ isDelegationRequested: val }),
  
  mapUnits: [],
  mapVersions: [],
  activeMapVersionId: null,
  reviewSelectedLabels: ['Unit ID', 'Size SQM'],
  reviewLabelColors: {},
  autoUpdateBrandName: true,
  activeTab: 'input',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isMenuOpen: false,
  setIsMenuOpen: (val) => set({ isMenuOpen: val }),
  isNotifOpen: false,
  setIsNotifOpen: (val) => set({ isNotifOpen: val }),
  reviewOnlyMode: false,
  setReviewOnlyMode: (val) => set({ reviewOnlyMode: val }),
  store: null,
  setStore: (val) => set({ store: val }),
  setAutoUpdateBrandName: (val) => set({ autoUpdateBrandName: val }),
  
  setActualClassInfo: (data) => set({ actualClassInfo: data }),
  setClassInfo: (data) => {
    set({ classInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving brand info to Firestore:", err));
  },
  setSales: (data) => set({ sales: data }),
  setProfits: (data) => set({ profits: data }),
  setDailySalesProfits: (data) => set({ dailySalesProfits: data }),
  setUnitInfo: (data) => {
    set({ unitInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_unit_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving unit info to Firestore:", err));
  },
  setMdStatus: (data) => set({ mdStatus: data }),
  setSubFees: (data) => set({ subFees: data }),
  setProjectStatus: (data) => set({ projectStatus: data }),
  setProjectLink: (data) => set({ projectLink: data }),
  setBasePlan: (data) => set({ basePlan: data }),
  setUnits: (data) => {
    set({ units: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_units', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving units to Firestore:", err));
  },
  setNotifications: (data) => set({ notifications: data }),
  addNotification: (message) => set(state => ({
      notifications: [{
          id: Math.random().toString(36).substr(2, 9),
          message,
          read: false,
          timestamp: new Date().toISOString()
      }, ...state.notifications]
  })),
  markAllNotificationsRead: () => set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
  setMapUnits: (data) => set({ mapUnits: data }),
  setMapVersions: (data) => set({ mapVersions: data }),
  setActiveMapVersionId: (id) => set({ activeMapVersionId: id }),
  
  isLoading: true,
  isSaving: false,
  lastBackup: null,
  
  triggerManualBackup: async () => {}, // injected
  triggerManualLoad: async () => {}, // injected
  restoreBackup: async () => {}, // injected
  selectLocalFolder: async () => {}, // injected
  hasLocalFolder: false,
  needsPermission: false,
  setNeedsPermission: (v) => set({ needsPermission: v }),
  requestFolderPermission: async () => {}, // injected
  syncWithGoogleSheets: async () => {}, // injected
  
  spreadsheetId: null,
  setSpreadsheetId: (id) => set({ spreadsheetId: id }), 
  isAppLocked: true,
  setIsAppLocked: (v) => set({ isAppLocked: v }),
  setReviewSelectedLabels: (labels) => set({ reviewSelectedLabels: labels }),
  setReviewLabelColors: (colors) => set({ reviewLabelColors: colors })
}));

export function DataProvider({ children, store }: { children: React.ReactNode, store: StoreRegion }) {
  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    let isInitialized = false;
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        useDataStore.setState({ classInfo: data });
        isInitialized = true;
      } else {
        if (!isInitialized) {
          // Document doesn't exist, try to migrate from local
          try {
            const currentStore = useDataStore.getState().store;
            const data = await loadPersistentData(currentStore);
            if (data && data.classInfo && data.classInfo.length > 0) {
              console.log("Migrating Brand Info to Firestore...");
              useDataStore.getState().setClassInfo(data.classInfo);
            }
          } catch(e) {
            console.warn("Migration failed or no local data", e);
          }
          isInitialized = true;
        }
      }
    }, (error) => {
      console.error("Error reading brand info from Firestore:", error);
    });
    return () => unsub();
  }, []);

  // Sync units from Firestore
  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_units', 'global');
    let isInitialized = false;
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        useDataStore.setState({ units: data });
        isInitialized = true;
      } else {
        if (!isInitialized) {
          try {
            const currentStore = useDataStore.getState().store;
            const data = await loadPersistentData(currentStore);
            if (data && data.units && data.units.length > 0) {
              console.log("Migrating Units to Firestore...");
              useDataStore.getState().setUnits(data.units);
            }
          } catch(e) {
            console.warn("Migration failed or no local data", e);
          }
          isInitialized = true;
        }
      }
    }, (error) => {
      console.error("Error reading units from Firestore:", error);
    });
    return () => unsub();
  }, []);

  // Sync unitInfo from Firestore
  useEffect(() => {
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_unit_info', 'global');
    let isInitialized = false;
    const unsub = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().data || [];
        useDataStore.setState({ unitInfo: data });
        isInitialized = true;
      } else {
        if (!isInitialized) {
          try {
            const currentStore = useDataStore.getState().store;
            const data = await loadPersistentData(currentStore);
            if (data && data.unitInfo && data.unitInfo.length > 0) {
              console.log("Migrating Unit Info to Firestore...");
              useDataStore.getState().setUnitInfo(data.unitInfo);
            }
          } catch(e) {
            console.warn("Migration failed or no local data", e);
          }
          isInitialized = true;
        }
      }
    }, (error) => {
      console.error("Error reading unit info from Firestore:", error);
    });
    return () => unsub();
  }, []);

  const set = useDataStore.setState;
  const { 
      units, 
      classInfo,
      projectStatus,
      isLoading,
      lastBackup,
      isTasksRequested,
      isDelegationRequested
  } = useDataStore(useShallow(state => ({
      units: state.units,
      classInfo: state.classInfo,
      projectStatus: state.projectStatus,
      isLoading: state.isLoading,
      lastBackup: state.lastBackup,
      isTasksRequested: state.isTasksRequested,
      isDelegationRequested: state.isDelegationRequested
  })));

  const validUnits = React.useMemo(() => units.map(u => u.unit), [units]);
  const { projectStatus: fsProjectStatus, fsMdStatus, error: fsError } = useProjectStatusSync(
    validUnits, 
    store,
    isTasksRequested,
    isDelegationRequested
  );

  useEffect(() => {
    set({ store });
  }, [store]);

  useEffect(() => {
    if (fsProjectStatus && fsProjectStatus.length > 0) {
      set({ projectStatus: fsProjectStatus });
    }
  }, [fsProjectStatus]);

  useEffect(() => {
    if (fsMdStatus && fsMdStatus.length > 0) {
      const prev = useDataStore.getState().mdStatus;
      const unitInfo = useDataStore.getState().unitInfo;
      const merged = [...fsMdStatus];
      const nextMdStatus = merged.map(fsItem => {
        const existingItem = prev.find(p => p.unit === fsItem.unit);
        const uInfo = unitInfo.find(u => u.unit === fsItem.unit);
        
        const finalBrandCode = uInfo?.brandCode || existingItem?.brandCode || '';
        const finalBrandName = uInfo?.brandName || existingItem?.brandName || '';

        if (existingItem) {
          return {
            ...fsItem,
            brandCode: finalBrandCode,
            brandName: finalBrandName,
            unitLink: existingItem.unitLink || ''
          };
        }
        return {
          ...fsItem,
          brandCode: finalBrandCode,
          brandName: finalBrandName
        };
      });
      set({ mdStatus: nextMdStatus });
    }
  }, [fsMdStatus]);
  
  useEffect(() => {
    if (fsError) {
       useDataStore.getState().addNotification(fsError);
    }
  }, [fsError]);

  const dirHandleRef = useRef<any>(null);
  const isInitialMount = useRef(true);

  // Auto-sync unitInfo when units or classInfo change
  useEffect(() => {
    if (isLoading) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    set(state => {
      let isChanged = false;
      
      // Build maps for O(1) lookups
      const unitsByLower = new Map<string, UnitDataInfo>();
      for (const u of state.units) {
        if (u.unit) {
          unitsByLower.set(u.unit.toLowerCase(), u);
        }
      }
      
      const classByCodeLower = new Map<string, ClassInfo>();
      const classByNameLower = new Map<string, ClassInfo>();
      for (const c of state.classInfo) {
        if (c.brandCode) classByCodeLower.set(c.brandCode.toLowerCase(), c);
        if (c.brandName) classByNameLower.set(c.brandName.toLowerCase(), c);
      }

      const next = state.unitInfo.map(item => {
        let updated = { ...item };
        let localChanged = false;

        // Sync floor and size from units
        if (item.unit) {
          const matchedUnit = unitsByLower.get(item.unit.toLowerCase());
          if (matchedUnit) {
            if (updated.floor !== matchedUnit.floor || updated.size !== String(matchedUnit.size)) {
              updated.floor = matchedUnit.floor;
              updated.size = String(matchedUnit.size);
              localChanged = true;
            }
            
            const isUnactive = matchedUnit.active === 'Unactive' || matchedUnit.active === 'unact' || matchedUnit.active === 'Inactive';
            if (isUnactive && updated.status !== 'Unactive') {
                updated.status = 'Unactive';
                localChanged = true;
            } else if (!isUnactive && updated.status === 'Unactive') {
                updated.status = 'Active';
                localChanged = true;
            }
          }
        }

        // Sync brandName/brandCode from classInfo
        if (item.brandCode) {
          const matchedClass = classByCodeLower.get(item.brandCode.toLowerCase());
          if (matchedClass && updated.brandName !== matchedClass.brandName) {
            updated.brandName = matchedClass.brandName;
            localChanged = true;
          }
        } else if (item.brandName) {
          const matchedClass = classByNameLower.get(item.brandName.toLowerCase());
          if (matchedClass && updated.brandCode !== matchedClass.brandCode) {
            updated.brandCode = matchedClass.brandCode;
            localChanged = true;
          }
        }

        if (localChanged) isChanged = true;
        return localChanged ? updated : item; // optimization: return original item if no changes
      });

      return isChanged ? { unitInfo: next } : {};
    });
    }, [units, classInfo, isLoading]);

  // Auto-sync projectLink when projectStatus changes
  useEffect(() => {
    if (isLoading) return;
    
    set(state => {
      let isChanged = false;
      const { projectLink, projectStatus } = state;
      if (!projectLink || projectLink.length === 0 || !projectStatus || projectStatus.length === 0) {
         return {};
      }

      const next = projectLink.map(link => {
        if (!link.unitLink) return link;
        const match = projectStatus.find(p => p.unit === link.unitLink);
        if (match) {
          if (
            link.status !== (match.status || '') ||
            link.actStatus !== (match.actStatus || '') ||
            link.task !== (match.task || '') ||
            link.startDate !== (match.startDate || '') ||
            link.endDate !== (match.endDate || '') ||
            link.party !== (match.party || '') ||
            link.flowStatus !== (match.flowStatus || '') ||
            (match.delegationStatus !== undefined && link.delegationStatus !== (match.delegationStatus || ''))
          ) {
            isChanged = true;
            const today = new Date();
            const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
            return {
              ...link,
              status: match.status || '',
              actStatus: match.actStatus || '',
              task: match.task || '',
              startDate: match.startDate || '',
              endDate: match.endDate || '',
              party: match.party || '',
              flowStatus: match.flowStatus || '',
              delegationStatus: match.delegationStatus || '',
              update: formattedDate
            };
          }
        }
        return link;
      });

      return isChanged ? { projectLink: next } : {};
    });
  }, [projectStatus, isLoading]);



  async function rotateBackups(handle: any, baseName: string) {
    try {
      for (let i = 2; i >= 1; i--) {
        const srcName = `${baseName}_v${i}.json`;
        const destName = `${baseName}_v${i+1}.json`;
        try {
          const srcHandle = await handle.getFileHandle(srcName);
          const file = await srcHandle.getFile();
          const text = await file.text();
          
          try { await handle.removeEntry(destName); } catch(e) {}
          const destHandle = await handle.getFileHandle(destName, { create: true });
          const destWritable = await destHandle.createWritable();
          await destWritable.write(text);
          await destWritable.close();
        } catch (e) {} // Ignore if src doesn't exist
      }
      
      // Main file to v1
      try {
        const mainHandle = await handle.getFileHandle(`${baseName}.json`);
        const file = await mainHandle.getFile();
        const text = await file.text();
        
        try { await handle.removeEntry(`${baseName}_v1.json`); } catch(e) {}
        const v1Handle = await handle.getFileHandle(`${baseName}_v1.json`, { create: true });
        const v1Writable = await v1Handle.createWritable();
        await v1Writable.write(text);
        await v1Writable.close();
      } catch (e) {}
    } catch (err) {
      console.warn("Backup rotation failed", err);
    }
  }

  async function checkFilePermissions(handle: any): Promise<boolean> {
    try {
      const testFile = await handle.getFileHandle('.__perm_check.tmp', { create: true });
      const writable = await testFile.createWritable();
      await writable.write('test');
      await writable.close();
      const file = await testFile.getFile();
      const text = await file.text();
      await handle.removeEntry('.__perm_check.tmp');
      return text === 'test';
    } catch (e) {
      console.warn('File system permission check failed:', e);
      return false;
    }
  }

  async function validateBackupIntegrity(handle: any, fileName: string): Promise<boolean> {
    for (let i = 0; i < 3; i++) {
        try {
            const fileHandle = await handle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const text = await file.text();
            if (!text || text.trim() === '') {
                throw new Error("File is empty");
            }
            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error("Invalid JSON structure");
            }
            return true;
        } catch (err) {
            console.warn(`Integrity check failed for ${fileName} (attempt ${i + 1}/3):`, err);
            await new Promise(res => setTimeout(res, 500)); // wait before retry
        }
    }
    return false;
  }

  // Verify permission for a directory handle
  async function verifyPermission(fileHandle: any, readWrite: boolean) {
    const opts: any = {};
    if (readWrite) {
      opts.mode = 'readwrite';
    }
    // Check if permission was already granted.
    if ((await fileHandle.queryPermission(opts)) === 'granted') {
      return true;
    }
    // We cannot request permission on load (requires user gesture)
    return false;
  }

  // Load data from a given handle
  async function loadFromHandle(handle: any, forceFileName?: string) {
    try {
      let parsed: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          let fileHandle;
          if (forceFileName) {
            fileHandle = await handle.getFileHandle(forceFileName);
          } else {
            try {
              fileHandle = await handle.getFileHandle(`SheetSyncData_${store}.json`);
            } catch (err) {
              if (store === 'HCM') {
                  fileHandle = await handle.getFileHandle('SheetSyncData.json');
              } else {
                  throw err;
              }
            }
          }
          const file = await fileHandle.getFile();
          const text = await file.text();
          if (!text || text.trim() === '') throw new Error("File is empty");
          parsed = JSON.parse(text);
          break; // success
        } catch (err) {
          console.warn(`Load attempt ${attempt + 1} failed for ${store}:`, err);
          if (attempt === 2) throw err;
          await new Promise(res => setTimeout(res, 500));
        }
      }
      if (parsed.classInfo) useDataStore.getState().setClassInfo(parsed.classInfo);
      if (parsed.actualClassInfo) set({ actualClassInfo: parsed.actualClassInfo });
      if (parsed.dailySalesProfits) set({ dailySalesProfits: parsed.dailySalesProfits });
      if (parsed.unitInfo) set({ unitInfo: parsed.unitInfo });
      if (parsed.mdStatus) set({ mdStatus: parsed.mdStatus });
      if (parsed.subFees) set({ subFees: parsed.subFees });
      if (parsed.projectStatus) set({ projectStatus: parsed.projectStatus });
      if (parsed.projectLink) set({ projectLink: parsed.projectLink });
      if (parsed.basePlan) set({ basePlan: parsed.basePlan });
      if (parsed.units) set({ units: parsed.units });
      if (parsed.mapUnits) set({ mapUnits: parsed.mapUnits });
      if (parsed.mapVersions) set({ mapVersions: parsed.mapVersions });
      if (parsed.activeMapVersionId) set({ activeMapVersionId: parsed.activeMapVersionId });
      if (parsed.reviewSelectedLabels) set({ reviewSelectedLabels: parsed.reviewSelectedLabels });
      if (parsed.reviewLabelColors) set({ reviewLabelColors: parsed.reviewLabelColors });
      if (parsed.autoUpdateBrandName !== undefined) set({ autoUpdateBrandName: parsed.autoUpdateBrandName });
      
      try {
        let sharedParsed: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const sharedHandle = await handle.getFileHandle('SheetSyncData_Shared.json');
            const sharedFile = await sharedHandle.getFile();
            const sharedText = await sharedFile.text();
            if (sharedText && sharedText.trim() !== '') {
               sharedParsed = JSON.parse(sharedText);
            }
            break;
          } catch (err: any) {
            if (err.name === 'NotFoundError') throw err;
            console.warn(`Shared file load attempt ${attempt + 1} failed:`, err);
            if (attempt === 2) throw err;
            await new Promise(res => setTimeout(res, 300));
          }
        }
        if (sharedParsed.classInfo) useDataStore.getState().setClassInfo(sharedParsed.classInfo);
        if (sharedParsed.actualClassInfo) set({ actualClassInfo: sharedParsed.actualClassInfo });
      } catch (e) {
        console.log('No shared class/brand info found, using store-specific data.');
      }

      let salesData = parsed.sales || [];
      let profitsData = parsed.profits || [];
      // One-time migration: divide by 1000 if not already migrated
      if (!parsed.migrated_scaled_1000) {
        if (salesData.length > 0) {
          salesData = salesData.map((s: SalesInfo) => ({ ...s, sales: (Number(s.sales) || 0) / 1000 }));
        }
        if (profitsData.length > 0) {
          profitsData = profitsData.map((p: ProfitInfo) => ({ ...p, profit: (Number(p.profit) || 0) / 1000 }));
        }
        console.log('Migrated existing data: divided by 1000');
      }
      set({ sales: salesData });
      set({ profits: profitsData });
      
      if (parsed.r2Config) {
        if (parsed.r2Config.accountId) localStorage.setItem('r2_account_id', parsed.r2Config.accountId);
        if (parsed.r2Config.accessKey) localStorage.setItem('r2_access_key', parsed.r2Config.accessKey);
        if (parsed.r2Config.secretKey) localStorage.setItem('r2_secret_key', parsed.r2Config.secretKey);
        if (parsed.r2Config.bucketName) localStorage.setItem('r2_bucket_name', parsed.r2Config.bucketName);
        if (parsed.r2Config.cfZoneId) localStorage.setItem('cf_zone_id', parsed.r2Config.cfZoneId);
        if (parsed.r2Config.cfApiToken) localStorage.setItem('cf_api_token', parsed.r2Config.cfApiToken);
      }

      if (parsed.lastUpdated) set({ lastBackup: parsed.lastUpdated });
      return true;
    } catch (e) {
      console.log('No existing backup in directory, it might be a new folder.');
      return false;
    }
  }

  // Initial Load
  useEffect(() => {
    async function init() {
      try {
        set({ isLoading: true });
        
        // 1. Try to restore local folder from IndexedDB
        const savedHandle = await idbGet('dirHandle');
        if (savedHandle) {
          const isPermitted = await verifyPermission(savedHandle, true);
          if (isPermitted) {
            dirHandleRef.current = savedHandle;
            set({ hasLocalFolder: true });
            const loaded = await loadFromHandle(savedHandle);
            if (loaded) {
              set({ isLoading: false });
              return;
            }
          } else {
            console.log('Stored folder handle requires re-permission');
            set({ hasLocalFolder: true }); // We have a handle, but need permission
            set({ needsPermission: true });
            dirHandleRef.current = savedHandle;
          }
        }

        // 2. Fallback: Load from Server
        const data = await loadPersistentData(store);
        // set({ classInfo: data.classInfo || [] });
        set({ actualClassInfo: data.actualClassInfo || [] });
        set({ unitInfo: data.unitInfo || [] });
        set({ mdStatus: data.mdStatus || [] });
        set({ subFees: data.subFees || [] });
        set({ projectStatus: data.projectStatus || [] });
        set({ projectLink: data.projectLink || [] });
        set({ basePlan: data.basePlan || [] });
        set({ units: data.units || [] });
        set({ mapUnits: data.mapUnits || [] });
        set({ mapVersions: data.mapVersions || [] });
        set({ activeMapVersionId: data.activeMapVersionId || null });
        if (data.dailySalesProfits) set({ dailySalesProfits: data.dailySalesProfits });
        if (data.reviewSelectedLabels) set({ reviewSelectedLabels: data.reviewSelectedLabels });
        if (data.reviewLabelColors) set({ reviewLabelColors: data.reviewLabelColors });
        if (data.autoUpdateBrandName !== undefined) set({ autoUpdateBrandName: data.autoUpdateBrandName });
        
        let salesData = data.sales || [];
        let profitsData = data.profits || [];
        // One-time migration for server data as well
        if (!data.migrated_scaled_1000) {
          if (salesData.length > 0) {
            salesData = salesData.map((s: SalesInfo) => ({ ...s, sales: (Number(s.sales) || 0) / 1000 }));
          }
          if (profitsData.length > 0) {
            profitsData = profitsData.map((p: ProfitInfo) => ({ ...p, profit: (Number(p.profit) || 0) / 1000 }));
          }
        }
        set({ sales: salesData });
        set({ profits: profitsData });
        
        if (data.r2Config) {
          if (data.r2Config.accountId) localStorage.setItem('r2_account_id', data.r2Config.accountId);
          if (data.r2Config.accessKey) localStorage.setItem('r2_access_key', data.r2Config.accessKey);
          if (data.r2Config.secretKey) localStorage.setItem('r2_secret_key', data.r2Config.secretKey);
          if (data.r2Config.bucketName) localStorage.setItem('r2_bucket_name', data.r2Config.bucketName);
          if (data.r2Config.cfZoneId) localStorage.setItem('cf_zone_id', data.r2Config.cfZoneId);
          if (data.r2Config.cfApiToken) localStorage.setItem('cf_api_token', data.r2Config.cfApiToken);
        }

        if (data.lastUpdated) set({ lastBackup: data.lastUpdated });
      } catch (error) {
        console.error('Initial load failed:', error);
      } finally {
        set({ isLoading: false });
      }
    }
    init();
  }, []);

  const requestFolderPermission = async () => {
    if (!dirHandleRef.current) return;
    try {
      if (window !== window.parent) {
        alert("Tính năng này không hỗ trợ trong chế độ xem trước (iframe). Vui lòng mở ứng dụng trong một tab mới (nút mũi tên ở góc trên bên phải) để sử dụng.");
        return;
      }
      const opts = { mode: 'readwrite' };
      if ((await dirHandleRef.current.requestPermission(opts)) === 'granted') {
        const loaded = await loadFromHandle(dirHandleRef.current);
        set({ needsPermission: false });
        if (loaded) {
          alert('Đã khôi phục kết nối và tải dữ liệu từ thư mục cục bộ!');
        } else {
          alert('Đã kết nối với thư mục cục bộ!');
        }
      }
    } catch (err) {
      console.error('Permission request failed', err);
    }
  };

  const selectLocalFolder = async () => {
    try {
      if (window !== window.parent) {
        alert("Tính năng này không hỗ trợ trong chế độ xem trước (iframe). Vui lòng mở ứng dụng trong một tab mới (nút mũi tên ở góc trên bên phải) để sử dụng.");
        return;
      }
      
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      dirHandleRef.current = handle;
      await idbSet('dirHandle', handle); // Save handle to IndexedDB
      set({ hasLocalFolder: true });
      
      // Prevent any pending auto-saves from overwriting the folder before we load
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      set({ isLoading: true });
      const loaded = await loadFromHandle(handle);
      if (loaded) {
        alert('Đã kết nối và tải dữ liệu từ thư mục thành công!');
      } else {
        alert('Đã kết nối thư mục, nhưng không tìm thấy dữ liệu cũ.');
      }
    } catch(err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        alert("Không thể chọn thư mục. Hãy chắc chắn bạn mở app trên tab mới và trình duyệt hỗ trợ File System Access API.");
      }
    } finally {
      set({ isLoading: false });
    }
  };

  
  useEffect(() => {
    set({
      triggerManualLoad,
      triggerManualBackup,
      restoreBackup,
      selectLocalFolder,
      requestFolderPermission,
      syncWithGoogleSheets
    });
  }, []);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  const saveToHandlers = async (
    customHandle?: any,
    isManualClick: boolean = false
  ) => {
    const currentState = useDataStore.getState();
    const { 
      classInfo: c, actualClassInfo: ac, sales: s, unitInfo: u, profits: p, 
      mdStatus: md, subFees: sf, projectStatus: ps, projectLink: pl, basePlan: bp, 
      units: un, mapUnits: mu, mapVersions: mv, activeMapVersionId: amvId, 
      reviewSelectedLabels: rsl, reviewLabelColors: rlc, autoUpdateBrandName
    } = currentState;

    set({ isSaving: true });
    let errorToReport = null;
    try {
      // 1. Server persistence (Backup) - Catch errors so we don't break local persistence
      try {
        const res = await savePersistentData({ 
          classInfo: c, 
          actualClassInfo: ac,
          sales: s,
          unitInfo: u,
          profits: p,
          dailySalesProfits: useDataStore.getState().dailySalesProfits,
          mdStatus: md,
          subFees: sf,
          projectStatus: ps,
          projectLink: pl,
          basePlan: bp,
          units: un,
          mapUnits: mu,
          mapVersions: mv,
          activeMapVersionId: amvId,
          reviewSelectedLabels: rsl,
          reviewLabelColors: rlc,
            autoUpdateBrandName,
          migrated_scaled_1000: true, // Set flag to avoid re-migration
          r2Config: {
            accountId: localStorage.getItem('r2_account_id') || '',
            accessKey: localStorage.getItem('r2_access_key') || '',
            secretKey: localStorage.getItem('r2_secret_key') || '',
            bucketName: localStorage.getItem('r2_bucket_name') || '',
            cfZoneId: localStorage.getItem('cf_zone_id') || '',
            cfApiToken: localStorage.getItem('cf_api_token') || ''
          }
        }, store);
        if (res.success && !lastBackup) set({ lastBackup: res.timestamp });
      } catch (bkpErr) {
        console.warn('Server backup failed, skipped:', bkpErr);
      }
      
      // 2. Local persistence if a folder is selected
      const activeHandle = customHandle || dirHandleRef.current;
      if (activeHandle) {
        // Double check permission before saving
        let hasPerm = await verifyPermission(activeHandle, true);
        
        // If manual click and no permission, try requesting it
        if (!hasPerm && isManualClick) {
            try {
                if ((await activeHandle.requestPermission({ mode: 'readwrite' })) === 'granted') {
                    hasPerm = true;
                }
            } catch (e: any) {
                console.warn('Could not request permission:', e);
            }
        }

        const canWrite = await checkFilePermissions(activeHandle);
        if (hasPerm && canWrite) {
          const timestamp = new Date().toISOString();
          const baseName = `SheetSyncData_${store}`;
          const targetFile = `${baseName}.json`;
          const tempFile = `.__tmp_${targetFile}`;
          const jsonPayload = JSON.stringify({ 
            classInfo: c, 
            actualClassInfo: ac,
            sales: s, 
            unitInfo: u,
            profits: p,
            dailySalesProfits: useDataStore.getState().dailySalesProfits,
            mdStatus: md,
            subFees: sf,
            projectStatus: ps,
            projectLink: pl,
            basePlan: bp,
            units: un,
            mapUnits: mu,
            mapVersions: mv,
            activeMapVersionId: amvId,
            reviewSelectedLabels: rsl,
          reviewLabelColors: rlc,
            autoUpdateBrandName,
            lastUpdated: timestamp,
            migrated_scaled_1000: true, // Set flag to avoid re-migration
            r2Config: {
              accountId: localStorage.getItem('r2_account_id') || '',
              accessKey: localStorage.getItem('r2_access_key') || '',
              secretKey: localStorage.getItem('r2_secret_key') || '',
              bucketName: localStorage.getItem('r2_bucket_name') || '',
              cfZoneId: localStorage.getItem('cf_zone_id') || '',
              cfApiToken: localStorage.getItem('cf_api_token') || ''
            }
          });

          let saveSuccess = false;
          try {
            await rotateBackups(activeHandle, baseName);
            try { await activeHandle.removeEntry(tempFile); } catch(e) {}
            const tempFileHandle = await activeHandle.getFileHandle(tempFile, { create: true });
            const tempWritable = await tempFileHandle.createWritable();
            await tempWritable.write(jsonPayload);
            await tempWritable.close();

            try {
              if (typeof (tempFileHandle as any).move === 'function') {
                await (tempFileHandle as any).move(targetFile);
                saveSuccess = true;
              } else {
                throw new Error("move not supported");
              }
            } catch (moveErr) {
               // Fallback: write directly without removing the original file first to prevent data loss
               const targetHandle = await activeHandle.getFileHandle(targetFile, { create: true });
               const targetWritable = await targetHandle.createWritable();
               await targetWritable.write(jsonPayload);
               await targetWritable.close();
               saveSuccess = true;
            }
            
            if (saveSuccess) {
               try { await activeHandle.removeEntry(tempFile); } catch(e) {}
               const isIntact = await validateBackupIntegrity(activeHandle, targetFile);
               if (!isIntact) throw new Error("Integrity check failed after write");
            }
          } catch(err: any) {
             throw new Error("Local save failed: " + err.message);
          }

          try {
            const sharedBaseName = 'SheetSyncData_Shared';
            const targetSharedFile = `${sharedBaseName}.json`;
            const tempSharedFile = `.__tmp_${targetSharedFile}`;
            const sharedPayload = JSON.stringify({
              classInfo: c,
              actualClassInfo: ac
            });

            let sharedSaveSuccess = false;
            try {
              await rotateBackups(activeHandle, sharedBaseName);
              try { await activeHandle.removeEntry(tempSharedFile); } catch(e) {}
              const tempSharedHandle = await activeHandle.getFileHandle(tempSharedFile, { create: true });
              const tempSharedWritable = await tempSharedHandle.createWritable();
              await tempSharedWritable.write(sharedPayload);
              await tempSharedWritable.close();

              try {
                if (typeof (tempSharedHandle as any).move === 'function') {
                  await (tempSharedHandle as any).move(targetSharedFile);
                  sharedSaveSuccess = true;
                } else {
                  throw new Error("move not supported");
                }
              } catch (moveErr) {
                 const targetSharedHandle = await activeHandle.getFileHandle(targetSharedFile, { create: true });
                 const targetSharedWritable = await targetSharedHandle.createWritable();
                 await targetSharedWritable.write(sharedPayload);
                 await targetSharedWritable.close();
                 sharedSaveSuccess = true;
              }
              
              if (sharedSaveSuccess) {
                 try { await activeHandle.removeEntry(tempSharedFile); } catch(e) {}
                 const isIntact = await validateBackupIntegrity(activeHandle, targetSharedFile);
                 if (!isIntact) throw new Error("Integrity check failed for shared file");
              }
            } catch(err: any) {
              throw err;
            }
          } catch(e) {
            console.warn('Failed to save shared data locally', e);
          }
          set({ lastBackup: timestamp });
          if (isManualClick) {
              alert(`Lưu thành công file SheetSyncData_${store}.json vào thư mục được chọn!`);
          }
        } else if (isManualClick) {
           errorToReport = 'Lưu thất bại: Không có quyền ghi vào thư mục được chọn. Hãy chọn lại thư mục.';
        }
      } else if (isManualClick) {
        alert('Đã lưu vào bộ nhớ tạm. Hãy chọn thư mục cục bộ (Sync to Local Folder) để lưu file vào máy.');
      }
    } catch (error: any) {
      console.error('Auto-backup failed:', error);
      const errMsg = error?.message || String(error);
      
      // If we encounter ANY error while trying to write using the directory handle,
      // invalidate it so the user can re-select it instead of failing silently or loudly forever.
      if (dirHandleRef.current && (errMsg.includes('cached in an interface object') || error?.name === 'ValidStateError' || error?.name === 'InvalidStateError' || error?.name === 'NotAllowedError')) {
        errorToReport = `Lỗi hệ thống tệp đĩa: Kết nối thư mục bị gián đoạn. Vui lòng bấm vào "Sync to Local Folder" để CHỌN LẠI THƯ MỤC. (${errMsg})`;
        set({ hasLocalFolder: false });
        dirHandleRef.current = null;
      } else {
        errorToReport = `Lỗi hệ thống lưu: ${errMsg}`;
        // Still clear the dirHandle just in case the exception was something else but related to file system
        if (dirHandleRef.current) {
           set({ hasLocalFolder: false });
           dirHandleRef.current = null;
        }
      }
    } finally {
      set({ isSaving: false });
      // Wait, if it auto-saves and fails, it might spam alerts if we aren't careful.
      // But since we set({ hasLocalFolder: false }), it will NOT try to save to local folder next time
      // so it will only alert once if we let it.
      // But we ONLY alert on manual click to avoid interrupting the user.
      if (errorToReport && isManualClick) {
          alert(errorToReport);
      } else if (errorToReport) {
          // If auto-saving, we can log it or show a non-intrusive toast, but alert is too intrusive.
          console.warn('Auto-save error:', errorToReport);
      }
    }
  };

  // Debounced save effect using Zustand subscribe
  useEffect(() => {
    const unsub = useDataStore.subscribe((state, prevState) => {
      if (state.isLoading) return;

      const changed = 
        state.classInfo !== prevState.classInfo ||
        state.actualClassInfo !== prevState.actualClassInfo ||
        state.sales !== prevState.sales ||
        state.unitInfo !== prevState.unitInfo ||
        state.profits !== prevState.profits ||
        state.dailySalesProfits !== prevState.dailySalesProfits ||
        state.mdStatus !== prevState.mdStatus ||
        state.subFees !== prevState.subFees ||
        state.projectStatus !== prevState.projectStatus ||
        state.projectLink !== prevState.projectLink ||
        state.basePlan !== prevState.basePlan ||
        state.units !== prevState.units ||
        state.mapUnits !== prevState.mapUnits ||
        state.mapVersions !== prevState.mapVersions ||
        state.activeMapVersionId !== prevState.activeMapVersionId ||
        state.reviewSelectedLabels !== prevState.reviewSelectedLabels ||
        state.reviewLabelColors !== prevState.reviewLabelColors ||
        state.autoUpdateBrandName !== prevState.autoUpdateBrandName;

      if (!changed) return;

      isDirtyRef.current = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        isDirtyRef.current = false;
        saveToHandlers();
        idbSet('dailySalesProfits', state.dailySalesProfits);
      }, 2000);
    });
  
    return () => {
      unsub();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const setActualClassInfo = (data: ActualClassInfo[]) => {
    set({ actualClassInfo: data });
  };

  const setClassInfo = (data: ClassInfo[]) => {
    useDataStore.setState({ classInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_brand_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving brand info to Firestore:", err));
  };

  const setSales = (data: SalesInfo[]) => {
    set({ sales: data });
  };

  const setProfits = (data: ProfitInfo[]) => {
    set({ profits: data });
  };

  const setUnitInfo = (data: UnitInfo[]) => {
    useDataStore.setState({ unitInfo: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_unit_info', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving unit info to Firestore:", err));
  };

  const setMdStatus = (data: MDStatusInfo[]) => {
    const currentMdStatus = useDataStore.getState().mdStatus;
    data.forEach((newItem) => {
      const oldItem = currentMdStatus.find(m => m.unit === newItem.unit);
      if (oldItem && newItem.firestoreId) {
        if (oldItem.status !== newItem.status || oldItem.mdNotes !== newItem.mdNotes) {
          updateMdStatusInFirestore(newItem.firestoreId, newItem.status, newItem.mdNotes || '');
        }
      }
    });
    set({ mdStatus: data });
  };

  const setSubFees = (data: SubFeeInfo[]) => {
    set({ subFees: data });
  };

  const setProjectStatus = (data: ProjectStatusInfo[]) => {
    set({ projectStatus: data });
  };
  const setProjectLink = (data: ProjectLinkInfo[]) => {
    set({ projectLink: data });
  };

  const setBasePlan = (data: BasePlanInfo[]) => {
    set({ basePlan: data });
  };

  const setUnits = (data: UnitDataInfo[]) => {
    useDataStore.setState({ units: data });
    const docRef = doc(defaultDb, 'artifacts/taka-projects-app-v1/public/data/taka_units', 'global');
    setDoc(docRef, { data }).catch(err => console.error("Error saving units to Firestore:", err));
  };

  const setSpreadsheetId = (id: string | null) => {
    set({ spreadsheetId: id });
    localStorage.setItem('spreadsheetId', id || '');
  };

  useEffect(() => {
    const savedId = localStorage.getItem('spreadsheetId');
    if (savedId) set({ spreadsheetId: savedId });
  }, []);

  const parseSheetData = (rows: any[]) => {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0].map((h: string) => h.toLowerCase().trim());
    return rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((h: string, idx: number) => {
        obj[h] = row[idx];
      });
      return obj;
    });
  };

  const syncWithGoogleSheets = async (sid: string) => {
    set({ isLoading: true });
    try {
      const results = await syncFromGoogleSheets(sid);
      
      // Try 'Brand Info' first for classInfo (Brand Info renamed), fallback to 'Class Info' if it's not present there
      const mapClassInfo = (data: any[]) => data.map((c: any) => {
        const salesEffiStr = String(c['sales effi'] || c['sales effi (%)'] || c['sales efficiency'] || c['hcm sales effi'] || c.salesEffi || '').replace(/,/g, '').replace(/%/g, '');
        const profitEffiStr = String(c['profit effi'] || c['profit effi (%)'] || c['profit efficiency'] || c['hcm profit effi'] || c.profitEffi || '').replace(/,/g, '').replace(/%/g, '');
        const marginStr = String(c['margin'] || c['hcm margin'] || c['margin (%)'] || '').replace(/,/g, '').replace(/%/g, '');
        
        let salesEffi = parseFloat(salesEffiStr) || 0;
        let profitEffi = parseFloat(profitEffiStr) || 0;
        let margin = parseFloat(marginStr) || 0;
        
        // If margin is found, and we need profitEffi = salesEffi * margin (or vice versa), maybe keep margin
        
        return {
          ...c,
          classCode: c.classCode || c['class code'] || c['classcode'] || '',
          name: c.name || c['name'] || '',
          vendorCode: c.vendorCode || c['vendor code'] || c['vendorcode'] || '',
          brandCode: c.brandCode || c['brand code'] || c['brandcode'] || '',
          brandName: c.brandName || c['brand name'] || c['brandname'] || '',
          salesEffi,
          profitEffi,
          margin: margin > 0 ? margin : (salesEffi > 0 ? profitEffi / salesEffi : 0) // store margin explicitly
        };
      });

      if (results['Brand Info']) useDataStore.getState().setClassInfo(mapClassInfo(parseSheetData(results['Brand Info'])));
      else if (results['Class Info'] && !results['Brand Info']) useDataStore.getState().setClassInfo(mapClassInfo(parseSheetData(results['Class Info'])));
      
      if (results['Class Info'] && results['Brand Info']) {
        const mappedActualClassInfo = parseSheetData(results['Class Info']).map((c: any) => ({
          ...c,
          classCode: c.classCode || c['class code'] || c['classcode'] || '',
          name: c.name || c['name'] || '',
          hcmSize: c.hcmSize || c['hcm size'] || c['hcmsize'] || '',
          hcmSalesEffi: c.hcmSalesEffi || c['hcm sales effi'] || c['hcmsaleseffi'] || '',
          hcmProfitEffi: c.hcmProfitEffi || c['hcm profit effi'] || c['hcmprofiteffi'] || '',
        }));
        set({ actualClassInfo: mappedActualClassInfo });
      } else if (results['Actual Class Info']) {
        const mappedActualClassInfo = parseSheetData(results['Actual Class Info']).map((c: any) => ({
          ...c,
          classCode: c.classCode || c['class code'] || c['classcode'] || '',
          name: c.name || c['name'] || '',
          hcmSize: c.hcmSize || c['hcm size'] || c['hcmsize'] || '',
          hcmSalesEffi: c.hcmSalesEffi || c['hcm sales effi'] || c['hcmsaleseffi'] || '',
          hcmProfitEffi: c.hcmProfitEffi || c['hcm profit effi'] || c['hcmprofiteffi'] || '',
        }));
        set({ actualClassInfo: mappedActualClassInfo });
      }

      if (results['Unit Info']) {
        const parsedUnitInfo = parseSheetData(results['Unit Info']).map((u: any) => ({
          ...u,
          classCode: u.classCode || u['class code'] || u['classcode'] || '',
          vendorCode: u.vendorCode || u['vendor code'] || u['vendorcode'] || '',
          brandCode: u.brandCode || u['brand code'] || u['brandcode'] || '',
          brandName: u.brandName || u['brand name'] || u['brandname'] || '',
          startMonth: u.startMonth || u['start month'] || '',
        }));
        set({ unitInfo: parsedUnitInfo });
      }
      if (results['Sales']) {
        const salesData = parseSheetData(results['Sales']);
        // Auto-scale if needed or just use as is
        set({ sales: salesData.map((s: any) => ({
          ...s,
          sales: Number(s.sales) || 0,
          salesByCp: Number(s.salesByCp) || 0
        })) });
      }
      if (results['Profits']) {
        const profitsData = parseSheetData(results['Profits']);
        set({ profits: profitsData.map((p: any) => ({
          ...p,
          profit: Number(p.profit) || 0,
          profitByCp: Number(p.profitByCp) || 0
        })) });
      }
      if (results['Daily Sales & Profit']) {
        const dsData = parseSheetData(results['Daily Sales & Profit']);
        set({ dailySalesProfits: dsData.map((d: any) => ({
          ...d,
          sales: Number(d.sales) || 0,
          profit: Number(d.profit) || 0,
          margin: Number(d.margin) || 0
        })) });
      }
      if (results['MD Status']) set({ mdStatus: parseSheetData(results['MD Status']) });
      if (results['Sub Fees']) set({ subFees: parseSheetData(results['Sub Fees']) });
      if (results['Project Status']) set({ projectStatus: parseSheetData(results['Project Status']) });
      if (results['Project Link']) set({ projectLink: parseSheetData(results['Project Link']) });
      if (results['Base Plan']) {
        const basePlanData = parseSheetData(results['Base Plan']);
        set({ basePlan: basePlanData.map((b: any) => ({
          ...b,
          marginLow: Number(b.marginLow) || 0,
          marginHigh: Number(b.marginHigh) || 0,
          vshcm: parseFloat(String(b.vshcm || b['vshcm (%)'] || b['vs hcm'] || b['vshcm'] || '').replace(/,/g, '').replace(/%/g, '')) || 0
        })) });
      }
      if (results['Units']) {
        const unitsData = parseSheetData(results['Units']);
        set({ units: unitsData.map((u: any) => ({
          ...u,
          size: Number(String(u.size).replace(/,/g, '')) || 0
        })) });
      }
      
      set({ spreadsheetId: sid });
      alert('Đồng bộ dữ liệu từ Google Sheets thành công!');
    } catch (error: any) {
      console.error('Google Sheets sync failed:', error);
      alert('Đồng bộ thất bại: ' + error.message);
    } finally {
      set({ isLoading: false });
    }
  };

  const triggerManualBackup = async () => {
    await saveToHandlers(undefined, true);
  };

  const restoreBackup = async () => {
    if (!dirHandleRef.current) {
        alert("Chưa chọn thư mục nào!");
        return;
    }
    const isPermitted = await verifyPermission(dirHandleRef.current, true);
    if (!isPermitted) {
         alert("Bạn cần cấp quyền truy cập lại cho thư mục này.");
         return;
    }
    
    set({ isLoading: true });
    try {
      const backupFile = `SheetSyncData_${store}_v1.json`;
      const loaded = await loadFromHandle(dirHandleRef.current, backupFile);
      if (loaded) {
          alert(`Khôi phục thành công từ file ${backupFile}!`);
      } else {
          alert(`Không tìm thấy file backup (${backupFile}) hoặc dữ liệu bị lỗi.`);
      }
    } catch(err: any) {
        console.error(err);
        alert('Lỗi khi khôi phục dữ liệu: ' + err.message);
    } finally {
        set({ isLoading: false });
    }
  };

  const triggerManualLoad = async () => {
    if (!dirHandleRef.current) {
        alert("Chưa chọn thư mục nào!");
        return;
    }
    const isPermitted = await verifyPermission(dirHandleRef.current, true);
    if (!isPermitted) {
         alert("Bạn cần cấp quyền truy cập lại cho thư mục này.");
         return;
    }
    
    set({ isLoading: true });
    try {
      const loaded = await loadFromHandle(dirHandleRef.current);
      if (loaded) {
          alert('Đọc dữ liệu từ thư mục cục bộ thành công!');
      } else {
          alert('Không tìm thấy dữ liệu SheetSyncData.json trong thư mục đã chọn.');
      }
    } catch(err: any) {
        console.error(err);
        alert('Lỗi khi đọc dữ liệu: ' + err.message);
    } finally {
        set({ isLoading: false });
    }
  };

  return <>{children}</>;
}
