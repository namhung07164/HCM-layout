import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

const TAB_CONFIG: Record<string, any> = {
  project: { id: 'project', label: 'Xuất Project', columns: ['store', 'location', 'year', 'code', 'name'], fileNamePrefix: 'taka_projects_exported', icon: 'ph-file-csv', exportType: 'csv' },
  task: { id: 'task', label: 'Xuất Task detail', columns: ['store', 'location', 'projectYear', 'projectCode', 'Task name', 'start', 'finish', 'duration', 'party', 'predecessor', 'delegation', 'comments'], fileNamePrefix: 'taka_tasks_exported', icon: 'ph-list-dashes', exportType: 'csv' },
  budget: { id: 'budget', label: 'Xuất Task budget', columns: ['location', 'code', 'name', 'budget', 'actual/forecast', 'variance', 'type', 'note'], fileNamePrefix: 'taka_projects_budget_exported', icon: 'ph-calculator', exportType: 'csv' },
  cost: { id: 'cost', label: 'Xuất Cost', columns: ['projectCode', 'budget', 'actual', 'firstPaid', 'firstPaidAt', 'secondPaid', 'secondPaidAt', 'thirdPaid', 'thirdPaidAt', 'supportingFee', 'description', 'vendor'], fileNamePrefix: 'taka_costs_exported', icon: 'ph-receipt', exportType: 'csv' },
  investment: { 
    id: 'investment', 
    label: 'Xuất Investment', 
    columns: ['No', 'Level', 'New Brand', 'Old Brand', 'Estimation time', 'Size area - m2', 'Estimation construction (A works / B works)', 'Suggested by', 'Budget', 'Actual', 'Unit price/sqm (thousand VND)', 'On detail'], 
    fileNamePrefix: 'taka_investment_plan', 
    icon: 'ph-chart-line-up', 
    exportType: 'excel' 
  },
  mass_task: { 
    id: 'mass_task', 
    label: 'Mass-import Task', 
    columns: ['store', 'location', 'projectYear', 'projectCode', 'Task code phá»¥', 'Task name', 'start', 'finish', 'duration', 'party', 'predecessor', 'delegation', 'comments'], 
    fileNamePrefix: 'taka_mass_tasks_exported', 
    icon: 'ph-copy', 
    exportType: 'csv' 
  },
  brand: { 
    id: 'brand', 
    label: 'Xuất Brand', 
    columns: ['CLASS CODE', 'DEPARTMENT', 'FLOOR', 'AREA/DIV', 'NAME', 'TYPE', 'Vendor Code', 'BRAND CODE', 'BRAND NAME'], 
    fileNamePrefix: 'taka_brand_class_info', 
    icon: 'ph-tag', 
    exportType: 'csv' 
  },
  sales: {
    id: 'sales',
    label: 'Xuất Sales',
    columns: ['date', 'class code', 'brand code', 'brand name', 'sales'],
    fileNamePrefix: 'taka_sales_exported',
    icon: 'ph-currency-dollar',
    exportType: 'csv'
  },
  profit: {
    id: 'profit',
    label: 'Xuất Profit',
    columns: ['date', 'class code', 'brand code', 'profit', 'Margin'],
    fileNamePrefix: 'taka_profit_exported',
    icon: 'ph-trend-up',
    exportType: 'csv'
  },
  size_unit: {
    id: 'size_unit',
    label: 'Xuất Size Unit',
    columns: ['floor', 'unit', 'size', 'start month', 'brand code', 'brand name'],
    fileNamePrefix: 'taka_size_unit_exported',
    icon: 'ph-arrows-out',
    exportType: 'csv'
  }
};

const safeJSONParse = (data: string | null) => {
  try {
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const safeGetStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("Trình duyệt chặn localStorage khi mở file offline", e);
    return null;
  }
};

const safeSetStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Trình duyệt chặn lưu localStorage", e);
  }
};

