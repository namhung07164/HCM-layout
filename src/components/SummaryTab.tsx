import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useData } from "../DataContext";
import DataTable from "./DataTable";
import { useSummaryData } from "../lib/summaryData";

export default function SummaryTab() {
  const summaryData = useSummaryData();
  const [searchTerm, setSearchTerm] = useState("");

  const tableData = useMemo(() => {
    return summaryData.map((unit) => {
      return {
        ...unit,
        sales: unit.salesAmount
          ? unit.salesAmount.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
          : "-",
        salesByCpFormatted: unit.salesByCp
          ? unit.salesByCp.toLocaleString("en-US", { maximumFractionDigits: 2 })
          : "-",
        profitFormatted: unit.profitAmount
          ? unit.profitAmount.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
          : "-",
        profitByCpFormatted: unit.profitByCp
          ? unit.profitByCp.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
          : "-",
        marginFormatted: unit.margin
          ? `${(unit.margin * 100).toFixed(0)}%`
          : "-",
        marginByCpFormatted: unit.marginByCp
          ? `${(unit.marginByCp * 100).toFixed(0)}%`
          : "-",
        salesByHcmcateFormatted: unit.salesByHcmcate !== undefined && unit.salesByHcmcate !== null
          ? unit.salesByHcmcate.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
          : "-",
        profitByHcmcateFormatted: unit.profitByHcmcate !== undefined && unit.profitByHcmcate !== null
          ? unit.profitByHcmcate.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
          : "-",
        hcmSalesEffiFormatted: unit.hcmSalesEffi !== undefined && unit.hcmSalesEffi !== null && unit.hcmSalesEffi !== 0
          ? unit.hcmSalesEffi.toLocaleString("en-US", { maximumFractionDigits: 2 })
          : "-",
        hcmMarginFormatted: unit.hcmMargin !== undefined && unit.hcmMargin !== null && unit.hcmMargin !== 0
          ? `${(unit.hcmMargin * 100).toFixed(0)}%`
          : "-",
      };
    });
  }, [summaryData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    const lowerSearch = searchTerm.toLowerCase();
    return tableData.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(lowerSearch),
      ),
    );
  }, [tableData, searchTerm]);

  const getUniqueOptions = (field: string) => {
    return Array.from(
      new Set(tableData.map((item: any) => item[field]).filter(Boolean)),
    ).map((val) => ({
      label: String(val),
      value: String(val),
    }));
  };

  const getUniqueCount = (field: string) => (filteredData: any[]) => {
      const uniqueVals = new Set(filteredData.map((item: any) => item[field]).filter(Boolean));
      return uniqueVals.size > 0 ? uniqueVals.size : null;
  };

  const getSum = (field: string, isPercent = false) => (filteredData: any[]) => {
      if (!filteredData.length) return null;
      let sum = 0;
      let count = 0;
      filteredData.forEach(item => {
          const val = item[field];
          if (typeof val === 'number') {
              sum += val;
              count++;
          } else if (typeof val === 'string') {
              const num = parseFloat(val.replace(/[^\d.-]/g, ''));
              if (!isNaN(num)) {
                  sum += num;
                  count++;
              }
          }
      });
      if (sum === 0 && count === 0) return null;
      
      if (field === 'size') {
          return `${sum.toLocaleString("en-US", { maximumFractionDigits: 2 })} SQM`;
      }
      
      // Calculate average for percentages
      if (isPercent) {
          if (count === 0) return "-";
          const avg = sum / count;
          return `${(avg * 100).toFixed(0)}% (Avg)`;
      }

      return sum.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const columns = [
    { key: "update", label: "Update", renderCell: (val: any) => val },
    { key: "floor", label: "Floor", renderCell: (val: any) => val },
    {
      key: "classCode",
      label: "Class Code",
      renderCell: (val: any) => val || "-",
      filterType: "select",
      filterOptions: getUniqueOptions("classCode"),
      summary: getUniqueCount("classCode"),
    },
    { key: "unit", label: "Unit", renderCell: (val: any) => val, summary: getUniqueCount("unit") },
    { key: "size", label: "Size", renderCell: (val: any) => val, summary: getSum("size") },
    {
      key: "vendorCode",
      label: "Vendor Code",
      renderCell: (val: any) => val || "-",
      filterType: "select",
      filterOptions: getUniqueOptions("vendorCode"),
      summary: getUniqueCount("vendorCode"),
    },
    {
      key: "brandCode",
      label: "Brand Code",
      renderCell: (val: any) => val,
      filterType: "select",
      filterOptions: getUniqueOptions("brandCode"),
      summary: getUniqueCount("brandCode"),
    },
    {
      key: "brandName",
      label: "Brand Name",
      renderCell: (val: any) => val,
      filterType: "select",
      filterOptions: getUniqueOptions("brandName"),
      summary: getUniqueCount("brandName"),
    },
    { key: "sales", label: "Sales", renderCell: (val: any) => val, summary: getSum("salesAmount") },
    {
      key: "salesByCpFormatted",
      label: "Sales by CP",
      renderCell: (val: any) => val,
      summary: getSum("salesByCp")
    },
    {
      key: "salesByHcmcateFormatted",
      label: "Sales by HCMcate",
      renderCell: (val: any) => val,
      summary: getSum("salesByHcmcate")
    },
    { key: "marginFormatted", label: "Margin", renderCell: (val: any) => val, summary: getSum("margin", true) },
    {
      key: "marginByCpFormatted",
      label: "Margin by CP",
      renderCell: (val: any) => val,
      summary: getSum("marginByCp", true)
    },
    { key: "profitFormatted", label: "Profit", renderCell: (val: any) => val, summary: getSum("profitAmount") },
    {
      key: "profitByCpFormatted",
      label: "Profit by CP",
      renderCell: (val: any) => val,
      summary: getSum("profitByCp")
    },
    {
      key: "profitByHcmcateFormatted",
      label: "Profit by HCMcate",
      renderCell: (val: any) => val,
      summary: getSum("profitByHcmcate")
    },
    {
      key: "hcmSalesEffiFormatted",
      label: "HCM Sales Effi",
      renderCell: (val: any) => val,
      summary: getSum("hcmSalesEffi")
    },
    {
      key: "hcmMarginFormatted",
      label: "HCM Margin",
      renderCell: (val: any) => val,
      summary: getSum("hcmMargin", true)
    },
    {
      key: "mdStatus",
      label: "MD Status",
      renderCell: (val: any) => val,
      filterType: "select",
      filterOptions: getUniqueOptions("mdStatus"),
      summary: getUniqueCount("mdStatus"),
    },
    {
      key: "task",
      label: "Task",
      renderCell: (val: any) => val,
      filterType: "select",
      filterOptions: getUniqueOptions("task"),
      summary: getUniqueCount("task"),
    },
    {
      key: "projectStatus",
      label: "Project Status",
      renderCell: (val: any) => val,
      filterType: "select",
      filterOptions: getUniqueOptions("projectStatus"),
      summary: getUniqueCount("projectStatus"),
    },
    {
      key: "actStatus",
      label: "Act. Status",
      renderCell: (val: any) => val,
      filterType: "select",
      filterOptions: getUniqueOptions("actStatus"),
      summary: getUniqueCount("actStatus"),
    },
    {
      key: "status",
      label: "Status",
      filterType: "select",
      filterOptions: [
        { label: "Active", value: "Active" },
        { label: "Unactive", value: "Unactive" },
      ],
      summary: getUniqueCount("status"),
      renderCell: (val: any) => (
        <span
          className={val === "Unactive" ? "text-red-400" : "text-green-400"}
        >
          {val}
        </span>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Summary</h2>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-700 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <DataTable
          title="Summary"
          description="Readonly view of all units with mapped sales"
          data={filteredData as any}
          columns={columns as any}
          onDataChange={() => {}} // Readonly
          defaultFilters={{ status: "Active" }}
          readonly={true}
        />
      </div>
    </div>
  );
}
