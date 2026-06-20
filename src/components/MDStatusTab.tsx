import React from 'react';
import DataTable from './DataTable';
import { MDStatusInfo } from '../types';
import { useData } from '../DataContext';
import { standardizeDateToMMDDYYYY, cn } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';
import { useSummaryData } from '../lib/summaryData';

export default function MDStatusTab() {
  const { mdStatus, setMdStatus, classInfo, projectStatus } = useData();
  const summaryData = useSummaryData();

  const handleDataChange = (newData: MDStatusInfo[]) => {
    setMdStatus(newData);
  };

  const getUniqueCount = (key: keyof MDStatusInfo) => {
    return new Set(mdStatus.map(item => item[key]).filter(Boolean)).size;
  };

  const statusOptions = [
    'approached',
    'negotiation',
    'MOU sent',
    't&c Agreed',
    'Signed agreement',
    'Rejected'
  ];

  const uniqueUnits = React.useMemo(() => {
    return Array.from(new Set(mdStatus.map(p => p.unit).filter(Boolean))).sort();
  }, [mdStatus]);

  const handleUnitLinkChange = React.useCallback((row: MDStatusInfo, updateRow: (newRow: MDStatusInfo) => void, unitLinkValue: any) => {
    const val = typeof unitLinkValue === 'object' ? unitLinkValue.value : unitLinkValue;
    const parentUnitRow = summaryData.find(p => p.unit === val);
    
    if (parentUnitRow) {
      updateRow({
        ...row,
        unitLink: val,
        brandCode: parentUnitRow.brandCode || '',
        brandName: parentUnitRow.brandName || '',
      });
    } else {
      updateRow({ ...row, unitLink: val });
    }
  }, [summaryData]);

  const renderUnitCell = React.useCallback(() => (val: any, row: MDStatusInfo, updateRow: (newRow: MDStatusInfo) => void, isLocked: boolean) => {
    const activeUnits = summaryData.filter(u => u.status !== 'Unactive' && u.status !== 'unact' && u.status !== 'Inactive');
    const options = activeUnits.map(u => ({
      value: u.unit,
      label: `Floor ${u.floor || '?'} - ${u.size || 0} SQM${u.brandName ? ` - ${u.brandName}` : ''}`,
      item: u
    }));

    return (
      <div className="flex-1 min-w-0">
        <AutocompleteCell
          value={val}
          onChange={(newVal) => {
            const matchedUnit = summaryData.find(u => u.unit === newVal);
            if (matchedUnit) {
               updateRow({
                 ...row,
                 unit: newVal,
                 brandCode: matchedUnit.brandCode || row.brandCode || '',
                 brandName: matchedUnit.brandName || row.brandName || ''
               });
            } else {
               updateRow({ ...row, unit: newVal });
            }
          }}
          onSelect={(selectedUnit) => updateRow({ 
            ...row, 
            unit: selectedUnit.item.unit,
            brandCode: selectedUnit.item.brandCode || '',
            brandName: selectedUnit.item.brandName || ''
          })}
          onBlur={(newVal) => {
            const matchedUnit = summaryData.find(u => u.unit === newVal);
            if (matchedUnit) {
               updateRow({
                 ...row,
                 unit: newVal,
                 brandCode: matchedUnit.brandCode || row.brandCode || '',
                 brandName: matchedUnit.brandName || row.brandName || ''
               });
            } else {
               updateRow({ ...row, unit: newVal });
            }
          }}
          options={options}
          minChars={0} // Show all units on focus
          isLocked={isLocked}
          placeholder="Select Unit..."
        />
      </div>
    );
  }, [summaryData]);

  const renderUnitLinkCell = React.useCallback(() => (val: any, row: MDStatusInfo, updateRow: (newRow: MDStatusInfo) => void, isLocked: boolean) => {
    const parentUnits = Array.from(new Set(projectStatus.map(p => String(p.unit || '')).filter(Boolean)));
    const options = parentUnits.map(unit => ({ value: unit, label: '', item: unit }));
    return (
      <AutocompleteCell 
        value={val || ''}
        onChange={(newVal) => handleUnitLinkChange(row, updateRow, newVal)}
        onSelect={(item) => handleUnitLinkChange(row, updateRow, item)}
        onBlur={(newVal) => handleUnitLinkChange(row, updateRow, newVal)}
        options={options}
        minChars={0}
        isLocked={isLocked}
        placeholder="Select Unit..."
      />
    );
  }, [handleUnitLinkChange, projectStatus]);

  const renderBrandCodeCell = React.useCallback(() => (val: any, row: MDStatusInfo, updateRow: (newRow: MDStatusInfo) => void, isLocked: boolean) => {
    const options = classInfo.map(c => ({
      value: c.brandCode,
      label: c.brandName,
      item: c
    }));

    return (
      <div className="flex-1 min-w-0">
        <AutocompleteCell
          value={val}
          onChange={(newVal) => updateRow({ ...row, brandCode: newVal })}
          onSelect={(selectedItem) => updateRow({ ...row, brandCode: selectedItem.brandCode, brandName: selectedItem.brandName })}
          onBlur={(newVal) => updateRow({ ...row, brandCode: newVal })}
          options={options}
          minChars={0}
          isLocked={isLocked}
          placeholder="..."
        />
      </div>
    );
  }, [classInfo]);

  const renderBrandNameCell = React.useCallback(() => (val: any, row: MDStatusInfo, updateRow: (newRow: MDStatusInfo) => void, isLocked: boolean) => {
    const options = classInfo.map(c => ({
      value: c.brandName,
      label: c.brandCode,
      item: c
    }));

    return (
      <div className="flex-1 min-w-0">
        <AutocompleteCell
          value={val}
          onChange={(newVal) => updateRow({ ...row, brandName: newVal })}
          onSelect={(selectedItem) => updateRow({ ...row, brandName: selectedItem.brandName, brandCode: selectedItem.brandCode })}
          onBlur={(newVal) => updateRow({ ...row, brandName: newVal })}
          options={options}
          minChars={0}
          isLocked={isLocked}
          placeholder="..."
        />
      </div>
    );
  }, [classInfo]);

  const renderStatusCell = React.useCallback(() => (val: any, row: MDStatusInfo, updateRow: (newRow: MDStatusInfo) => void, isLocked: boolean) => {
    const options = statusOptions.map(opt => ({ value: opt, label: '', item: opt }));
    return (
      <AutocompleteCell 
        value={val || ''} 
        onChange={(newVal) => updateRow({ ...row, status: newVal })}
        onSelect={(item) => updateRow({ ...row, status: item })}
        options={options}
        minChars={0}
        isLocked={isLocked}
        placeholder="--Select--"
      />
    );
  }, []);

  const columns: { key: keyof MDStatusInfo; label: string; summary?: React.ReactNode; renderCell?: any }[] = React.useMemo(() => [
    { key: 'unit', label: 'Unit', summary: getUniqueCount('unit'), renderCell: renderUnitCell() },
    { key: 'unitLink', label: 'Unit Link', summary: getUniqueCount('unitLink'), renderCell: renderUnitLinkCell() },
    { key: 'brandCode', label: 'Brand Code', summary: getUniqueCount('brandCode'), renderCell: renderBrandCodeCell() },
    { key: 'brandName', label: 'Brand Name', summary: getUniqueCount('brandName'), renderCell: renderBrandNameCell() },
    { 
      key: 'status', 
      label: 'Status', 
      renderCell: renderStatusCell()
    },
  ], [mdStatus, renderUnitCell, renderUnitLinkCell, renderBrandCodeCell, renderBrandNameCell, renderStatusCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['update', 'unit', 'unit link', 'brand code', 'brand name', 'status'],
    mapping: (row: any) => {
      return {
        update: standardizeDateToMMDDYYYY(row['update'] || row['Update'] || row['date'] || row['Date'] || ''),
        unit: row['unit'] || row['Unit'] || '',
        unitLink: row['unit link'] || row['unitLink'] || row['Unit Link'] || row['Unit link'] || '',
        brandCode: row['brand code'] || row['brandCode'] || row['Brand Code'] || '',
        brandName: row['brand name'] || row['brandName'] || row['Brand Name'] || '',
        status: row['status'] || row['Status'] || ''
      };
    }
  }), []);

  return (
    <>
      <datalist id="unitLinkOptions">
        {uniqueUnits.map(unit => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <DataTable
        title="Dữ Liệu MD Status"
        description="Quản lý và cập nhật MD Status"
        columns={columns}
        data={mdStatus}
        onDataChange={handleDataChange}
        importConfig={importConfig}
      />
    </>
  );
}
