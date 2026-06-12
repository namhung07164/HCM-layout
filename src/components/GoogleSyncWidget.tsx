import React, { useState, useEffect } from "react";
import { useData } from "../DataContext";
import { Globe, Loader2, CloudUpload, CloudDownload, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import { googleSignIn, getAccessToken, logout } from "../lib/auth";
import { uploadFileToDrive } from "../lib/drive";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

export default function GoogleSyncWidget() {
  const dataContext = useData();
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

  const handleSaveToDrive = async () => {
    setIsDriveLoading(true);
    try {
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
            basePlan: dataContext.basePlan,
            units: dataContext.units,
            mapUnits: dataContext.mapUnits,
            mapVersions: dataContext.mapVersions,
            activeMapVersionId: dataContext.activeMapVersionId,
            migrated_scaled_1000: true,
            r2Config: {
                accountId: localStorage.getItem('r2_account_id') || '',
                accessKey: localStorage.getItem('r2_access_key') || '',
                secretKey: localStorage.getItem('r2_secret_key') || '',
                bucketName: localStorage.getItem('r2_bucket_name') || ''
            }
        };

        const jsonString = JSON.stringify(dataToSave);
        const blob = new Blob([jsonString], { type: "application/json" });

        await uploadFileToDrive({
            accessToken: token,
            fileBlob: blob,
            fileName: "SheetSyncData.json",
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
        const token = await authenticateGoogle();

        const query = encodeURIComponent(`name='SheetSyncData.json' and trashed=false`);
        const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!listRes.ok) throw new Error('Failed to list files from Google Drive');
        const listData = await listRes.json();
        const existingFile = listData.files && listData.files.length > 0 ? listData.files[0] : null;

        if (!existingFile) {
            throw new Error("Không tìm thấy file SheetSyncData.json trên Google Drive.");
        }

        const fetchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!fetchRes.ok) throw new Error("Failed to download file from Google Drive");
        
        const data = await fetchRes.json();
        
        if (data.classInfo) dataContext.setClassInfo(data.classInfo);
        if (data.actualClassInfo) dataContext.setActualClassInfo(data.actualClassInfo);
        if (data.sales) dataContext.setSales(data.sales);
        if (data.unitInfo) dataContext.setUnitInfo(data.unitInfo);
        if (data.profits) dataContext.setProfits(data.profits);
        if (data.mdStatus) dataContext.setMdStatus(data.mdStatus);
        if (data.subFees) dataContext.setSubFees(data.subFees);
        if (data.projectStatus) dataContext.setProjectStatus(data.projectStatus);
        if (data.basePlan) dataContext.setBasePlan(data.basePlan);
        if (data.units) dataContext.setUnits(data.units);
        if (data.mapUnits) dataContext.setMapUnits(data.mapUnits);
        if (data.mapVersions) dataContext.setMapVersions(data.mapVersions);
        if (data.activeMapVersionId) dataContext.setActiveMapVersionId(data.activeMapVersionId);
        
        if (data.r2Config) {
            if (data.r2Config.accountId) localStorage.setItem('r2_account_id', data.r2Config.accountId);
            if (data.r2Config.accessKey) localStorage.setItem('r2_access_key', data.r2Config.accessKey);
            if (data.r2Config.secretKey) localStorage.setItem('r2_secret_key', data.r2Config.secretKey);
            if (data.r2Config.bucketName) localStorage.setItem('r2_bucket_name', data.r2Config.bucketName);
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
    <div className="glass rounded-2xl p-4 border border-slate-800/50 bg-slate-900/20 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
          <Globe size={12} className="text-blue-400" />
          Google Drive Sync
        </p>
        {isDriveLoading && (
          <Loader2 size={10} className="animate-spin text-blue-400" />
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSaveToDrive}
          disabled={isDriveLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-blue-500/30 text-[10px] font-medium transition-colors mb-2",
            isDriveLoading
              ? "bg-blue-900/50 text-blue-400 cursor-not-allowed"
              : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50",
          )}
        >
          <CloudUpload size={12} className={isDriveLoading ? "animate-pulse" : ""} />
          Lưu Lên Google Drive
        </button>

        <button
          onClick={handleLoadFromDrive}
          disabled={isDriveLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-green-500/30 text-[10px] font-medium transition-colors",
            isDriveLoading
              ? "bg-green-900/50 text-green-400 cursor-not-allowed"
              : "bg-green-600/20 text-green-400 hover:bg-green-600/30 hover:border-green-500/50",
          )}
        >
          <CloudDownload size={12} className={isDriveLoading ? "animate-pulse" : ""} />
          Tải Về Từ Google Drive
        </button>

        {user && (
            <button
              onClick={async () => {
                  try {
                      await logout();
                      alert("Đã đăng xuất tài khoản Google.");
                  } catch (e: any) {
                      console.error(e);
                      alert("Lỗi khi đăng xuất: " + e.message);
                  }
              }}
              disabled={isDriveLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-slate-500/30 text-[10px] font-medium transition-colors mt-2",
                "bg-slate-600/20 text-slate-400 hover:bg-slate-600/30 hover:border-slate-500/50 hover:text-white"
              )}
            >
              <LogOut size={12} />
              Đổi Tài Khoản Google ({user.email})
            </button>
        )}
      </div>
    </div>
  );
}
