import { useShallow } from 'zustand/react/shallow';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileInput,
  ChevronRight,
  Table2,
  TrendingUp,
  Info as InfoIcon,
  HardDrive,
  ShieldCheck,
  Loader2,
  FolderOpen,
  Split,
  Menu,
  X,
  Image as ImageIcon,
  Bell,
  Save,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import InputTab from "./components/InputTab";
import DashboardTab from "./components/DashboardTab";
import DataMappingTab from "./components/DataMappingTab";
import MappingTab from "./components/MappingTab";
import CsvExportTab from "./components/CsvExportTab";
import ReviewOnlyView from "./components/DataMapping/ReviewOnlyView";
import { useDataStore } from './DataContext';
import DriveAutoExporter from "./components/DriveAutoExporter";

type TabId = "input" | "dashboard" | "dataMapping" | "mapping" | "picture" | "csv";

import GoogleSyncWidget from "./components/GoogleSyncWidget";
import {DataProvider} from "./DataContext";
import type { StoreRegion } from "./types";

function MainApp({ store, onSwitchStore }: { store: StoreRegion, onSwitchStore: () => void }) {
  
  
  
  

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("reviewOnly")) {
      setReviewOnlyMode(true);
    }
  }, []);

  const navigation = [
    { id: "input", label: "Library", icon: FileInput, shortcut: "⌥+I" },
    { id: "mapping", label: "Mapping", icon: Split, shortcut: "⌥+M" },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "⌥+D" },
    { id: "picture", label: "Picture", icon: ImageIcon, shortcut: "⌥+P" },
    { id: "csv", label: "CSV", icon: Table2, shortcut: "⌥+C" },
  ];

  const { 
    isLoading,
    isSaving,
    lastBackup,
    selectLocalFolder,
    hasLocalFolder,
    needsPermission,
    requestFolderPermission,
    notifications,
    markAllNotificationsRead,
    triggerManualBackup,
    autoUpdateBrandName,
    setAutoUpdateBrandName,
    triggerManualLoad,
    restoreBackup,
    activeTab,
    setActiveTab,
    isMenuOpen,
    setIsMenuOpen,
    isNotifOpen,
    setIsNotifOpen,
    reviewOnlyMode,
    setReviewOnlyMode,
   } = useDataStore(useShallow(state => ({
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    lastBackup: state.lastBackup,
    selectLocalFolder: state.selectLocalFolder,
    hasLocalFolder: state.hasLocalFolder,
    needsPermission: state.needsPermission,
    requestFolderPermission: state.requestFolderPermission,
    notifications: state.notifications,
    markAllNotificationsRead: state.markAllNotificationsRead,
    triggerManualBackup: state.triggerManualBackup,
    autoUpdateBrandName: state.autoUpdateBrandName,
    setAutoUpdateBrandName: state.setAutoUpdateBrandName,
    triggerManualLoad: state.triggerManualLoad,
    restoreBackup: state.restoreBackup,
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    isMenuOpen: state.isMenuOpen,
    setIsMenuOpen: state.setIsMenuOpen,
    isNotifOpen: state.isNotifOpen,
    setIsNotifOpen: state.setIsNotifOpen,
    reviewOnlyMode: state.reviewOnlyMode,
    setReviewOnlyMode: state.setReviewOnlyMode,
    store: state.store,
    setStore: state.setStore,
  })));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save shortcut (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerManualBackup();
      }
      
      // Import/Library shortcut (Ctrl+Alt+I or Cmd+Opt+I)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setActiveTab('input');
      }

      // Mapping shortcut (Ctrl+Alt+M)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setActiveTab('mapping');
      }

      // Dashboard shortcut (Ctrl+Alt+D)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveTab('dashboard');
      }

      // Picture shortcut (Ctrl+Alt+P)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActiveTab('picture');
      }

      // CSV shortcut (Ctrl+Alt+C)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setActiveTab('csv');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerManualBackup]);

  if (reviewOnlyMode) {
    return <ReviewOnlyView />;
  }

  return (
    <div className={`flex h-screen bg-bg-dark text-[#E2E8F0] font-sans overflow-hidden selection:bg-brand-500/30 ${store === 'HN' ? 'store-hn' : ''}`}>
      {/* Permission Overlay */}
      <AnimatePresence>
        {needsPermission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => requestFolderPermission()}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 border-4 border-brand-500/20 rounded-full animate-pulse" />
              <HardDrive
                className="absolute inset-0 m-auto animate-bounce text-brand-500"
                size={40}
              />
            </div>
            <div className="text-center max-w-md px-6">
              <h3 className="text-2xl font-light serif italic tracking-widest text-white mb-3">
                Auto-Link Drive D
              </h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Ứng dụng cần quyền để tự động kết nối và đồng bộ với thư mục cục bộ của bạn trên ổ đĩa D.
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); requestFolderPermission(); }}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-lg shadow-brand-500/20 transition-all font-medium flex items-center gap-2 mx-auto"
              >
                <FolderOpen size={18} />
                Click để kết nối ngay
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-brand-500/20 rounded-full animate-pulse" />
              <Loader2
                className="absolute inset-0 m-auto animate-spin text-brand-500"
                size={40}
              />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-light serif italic tracking-widest text-white">
                Initializing Drive D Protocol
              </h3>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-2">
                Retrieving persistent storage clusters...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hamburger Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-bg-dark border-r border-slate-800/50 z-50 flex flex-col shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50 glass">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-600 rounded flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-brand-900/40">
                    DM
                  </div>
                  <h1 className="font-light serif italic tracking-wide text-lg text-white">
                    Data Manager
                  </h1>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 py-8 space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold px-4 mb-4">
                  Navigation
                </p>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as TabId);
                        setIsMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-300 group text-sm font-medium border border-transparent",
                        isActive
                          ? "bg-brand-600/10 text-brand-400 border-brand-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          size={18}
                          className={cn(
                            "transition-colors",
                            isActive
                              ? "text-brand-400"
                              : "text-slate-500 group-hover:text-slate-400",
                          )}
                        />
                        {item.label}
                      </div>
                      {item.shortcut && (
                        <span className="text-[10px] tracking-wide text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="px-4 mt-6">
                  <button
                    onClick={() => {
                        setIsMenuOpen(false);
                        onSwitchStore();
                    }}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                        "border-brand-500/30 bg-brand-900/10 hover:bg-brand-900/20"
                    )}
                  >
                        <div className="flex flex-col">
                            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Cơ Sở Hoạt Động</span>
                            <span className={cn(
                                "text-sm font-bold leading-tight mt-0.5",
                                "text-brand-400"
                            )}>
                                {store === 'HCM' ? 'Hồ Chí Minh' : 'Hà Nội'}
                            </span>
                        </div>
                        <Split size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                </div>

                <div className="pt-6 space-y-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold px-4 mb-2">
                    Systems
                  </p>
                  <div className="px-2">
                    <div className="glass rounded-2xl p-4 border border-slate-800/50 bg-slate-900/20">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                          Drive D Backup
                        </p>
                        {isSaving && (
                          <Loader2
                            size={10}
                            className="animate-spin text-brand-400"
                          />
                        )}
                      </div>

                      <button
                        onClick={() => {
                          hasLocalFolder
                            ? requestFolderPermission()
                            : selectLocalFolder();
                          setIsMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 mb-3 p-2 bg-slate-800/50 hover:bg-slate-800 transition-colors rounded-lg border border-slate-700/50 text-left",
                          hasLocalFolder && "border-brand-500/30 bg-brand-950/10",
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded shrink-0 flex items-center justify-center border transition-colors",
                            hasLocalFolder
                              ? "bg-brand-950 text-brand-400 border-brand-900/40"
                              : "bg-slate-900/50 text-slate-600 border-slate-800",
                          )}
                        >
                          {hasLocalFolder ? (
                            <HardDrive size={16} />
                          ) : (
                            <FolderOpen size={16} />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-tight truncate">
                            {hasLocalFolder
                              ? "Link: Folder D:"
                              : "Link Folder D:"}
                          </span>
                          <span className="block text-[9px] text-slate-500 italic lowercase truncate">
                            {hasLocalFolder ? "Active sync" : "Connect folder"}
                          </span>
                        </div>
                      </button>

                      {hasLocalFolder && (
                        <div className="flex flex-col gap-1 w-full mt-2">
                          <button
                            onClick={() => triggerManualBackup()}
                            disabled={isSaving}
                            className="w-full flex items-center justify-between px-3 py-2 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            <div className="flex items-center gap-2">
                              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              <span className="text-[10px] uppercase tracking-widest font-bold">Lưu Dữ Liệu Cục Bộ (Ổ D)</span>
                            </div>
                            <span className="text-[10px] uppercase font-mono text-brand-400/50 group-hover:text-brand-400/80 transition-colors">
                              ⌘S
                            </span>
                          </button>
                          <button
                            onClick={() => triggerManualLoad()}
                            disabled={isLoading}
                            className="w-full flex items-center justify-between px-3 py-2 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            <div className="flex items-center gap-2">
                              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                              <span className="text-[10px] uppercase tracking-widest font-bold">Đọc Dữ Liệu (Từ Ổ D)</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => restoreBackup()}
                            disabled={isLoading}
                            className="w-full flex items-center justify-between px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
                          >
                            <div className="flex items-center gap-2">
                              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                              <span className="text-[10px] uppercase tracking-widest font-bold">Khôi phục (Từ Backup v1)</span>
                            </div>
                          </button>
                          <button
                            onClick={selectLocalFolder}
                            className="w-full text-center py-1.5 text-[8px] uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                          >
                            Thay đổi thư mục
                          </button>
                        </div>
                      )}

                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: isSaving ? "100%" : "65%" }}
                          className="bg-brand-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                        />
                      </div>
                      <p className="text-[9px] mt-2 text-slate-500 flex items-center justify-between">
                        <span>
                          Last:{" "}
                          {lastBackup
                            ? new Date(lastBackup).toLocaleTimeString()
                            : "Never"}
                        </span>
                        <ShieldCheck size={10} className="text-green-500" />
                      </p>
                    </div>

                    <GoogleSyncWidget />
                  </div>
                </div>
              </nav>

              <div className="p-6 border-t border-slate-800/50 text-center">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                  Protocol v4.2.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-12 flex items-center justify-between px-6 border-b border-slate-800/50 glass z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
            >
              <Menu size={18} />
            </button>
            <div className="w-px h-4 bg-slate-800/50 mx-1 hidden sm:block" />
            <h2 className="text-base font-light italic serif tracking-wide text-white capitalize hidden sm:block">
              {activeTab === "picture"
                ? "Picture"
                : activeTab === "input"
                  ? "Library"
                  : activeTab}{" "}
              Entry
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onSwitchStore}
              className={cn(
                "hidden sm:flex flex-col items-start px-3 py-1 bg-slate-900 border rounded-lg transition-colors group",
                "border-brand-500/30 hover:bg-brand-900/20"
              )}
            >
              <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Cơ Sở Hoạt Động</span>
              <span className={cn(
                "text-xs font-bold leading-tight transition-colors",
                "text-brand-400 group-hover:text-brand-300"
              )}>
                {store === 'HCM' ? 'Hồ Chí Minh' : 'Hà Nội'}
              </span>
            </button>

            
            <div 
              className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={() => setAutoUpdateBrandName(!autoUpdateBrandName)}
              title="Auto-update Brand Name from Project Status"
            >
              <div className={cn(
                "w-8 h-4 rounded-full relative transition-colors",
                autoUpdateBrandName ? "bg-brand-500" : "bg-slate-700"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                  autoUpdateBrandName ? "left-4.5 right-0.5 translate-x-[16px]" : "left-0.5"
                )} />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 select-none">
                Auto Sync Brand
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
                Live Sync Active
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50 backdrop-blur-sm">
              <span className="text-slate-500">Backup:</span>
              <span>
                {lastBackup
                  ? new Date(lastBackup).toLocaleTimeString()
                  : "Never"}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (isNotifOpen) markAllNotificationsRead();
                }}
                className="relative p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800/50 rounded-lg border border-transparent hover:border-slate-700/50"
              >
                <Bell size={18} />
                {notifications && notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-bg-dark" />
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => {
                        setIsNotifOpen(false);
                        markAllNotificationsRead();
                      }}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-[9999] overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                          Notifications
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {notifications.filter(n => !n.read).length} new
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-xs">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id} 
                              className={cn(
                                "flex items-start gap-3 p-3 border-b border-slate-800/50 last:border-0",
                                notif.read ? "opacity-70" : "bg-brand-900/10"
                              )}
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                notif.read ? "bg-slate-700" : "bg-brand-500"
                              )} />
                              <div className="flex-1">
                                <p className={cn(
                                  "text-xs leading-relaxed",
                                  notif.read ? "text-slate-400" : "text-slate-200"
                                )}>
                                  {notif.message}
                                </p>
                                <p className="text-[9px] text-slate-500 mt-1">
                                  {new Date(notif.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-bg-dark">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full p-6"
            >
              {activeTab === "input" ? (
                <InputTab />
              ) : activeTab === "dashboard" ? (
                <DashboardTab />
              ) : activeTab === "mapping" ? (
                <MappingTab />
              ) : activeTab === "picture" ? (
                <DataMappingTab />
              ) : activeTab === "csv" ? (
                <CsvExportTab />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <DriveAutoExporter />
    </div>
  );
}


export default function App() {
  const { store, setStore } = useDataStore(useShallow(state => ({
    store: state.store,
    setStore: state.setStore,
  })));

  useEffect(() => {
    const savedStore = localStorage.getItem('active_store') as StoreRegion | null;
    if (savedStore && store === null) {
      setStore(savedStore);
    }
  }, []);

  

  const handleSelectStore = (s: StoreRegion) => {
    localStorage.setItem('active_store', s);
    setStore(s);
  };

  if (!store) {
    return (
      <div className="flex h-screen bg-bg-dark text-[#E2E8F0] font-sans items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl glass">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light serif italic tracking-wide text-white mb-3">
              Data Manager
            </h1>
            <p className="text-slate-400 text-sm">
              Vui lòng chọn cơ sở mà bạn muốn làm việc. Dữ liệu của 2 cơ sở sẽ được phân tách hoàn toàn riêng biệt.
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => handleSelectStore('HCM')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-brand-500/30 bg-brand-900/20 hover:bg-brand-600/20 transition-all group"
            >
              <div className="flex flex-col text-left">
                <span className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">Hồ Chí Minh</span>
                <span className="text-xs text-slate-500">Giữ nguyên dữ liệu hiện tại</span>
              </div>
              <ChevronRight className="text-brand-500 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => handleSelectStore('HN')}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-600/20 transition-all group"
            >
              <div className="flex flex-col text-left">
                <span className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Hà Nội</span>
                <span className="text-xs text-slate-500">Khởi tạo dữ liệu mới hoàn toàn</span>
              </div>
              <ChevronRight className="text-emerald-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataProvider store={store} key={store}>
      <MainApp store={store} onSwitchStore={() => setStore(null)} />
    </DataProvider>
  );
}
