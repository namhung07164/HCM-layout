import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import SummaryTab from "./SummaryTab";
import UnitInfoTab from "./UnitInfoTab";
import MDStatusTab from "./MDStatusTab";
import ProjectStatusTab from "./ProjectStatusTab";
import ProjectLinkTab from "./ProjectLinkTab";
import { Table2, Activity, Briefcase, FileSpreadsheet, Link } from "lucide-react";
import { MappingSubTabType } from "../types";

export default React.memo(function MappingTab() {
  const [activeSubTab, setActiveSubTab] =
    useState<MappingSubTabType>("summary");

  const subTabs = [
    { id: "summary", label: "Summary", icon: FileSpreadsheet },
    { id: "unit-info", label: "Unit Info", icon: Table2 },
    { id: "md-status", label: "MD Status", icon: Activity },
    { id: "project-status", label: "Project Status", icon: Briefcase },
    { id: "project-link", label: "Project Link", icon: Link },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="flex justify-center pt-1 z-50">
        <div className="flex bg-slate-900/90 backdrop-blur-xl p-1 rounded-xl border border-slate-800 shadow-2xl shadow-black/50 overflow-x-auto max-w-[95vw] scrollbar-hide">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as MappingSubTabType)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mapping-subtab-pill"
                    className="absolute inset-0 bg-brand-600/20 border border-brand-500/30 rounded-lg"
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon
                    size={12}
                    className={isActive ? "text-brand-400" : "text-slate-600"}
                  />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 glass rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/40 relative z-10">
        {activeSubTab === "summary" && <SummaryTab />}
        {activeSubTab === "unit-info" && <UnitInfoTab />}
        {activeSubTab === "md-status" && <MDStatusTab />}
        {activeSubTab === "project-status" && <ProjectStatusTab />}
        {activeSubTab === "project-link" && <ProjectLinkTab />}
      </div>
    </div>
  );
});
