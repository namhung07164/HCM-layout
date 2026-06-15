import React from 'react';
import DataTable from './DataTable';
import { ProjectStatusInfo } from '../types';
import { useData } from '../DataContext';
import { cn, standardizeDateToMMDDYYYY } from '../lib/utils';

export default function ProjectStatusTab() {
  const { projectStatus, setProjectStatus, units } = useData();

  const handleDataChange = (newData: ProjectStatusInfo[]) => {
    setProjectStatus(newData);
  };

  const getUniqueCount = (key: keyof ProjectStatusInfo) => {
    return new Set(projectStatus.map(item => item[key]).filter(Boolean)).size;
  };

  // Use master units for dropdown
  const uniqueUnits = Array.from(new Set(units.map(u => u.unit).filter(Boolean))).sort();

  const handleUpdateField = (row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, field: keyof ProjectStatusInfo, value: any) => {
    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    
    updateRow({
      ...row,
      [field]: value,
      update: formattedDate
    });
  };

  const renderTextCell = React.useCallback((key: keyof ProjectStatusInfo) => (val: any, row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, isLocked: boolean) => (
    <input 
      type="text"
      value={val || ''} 
      onChange={(e) => updateRow({ ...row, [key]: e.target.value })}
      disabled={isLocked}
      className={cn(
        "bg-transparent border-0 text-slate-300 w-full outline-none",
        isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-blue-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-blue-500/50 text-xs"
      )}
      placeholder="..."
    />
  ), []);

  const renderUnitCell = React.useCallback(() => (val: any, row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, isLocked: boolean) => {
    return (
      <select 
        value={val || ''} 
        onChange={(e) => updateRow({ ...row, unit: e.target.value })}
        disabled={isLocked}
        className={cn(
          "w-full bg-slate-900 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all focus:bg-blue-600/20 focus:text-white",
          isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-blue-500/50"
        )}
      >
        <option value="">--Select Unit--</option>
        {uniqueUnits.map(unit => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
    );
  }, [uniqueUnits]);

  const renderUnitLinkCell = React.useCallback(() => (val: any, row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, isLocked: boolean) => {
    return (
      <select 
        value={val || ''} 
        onChange={(e) => {
          const selected = e.target.value;
          const motherUnitData = projectStatus.find(p => p.unit === selected);
          if (motherUnitData) {
            updateRow({
              ...row,
              unitLink: selected,
              update: motherUnitData.update || '',
              party: motherUnitData.party || '',
              flowStatus: motherUnitData.flowStatus || '',
              projectName: motherUnitData.projectName || '',
              status: motherUnitData.status || '',
              task: motherUnitData.task || '',
              startDate: motherUnitData.startDate || '',
              endDate: motherUnitData.endDate || '',
              delegationStatus: motherUnitData.delegationStatus || '',
            });
          } else {
            updateRow({ ...row, unitLink: selected });
          }
        }}
        disabled={isLocked}
        className={cn(
          "w-full bg-slate-900 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all focus:bg-blue-600/20 focus:text-white",
          isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-blue-500/50"
        )}
      >
        <option value="">--</option>
        {uniqueUnits.map(u => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    );
  }, [uniqueUnits, projectStatus]);

  const columns: { key: keyof ProjectStatusInfo; label: string; summary?: React.ReactNode; renderCell?: any }[] = React.useMemo(() => [
    { key: 'update', label: 'Year', summary: getUniqueCount('update'), renderCell: renderTextCell('update') },
    { key: 'party', label: 'Store', summary: getUniqueCount('party'), renderCell: renderTextCell('party') },
    { key: 'flowStatus', label: 'Location', summary: getUniqueCount('flowStatus'), renderCell: renderTextCell('flowStatus') },
    { 
      key: 'unit', 
      label: 'Unit', 
      summary: getUniqueCount('unit'),
      renderCell: renderTextCell('unit')
    },
    { 
      key: 'unitLink', 
      label: 'Unit Link', 
      summary: getUniqueCount('unitLink'),
      renderCell: renderUnitLinkCell()
    },
    { key: 'projectName', label: 'Project Name', summary: getUniqueCount('projectName'), renderCell: renderTextCell('projectName') },
    { 
      key: 'status', 
      label: 'Status', 
      summary: getUniqueCount('status'),
      renderCell: renderTextCell('status')
    },
    { 
      key: 'task', 
      label: 'Task',
      summary: getUniqueCount('task'),
      renderCell: renderTextCell('task')
    },
    { key: 'startDate', label: 'Start Date', renderCell: renderTextCell('startDate') },
    { key: 'endDate', label: 'End Date', renderCell: renderTextCell('endDate') },
  ], [projectStatus, renderTextCell, renderUnitCell, renderUnitLinkCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['project name', 'unit', 'status', 'start date', 'end date', 'task', 'update'],
    mapping: (row: any) => ({
      projectName: row['project name'] || row['projectName'] || row['Project Name'] || '',
      unit: row['unit'] || row['Unit'] || '',
      status: row['status'] || row['Status'] || '',
      startDate: standardizeDateToMMDDYYYY(row['start date'] || row['startDate'] || row['Start Date'] || ''),
      endDate: standardizeDateToMMDDYYYY(row['end date'] || row['endDate'] || row['End Date'] || ''),
      task: row['task'] || row['Task'] || '',
      update: standardizeDateToMMDDYYYY(row['update'] || row['Update'] || ''),
    })
  }), []);

  return (
    <DataTable
      title="Dữ Liệu Project Status"
      description="Quản lý thông tin và tiến độ của các Project"
      columns={columns}
      data={projectStatus}
      onDataChange={handleDataChange}
      importConfig={importConfig}
    />
  );
}
