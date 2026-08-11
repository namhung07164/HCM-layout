import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import DataTable from './DataTable';
import { ProjectLinkInfo } from '../types';
import { useDataStore } from '../DataContext';
import { cn, standardizeDateToMMDDYYYY } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';

function ProjectLinkTab() {
  const {  projectLink, setProjectLink, projectStatus, units  } = useDataStore(useShallow(state => ({
    projectLink: state.projectLink,
    setProjectLink: state.setProjectLink,
    projectStatus: state.projectStatus,
    units: state.units,
  })));

  const handleDataChange = (newData: ProjectLinkInfo[]) => {
    setProjectLink(newData);
  };

  const getUniqueCount = (key: keyof ProjectLinkInfo) => {
    return new Set(projectLink.map(item => item[key]).filter(Boolean)).size;
  };

  // Use master units for dropdown
  const uniqueUnits = Array.from(new Set(units.map(u => u.unit).filter(Boolean))).sort();

  const handleUpdateField = (row: ProjectLinkInfo, updateRow: (newRow: ProjectLinkInfo) => void, field: keyof ProjectLinkInfo, value: any) => {
    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
    
    updateRow({
      ...row,
      [field]: value,
      update: formattedDate
    });
  };

  const renderTextCell = React.useCallback((key: keyof ProjectLinkInfo) => (val: any, row: ProjectLinkInfo, updateRow: (newRow: ProjectLinkInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(projectLink.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
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
  }, [projectLink]);

  const renderUnitCell = React.useCallback(() => (val: any, row: ProjectLinkInfo, updateRow: (newRow: ProjectLinkInfo) => void, isLocked: boolean) => {
    const options = uniqueUnits.map(unit => ({ value: unit, label: '', item: unit }));
    return (
      <AutocompleteCell 
        value={val || ''} 
        onChange={(newVal) => updateRow({ ...row, unit: newVal })}
        onSelect={(item) => updateRow({ ...row, unit: item })}
        options={options}
        minChars={0}
        isLocked={isLocked}
        placeholder="..."
      />
    );
  }, [uniqueUnits]);

  const handleUnitLinkChange = React.useCallback((row: ProjectLinkInfo, updateRow: (newRow: ProjectLinkInfo) => void, unitLinkValue: string) => {
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

  const renderUnitLinkCell = React.useCallback(() => (val: any, row: ProjectLinkInfo, updateRow: (newRow: ProjectLinkInfo) => void, isLocked: boolean) => {
    const options = uniqueUnits.map(unit => ({ value: unit, label: '', item: unit }));
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
  }, [handleUnitLinkChange, uniqueUnits]);

  const columns: { key: keyof ProjectLinkInfo; label: string; summary?: React.ReactNode; renderCell?: any }[] = React.useMemo(() => [
    { key: 'update', label: 'Year', summary: getUniqueCount('update'), renderCell: renderTextCell('update') },
    { key: 'party', label: 'Store', summary: getUniqueCount('party'), renderCell: renderTextCell('party') },
    { key: 'flowStatus', label: 'Location', summary: getUniqueCount('flowStatus'), renderCell: renderTextCell('flowStatus') },
    { 
      key: 'unit', 
      label: 'Unit', 
      summary: getUniqueCount('unit'),
      renderCell: renderUnitCell()
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
  ], [projectLink, renderTextCell, renderUnitCell, renderUnitLinkCell]);

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
      <datalist id="projectLinkUnitOptions">
        {uniqueUnits.map(unit => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <DataTable
        title="Dữ Liệu Project Link"
        description="Quản lý thông tin và tiến độ thông qua việc mapping từ Project Status"
        columns={columns}
        data={projectLink}
        onDataChange={handleDataChange}
        importConfig={importConfig}
      />
    </>
  );
}

export default React.memo(ProjectLinkTab);