export default function CsvExportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateData, setTemplateData] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('project');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return safeGetStorage(`taka_locked_project`) === 'true';
  });

  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const saved = safeGetStorage(`taka_mapping_project`);
    const parsed = safeJSONParse(saved);
    return TAB_CONFIG['project'].columns.reduce((acc: any, col: string) => ({ ...acc, [col]: parsed[col] || '' }), {});
  });
  
  const [keepOriginal, setKeepOriginal] = useState<Record<string, boolean>>(() => {
    const saved = safeGetStorage(`taka_keeporiginal_project`);
    const parsed = safeJSONParse(saved);
    return TAB_CONFIG['project'].columns.reduce((acc: any, col: string) => ({ ...acc, [col]: !!parsed[col] }), {});
  });

  const [constantMapping, setConstantMapping] = useState<Record<string, string>>(() => {
    const saved = safeGetStorage(`taka_constant_project`);
    const parsed = safeJSONParse(saved);
    return TAB_CONFIG['project'].columns.reduce((acc: any, col: string) => ({ ...acc, [col]: parsed[col] !== undefined ? parsed[col] : (col === 'delegation' ? 'true' : '') }), {});
  });

  const unitSizeMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (activeTab !== 'size_unit' || !Array.isArray(excelData) || excelData.length === 0) return map;
    
    excelData.forEach(row => {
      if (!row || typeof row !== 'object') return; 
      
      let u = constantMapping['unit'] || row[mapping['unit']];
      if (u === undefined || u === null || String(u).trim() === '') u = 'Temp';
      
      let s = constantMapping['size'] || row[mapping['size']];
      if (s !== undefined && s !== null && String(s).trim() !== '') {
        map[u] = s;
      }
    });
    return map;
  }, [activeTab, excelData, mapping, constantMapping]);

  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
    setFile(null);
    setExcelData([]);
    setExcelHeaders([]);
    setWorkbook(null);
    setSheetNames([]);
    setActiveSheet('');
    setTemplateFile(null);
    setTemplateData([]);
    setError('');
    
    const savedMapping = safeGetStorage(`taka_mapping_${tabId}`);
    const parsedMapping = safeJSONParse(savedMapping);
    setMapping(TAB_CONFIG[tabId].columns.reduce((acc: any, col: string) => ({ ...acc, [col]: parsedMapping[col] || '' }), {}));

    const savedConstant = safeGetStorage(`taka_constant_${tabId}`);
    const parsedConstant = safeJSONParse(savedConstant);
    setConstantMapping(TAB_CONFIG[tabId].columns.reduce((acc: any, col: string) => {
      let val = parsedConstant[col];
      if (val === undefined || (!savedConstant)) {
        val = col === 'delegation' ? 'true' : (val || '');
      }
      return { ...acc, [col]: val };
    }, {}));
    
    const savedKeepOriginal = safeGetStorage(`taka_keeporiginal_${tabId}`);
    const parsedKeepOriginal = safeJSONParse(savedKeepOriginal);
    setKeepOriginal(TAB_CONFIG[tabId].columns.reduce((acc: any, col: string) => ({ ...acc, [col]: !!parsedKeepOriginal[col] }), {}));

    setIsLocked(safeGetStorage(`taka_locked_${tabId}`) === 'true');
  };

  const processSheet = (worksheet: XLSX.WorkSheet) => {
    try {
      if (!worksheet) throw new Error("Sheet bị trống.");
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[] || [];
      setExcelData(jsonData);
      
      if (jsonData.length > 0) {
        const headers = Object.keys(jsonData[0] || {});
        setExcelHeaders(headers);
        
        if (!isLocked) {
          const newMapping = { ...(mapping || {}) };
          TAB_CONFIG[activeTab].columns.forEach((targetCol: string) => {
            const match = headers.find(h => h && h.toLowerCase().includes(targetCol.toLowerCase()));
            if (match) newMapping[targetCol] = match;
          });
          setMapping(newMapping);
        }
      } else {
        setExcelHeaders([]);
      }
    } catch (err: any) {
      console.error(err);
      setError('Đã xảy ra lỗi khi trích xuất dữ liệu từ Sheet này.');
      setExcelData([]);
      setExcelHeaders([]);
    }
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setTemplateFile(uploadedFile);
    
    const isCSV = uploadedFile.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error("File tải lên trống.");
        
        let wb;
        if (isCSV) {
          wb = XLSX.read(result, { type: 'string' });
        } else {
          wb = XLSX.read(new Uint8Array(result as ArrayBuffer), { type: 'array' });
        }
        
        const firstSheet = wb.SheetNames[0];
        const json = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: '' }) as any[];
        setTemplateData(json);
      } catch (err: any) {
        setError(`Lỗi đọc template: ${err.message}`);
      }
    };
    
    if (isCSV) {
      reader.readAsText(uploadedFile, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(uploadedFile);
    }
    e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setError('');
    setFile(uploadedFile);
    setWorkbook(null);
    setSheetNames([]);
    setActiveSheet('');
    setExcelData([]);
    setExcelHeaders([]);
    
    const isCSV = uploadedFile.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error("File tải lên trống.");

        let wb;
        try {
          if (isCSV) {
            wb = XLSX.read(result, { type: 'string' });
          } else {
            const data = new Uint8Array(result as ArrayBuffer);
            wb = XLSX.read(data, { type: 'array' });
          }
        } catch (xlsxErr) {
          console.error("XLSX Parse Error:", xlsxErr);
          throw new Error("Định dạng file không được hỗ trợ hoặc cấu trúc file bị lỗi.");
        }

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error("Không thể tìm thấy sheet dữ liệu nào trong file.");
        }

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0];
        setActiveSheet(firstSheet);
        processSheet(wb.Sheets[firstSheet]);
      } catch (err: any) {
        setError(`Không thể xử lý file: ${err.message}`);
        console.error(err);
        setExcelData([]);
      }
    };

    reader.onerror = () => {
      setError('Trình duyệt gặp lỗi trong quá trình nạp file.');
    };

    if (isCSV) {
      reader.readAsText(uploadedFile, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(uploadedFile);
    }
    
    e.target.value = '';
  };

  const handleCancelUpload = () => {
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setActiveSheet('');
    setExcelData([]);
    setExcelHeaders([]);
    setError('');
  };

  const handleSaveMapping = () => {
    safeSetStorage(`taka_mapping_${activeTab}`, JSON.stringify(mapping));
    safeSetStorage(`taka_constant_${activeTab}`, JSON.stringify(constantMapping));
    safeSetStorage(`taka_keeporiginal_${activeTab}`, JSON.stringify(keepOriginal));
    safeSetStorage(`taka_locked_${activeTab}`, 'true');
    setIsLocked(true);
  };

  const handleUnlock = () => {
    if (passwordInput === '1641985') {
      safeSetStorage(`taka_locked_${activeTab}`, 'false');
      setIsLocked(false);
      setShowUnlockModal(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Mật khẩu không đúng!');
    }
  };

  const formatDateTime = (val: any, colName: string) => {
    if (!val && val !== 0) return '';
    
    const defaultTime = colName === 'start' ? '22:00' : (colName === 'finish' ? '10:00' : '00:00');

    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const m = date.getUTCMonth() + 1;
      const d = date.getUTCDate();
      const y = date.getUTCFullYear();
      
      if (colName === 'date' || colName === 'start month') {
        return `${m}/${d}/${y}`; 
      }
      
      const hasTime = (val % 1) !== 0;

      if (hasTime) {
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const min = String(date.getUTCMinutes()).padStart(2, '0');
        return `${m}/${d}/${y} ${hh}:${min}`;
      } else {
        return `${m}/${d}/${y} ${defaultTime}`; 
      }
    }

    const dateStr = String(val);
    const parsedDate = new Date(dateStr);
    
    if (!isNaN(parsedDate.getTime())) {
      const m = parsedDate.getMonth() + 1;
      const d = parsedDate.getDate();
      const y = parsedDate.getFullYear();
      
      if (colName === 'date' || colName === 'start month') {
        return `${m}/${d}/${y}`; 
      }
      
      if (dateStr.includes(':')) {
        const hh = String(parsedDate.getHours()).padStart(2, '0');
        const min = String(parsedDate.getMinutes()).padStart(2, '0');
        return `${m}/${d}/${y} ${hh}:${min}`;
      } else {
        return `${m}/${d}/${y} ${defaultTime}`; 
      }
    }
    
    return val;
  };

  const getCellValue = (row: any, colName: string) => {
    if (!row || typeof row !== 'object') return ''; 
    
    let val = constantMapping[colName] || row[mapping[colName]];

    if (activeTab === 'task' && colName.toLowerCase() === 'predecessor' && !keepOriginal[colName]) {
      let projCode = constantMapping['projectCode'] || row[mapping['projectCode']] || '';
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        val = `${projCode}-${val}`;
      }
    }

    if (activeTab === 'size_unit') {
      if (colName === 'unit') {
        if (val === undefined || val === null || String(val).trim() === '') return 'Temp';
        return val;
      }
      if (colName === 'size') {
        if (val === undefined || val === null || String(val).trim() === '') {
          let u = constantMapping['unit'] || row[mapping['unit']];
          if (u === undefined || u === null || String(u).trim() === '') u = 'Temp';
          val = unitSizeMap[u];
        }
      }
    }

    if ((activeTab === 'task' && (colName === 'start' || colName === 'finish')) || 
        (activeTab === 'sales' && colName === 'date') || 
        (activeTab === 'profit' && colName === 'date') || 
        (activeTab === 'size_unit' && colName === 'start month')) {
      val = formatDateTime(val, colName);
    }
    
    if (typeof val === 'object' && val !== null) {
      val = String(val);
    }

    return val !== undefined && val !== null ? val : '';
  };

  const previewData = useMemo(() => {
    if (!excelData || excelData.length === 0) return [];
    
    if (activeTab === 'mass_task') {
      if (!templateData || templateData.length === 0) return [];
      
      const finalJson: any[] = [];
      excelData.forEach(proj => {
        if (finalJson.length >= 10) return; // Only need 10 for preview
        const projStore = getCellValue(proj, 'store');
        const projLocation = getCellValue(proj, 'location');
        const projCode = getCellValue(proj, 'projectCode');
        const projYear = getCellValue(proj, 'projectYear') || getCellValue(proj, 'YEAR');
        
        templateData.forEach(taskDef => {
          if (finalJson.length >= 10) return;
          const taskName = taskDef['Task name'] || '';
          const tcKey = Object.keys(taskDef).find(k => {
            const clean = k.toLowerCase().replace(/á»¥/g, 'ụ').replace(/\s+/g, '');
            return clean.includes('taskcodeph');
          });
          let taskCodePhu = tcKey ? taskDef[tcKey] : '';
          if (!keepOriginal['Task code phá»¥'] && taskCodePhu !== undefined && taskCodePhu !== null && String(taskCodePhu).trim() !== '') {
             taskCodePhu = projCode ? `${projCode}-${String(taskCodePhu).trim()}` : String(taskCodePhu).trim();
          }
          let start = taskDef['start'] || '';
          let finish = taskDef['finish'] || '';
          if (typeof start === 'number') start = XLSX.SSF.format('m/d/yyyy h:mm', start);
          if (typeof finish === 'number') finish = XLSX.SSF.format('m/d/yyyy h:mm', finish);
          
          const party = taskDef['party'] || '';
          const duration = taskDef['duration'] !== undefined ? taskDef['duration'] : '';
          const predKey = Object.keys(taskDef).find(k => k.toLowerCase().replace(/\s+/g, '') === 'predecessor');
          let templatePred = predKey ? taskDef[predKey] : '';
          let mappedPred = constantMapping['predecessor'] || proj[mapping['predecessor']];
          let pred = (mappedPred !== undefined && mappedPred !== null && String(mappedPred).trim() !== '') ? mappedPred : templatePred;
          if (!keepOriginal['predecessor'] && pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = projCode ? `${projCode}-${String(pred).trim()}` : String(pred).trim();
          }
          let delegation = taskDef['delegation'] !== undefined ? taskDef['delegation'] : (constantMapping['delegation'] || 'true');
          let comments = taskDef['comments'] !== undefined ? taskDef['comments'] : (constantMapping['comments'] || '');
          
          finalJson.push({
            'store': projStore,
            'location': projLocation,
            'projectYear': projYear,
            'projectCode': projCode,
            'Task code phá»¥': taskCodePhu,
            'Task name': taskName,
            'start': start,
            'finish': finish,
            'duration': duration,
            'party': party,
            'predecessor': pred,
            'delegation': delegation,
            'comments': comments
          });
        });
      });
      return finalJson;
    }
    
    return excelData.slice(0, 10).map((row) => {
      const parsedRow: any = {};
      TAB_CONFIG[activeTab].columns.forEach((c: string) => {
        parsedRow[c] = getCellValue(row, c);
      });
      return parsedRow;
    });
  }, [activeTab, excelData, templateData, mapping, constantMapping]);

  const exportData = () => {
    const targetCols = TAB_CONFIG[activeTab].columns;
    
    if (activeTab === 'investment') {
      const wb = XLSX.utils.book_new();
      sheetNames.forEach(name => {
        const sourceJson = XLSX.utils.sheet_to_json(workbook!.Sheets[name], { defval: '' }) as any[];
        
        const headerRows = [
          ["Takashimaya Vietnam - MD Investment Plan", "", "", "", "", "", "", "", "", "", "", new Date().toLocaleDateString()],
          ["Noted: ※Permanent shop / ※POP up shop / ※New Event Hall", "", "", "", "", "", "", "", "", "", "", ""],
          [], 
          targetCols 
        ];

        const rowsByLevel: Record<string, any[]> = {};
        sourceJson.forEach(row => {
          const levelKey = row[mapping['Level']] || 'Other';
          if (!rowsByLevel[levelKey]) rowsByLevel[levelKey] = [];
          
          const mappedRow = targetCols.map((col: string) => {
            if (constantMapping[col]) return constantMapping[col];
            return row[mapping[col]] || '';
          });
          rowsByLevel[levelKey].push(mappedRow);
        });

        const finalRows = [...headerRows];
        Object.keys(rowsByLevel).forEach(level => {
          finalRows.push([level, "", "", "", "", "", "", "Subtotal", "", "", "", ""]);
          rowsByLevel[level].forEach(r => finalRows.push(r));
        });

        const ws = XLSX.utils.aoa_to_sheet(finalRows);
        XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
      });
      XLSX.writeFile(wb, `${TAB_CONFIG[activeTab].fileNamePrefix}.xlsx`);
    } else if (activeTab === 'mass_task') {
      if (!templateData || templateData.length === 0) {
        setError('Vui lòng tải lên file template (Attached)');
        return;
      }
      
      const finalJson: any[] = [];
      excelData.forEach(proj => {
        const projStore = getCellValue(proj, 'store');
        const projLocation = getCellValue(proj, 'location');
        const projCode = getCellValue(proj, 'projectCode');
        const projYear = getCellValue(proj, 'projectYear') || getCellValue(proj, 'YEAR');
        
        templateData.forEach(taskDef => {
          const taskName = taskDef['Task name'] || '';
          const tcKey = Object.keys(taskDef).find(k => {
            const clean = k.toLowerCase().replace(/á»¥/g, 'ụ').replace(/\s+/g, '');
            return clean.includes('taskcodeph');
          });
          let taskCodePhu = tcKey ? taskDef[tcKey] : '';
          if (!keepOriginal['Task code phá»¥'] && taskCodePhu !== undefined && taskCodePhu !== null && String(taskCodePhu).trim() !== '') {
             taskCodePhu = projCode ? `${projCode}-${String(taskCodePhu).trim()}` : String(taskCodePhu).trim();
          }
          let start = taskDef['start'] || '';
          let finish = taskDef['finish'] || '';
          if (typeof start === 'number') start = XLSX.SSF.format('m/d/yyyy h:mm', start);
          if (typeof finish === 'number') finish = XLSX.SSF.format('m/d/yyyy h:mm', finish);
          
          const party = taskDef['party'] || '';
          const duration = taskDef['duration'] !== undefined ? taskDef['duration'] : '';
          const predKey = Object.keys(taskDef).find(k => k.toLowerCase().replace(/\s+/g, '') === 'predecessor');
          let templatePred = predKey ? taskDef[predKey] : '';
          let mappedPred = constantMapping['predecessor'] || proj[mapping['predecessor']];
          let pred = (mappedPred !== undefined && mappedPred !== null && String(mappedPred).trim() !== '') ? mappedPred : templatePred;
          if (!keepOriginal['predecessor'] && pred !== undefined && pred !== null && String(pred).trim() !== '') {
             pred = projCode ? `${projCode}-${String(pred).trim()}` : String(pred).trim();
          }
          let delegation = taskDef['delegation'] !== undefined ? taskDef['delegation'] : (constantMapping['delegation'] || 'true');
          let comments = taskDef['comments'] !== undefined ? taskDef['comments'] : (constantMapping['comments'] || '');
          
          finalJson.push({
            'store': projStore,
            'location': projLocation,
            'projectYear': projYear,
            'projectCode': projCode,
            'Task code phá»¥': taskCodePhu,
            'Task name': taskName,
            'start': start,
            'finish': finish,
            'duration': duration,
            'party': party,
            'predecessor': pred,
            'delegation': delegation,
            'comments': comments
          });
        });
      });
      
      const csvRows = [targetCols.join(',')];
      finalJson.forEach(row => {
        const values = targetCols.map((col: string) => {
          let val = row[col];
          if (val === undefined || val === null) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });
      
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${TAB_CONFIG[activeTab].fileNamePrefix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const csvRows = [targetCols.join(',')];
      excelData.forEach(row => {
        const values = targetCols.map((col: string) => {
          let val = getCellValue(row, col);
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });
      
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${TAB_CONFIG[activeTab].fileNamePrefix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="h-full bg-slate-50 p-4 font-sans text-slate-800 overflow-y-auto w-full custom-scrollbar">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4 border border-slate-200">
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="bg-brand-600 p-3 rounded-xl text-white">
              <i className="ph-fill ph-file-spreadsheet text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Taka Data Converter</h1>
              <p className="text-sm text-slate-500">Thiết kế file xuất chuyên nghiệp</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full w-full xl:w-auto">
            {Object.values(TAB_CONFIG).map(tab => (
              <button 
                key={tab.id} 
                onClick={() => switchTab(tab.id)} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <i className={`ph ${tab.icon} text-lg`}></i>{tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-2">
            <i className="ph-fill ph-warning-circle text-xl"></i>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold flex items-center gap-2 text-slate-700">
                  <i className="ph ph-upload-simple text-brand-600 text-lg"></i> 1. {activeTab === 'mass_task' ? 'Tải file mass project name' : 'Tải file'}
                </h2>
                {file && (
                  <button 
                    onClick={handleCancelUpload}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <i className="ph-fill ph-x-circle text-sm"></i> Hủy bỏ
                  </button>
                )}
              </div>
              <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group">
                <i className={`ph ${file ? 'ph-file-csv' : 'ph-cloud-arrow-up'} text-4xl mb-2 transition-colors ${file ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-400'}`}></i>
                <span className={`text-sm text-center font-medium ${file ? 'text-brand-600' : 'text-slate-500'}`}>
                  {file ? file.name : 'Chọn file Excel gốc'}
                </span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
              </label>
              
              {sheetNames.length > 1 && (
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Chọn Sheet</label>
                  <select 
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-brand-500 text-slate-800" 
                    value={activeSheet} 
                    onChange={(e) => {
                      setActiveSheet(e.target.value); 
                      if (workbook) {
                        processSheet(workbook.Sheets[e.target.value]);
                      }
                    }}
                  >
                    {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>

            {activeTab === 'mass_task' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold flex items-center gap-2 text-slate-700">
                    <i className="ph ph-paperclip text-brand-600 text-lg"></i> 1b. Tải file Attached
                  </h2>
                  {templateFile && (
                    <button 
                      onClick={() => { setTemplateFile(null); setTemplateData([]); }}
                      className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <i className="ph-fill ph-x-circle text-sm"></i> Hủy
                    </button>
                  )}
                </div>
                <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors group">
                  <i className={`ph ${templateFile ? 'ph-file-csv' : 'ph-cloud-arrow-up'} text-4xl mb-2 transition-colors ${templateFile ? 'text-brand-500' : 'text-slate-300 group-hover:text-brand-400'}`}></i>
                  <span className={`text-sm text-center font-medium ${templateFile ? 'text-brand-600' : 'text-slate-500'}`}>
                    {templateFile ? templateFile.name : 'Chọn file attached (Template)'}
                  </span>
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleTemplateUpload} />
                </label>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h2 className="font-bold flex items-center gap-2 text-slate-700">
                  <i className="ph ph-intersect text-brand-600 text-lg"></i> 2. Cấu hình cột
                </h2>
                <button 
                  onClick={isLocked ? () => setShowUnlockModal(true) : handleSaveMapping} 
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors ${isLocked ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
                >
                  <i className={isLocked ? "ph-fill ph-lock-key" : "ph ph-floppy-disk"}></i> 
                  {isLocked ? 'Đã khóa' : 'Lưu & Khóa'}
                </button>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {TAB_CONFIG[activeTab].columns
                  .filter((col: string) => {
                    if (activeTab === 'mass_task') {
                      return ['store', 'location', 'projectCode', 'predecessor', 'projectYear'].includes(col);
                    }
                    return true;
                  })
                  .map((col: string) => (
                  <div key={col} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{col}</label>
                    <div className="flex gap-2">
                      <select 
                        disabled={isLocked} 
                        className="flex-1 w-0 p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 outline-none focus:border-brand-500 text-slate-800" 
                        value={mapping[col] || ''} 
                        onChange={e => setMapping({...mapping, [col]: e.target.value})}
                      >
                        <option value="">-- Cột Excel --</option>
                        {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                      {(activeTab === 'task' || activeTab === 'mass_task') && (
                        <div className="flex items-center" title="Giữ nguyên giá trị tải lên">
                          <input 
                            type="checkbox" 
                            disabled={isLocked}
                            checked={!!keepOriginal[col]}
                            onChange={e => setKeepOriginal({...keepOriginal, [col]: e.target.checked})}
                            className="w-4 h-4 cursor-pointer border-slate-300 rounded text-brand-600 focus:ring-brand-500"
                          />
                        </div>
                      )}
                      <input 
                         disabled={isLocked}  
                        type="text" 
                        placeholder="Giá trị tĩnh..." 
                        className="w-24 p-2 border border-slate-200 rounded-lg text-xs disabled:bg-slate-100 disabled:text-slate-400 outline-none focus:border-brand-500 text-slate-800" 
                        value={constantMapping[col] || ''} 
                        onChange={e => setConstantMapping({...constantMapping, [col]: e.target.value})} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
                <h2 className="font-bold flex items-center gap-2 text-slate-700">
                  <i className="ph ph-eye text-brand-600 text-lg"></i> 3. Xem trước & Xuất bản
                </h2>
                <button 
                  disabled={!file} 
                  onClick={exportData} 
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
                >
                  <i className="ph ph-export text-lg"></i> 
                  Tải xuống {activeTab === 'investment' ? 'Excel' : 'CSV'}
                </button>
              </div>
              
              {previewData.length > 0 ? (
                <div className="overflow-x-auto flex-1 rounded-xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-xs tracking-wider">
                      <tr>
                        {TAB_CONFIG[activeTab].columns.map((c: string) => (
                          <th key={c} className="px-4 py-3 font-bold whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          {TAB_CONFIG[activeTab].columns.map((c: string) => {
                            let displayVal = row[c];

                            return (
                              <td key={c} className="px-4 py-3 text-slate-600 truncate max-w-[150px]" title={displayVal || ''}>
                                {displayVal || <span className="text-slate-300">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {excelData.length > 0 && (
                    <div className="text-center py-3 text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                      Đang hiển thị tối đa 10 dòng đầu tiên. File tải xuống sẽ chứa toàn bộ {activeTab === 'mass_task' ? `dữ liệu từ ${excelData.length} project` : `${excelData.length} dòng`}.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <i className="ph ph-file-search text-6xl mb-4 text-slate-300"></i>
                  <p className="font-medium">
                    {activeTab === 'mass_task' && (!templateFile || excelData.length === 0) ? 'Vui lòng tải lên cả file mass project name và file Attached' : 'Vui lòng tải lên một file để xem dữ liệu'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showUnlockModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xs text-center animate-in fade-in zoom-in duration-200">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                <i className="ph-fill ph-lock-key text-3xl"></i>
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-800">Mở khóa Mapping</h3>
              <p className="text-xs text-slate-500 mb-6">Nhập mật khẩu để thay đổi cấu hình các cột dữ liệu.</p>
              <input 
                type="password" 
                autoFocus 
                className="w-full p-3 border border-slate-200 rounded-xl mb-2 text-center text-xl tracking-widest outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-slate-800" 
                placeholder="••••••" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleUnlock()} 
              />
              <div className="h-6">
                {passwordError && <p className="text-red-500 text-xs font-medium">{passwordError}</p>}
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowUnlockModal(false)} className="flex-1 py-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors">Hủy</button>
                <button onClick={handleUnlock} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors">Xác nhận</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
