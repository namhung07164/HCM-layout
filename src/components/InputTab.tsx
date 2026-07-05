import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import ClassInfoTab from "./ClassInfoTab";
import SalesTab from "./SalesTab";
import ProfitTab from "./ProfitTab";
import DailySalesProfitTab from "./DailySalesProfitTab";
import AllSubFeeTab from "./AllSubFeeTab";
import BasePlanTab from "./BasePlanTab";
import UnitsTab from "./UnitsTab";
import {
  Info,
  TrendingUp,
  DollarSign,
  FileStack,
  CalendarClock,
  Box,
  RefreshCw,
} from "lucide-react";
import { InputSubTabType } from "../types";

import ActualClassInfoTab from "./ActualClassInfoTab";

export default React.memo(function InputTab() {
  const [activeSubTab, setActiveSubTab] =
    useState<InputSubTabType>("base-plan");

  const subTabs = [
    { id: "base-plan", label: "Base Plan", icon: CalendarClock },
    { id: "units", label: "Unit", icon: Box },
    { id: "class-info", label: "Brand Info", icon: Info },
    { id: "actual-class-info", label: "Class Info", icon: Info },
    { id: "sales", label: "Sales", icon: TrendingUp },
    { id: "profit", label: "Profit", icon: DollarSign },
    { id: "daily-sales-profit", label: "Daily S&P", icon: TrendingUp },
    { id: "sub-fee", label: "All Sub-Fee", icon: FileStack },
  ];

  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

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
                onClick={() => setActiveSubTab(tab.id as InputSubTabType)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="subtab-pill"
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

      <div className="flex-1 rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/40 relative z-10 transition-all duration-300">
        {activeSubTab === "base-plan" && <BasePlanTab />}
        {activeSubTab === "units" && <UnitsTab />}
        {activeSubTab === "class-info" && <ClassInfoTab />}
        {activeSubTab === "actual-class-info" && <ActualClassInfoTab />}
        {activeSubTab === "sales" && <SalesTab />}
        {activeSubTab === "profit" && <ProfitTab />}
        {activeSubTab === "daily-sales-profit" && <DailySalesProfitTab />}
        {activeSubTab === "sub-fee" && <AllSubFeeTab />}
      </div>
    </div>
  );
});
