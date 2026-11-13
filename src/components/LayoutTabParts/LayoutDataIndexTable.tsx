import React from 'react';
import { Trash2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ComparisonRowInput } from '../../lib/standaloneComparisonService';

interface LayoutDataIndexTableProps {
  filteredRows: Array<{ row: ComparisonRowInput; originalIndex: number }>;
  cadUnitCodeSet: Set<string>;
  existingProjectCodeSet: Set<string>;
  showAttributes: boolean;
  showMetrics: boolean;
  showProjects: boolean;
  handleCellChange: (index: number, field: keyof ComparisonRowInput, value: string | number) => void;
  handleDeleteRow: (index: number) => void;
}

export const LayoutDataIndexTable: React.FC<LayoutDataIndexTableProps> = React.memo(({
  filteredRows,
  cadUnitCodeSet,
  existingProjectCodeSet,
  showAttributes,
  showMetrics,
  showProjects,
  handleCellChange,
  handleDeleteRow,
}) => {
  return (
    <div className="flex-1 overflow-auto relative">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 shadow-xs select-none">
          <tr>
            {/* Fixed ID & Matches */}
            <th className="py-2.5 px-2 w-10 text-center bg-slate-200/60 dark:bg-slate-800/80">#</th>
            <th className="py-2.5 px-2 w-28 bg-slate-200/60 dark:bg-slate-800/80">Match CAD?</th>
            <th className="py-2.5 px-2 w-28 bg-slate-200/60 dark:bg-slate-800/80">Match Proj?</th>
            <th className="py-2.5 px-2 w-16">Store</th>
            <th className="py-2.5 px-2 w-16">Floor</th>
            <th className="py-2.5 px-2 w-24">Unit Code</th>
            <th className="py-2.5 px-2 min-w-[140px]">Brand Name</th>

            {/* Group 1: Attributes */}
            {showAttributes && (
              <>
                <th className="py-2.5 px-2 w-24 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Brand Code</th>
                <th className="py-2.5 px-2 w-24 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Vendor Code</th>
                <th className="py-2.5 px-2 w-24 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Class Code</th>
                <th className="py-2.5 px-2 w-24 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Shop Type</th>
                <th className="py-2.5 px-2 w-20 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Size (m²)</th>
                <th className="py-2.5 px-2 w-24 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">MD Status</th>
                <th className="py-2.5 px-2 min-w-[130px] text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">MD Notes</th>
                <th className="py-2.5 px-2 w-24 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Task</th>
                <th className="py-2.5 px-2 w-16 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Year</th>
              </>
            )}

            {/* Group 2: Financial Metrics */}
            {showMetrics && (
              <>
                <th className="py-2.5 px-2 w-28 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Sales (VND)</th>
                <th className="py-2.5 px-2 w-28 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Sales by CP</th>
                <th className="py-2.5 px-2 w-28 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Sales HCMcate</th>
                <th className="py-2.5 px-2 w-28 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Profit (VND)</th>
                <th className="py-2.5 px-2 w-28 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Profit by CP</th>
                <th className="py-2.5 px-2 w-28 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Profit HCMcate</th>
                <th className="py-2.5 px-2 w-20 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Margin %</th>
                <th className="py-2.5 px-2 w-20 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Margin CP %</th>
                <th className="py-2.5 px-2 w-24 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">HCM Sales Effi</th>
                <th className="py-2.5 px-2 w-20 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">HCM Margin %</th>
              </>
            )}

            {/* Group 3: Real-time App & Projects */}
            {showProjects && (
              <>
                <th className="py-2.5 px-2 w-28 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Project Code</th>
                <th className="py-2.5 px-2 min-w-[140px] text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Project Name</th>
                <th className="py-2.5 px-2 w-24 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Project Status</th>
                <th className="py-2.5 px-2 w-24 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Act Status</th>
                <th className="py-2.5 px-2 w-24 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Budget (VND)</th>
                <th className="py-2.5 px-2 w-24 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Actual (VND)</th>
                <th className="py-2.5 px-2 w-24 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Start Date</th>
                <th className="py-2.5 px-2 w-24 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Finish Date</th>
                <th className="py-2.5 px-2 min-w-[130px] text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Contractor / Party</th>
                <th className="py-2.5 px-2 min-w-[160px] text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Notes / Detail</th>
              </>
            )}

            <th className="py-2.5 px-2 w-12 text-center bg-slate-200/60 dark:bg-slate-800/80">Xóa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={35} className="py-14 text-center text-slate-400">
                <p className="font-semibold text-sm">Không tìm thấy dòng dữ liệu nào phù hợp.</p>
                <p className="text-xs mt-1 text-slate-500">Hãy thử xóa bộ lọc tìm kiếm hoặc nhấn &quot;Thêm dòng&quot; để tạo bản ghi mới.</p>
              </td>
            </tr>
          ) : (
            filteredRows.map(({ row, originalIndex }, idx) => {
              const unitCode = String(row['Unit Code'] || '').trim().toUpperCase();
              const isCadMatched = cadUnitCodeSet.has(unitCode);

              const projCode = String(row['Project Code'] || '').trim().toUpperCase();
              const isProjMatched = Boolean(projCode && existingProjectCodeSet.has(projCode));

              return (
                <tr key={originalIndex} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px] bg-slate-50/40 dark:bg-slate-900/40">{idx + 1}</td>

                  {/* CAD Match Status */}
                  <td className="py-2 px-2">
                    {isCadMatched ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Matched CAD</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        title={`Mã unit "${unitCode}" chưa khớp với nhãn CAD polygon nào trong bản vẽ.`}
                      >
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>No CAD Unit</span>
                      </span>
                    )}
                  </td>

                  {/* Project Match Status */}
                  <td className="py-2 px-2">
                    {isProjMatched ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        <span>Matched Proj</span>
                      </span>
                    ) : projCode ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                        title={`Dự án "${projCode}" sẽ được tự động tạo mới khi lưu.`}
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>Auto Sync</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No Project</span>
                    )}
                  </td>

                  {/* Store */}
                  <td className="py-1 px-1">
                    <select
                      value={row['Store'] || 'HCM'}
                      onChange={(e) => handleCellChange(originalIndex, 'Store', e.target.value)}
                      className="w-full bg-transparent p-1 rounded font-bold border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none cursor-pointer"
                    >
                      <option value="HCM">HCM</option>
                      <option value="HN">HN</option>
                    </select>
                  </td>

                  {/* Floor */}
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={row['Floor'] ?? ''}
                      onChange={(e) => handleCellChange(originalIndex, 'Floor', e.target.value)}
                      className="w-full bg-transparent p-1 rounded font-bold text-center border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                    />
                  </td>

                  {/* Unit Code */}
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={row['Unit Code'] ?? ''}
                      onChange={(e) => handleCellChange(originalIndex, 'Unit Code', e.target.value)}
                      className="w-full bg-transparent p-1 rounded font-mono font-bold text-indigo-600 dark:text-indigo-400 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                    />
                  </td>

                  {/* Brand Name */}
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={row['Brand / Shop Name'] ?? ''}
                      onChange={(e) => handleCellChange(originalIndex, 'Brand / Shop Name', e.target.value)}
                      className="w-full bg-transparent p-1 rounded font-semibold border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                    />
                  </td>

                  {/* Attributes Fields */}
                  {showAttributes && (
                    <>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="text"
                          value={row['Brand Code'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Brand Code', e.target.value)}
                          placeholder="Mã brand"
                          className="w-full bg-transparent p-1 rounded font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="text"
                          value={row['Vendor Code'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Vendor Code', e.target.value)}
                          placeholder="Mã vendor"
                          className="w-full bg-transparent p-1 rounded font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="text"
                          value={row['Class Code'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Class Code', e.target.value)}
                          placeholder="Class"
                          className="w-full bg-transparent p-1 rounded font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="text"
                          value={row['Shop Type'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Shop Type', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="number"
                          value={row['Contract Size (m2)'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Contract Size (m2)', Number(e.target.value))}
                          className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="text"
                          value={row['MD Status'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'MD Status', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="text"
                          value={row['MD Notes'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'MD Notes', e.target.value)}
                          placeholder="Ghi chú MD"
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="text"
                          value={row['Task'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Task', e.target.value)}
                          placeholder="Tác vụ"
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="number"
                          value={row['Year'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Year', Number(e.target.value))}
                          className="w-full bg-transparent p-1 rounded text-center border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                    </>
                  )}

                  {/* Metrics Fields */}
                  {showMetrics && (
                    <>
                      {(
                        [
                          'Sales Amount',
                          'Sales by CP',
                          'Sales by HCMcate',
                          'Profit Amount',
                          'Profit by CP',
                          'Profit by HCMcate',
                          'Margin (%)',
                          'Margin by CP (%)',
                          'HCM Sales Effi',
                          'HCM Margin (%)',
                        ] as const
                      ).map((metricField) => (
                        <td key={metricField} className="py-1 px-1 bg-emerald-50/20 dark:bg-emerald-950/10">
                          <input
                            type="number"
                            value={row[metricField] ?? ''}
                            onChange={(e) => handleCellChange(originalIndex, metricField, Number(e.target.value))}
                            className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                          />
                        </td>
                      ))}
                    </>
                  )}

                  {/* Projects & App Fields */}
                  {showProjects && (
                    <>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="text"
                          value={row['Project Code'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Project Code', e.target.value)}
                          className="w-full bg-transparent p-1 rounded font-mono border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="text"
                          value={row['Project Name'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Project Name', e.target.value)}
                          placeholder="Tên dự án"
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="text"
                          value={row['Project Status'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Project Status', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="text"
                          value={row['Act Status'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Act Status', e.target.value)}
                          placeholder="Trạng thái thực tế"
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="number"
                          value={row['Budget'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Budget', Number(e.target.value))}
                          placeholder="Budget"
                          className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="number"
                          value={row['Actual Cost'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Actual Cost', Number(e.target.value))}
                          placeholder="Actual"
                          className="w-full bg-transparent p-1 rounded text-right border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="date"
                          value={row['Start Date'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Start Date', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="date"
                          value={row['Finish Date'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Finish Date', e.target.value)}
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="text"
                          value={row['Party / Contractor'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Party / Contractor', e.target.value)}
                          placeholder="Nhà thầu / Bên liên quan"
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <input
                          type="text"
                          value={row['Notes / Detail'] ?? ''}
                          onChange={(e) => handleCellChange(originalIndex, 'Notes / Detail', e.target.value)}
                          placeholder="Ghi chú chi tiết dự án"
                          className="w-full bg-transparent p-1 rounded border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 outline-none"
                        />
                      </td>
                    </>
                  )}

                  {/* Delete Action */}
                  <td className="py-1 px-2 text-center bg-slate-50/40 dark:bg-slate-900/40">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(originalIndex)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Xóa dòng này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
});
