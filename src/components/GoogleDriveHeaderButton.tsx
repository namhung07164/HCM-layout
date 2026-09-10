import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { Globe, RefreshCw, LogIn } from "lucide-react";
import { cn } from "../lib/utils";
import { useDataStore } from "../DataContext";
import { googleSignIn, logout } from "../lib/auth";

export default function GoogleDriveHeaderButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setIsMenuOpen = useDataStore((state) => state.setIsMenuOpen);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleQuickAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      if (user) {
        // Đổi tài khoản: logout rồi popup chọn tài khoản mới
        await logout();
        const res = await googleSignIn();
        if (res?.user) {
          alert(`Đã đổi sang tài khoản Google: ${res.user.email || 'Thành công'}`);
        }
      } else {
        // Đăng nhập
        const res = await googleSignIn();
        if (res?.user) {
          alert(`Đã kết nối Google Drive: ${res.user.email || 'Thành công'}`);
        }
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error(err);
        alert("Lỗi xác thực: " + (err.message || err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="header-google-drive-widget" className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 hover:border-slate-700 transition-colors">
      <button
        id="btn-header-open-drive-sync"
        type="button"
        onClick={() => setIsMenuOpen(true)}
        title="Bấm để mở bảng Google Drive Sync chi tiết"
        className="flex items-center gap-2 text-left group"
      >
        <div className="relative flex items-center justify-center">
          <Globe size={13} className={cn("transition-colors", user ? "text-emerald-400" : "text-brand-400")} />
          <span 
            className={cn(
              "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
              user ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-amber-400"
            )} 
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold leading-none">Drive Account</span>
          <span 
            className="text-[10px] font-medium text-slate-300 group-hover:text-white transition-colors truncate max-w-[130px]" 
            title={user?.email || "Chưa kết nối"}
          >
            {user ? (user.email || "Đã kết nối") : "Chưa kết nối"}
          </span>
        </div>
      </button>

      <div className="w-px h-4 bg-slate-800 mx-0.5" />

      <button
        id="btn-header-switch-drive-account"
        type="button"
        onClick={handleQuickAction}
        disabled={isLoading}
        title={user ? "Bấm để đổi sang tài khoản Google Drive khác" : "Bấm để đăng nhập Google Drive"}
        className={cn(
          "px-2 py-0.5 text-[9px] font-medium rounded transition-all flex items-center gap-1 border active:scale-95",
          user
            ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700"
            : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border-amber-500/30 hover:text-amber-200"
        )}
      >
        {user ? (
          <>
            <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
            <span>Đổi</span>
          </>
        ) : (
          <>
            <LogIn size={10} className={isLoading ? "animate-spin" : ""} />
            <span>Đăng nhập</span>
          </>
        )}
      </button>
    </div>
  );
}
