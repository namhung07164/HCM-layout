import React, { useState, useEffect } from "react";
import { useDataStore } from '../DataContext';
import { 
  Globe, 
  Loader2, 
  CloudUpload, 
  CloudDownload, 
  LogOut, 
  LogIn, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { cn } from "../lib/utils";
import { googleSignIn, getAccessToken, logout } from "../lib/auth";
import { uploadFileToDrive } from "../lib/drive";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

export default function GoogleSyncWidget() {
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Auto-login handle
  const authenticateGoogle = async () => {
    let token = await getAccessToken();
    if (!token) {
      const authResult = await googleSignIn();
      if (authResult?.accessToken) {
        token = authResult.accessToken;
      } else {
        throw new Error("Không thể lấy token xác thực từ Google.");
      }
    }
    return token;
  };

  const handleSignIn = async () => {
    setIsDriveLoading(true);
    try {
      const authResult = await googleSignIn();
      if (authResult?.user) {
        alert(`Đã kết nối Google Drive: ${authResult.user.email || authResult.user.displayName || 'Thành công'}`);
      }
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error(e);
        alert("Lỗi khi kết nối Google: " + (e.message || e));
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setIsDriveLoading(true);
    try {
      await logout();
      const authResult = await googleSignIn();
      if (authResult?.user) {
        alert(`Đã đổi sang tài khoản Google: ${authResult.user.email || authResult.user.displayName || 'Thành công'}`);
      }
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error(e);
        alert("Lỗi khi đổi tài khoản: " + (e.message || e));
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn ngắt kết nối tài khoản Google Drive này?")) return;
    setIsDriveLoading(true);
    try {
      await logout();
      alert("Đã ngắt kết nối tài khoản Google.");
    } catch (e: any) {
      console.error(e);
      alert("Lỗi khi ngắt kết nối: " + (e.message || e));
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSaveToDrive = async () => {
    setIsDriveLoading(true);
    try {
      const dataContext = useDataStore.getState();
      const token = await authenticateGoogle();
      
      const dataToSave = {
        classInfo: dataContext.classInfo, 
        actualClassInfo: dataContext.actualClassInfo,
        sales: dataContext.sales,
        unitInfo: dataContext.unitInfo,
        profits: dataContext.profits,
        mdStatus: dataContext.mdStatus,
        subFees: dataContext.subFees,
        projectStatus: dataContext.projectStatus,
        projectLink: dataContext.projectLink,
        basePlan: dataContext.basePlan,
        units: dataContext.units,
        mapUnits: dataContext.mapUnits,
        mapVersions: dataContext.mapVersions,
        activeMapVersionId: dataContext.activeMapVersionId,
        reviewSelectedLabels: dataContext.reviewSelectedLabels,
        migrated_scaled_1000: true,
        r2Config: {
          accountId: localStorage.getItem('r2_account_id') || '',
          accessKey: localStorage.getItem('r2_access_key') || '',
          secretKey: localStorage.getItem('r2_secret_key') || '',
          bucketName: localStorage.getItem('r2_bucket_name') || '',
          cfZoneId: localStorage.getItem('cf_zone_id') || '',
          cfApiToken: localStorage.getItem('cf_api_token') || ''
        }
      };

      const jsonString = JSON.stringify(dataToSave);
      const blob = new Blob([jsonString], { type: "application/json" });

      await uploadFileToDrive({
        accessToken: token,
        fileBlob: blob,
        fileName: `SheetSyncData_${dataContext.store}.json`,
        mimeType: "application/json"
      });

      const sharedBlob = new Blob([JSON.stringify({
        classInfo: dataContext.classInfo,
        actualClassInfo: dataContext.actualClassInfo
      })], { type: "application/json" });

      await uploadFileToDrive({
        accessToken: token,
        fileBlob: sharedBlob,
        fileName: `SheetSyncData_Shared.json`,
        mimeType: "application/json"
      });

      alert("Đã lưu toàn bộ dữ liệu lên Google Drive thành công!");
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi lưu lên Google Drive: " + err.message);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleLoadFromDrive = async () => {
    if (!window.confirm("Bạn có tin chắc muốn tải đè dữ liệu từ Google Drive lên? Các thay đổi chưa lưu trên máy này sẽ bị mất.")) {
      return;
    }
    
    setIsDriveLoading(true);
    try {
      const dataContext = useDataStore.getState();
      const token = await authenticateGoogle();

      const query = encodeURIComponent(`name='SheetSyncData_${dataContext.store}.json' and trashed=false`);
      const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!listRes.ok) throw new Error('Failed to list files from Google Drive');
      const listData = await listRes.json();
      let existingFile = listData.files && listData.files.length > 0 ? listData.files[0] : null;

      if (!existingFile && dataContext.store === 'HCM') {
        const legacyQuery = encodeURIComponent(`name='SheetSyncData.json' and trashed=false`);
        const legacyListRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${legacyQuery}&fields=files(id,name)`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (legacyListRes.ok) {
          const legacyListData = await legacyListRes.json();
          if (legacyListData.files && legacyListData.files.length > 0) {
            existingFile = legacyListData.files[0];
            console.log("Found legacy SheetSyncData.json on Drive");
          }
        }
      }

      if (!existingFile) {
        throw new Error(`Không tìm thấy file SheetSyncData_${dataContext.store}.json trên Google Drive.`);
      }

      const fetchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!fetchRes.ok) throw new Error("Failed to download file from Google Drive");
      
      const data = await fetchRes.json();
      
      try {
        const sharedQuery = encodeURIComponent(`name='SheetSyncData_Shared.json' and trashed=false`);
        const sharedListRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${sharedQuery}&fields=files(id,name)`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sharedListRes.ok) {
          const sharedListData = await sharedListRes.json();
          if (sharedListData.files && sharedListData.files.length > 0) {
            const sharedFileId = sharedListData.files[0].id;
            const sharedFetchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${sharedFileId}?alt=media`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (sharedFetchRes.ok) {
              const sharedData = await sharedFetchRes.json();
              if (sharedData.classInfo) data.classInfo = sharedData.classInfo;
              if (sharedData.actualClassInfo) data.actualClassInfo = sharedData.actualClassInfo;
            }
          }
        }
      } catch (e) {
        console.warn("Could not load shared data", e);
      }
      
      if (data.classInfo) dataContext.setClassInfo(data.classInfo);
      if (data.actualClassInfo) dataContext.setActualClassInfo(data.actualClassInfo);
      if (data.sales) dataContext.setSales(data.sales);
      if (data.unitInfo) dataContext.setUnitInfo(data.unitInfo);
      if (data.profits) dataContext.setProfits(data.profits);
      if (data.mdStatus) dataContext.setMdStatus(data.mdStatus);
      if (data.subFees) dataContext.setSubFees(data.subFees);
      if (data.projectStatus) dataContext.setProjectStatus(data.projectStatus);
      if (data.projectLink) dataContext.setProjectLink(data.projectLink);
      if (data.basePlan) dataContext.setBasePlan(data.basePlan);
      if (data.units) dataContext.setUnits(data.units);
      if (data.mapUnits) dataContext.setMapUnits(data.mapUnits);
      if (data.mapVersions) dataContext.setMapVersions(data.mapVersions);
      if (data.activeMapVersionId) dataContext.setActiveMapVersionId(data.activeMapVersionId);
      if (data.reviewSelectedLabels) dataContext.setReviewSelectedLabels(data.reviewSelectedLabels);
      
      if (data.r2Config) {
        if (data.r2Config.accountId) localStorage.setItem('r2_account_id', data.r2Config.accountId);
        if (data.r2Config.accessKey) localStorage.setItem('r2_access_key', data.r2Config.accessKey);
        if (data.r2Config.secretKey) localStorage.setItem('r2_secret_key', data.r2Config.secretKey);
        if (data.r2Config.bucketName) localStorage.setItem('r2_bucket_name', data.r2Config.bucketName);
        if (data.r2Config.cfZoneId) localStorage.setItem('cf_zone_id', data.r2Config.cfZoneId);
        if (data.r2Config.cfApiToken) localStorage.setItem('cf_api_token', data.r2Config.cfApiToken);
      }

      alert("Tải dữ liệu từ Google Drive thành công!");
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi tải từ Google Drive: " + err.message);
    } finally {
      setIsDriveLoading(false);
    }
  };

  return (
    <div id="google-sync-widget" className="glass rounded-2xl p-4 border border-slate-800/50 bg-slate-900/20 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2">
          <Globe size={12} className="text-brand-400" />
          Google Drive Sync
        </p>
        {isDriveLoading && (
          <Loader2 size={12} className="animate-spin text-brand-400" />
        )}
      </div>

      {/* Account Info Status Bar */}
      <div className="mb-3 px-2.5 py-2 rounded-xl bg-slate-950/50 border border-slate-800/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {user ? (
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={12} className="text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Tài khoản Google</p>
              <p className="text-[11px] font-medium text-slate-200 truncate" title={user?.email || "Chưa kết nối"}>
                {user?.email || "Chưa kết nối"}
              </p>
            </div>
          </div>
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0",
            user ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          )}>
            {user ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Primary Actions: Save & Load */}
      <div className="space-y-2 mb-3">
        <button
          id="btn-google-drive-save"
          onClick={handleSaveToDrive}
          disabled={isDriveLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-brand-500/30 text-[10px] font-medium transition-all shadow-sm",
            isDriveLoading
              ? "bg-brand-900/50 text-brand-400 cursor-not-allowed"
              : "bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 hover:border-brand-500/50 hover:text-brand-300 active:scale-[0.98]",
          )}
        >
          <CloudUpload size={13} className={isDriveLoading ? "animate-pulse" : ""} />
          Lưu Lên Google Drive
        </button>

        <button
          id="btn-google-drive-load"
          onClick={handleLoadFromDrive}
          disabled={isDriveLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-green-500/30 text-[10px] font-medium transition-all shadow-sm",
            isDriveLoading
              ? "bg-green-900/50 text-green-400 cursor-not-allowed"
              : "bg-green-600/20 text-green-400 hover:bg-green-600/30 hover:border-green-500/50 hover:text-green-300 active:scale-[0.98]",
          )}
        >
          <CloudDownload size={13} className={isDriveLoading ? "animate-pulse" : ""} />
          Tải Về Từ Google Drive
        </button>
      </div>

      {/* Account Management: Switch account / Login / Sign out */}
      <div className="pt-2 border-t border-slate-800/60">
        {user ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-google-drive-switch-account"
              onClick={handleSwitchAccount}
              disabled={isDriveLoading}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-700/60 text-[10px] font-medium transition-all",
                "bg-slate-800/60 text-slate-200 hover:bg-slate-700 hover:border-slate-500 hover:text-white active:scale-[0.98]",
                isDriveLoading && "opacity-50 cursor-not-allowed"
              )}
              title="Đổi sang một tài khoản Google Drive khác"
            >
              <RefreshCw size={11} className={isDriveLoading ? "animate-spin" : ""} />
              Đổi Tài Khoản
            </button>

            <button
              id="btn-google-drive-signout"
              onClick={handleSignOut}
              disabled={isDriveLoading}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-red-500/20 text-[10px] font-medium transition-all",
                "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 active:scale-[0.98]",
                isDriveLoading && "opacity-50 cursor-not-allowed"
              )}
              title="Ngắt kết nối Google Drive"
            >
              <LogOut size={11} />
              Đăng Xuất
            </button>
          </div>
        ) : (
          <button
            id="btn-google-drive-connect"
            onClick={handleSignIn}
            disabled={isDriveLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/40 text-[10px] font-medium transition-all shadow-sm",
              "bg-amber-600/15 text-amber-300 hover:bg-amber-600/25 hover:border-amber-500/60 hover:text-white active:scale-[0.98]",
              isDriveLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <LogIn size={12} className={isDriveLoading ? "animate-spin" : ""} />
            Đăng Nhập / Kết Nối Google Drive
          </button>
        )}
      </div>
    </div>
  );
}
