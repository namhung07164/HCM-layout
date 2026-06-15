import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ClassInfo, ActualClassInfo, SalesInfo, ProfitInfo, UnitInfo, MDStatusInfo, SubFeeInfo, ProjectStatusInfo, ProjectLinkInfo, BasePlanInfo, UnitDataInfo, StoreRegion } from './types';
import { UnitShape, MapVersion } from './components/DataMapping/types';
import { loadPersistentData, savePersistentData } from './lib/sheets';
import { get, set } from 'idb-keyval';

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
  unitInfo: UnitInfo[];
  mdStatus: MDStatusInfo[];
  subFees: SubFeeInfo[];
  projectStatus: ProjectStatusInfo[];
  projectLink: ProjectLinkInfo[];
  basePlan: BasePlanInfo[];
  units: UnitDataInfo[];
  notifications: AppNotification[];
  
  mapUnits: UnitShape[];
  mapVersions: MapVersion[];
  activeMapVersionId: string | null;

  setActualClassInfo: (data: ActualClassInfo[]) => void;
  setClassInfo: (data: ClassInfo[]) => void;
  setSales: (data: SalesInfo[]) => void;
  setProfits: (data: ProfitInfo[]) => void;
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
  selectLocalFolder: () => Promise<void>;
  hasLocalFolder: boolean;
  needsPermission: boolean;
  setNeedsPermission: (v: boolean) => void;
  requestFolderPermission: () => Promise<void>;
  syncWithGoogleSheets: (spreadsheetId: string) => Promise<void>;
  spreadsheetId: string | null;
  setSpreadsheetId: (id: string | null) => void;
  store: StoreRegion;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

import { syncFromGoogleSheets } from './services/googleSheets';
import { useProjectStatusSync } from './hooks/useProjectStatusSync';

