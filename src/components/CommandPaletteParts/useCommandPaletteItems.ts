import React, { useMemo } from 'react';
import {
  FolderPlus, PlusCircle, Sun, Moon, Maximize2, Minimize2, CalendarCheck, Printer,
  DollarSign, ImageDown, LayoutDashboard, Calendar, BarChartHorizontal, List,
  PieChart, Shield, FileText, Settings, HelpCircle, Building2, Tag, AlertCircle, Zap,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useEnrichedData } from '../../hooks/useEnrichedData';
import { matchesAdvancedSearch } from '../../lib/utils';
import { TabId, AppRole } from '../../types';
import { PaletteItem, CommandCategory } from './commandPaletteTypes';

interface UseCommandPaletteItemsProps {
  searchQuery: string;
  selectedCategory: CommandCategory;
  onClose: () => void;
  onTabChange: (tab: TabId) => void;
  onToggleTheme?: () => void;
  onToggleFocusMode?: () => void;
  onPrintPreviewToggle?: () => void;
}

export function useCommandPaletteItems({
  searchQuery, selectedCategory, onClose, onTabChange,
  onToggleTheme, onToggleFocusMode, onPrintPreviewToggle,
}: UseCommandPaletteItemsProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const permissionMatrix = useAppStore((state) => state.permissionMatrix);
  const theme = useAppStore((state) => state.theme);
  const isFocusMode = useAppStore((state) => state.isFocusMode);
  const currency = useAppStore((state) => state.currency);
  const setCurrency = useAppStore((state) => state.setCurrency);
  const locations = useAppStore((state) => state.locations);
  const setIsProjectModalOpen = useAppStore((state) => state.setIsProjectModalOpen);
  const setEditingProject = useAppStore((state) => state.setEditingProject);
  const setIsTaskModalOpen = useAppStore((state) => state.setIsTaskModalOpen);
  const setEditingTask = useAppStore((state) => state.setEditingTask);
  const setIsReadOnlyModal = useAppStore((state) => state.setIsReadOnlyModal);
  const setModalInitialTab = useAppStore((state) => state.setModalInitialTab);
  const setPrefillProjectCode = useAppStore((state) => state.setPrefillProjectCode);
  const setPrefillProjectYear = useAppStore((state) => state.setPrefillProjectYear);
  const triggerGanttToday = useAppStore((state) => state.triggerGanttToday);
  const setLayoutTabFilters = useAppStore((state) => state.setLayoutTabFilters);
  const setGanttTabFocusTaskId = useAppStore((state) => state.setGanttTabFocusTaskId);
  const setDetailTabFocusTaskId = useAppStore((state) => state.setDetailTabFocusTaskId);
  const setQuickNavTarget = useAppStore((state) => state.setQuickNavTarget);

  const { enrichedProjects: projects, filteredTasks: tasks } = useEnrichedData();

  const userRole = (currentUser?.role || 'guest') as AppRole;
  const isAdmin = currentUser?.role === 'admin';
  const perms = permissionMatrix[userRole] || {};

  // 1. Build Quick Actions
  const actionItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];

    // Toggle Theme
    items.push({
      id: 'action-toggle-theme',
      category: 'actions',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: `Currently in ${theme === 'dark' ? 'Dark' : 'Light'} theme`,
      icon: theme === 'dark' ? Sun : Moon,
      iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50',
      onSelect: () => {
        onToggleTheme?.();
        onClose();
      },
    });

    // Toggle Focus Mode
    items.push({
      id: 'action-toggle-focus',
      category: 'actions',
      title: isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
      subtitle: 'Maximize workspace and hide toolbars',
      icon: isFocusMode ? Minimize2 : Maximize2,
      iconColor: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50',
      shortcut: 'Shift+F',
      onSelect: () => {
        onToggleFocusMode?.();
        onClose();
      },
    });

    // Print Preview
    items.push({
      id: 'action-print-preview',
      category: 'actions',
      title: 'Toggle Print Preview',
      subtitle: 'High-fidelity PDF and paper export preview',
      icon: Printer,
      iconColor: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50',
      onSelect: () => {
        onPrintPreviewToggle?.();
        onClose();
      },
    });

    // Switch Currency
    items.push({
      id: 'action-currency',
      category: 'actions',
      title: `Cycle Currency (Current: ${currency === 'VND' ? "'000 VND" : currency === 'JPY' ? '万円' : 'USD'})`,
      subtitle: 'Switch between VND, JPY, and USD display rates',
      icon: DollarSign,
      iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
      onSelect: () => {
        let next: 'VND' | 'JPY' | 'USD' = 'VND';
        if (currency === 'VND') next = 'JPY';
        else if (currency === 'JPY') next = 'USD';
        setCurrency(next);
        onClose();
      },
    });

    // Store & Year Quick Filters
    (['HCM', 'HN', 'all'] as const).forEach((st) => {
      items.push({
        id: `action-store-${st}`,
        category: 'actions',
        title: `Switch Store Filter: ${st === 'all' ? 'All Stores' : st}`,
        subtitle: `Filter workspace floor maps and comparisons to ${st === 'all' ? 'All Stores' : st}`,
        icon: Building2,
        iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
        onSelect: () => {
          useAppStore.getState().setGlobalStoreFilter(st);
          onClose();
        },
      });
    });

    (['2026', '2027', 'all'] as const).forEach((yr) => {
      items.push({
        id: `action-year-${yr}`,
        category: 'actions',
        title: `Switch Year Filter: ${yr === 'all' ? 'All Years' : yr}`,
        subtitle: `Filter workspace to year ${yr === 'all' ? 'All Years' : yr}`,
        icon: Calendar,
        iconColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50',
        onSelect: () => {
          useAppStore.getState().setGlobalYearFilter(yr);
          onClose();
        },
      });
    });

    // Export PNG
    items.push({
      id: 'action-export-png',
      category: 'actions',
      title: 'Export Active View as PNG',
      subtitle: 'Capture high resolution image snapshot',
      icon: ImageDown,
      iconColor: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50',
      onSelect: () => {
        window.dispatchEvent(new CustomEvent('export-png'));
        onClose();
      },
    });

    return items;
  }, [
    theme,
    isFocusMode,
    currency,
    onClose,
    onToggleTheme,
    onToggleFocusMode,
    onPrintPreviewToggle,
    setCurrency,
  ]);

  // 2. Build Navigation Items (Only tabs present in Standalone App: layout & picture_mapping)
  const navItems: PaletteItem[] = useMemo(() => {
    const tabs: Array<{
      id: TabId;
      label: string;
      desc: string;
      icon: React.ElementType;
      shortcut?: string;
    }> = [
      { id: 'layout', label: 'Floor Layout & Comparison Tab', desc: 'Interactive 2D architectural map, unit polygons & Excel comparison', icon: Building2, shortcut: '1' },
      { id: 'picture_mapping', label: 'Picture Mapping Tab', desc: 'Floor plan CAD, 360° photo pins and studio review', icon: ImageDown, shortcut: '2' },
    ];

    return tabs.map((tab) => ({
      id: `nav-${tab.id}`,
      category: 'navigation',
      title: tab.label,
      subtitle: tab.desc,
      icon: tab.icon,
      iconColor: 'text-slate-600 dark:text-[#a3a3a3] bg-slate-100 dark:bg-[#28282a]',
      shortcut: tab.shortcut,
      onSelect: () => {
        onTabChange(tab.id);
        onClose();
      },
    }));
  }, [onTabChange, onClose]);

  // 3. Build Floor Layout Items
  const floorItems: PaletteItem[] = useMemo(() => {
    const list = locations && locations.length > 0 ? locations : ['L1', 'L2', 'L3', 'B1', 'B2', '3F', '4F'];
    return list.map((floor) => ({
      id: `floor-${floor}`,
      category: 'floors',
      title: `Floor ${floor} Layout`,
      subtitle: `Jump directly to Floor ${floor} architectural floor plan`,
      badge: floor,
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
      icon: Building2,
      iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50',
      onSelect: () => {
        setLayoutTabFilters({ location: floor });
        onTabChange('layout');
        onClose();
      },
    }));
  }, [locations, setLayoutTabFilters, onTabChange, onClose]);

  // 4. Build Projects Items with 1-Click Direct Jump to Layout
  const projectItems: PaletteItem[] = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    return projects.map((p) => {
      const isHCM = (p.store || '').toUpperCase() === 'HCM';
      const desc = p.detail || (p as any).description || p.note || '';
      return {
        id: `proj-${p.id || p.code}`,
        category: 'projects' as const,
        title: p.name || 'Untitled Project',
        subtitle: `${p.year || ''} • ${p.store || 'HCM'} • Floor ${p.location || 'N/A'}${
          desc ? ` • ${desc.length > 80 ? desc.slice(0, 80) + '...' : desc}` : ''
        }`,
        code: `${p.code || ''}`,
        badge: p.store || 'HCM',
        badgeColor: isHCM
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
          : 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
        icon: Tag,
        iconColor: isHCM
          ? 'text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/50'
          : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50',
        onSelect: () => {
          if (p.store) useAppStore.getState().setGlobalStoreFilter(p.store);
          if (p.year) useAppStore.getState().setGlobalYearFilter(String(p.year));
          setLayoutTabFilters({ location: p.location || 'L1', projectCode: p.code || '' });
          onTabChange('layout');
          onClose();
        },
        quickActions: [
          {
            label: 'Open on Layout',
            onClick: () => {
              if (p.store) useAppStore.getState().setGlobalStoreFilter(p.store);
              if (p.year) useAppStore.getState().setGlobalYearFilter(String(p.year));
              setLayoutTabFilters({ location: p.location || 'L1', projectCode: p.code || '' });
              onTabChange('layout');
              onClose();
            },
          },
        ],
      };
    });
  }, [projects, setLayoutTabFilters, onTabChange, onClose]);

  // Combine & Filter based on searchQuery and selectedCategory
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const pool = [
      ...(selectedCategory === 'all' || selectedCategory === 'actions' ? actionItems : []),
      ...(selectedCategory === 'all' || selectedCategory === 'navigation' ? navItems : []),
      ...(selectedCategory === 'all' || selectedCategory === 'floors' ? floorItems : []),
      ...(selectedCategory === 'all' || selectedCategory === 'projects' ? projectItems : []),
    ];

    if (!q) {
      if (selectedCategory === 'all') {
        return [
          ...actionItems.slice(0, 4),
          ...navItems,
          ...floorItems.slice(0, 4),
          ...projectItems.slice(0, 8),
        ];
      }
      return pool.slice(0, 25);
    }

    return pool
      .filter((item) =>
        matchesAdvancedSearch(q, [item.title, item.subtitle, item.code, item.badge])
      )
      .slice(0, 30);
  }, [searchQuery, selectedCategory, actionItems, navItems, floorItems, projectItems]);

  return {
    filteredItems,
  };
}
