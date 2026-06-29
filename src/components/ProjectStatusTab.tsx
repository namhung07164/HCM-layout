import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import DataTable from './DataTable';
import { ProjectStatusInfo } from '../types';
import { useDataStore } from '../DataContext';
import { cn, standardizeDateToMMDDYYYY } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';

export default function ProjectStatusTab() {
  const {  projectStatus, setProjectStatus, units  } = useDataStore(useShallow(state => ({
    projectStatus: state.projectStatus,
    setProjectStatus: state.setProjectStatus,
    units: state.units,
  })));

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

  const renderTextCell = React.useCallback((key: keyof ProjectStatusInfo) => (val: any, row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(projectStatus.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
    return (
      <AutocompleteCell 
        value={val || ''} 
        onChange={(newVal) => updateRow({ ...row, [key]: newVal })}
        onSelect={(item) => updateRow({ ...row, [key]: item })}
        options={options}
        minChars={0}
        isLocked={isLocked}
        placeholder="..."
      />
    );
  }, [projectStatus]);

  const renderUnitCell = React.useCallback(() => (val: any, row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, isLocked: boolean) => {
    const options = uniqueUnits.map(unit => ({ value: unit, label: '', item: unit }));
    return (
      <AutocompleteCell 
        value={val || ''} 
        onChange={(newVal) => updateRow({ ...row, unit: newVal })}
        onSelect={(item) => updateRow({ ...row, unit: item })}
        options={options}
        minChars={0}
        isLocked={isLocked}
        placeholder="--Select Unit--"
      />
    );
  }, [uniqueUnits]);

  const handleUnitLinkChange = React.useCallback((row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, unitLinkValue: string) => {
    const parentUnitRow = projectStatus.find(p => p.unit === unitLinkValue);
    
    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;

    if (parentUnitRow) {
      updateRow({
        ...row,
        unitLink: unitLinkValue,
        projectName: row.unit || '',
        status: parentUnitRow.status || '',
        actStatus: parentUnitRow.actStatus || '',
        task: parentUnitRow.task || '',
        startDate: parentUnitRow.startDate || '',
        endDate: parentUnitRow.endDate || '',
        party: parentUnitRow.party || '',
        flowStatus: parentUnitRow.flowStatus || '',
        delegationStatus: parentUnitRow.delegationStatus || '',
        update: formattedDate
      });
    } else {
      updateRow({ ...row, unitLink: unitLinkValue, update: formattedDate });
    }
  }, [projectStatus]);

  const renderUnitLinkCell = React.useCallback(() => (val: any, row: ProjectStatusInfo, updateRow: (newRow: ProjectStatusInfo) => void, isLocked: boolean) => {
    const parentUnits = Array.from(new Set(projectStatus.map(p => p.unit).filter(Boolean)));
    const options = parentUnits.map(unit => ({ value: unit, label: '', item: unit }));
    return (
      <AutocompleteCell 
        value={val || ''}
        onChange={(newVal) => handleUnitLinkChange(row, updateRow, newVal)}
        onSelect={(item) => handleUnitLinkChange(row, updateRow, item)}
        options={options}
        minChars={0}
        isLocked={isLocked}
        placeholder="Select Unit..."
      />
    );
  }, [handleUnitLinkChange, projectStatus]);

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
      key: 'actStatus', 
      label: 'Act: Status', 
      summary: getUniqueCount('actStatus'),
      renderCell: renderTextCell('actStatus')
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
    expectedHeaders: ['project name', 'unit', 'unit link', 'status', 'act status', 'start date', 'end date', 'task', 'update'],
    mapping: (row: any) => ({
      projectName: row['project name'] || row['projectName'] || row['Project Name'] || '',
      unit: row['unit'] || row['Unit'] || '',
      unitLink: row['unit link'] || row['unitLink'] || row['Unit Link'] || row['Unit link'] || '',
      status: row['status'] || row['Status'] || '',
      actStatus: row['act status'] || row['actStatus'] || row['Act Status'] || row['Act: Status'] || row['Act. Status'] || '',
      startDate: standardizeDateToMMDDYYYY(row['start date'] || row['startDate'] || row['Start Date'] || ''),
      endDate: standardizeDateToMMDDYYYY(row['end date'] || row['endDate'] || row['End Date'] || ''),
      task: row['task'] || row['Task'] || '',
      update: standardizeDateToMMDDYYYY(row['update'] || row['Update'] || ''),
    })
  }), []);

  return (
    <>
      <datalist id="unitLinkOptions">
        {uniqueUnits.map(unit => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <DataTable
        title="Dữ Liệu Project Status"
        description="Quản lý thông tin và tiến độ của các Project"
        columns={columns}
        data={projectStatus}
        onDataChange={handleDataChange}
        importConfig={importConfig}
      />
    </>
  );
}