export function DataProvider({ children, store }: { children: React.ReactNode, store: StoreRegion }) {
  const [classInfo, setClassInfoState] = useState<ClassInfo[]>([]);
  const [actualClassInfo, setActualClassInfoState] = useState<ActualClassInfo[]>([]);
  const [sales, setSalesState] = useState<SalesInfo[]>([]);
  const [profits, setProfitsState] = useState<ProfitInfo[]>([]);
  const [unitInfo, setUnitInfoState] = useState<UnitInfo[]>([]);
  const [mdStatus, setMdStatusState] = useState<MDStatusInfo[]>([]);
  const [subFees, setSubFeesState] = useState<SubFeeInfo[]>([]);
  const [projectStatus, setProjectStatusState] = useState<ProjectStatusInfo[]>([]);
  const [projectLink, setProjectLinkState] = useState<ProjectLinkInfo[]>([]);
  const [basePlan, setBasePlanState] = useState<BasePlanInfo[]>([]);
  const [units, setUnitsState] = useState<UnitDataInfo[]>([]);
  const validUnits = React.useMemo(() => units.map(u => u.unit), [units]);
  const { projectStatus: fsProjectStatus, error: fsError } = useProjectStatusSync(validUnits, store);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = (message: string) => {
    setNotifications(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      message,
      read: false,
      timestamp: new Date().toISOString()
    }, ...prev]);
  };

  useEffect(() => {
    if (fsProjectStatus && fsProjectStatus.length > 0) {
      setProjectStatusState(fsProjectStatus);
    }
  }, [fsProjectStatus]);
  
  useEffect(() => {
    if (fsError) {
       addNotification(fsError);
    }
  }, [fsError]);

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const [mapUnits, setMapUnitsState] = useState<UnitShape[]>([]);
  const [mapVersions, setMapVersionsState] = useState<MapVersion[]>([]);
  const [activeMapVersionId, setActiveMapVersionIdState] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetIdState] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [hasLocalFolder, setHasLocalFolder] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  
  const dirHandleRef = useRef<any>(null);
  const isInitialMount = useRef(true);

  // Auto-sync unitInfo when units or classInfo change
  useEffect(() => {
    if (isLoading) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setUnitInfoState(prev => {
      let isChanged = false;
      const next = prev.map(item => {
        let updated = { ...item };
        let localChanged = false;

        // Sync floor and size from units
        if (item.unit) {
          const matchedUnit = units.find(u => u.unit?.toLowerCase() === item.unit?.toLowerCase());
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
                // Should we change it back to active if it's active in units?
                // The requirement says: "Ngoài ra ,các unit đang bị unactive ở tab unit cũng sẽ bị unactive ở tab unit info".
                // I will also sync Active status.
                updated.status = 'Active';
                localChanged = true;
            }
          }
        }

        // Sync brandName/brandCode from classInfo
        if (item.brandCode) {
          const matchedClass = classInfo.find(c => c.brandCode?.toLowerCase() === item.brandCode?.toLowerCase());
          if (matchedClass && updated.brandName !== matchedClass.brandName) {
            updated.brandName = matchedClass.brandName;
            localChanged = true;
          }
        } else if (item.brandName) {
          const matchedClass = classInfo.find(c => c.brandName?.toLowerCase() === item.brandName?.toLowerCase());
          if (matchedClass && updated.brandCode !== matchedClass.brandCode) {
            updated.brandCode = matchedClass.brandCode;
            localChanged = true;
          }
        }

        if (localChanged) isChanged = true;
        return updated;
      });

      return isChanged ? next : prev;
    });
  }, [units, classInfo, isLoading]);

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
  async function loadFromHandle(handle: any) {
    try {
      let fileHandle;
      try {
        fileHandle = await handle.getFileHandle(`SheetSyncData_${store}.json`);
      } catch (err) {
        if (store === 'HCM') {
            try {
                fileHandle = await handle.getFileHandle('SheetSyncData.json');
                console.log("Found legacy SheetSyncData.json for HCM, will use it.");
            } catch (fallbackErr) {
                throw err;
            }
        } else {
            throw err;
        }
      }
      
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.classInfo) setClassInfoState(parsed.classInfo);
      if (parsed.actualClassInfo) setActualClassInfoState(parsed.actualClassInfo);
      if (parsed.unitInfo) setUnitInfoState(parsed.unitInfo);
      if (parsed.mdStatus) setMdStatusState(parsed.mdStatus);
      if (parsed.subFees) setSubFeesState(parsed.subFees);
      if (parsed.projectStatus) setProjectStatusState(parsed.projectStatus);
      if (parsed.projectLink) setProjectLinkState(parsed.projectLink);
      if (parsed.basePlan) setBasePlanState(parsed.basePlan);
      if (parsed.units) setUnitsState(parsed.units);
      if (parsed.mapUnits) setMapUnitsState(parsed.mapUnits);
      if (parsed.mapVersions) setMapVersionsState(parsed.mapVersions);
      if (parsed.activeMapVersionId) setActiveMapVersionIdState(parsed.activeMapVersionId);
      
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
      setSalesState(salesData);
      setProfitsState(profitsData);
      
      if (parsed.r2Config) {
        if (parsed.r2Config.accountId) localStorage.setItem('r2_account_id', parsed.r2Config.accountId);
        if (parsed.r2Config.accessKey) localStorage.setItem('r2_access_key', parsed.r2Config.accessKey);
        if (parsed.r2Config.secretKey) localStorage.setItem('r2_secret_key', parsed.r2Config.secretKey);
        if (parsed.r2Config.bucketName) localStorage.setItem('r2_bucket_name', parsed.r2Config.bucketName);
        if (parsed.r2Config.cfZoneId) localStorage.setItem('cf_zone_id', parsed.r2Config.cfZoneId);
        if (parsed.r2Config.cfApiToken) localStorage.setItem('cf_api_token', parsed.r2Config.cfApiToken);
      }

      if (parsed.lastUpdated) setLastBackup(parsed.lastUpdated);
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
        setIsLoading(true);
        
        // 1. Try to restore local folder from IndexedDB
        const savedHandle = await get('dirHandle');
        if (savedHandle) {
          const isPermitted = await verifyPermission(savedHandle, true);
          if (isPermitted) {
            dirHandleRef.current = savedHandle;
            setHasLocalFolder(true);
            const loaded = await loadFromHandle(savedHandle);
            if (loaded) {
              setIsLoading(false);
              return;
            }
          } else {
            console.log('Stored folder handle requires re-permission');
            setHasLocalFolder(true); // We have a handle, but need permission
            setNeedsPermission(true);
            dirHandleRef.current = savedHandle;
          }
        }

        // 2. Fallback: Load from Server
        const data = await loadPersistentData(store);
        setClassInfoState(data.classInfo || []);
        setActualClassInfoState(data.actualClassInfo || []);
        setUnitInfoState(data.unitInfo || []);
        setMdStatusState(data.mdStatus || []);
        setSubFeesState(data.subFees || []);
        setProjectStatusState(data.projectStatus || []);
        setProjectLinkState(data.projectLink || []);
        setBasePlanState(data.basePlan || []);
        setUnitsState(data.units || []);
        setMapUnitsState(data.mapUnits || []);
        setMapVersionsState(data.mapVersions || []);
        setActiveMapVersionIdState(data.activeMapVersionId || null);
        
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
        setSalesState(salesData);
        setProfitsState(profitsData);
        
        if (data.r2Config) {
          if (data.r2Config.accountId) localStorage.setItem('r2_account_id', data.r2Config.accountId);
          if (data.r2Config.accessKey) localStorage.setItem('r2_access_key', data.r2Config.accessKey);
          if (data.r2Config.secretKey) localStorage.setItem('r2_secret_key', data.r2Config.secretKey);
          if (data.r2Config.bucketName) localStorage.setItem('r2_bucket_name', data.r2Config.bucketName);
          if (data.r2Config.cfZoneId) localStorage.setItem('cf_zone_id', data.r2Config.cfZoneId);
          if (data.r2Config.cfApiToken) localStorage.setItem('cf_api_token', data.r2Config.cfApiToken);
        }

        if (data.lastUpdated) setLastBackup(data.lastUpdated);
      } catch (error) {
        console.error('Initial load failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const requestFolderPermission = async () => {
    if (!dirHandleRef.current) return;
    try {
      const opts = { mode: 'readwrite' };
      if ((await dirHandleRef.current.requestPermission(opts)) === 'granted') {
        const loaded = await loadFromHandle(dirHandleRef.current);
        setNeedsPermission(false);
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
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      dirHandleRef.current = handle;
      await set('dirHandle', handle); // Save handle to IndexedDB
      setHasLocalFolder(true);
      
      alert('Đã kết nối thư mục thành công!');
    } catch(err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        alert("Không thể chọn thư mục. Hãy chắc chắn bạn mở app trên tab mới và trình duyệt hỗ trợ File System Access API.");
      }
    }
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToHandlers = async (
    c: ClassInfo[], ac: ActualClassInfo[], s: SalesInfo[], u: UnitInfo[], p: ProfitInfo[], md: MDStatusInfo[], 
    sf: SubFeeInfo[], ps: ProjectStatusInfo[], pl: ProjectLinkInfo[], bp: BasePlanInfo[], un: UnitDataInfo[],
    mu: UnitShape[], mv: MapVersion[], amvId: string | null,
    customHandle?: any,
    isManualClick: boolean = false
  ) => {
    setIsSaving(true);
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
          mdStatus: md,
          subFees: sf,
          projectStatus: ps,
          projectLink: pl,
          basePlan: bp,
          units: un,
          mapUnits: mu,
          mapVersions: mv,
          activeMapVersionId: amvId,
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
        if (res.success && !lastBackup) setLastBackup(res.timestamp);
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

        if (hasPerm) {
          const fileHandle = await activeHandle.getFileHandle(`SheetSyncData_${store}.json`, { create: true });
          const writable = await fileHandle.createWritable();
          const timestamp = new Date().toISOString();
          // Use 0 indentation for performance and smaller file size
          await writable.write(JSON.stringify({ 
            classInfo: c, 
            actualClassInfo: ac,
            sales: s, 
            unitInfo: u,
            profits: p,
            mdStatus: md,
            subFees: sf,
            projectStatus: ps,
            projectLink: pl,
            basePlan: bp,
            units: un,
            mapUnits: mu,
            mapVersions: mv,
            activeMapVersionId: amvId,
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
          }));
          await writable.close();
          setLastBackup(timestamp);
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
      errorToReport = `Lỗi khi lưu: ${error.message}`;
    } finally {
      setIsSaving(false);
      if (errorToReport && isManualClick) {
          alert(errorToReport);
      }
    }
  };

  // Debounced save effect
  useEffect(() => {
    // Skip the first render load
    if (isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId);
    }, 2000); // Wait 2 seconds of silence before saving

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId]);

  const setActualClassInfo = (data: ActualClassInfo[]) => {
    setActualClassInfoState(data);
  };

  const setClassInfo = (data: ClassInfo[]) => {
    setClassInfoState(data);
  };

  const setSales = (data: SalesInfo[]) => {
    setSalesState(data);
  };

  const setProfits = (data: ProfitInfo[]) => {
    setProfitsState(data);
  };

  const setUnitInfo = (data: UnitInfo[]) => {
    setUnitInfoState(data);
  };

  const setMdStatus = (data: MDStatusInfo[]) => {
    setMdStatusState(data);
  };

  const setSubFees = (data: SubFeeInfo[]) => {
    setSubFeesState(data);
  };

  const setProjectStatus = (data: ProjectStatusInfo[]) => {
    setProjectStatusState(data);
  };
  const setProjectLink = (data: ProjectLinkInfo[]) => {
    setProjectLinkState(data);
  };

  const setBasePlan = (data: BasePlanInfo[]) => {
    setBasePlanState(data);
  };

  const setUnits = (data: UnitDataInfo[]) => {
    setUnitsState(data);
  };

  const setSpreadsheetId = (id: string | null) => {
    setSpreadsheetIdState(id);
    localStorage.setItem('spreadsheetId', id || '');
  };

  useEffect(() => {
    const savedId = localStorage.getItem('spreadsheetId');
    if (savedId) setSpreadsheetIdState(savedId);
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
    setIsLoading(true);
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

      if (results['Brand Info']) setClassInfoState(mapClassInfo(parseSheetData(results['Brand Info'])));
      else if (results['Class Info'] && !results['Brand Info']) setClassInfoState(mapClassInfo(parseSheetData(results['Class Info'])));
      
      if (results['Class Info'] && results['Brand Info']) {
        const mappedActualClassInfo = parseSheetData(results['Class Info']).map((c: any) => ({
          ...c,
          classCode: c.classCode || c['class code'] || c['classcode'] || '',
          name: c.name || c['name'] || '',
          hcmSize: c.hcmSize || c['hcm size'] || c['hcmsize'] || '',
          hcmSalesEffi: c.hcmSalesEffi || c['hcm sales effi'] || c['hcmsaleseffi'] || '',
          hcmProfitEffi: c.hcmProfitEffi || c['hcm profit effi'] || c['hcmprofiteffi'] || '',
        }));
        setActualClassInfoState(mappedActualClassInfo);
      } else if (results['Actual Class Info']) {
        const mappedActualClassInfo = parseSheetData(results['Actual Class Info']).map((c: any) => ({
          ...c,
          classCode: c.classCode || c['class code'] || c['classcode'] || '',
          name: c.name || c['name'] || '',
          hcmSize: c.hcmSize || c['hcm size'] || c['hcmsize'] || '',
          hcmSalesEffi: c.hcmSalesEffi || c['hcm sales effi'] || c['hcmsaleseffi'] || '',
          hcmProfitEffi: c.hcmProfitEffi || c['hcm profit effi'] || c['hcmprofiteffi'] || '',
        }));
        setActualClassInfoState(mappedActualClassInfo);
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
        setUnitInfoState(parsedUnitInfo);
      }
      if (results['Sales']) {
        const salesData = parseSheetData(results['Sales']);
        // Auto-scale if needed or just use as is
        setSalesState(salesData.map((s: any) => ({
          ...s,
          sales: Number(s.sales) || 0,
          salesByCp: Number(s.salesByCp) || 0
        })));
      }
      if (results['Profits']) {
        const profitsData = parseSheetData(results['Profits']);
        setProfitsState(profitsData.map((p: any) => ({
          ...p,
          profit: Number(p.profit) || 0,
          profitByCp: Number(p.profitByCp) || 0
        })));
      }
      if (results['MD Status']) setMdStatusState(parseSheetData(results['MD Status']));
      if (results['Sub Fees']) setSubFeesState(parseSheetData(results['Sub Fees']));
      if (results['Project Status']) setProjectStatusState(parseSheetData(results['Project Status']));
      if (results['Project Link']) setProjectLinkState(parseSheetData(results['Project Link']));
      if (results['Base Plan']) {
        const basePlanData = parseSheetData(results['Base Plan']);
        setBasePlanState(basePlanData.map((b: any) => ({
          ...b,
          marginLow: Number(b.marginLow) || 0,
          marginHigh: Number(b.marginHigh) || 0,
          vshcm: parseFloat(String(b.vshcm || b['vshcm (%)'] || b['vs hcm'] || b['vshcm'] || '').replace(/,/g, '').replace(/%/g, '')) || 0
        })));
      }
      if (results['Units']) {
        const unitsData = parseSheetData(results['Units']);
        setUnitsState(unitsData.map((u: any) => ({
          ...u,
          size: Number(String(u.size).replace(/,/g, '')) || 0
        })));
      }
      
      setSpreadsheetId(sid);
      alert('Đồng bộ dữ liệu từ Google Sheets thành công!');
    } catch (error: any) {
      console.error('Google Sheets sync failed:', error);
      alert('Đồng bộ thất bại: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerManualBackup = async () => {
    await saveToHandlers(classInfo, actualClassInfo, sales, unitInfo, profits, mdStatus, subFees, projectStatus, projectLink, basePlan, units, mapUnits, mapVersions, activeMapVersionId, undefined, true);
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
    
    setIsLoading(true);
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
        setIsLoading(false);
    }
  };

  return (
    <DataContext.Provider value={{
      actualClassInfo,
      setActualClassInfo, 
      classInfo, 
      sales, 
      unitInfo,
      profits,
      mdStatus,
      subFees,
      projectStatus,
      projectLink,
      basePlan,
      units,
      notifications,
      mapUnits,
      mapVersions,
      activeMapVersionId,
      setClassInfo, 
      setSales, 
      setUnitInfo,
      setProfits,
      setMdStatus,
      setSubFees,
      setProjectStatus,
      setProjectLink,
      setBasePlan,
      setUnits,
      setNotifications,
      addNotification,
      markAllNotificationsRead,
      setMapUnits: setMapUnitsState,
      setMapVersions: setMapVersionsState,
      setActiveMapVersionId: setActiveMapVersionIdState,
      syncWithGoogleSheets,
      spreadsheetId,
      setSpreadsheetId,
      isLoading,
      isSaving,
      lastBackup,
      triggerManualBackup,
      triggerManualLoad,
      selectLocalFolder,
      hasLocalFolder,
      needsPermission,
      setNeedsPermission,
      requestFolderPermission,
      store
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
