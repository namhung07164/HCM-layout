import { useShallow } from 'zustand/react/shallow';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from 'recharts';
import { Search, Filter, Calendar, Building2, Tag, Layers, Map as MapIcon, X, Plus } from 'lucide-react';
import { useDataStore } from '../DataContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const AVAILABLE_FILTERS = [
  { key: 'brandName', label: 'Brand Name', icon: Tag },
  { key: 'unit', label: 'Unit', icon: Building2 },
  { key: 'floor', label: 'Floor', icon: Layers },
  { key: 'mdStatus', label: 'MD Status', icon: Tag },
  { key: 'projectStatus', label: 'Project Status', icon: MapIcon },
  { key: 'task', label: 'Task', icon: Search },
  { key: 'startDate', label: 'Start Date', icon: Calendar },
  { key: 'endDate', label: 'End Date', icon: Calendar }
] as const;

type FilterKey = typeof AVAILABLE_FILTERS[number]['key'];

export default React.memo(function DashboardTab() {
  useEffect(() => {
    useDataStore.getState().setIsTasksRequested(true);
    useDataStore.getState().setIsDelegationRequested(true);
  }, []);

  const {  sales, profits, classInfo, unitInfo, mdStatus, projectStatus  } = useDataStore(useShallow(state => ({
    sales: state.sales,
    profits: state.profits,
    classInfo: state.classInfo,
    unitInfo: state.unitInfo,
    mdStatus: state.mdStatus,
    projectStatus: state.projectStatus,
  })));
  
  // Filters state
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    unit: '',
    floor: '',
    brandName: '',
    mdStatus: '',
    projectStatus: '',
    task: '',
    startDate: '',
    endDate: ''
  });
  
  const [activeFilterKeys, setActiveFilterKeys] = useState<FilterKey[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (key: FilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addFilterField = (key: FilterKey) => {
    if (!activeFilterKeys.includes(key)) {
      setActiveFilterKeys(prev => [...prev, key]);
    }
    setShowAddMenu(false);
  };

  const removeFilterField = (key: FilterKey) => {
    setActiveFilterKeys(prev => prev.filter(k => k !== key));
    handleFilterChange(key, ''); // Clear value when removed
  };

  // MD Status Options for dropdowns
  const mdStatusOptions = Array.from(new Set((mdStatus || []).map(m => m?.status).filter(Boolean))).sort();
  const projectStatusOptions = Array.from(new Set((projectStatus || []).map(p => p?.status).filter(Boolean))).sort();

  // Create a memoized lookup map for Class Info
  const classInfoMap = useMemo(() => {
    const map = new Map<string, typeof classInfo[0]>();
    (classInfo || []).forEach(c => {
      if (c?.brandCode) map.set(c.brandCode, c);
    });
    return map;
  }, [classInfo]);

  // Create lookup for MD Status
  const mdStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    (mdStatus || []).forEach(m => {
      if (m?.brandCode) map.set(m.brandCode, m.status);
    });
    return map;
  }, [mdStatus]);

  // Create lookup for Unit info (brandCode -> unit)
  const brandToUnitMap = useMemo(() => {
    const map = new Map<string, string[]>();
    (unitInfo || []).forEach(u => {
      if (u?.brandCode) {
        const list = map.get(u.brandCode) || [];
        if (u.unit) list.push(u.unit);
        map.set(u.brandCode, list);
      }
    });
    return map;
  }, [unitInfo]);

  // Join and Filter Data
  const { filteredSalesData, filteredProfitsData } = useMemo(() => {
    const fSales = sales.filter(sale => {
      const cls = classInfoMap.get(sale.brandCode);
      const mds = mdStatusMap.get(sale.brandCode);
      const units = brandToUnitMap.get(sale.brandCode) || [];
      
      // Filter by Brand Name
      if (filters.brandName && !(sale.brandName || '').toLowerCase().includes(filters.brandName.toLowerCase())) return false;
      
      // Filter by Floor (from classInfo)
      if (filters.floor && !(cls?.floor || '').toLowerCase().includes(filters.floor.toLowerCase())) return false;

      // Filter by MD Status
      if (filters.mdStatus && !(mds || '').toLowerCase().includes(filters.mdStatus.toLowerCase())) return false;

      // Filter by Unit
      if (filters.unit && !units.some(u => (u || '').toLowerCase().includes(filters.unit.toLowerCase()))) return false;

      // Filter by Project fields (this is harder because one brand can have multiple units/projects)
      // For now, let's just check if any project for this brand's units matches
      const brandProjects = projectStatus.filter(p => units.includes(p.unit));
      if (filters.projectStatus && !brandProjects.some(p => (p.status || '').toLowerCase().includes(filters.projectStatus.toLowerCase()))) return false;
      if (filters.task && !brandProjects.some(p => (p.task || '').toLowerCase().includes(filters.task.toLowerCase()))) return false;
      if (filters.startDate && !brandProjects.some(p => (p.startDate || '').includes(filters.startDate))) return false;
      if (filters.endDate && !brandProjects.some(p => (p.endDate || '').includes(filters.endDate))) return false;

      return true;
    });

    const fProfits = profits.filter(profit => {
      // Apply same brand-based filters if possible
      const units = brandToUnitMap.get(profit.brandCode) || [];
      const mds = mdStatusMap.get(profit.brandCode);
      const cls = classInfoMap.get(profit.brandCode);

      if (filters.brandName && !fSales.some(s => s.brandCode === profit.brandCode)) return false;
      if (filters.mdStatus && !(mds || '').toLowerCase().includes(filters.mdStatus.toLowerCase())) return false;
      if (filters.floor && !(cls?.floor || '').toLowerCase().includes(filters.floor.toLowerCase())) return false;
      if (filters.unit && !units.some(u => (u || '').toLowerCase().includes(filters.unit.toLowerCase()))) return false;

      return true;
    });

    return { filteredSalesData: fSales, filteredProfitsData: fProfits };
  }, [sales, profits, classInfoMap, mdStatusMap, brandToUnitMap, projectStatus, filters]);

  // Aggregate by Month
  const monthlyData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const aggregation = months.map((month, index) => ({
      name: month,
      sales: 0,
      profit: 0,
      salesByCp: 0,
      avgMargin: 0,
      monthIndex: index,
      year: null as number | null
    }));

    // Since sales and profits no longer have dates, we'll only aggregate context-less data
    // Monthly data will remain zero until a time dimension is reintroduced.
    
    filteredProfitsData.forEach(p => {
      // p.date is gone, so we can't aggregate by month anymore.
    });

    // Calculate Average Margin for the month
    aggregation.forEach(agg => {
      if (agg.sales > 0) {
        agg.avgMargin = agg.profit / agg.sales;
      }
    });

    return aggregation;
  }, [filteredSalesData, filteredProfitsData]);

  const totalSales = useMemo(() => {
    return filteredSalesData.reduce((sum, item) => sum + Number(item.sales || 0), 0);
  }, [filteredSalesData]);

  const totalSalesByCp = useMemo(() => {
    return filteredSalesData.reduce((sum, item) => sum + Number(item.salesByCp || 0), 0);
  }, [filteredSalesData]);

  const totalProfit = useMemo(() => {
    return filteredProfitsData.reduce((sum, item) => sum + Number(item.profit || 0), 0);
  }, [filteredProfitsData]);

  const totalProfitByCp = useMemo(() => {
    return filteredProfitsData.reduce((sum, item) => sum + Number(item.profitByCp || 0), 0);
  }, [filteredProfitsData]);

  const overallMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  return (
    <div className="flex flex-col h-full space-y-8 pb-12 overflow-y-auto pr-2">
      {/* Filters Section */}
      <div className="glass rounded-3xl p-8 border border-slate-800/50 shadow-2xl flex-shrink-0 relative z-40">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600/20 border border-brand-500/30 rounded-xl flex items-center justify-center text-brand-400">
              <Filter size={20} />
            </div>
            <div>
              <h3 className="text-xl font-light italic serif tracking-wide text-white">Báo Cáo Dashboard</h3>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">Phân tích dữ liệu tổng hợp</p>
            </div>
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Plus size={14} />
              Add Filter
            </button>
            <AnimatePresence>
              {showAddMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-slate-800/95 backdrop-blur-xl border border-slate-700 p-2 rounded-xl shadow-2xl shadow-black/50 z-[9999] flex flex-col gap-1"
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold p-2 pb-1">Select Filter</p>
                  {AVAILABLE_FILTERS.map(filter => {
                    const isActive = activeFilterKeys.includes(filter.key);
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.key}
                        disabled={isActive}
                        onClick={() => addFilterField(filter.key)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors",
                          isActive 
                            ? "opacity-50 cursor-not-allowed text-slate-500" 
                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        )}
                      >
                        <Icon size={14} />
                        {filter.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {activeFilterKeys.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
            {activeFilterKeys.map(key => {
              const filterConfig = AVAILABLE_FILTERS.find(f => f.key === key);
              if (!filterConfig) return null;
              const Icon = filterConfig.icon;

              return (
                <div key={key} className="space-y-2 relative group flex flex-col">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Icon size={12} className="text-brand-500" /> {filterConfig.label}
                    </label>
                    <button 
                      onClick={() => removeFilterField(key)}
                      className="text-slate-600 hover:text-red-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Filter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  
                  {key === 'mdStatus' ? (
                    <select
                      value={filters.mdStatus}
                      onChange={(e) => handleFilterChange('mdStatus', e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm outline-none focus:border-brand-500 transition-all font-sans h-10 mt-auto"
                    >
                      <option value="">-- All --</option>
                      {mdStatusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : key === 'projectStatus' ? (
                    <select
                      value={filters.projectStatus}
                      onChange={(e) => handleFilterChange('projectStatus', e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm outline-none focus:border-brand-500 transition-all font-sans h-10 mt-auto"
                    >
                      <option value="">-- All --</option>
                      {projectStatusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : key === 'startDate' || key === 'endDate' ? (
                    <input
                      type="date"
                      value={filters[key]}
                      onChange={(e) => handleFilterChange(key, e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-800 text-slate-200 px-4 flex-[1] rounded-xl text-sm outline-none focus:border-brand-500 transition-all font-sans min-h-[40px] mt-auto"
                    />
                  ) : (
                    <input
                      type="text"
                      value={filters[key]}
                      onChange={(e) => handleFilterChange(key, e.target.value)}
                      placeholder={`${filterConfig.label}...`}
                      className="w-full bg-slate-900/50 border border-slate-800 text-slate-200 px-4 flex-[1] rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all font-sans min-h-[40px] mt-auto"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Stats & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Metric Cards */}
        <div className="flex flex-col space-y-6">
          <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between h-32 group hover:border-brand-500/30 transition-all">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tổng Doanh Thu</p>
            <div>
              <p className="text-2xl font-light text-white serif italic truncate">
                {Number(totalSales).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                <span className="text-xs text-slate-500 ml-2 italic">vnđ</span>
              </p>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between h-32 group hover:border-cyan-500/30 transition-all">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sales by Cp</p>
            <div>
              <p className="text-2xl font-light text-brand-400 serif italic truncate">
                {Number(totalSalesByCp).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                <span className="text-xs text-slate-500 ml-2 italic">vnđ</span>
              </p>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between h-32 group hover:border-purple-500/30 transition-all">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tổng Profit</p>
            <div>
              <p className="text-2xl font-light text-white serif italic truncate">
                {Number(totalProfit).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                <span className="text-xs text-slate-500 ml-2 italic">vnđ</span>
              </p>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between h-32 group hover:border-fuchsia-500/30 transition-all">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Profit by Cp</p>
            <div>
              <p className="text-2xl font-light text-fuchsia-400 serif italic truncate">
                {Number(totalProfitByCp).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                <span className="text-xs text-slate-500 ml-2 italic">vnđ</span>
              </p>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-between h-32 group hover:border-brand-500/30 transition-all">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tỉ suất Margin</p>
            <div>
              <p className="text-2xl font-light text-white serif italic truncate">
                {overallMargin.toFixed(2)}
                <span className="text-xs text-brand-500 ml-2 italic">%</span>
              </p>
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="lg:col-span-3 glass rounded-3xl p-8 border border-slate-800/50 min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Biểu đồ Lợi Nhuận Kép (Sales & Profit & Margin)</span>
            <span className="text-brand-400">Yearly Performance</span>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  dy={10}
                />
                
                {/* Primary Y-Axis for Sales & Profit */}
                <YAxis 
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />

                {/* Secondary Y-Axis for Margin % */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#10b981', fontSize: 10 }}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />

                <Tooltip 
                  cursor={{ fill: 'rgba(59,130,246,0.1)' }}
                  contentStyle={{ 
                    backgroundColor: '#0f1115', 
                    borderColor: '#1e293b', 
                    borderRadius: '12px',
                    color: '#e2e8f0',
                    fontSize: '12px'
                  }}
                  labelFormatter={(label, items) => {
                    if (items && items.length > 0) {
                      const data = items[0].payload;
                      return `${label} ${data.year || ''}`;
                    }
                    return label;
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'avgMargin') {
                      return [`${(value * 100).toFixed(2)}%`, 'Margin (Avg)'];
                    }
                    return [`${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} vnđ`, name === 'sales' ? 'Sales' : 'Profit'];
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                
                <Bar 
                  yAxisId="left"
                  dataKey="sales" 
                  name="Sales"
                  fill="url(#salesGradient)" 
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="profit" 
                  name="Profit"
                  fill="url(#profitGradient)" 
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="avgMargin" 
                  name="Avg Margin"
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f1115' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});
