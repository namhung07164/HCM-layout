import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import DataTable from './DataTable';
import { ClassInfo } from '../types';
import { useDataStore } from '../DataContext';
import { cn } from '../lib/utils';
import AutocompleteCell from './AutocompleteCell';
import BlurInput from './BlurInput';

function ClassInfoTab() {
  const {  classInfo, setClassInfo  } = useDataStore(useShallow(state => ({
    classInfo: state.classInfo,
    setClassInfo: state.setClassInfo,
  })));

  const handleDataChange = (newData: ClassInfo[]) => {
    // Loại bỏ các dòng dữ liệu giống hệt nhau
    const seen = new Set<string>();
    const uniqueData = newData.filter(item => {
      // Tạo một chuỗi khóa dựa trên toàn bộ các giá trị để kiểm tra trùng lặp
      const key = `${item.classCode}|${item.name}|${item.vendorCode}|${item.brandCode}|${item.brandName}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    setClassInfo(uniqueData);
  };

  const handleUpdateData = (newData: ClassInfo[]) => {
    // Tạo Map để tra cứu nhanh các dòng mới theo Brand Code
    const incomingMap = new Map<string, ClassInfo>();
    newData.forEach(item => {
      if (item.brandCode) incomingMap.set(item.brandCode, item);
    });

    let updatedCount = 0;
    const updatedClassInfo = classInfo.map((existing) => {
      const incomingRow = incomingMap.get(existing.brandCode);
      if (incomingRow) {
        let changed = false;
        const currentItem = { ...existing };

        // Điền thêm vào các trường trống, không ghi đè nếu đã có dữ liệu
        Object.keys(incomingRow).forEach((key) => {
          const field = key as keyof ClassInfo;
          if (!currentItem[field] && incomingRow[field]) {
            (currentItem[field] as any) = incomingRow[field];
            changed = true;
          }
        });

        if (changed) {
          updatedCount++;
          return currentItem;
        }
      }
      return existing;
    });

    if (updatedCount > 0) {
      setClassInfo(updatedClassInfo);
      alert(`Đã cập nhật dữ liệu bổ sung cho các dòng có Brand Code trùng khớp.`);
    } else {
      alert('Không tìm thấy Brand Code tương ứng hoặc không có trường trống để bổ sung.');
    }
  };

  const getUniqueCount = (key: keyof ClassInfo) => {
    return new Set(classInfo.map(item => item[key]).filter(Boolean)).size;
  };

  const renderTextCell = React.useCallback((key: keyof ClassInfo) => (val: any, row: ClassInfo, updateRow: (newRow: ClassInfo) => void, isLocked: boolean) => {
    const options = Array.from(new Set(classInfo.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
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
  }, [classInfo]);

  const renderNumericCell = React.useCallback((key: keyof ClassInfo) => (val: any, row: ClassInfo, updateRow: (newRow: ClassInfo) => void, isLocked: boolean) => (
    <BlurInput 
      type="number"
      value={val === 0 ? '' : val} 
      onChange={(newVal) => updateRow({ ...row, [key]: parseFloat(newVal) || 0 })}
      isLocked={isLocked}
      className={cn(
        "bg-transparent border-0 text-slate-300 w-full outline-none",
        isLocked ? "bg-transparent opacity-50 cursor-not-allowed" : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-brand-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-brand-500/50"
      )}
      placeholder="0"
    />
  ), []);

  const columns: { key: keyof ClassInfo; label: string; summary?: React.ReactNode; renderCell?: any }[] = React.useMemo(() => [
    { key: 'classCode', label: 'Class Code', summary: getUniqueCount('classCode'), renderCell: renderTextCell('classCode') },
    { key: 'name', label: 'Name', summary: getUniqueCount('name'), renderCell: renderTextCell('name') },
    { key: 'vendorCode', label: 'Vendor Code', summary: getUniqueCount('vendorCode'), renderCell: renderTextCell('vendorCode') },
    { key: 'brandCode', label: 'Brand Code', summary: getUniqueCount('brandCode'), renderCell: renderTextCell('brandCode') },
    { key: 'brandName', label: 'Brand Name', summary: getUniqueCount('brandName'), renderCell: renderTextCell('brandName') },
    { key: 'salesEffi', label: 'Sales Effi', renderCell: renderNumericCell('salesEffi') },
    { key: 'profitEffi', label: 'Profit Effi', renderCell: renderNumericCell('profitEffi') },
  ], [classInfo, renderTextCell, renderNumericCell]);

  const importConfig = React.useMemo(() => ({
    expectedHeaders: ['CLASS CODE', 'NAME', 'VENDOR CODE', 'BRAND CODE', 'BRAND NAME', 'SALES EFFI', 'PROFIT EFFI'],
    mapping: (row: any) => ({
      classCode: row['CLASS CODE'] || row['classCode'] || '',
      name: row['NAME'] || row['name'] || '',
      vendorCode: row['VENDOR CODE'] || row['vendorCode'] || row['Vendor Code'] || '',
      brandCode: row['BRAND CODE'] || row['brandCode'] || '',
      brandName: row['BRAND NAME'] || row['brandName'] || '',
      salesEffi: parseFloat(String(row['SALES EFFI'] || row['salesEffi'] || row['sales effi'] || '').replace(/,/g, '').replace(/%/g, '')) || 0,
      profitEffi: parseFloat(String(row['PROFIT EFFI'] || row['profitEffi'] || row['profit effi'] || '').replace(/,/g, '').replace(/%/g, '')) || 0,
    })
  }), []);

  return (
    <DataTable
      title="Danh Sách Brand Info"
      description="Dữ liệu phân loại bao gồm thông tin chi tiết và Brand"
      columns={columns}
      data={classInfo}
      onDataChange={handleDataChange}
      onUpdateData={handleUpdateData}
      importConfig={importConfig}
    />
  );
}

export default React.memo(ClassInfoTab);
