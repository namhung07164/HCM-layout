import { useShallow } from 'zustand/react/shallow';
import React from "react";
import DataTable from "./DataTable";
import { SalesInfo } from "../types";
import { useDataStore } from '../DataContext';
import { standardizeDateToMMDDYYYY, cn } from "../lib/utils";
import AutocompleteCell from "./AutocompleteCell";

export default function SalesTab() {
  const {  sales, setSales  } = useDataStore(useShallow(state => ({
    sales: state.sales,
    setSales: state.setSales,
  })));

  const handleDataChange = (newData: SalesInfo[]) => {
    // Nhập tất cả dữ liệu, không bỏ bớt (không deduplicate)
    setSales(newData);
  };

  const getUniqueCount = (key: keyof SalesInfo) => {
    return new Set(sales.map((item) => item[key]).filter(Boolean)).size;
  };

  const totalSalesSum = sales.reduce(
    (sum, item) => sum + (Number(item.sales) || 0),
    0,
  );
  const totalSalesByCpSum = sales.reduce(
    (sum, item) => sum + (Number(item.salesByCp) || 0),
    0,
  );

  const renderTextCell = React.useCallback(
    (key: keyof SalesInfo) =>
    (
      val: any,
      row: SalesInfo,
      updateRow: (newRow: SalesInfo) => void,
      isLocked: boolean,
    ) => {
      const options = Array.from(new Set(sales.map(item => String(item[key] || '')).filter(Boolean))).map(opt => ({ value: opt, label: '', item: opt }));
      return (
        <AutocompleteCell
          value={val || ""}
          onChange={(newVal) => updateRow({ ...row, [key]: newVal })}
          onSelect={(item) => updateRow({ ...row, [key]: item })}
          options={options}
          minChars={0}
          isLocked={isLocked}
          placeholder="..."
        />
      );
    },
    [sales]
  );

  const renderNumericCell =
    (key: keyof SalesInfo) =>
    (
      val: any,
      row: SalesInfo,
      updateRow: (newRow: SalesInfo) => void,
      isLocked: boolean,
    ) => {
      const [isFocused, setIsFocused] = React.useState(false);
      const [localVal, setLocalVal] = React.useState("");

      let displayValue = "";
      if (isFocused) {
        displayValue = localVal;
      } else {
        if (val === undefined || val === null || val === "") {
          displayValue = "";
        } else {
          displayValue = Number(val).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          });
        }
      }

      return (
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setLocalVal(e.target.value);
          }}
          onFocus={() => {
            setIsFocused(true);
            setLocalVal(val === undefined || val === null ? "" : String(val));
          }}
          onBlur={() => {
            setIsFocused(false);
            const valStr = localVal.replace(/,/g, "");
            const newVal =
              valStr === "" || isNaN(Number(valStr))
                ? undefined
                : Number(valStr);
            updateRow({ ...row, [key]: newVal });
          }}
          disabled={isLocked}
          className={cn(
            "bg-transparent border-0 text-slate-300 w-full outline-none font-mono",
            isLocked
              ? "bg-transparent opacity-50 cursor-not-allowed"
              : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-brand-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-brand-500/50",
          )}
          placeholder="0"
        />
      );
    };

  const columns: {
    key: keyof SalesInfo;
    label: string;
    summary?: React.ReactNode;
    renderCell?: any;
  }[] = React.useMemo(
    () => [
      {
        key: "vendorCode",
        label: "Vendor Code",
        summary: getUniqueCount("vendorCode"),
        renderCell: renderTextCell("vendorCode"),
      },
      {
        key: "brandCode",
        label: "Brand Code",
        summary: getUniqueCount("brandCode"),
        renderCell: renderTextCell("brandCode"),
      },
      {
        key: "brandName",
        label: "Brand Name",
        summary: getUniqueCount("brandName"),
        renderCell: renderTextCell("brandName"),
      },
      {
        key: "sales",
        label: "Sales",
        summary: (
          <span className="flex items-center gap-1">
            {Number(totalSalesSum).toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}
            <span className="text-[8px] opacity-60">VNĐ</span>
          </span>
        ),
        renderCell: renderNumericCell("sales"),
      },
      {
        key: "salesByCp",
        label: "Sales by Cp",
        summary: (
          <span className="flex items-center gap-1">
            {Number(totalSalesByCpSum).toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}
            <span className="text-[8px] opacity-60">VNĐ</span>
          </span>
        ),
        renderCell: renderNumericCell("salesByCp"),
      },
    ],
    [totalSalesSum, totalSalesByCpSum, sales],
  ); // Depend on sums and sales for summary counts

  const importConfig = React.useMemo(
    () => ({
      expectedHeaders: [
        "vendor code",
        "brand code",
        "brand name",
        "sales",
        "sales by cp",
      ],
      mapping: (row: any) => {
        const rawSales = String(row["sales"] || row["Sales"] || "0");
        const rawSalesByCp = String(
          row["sales by cp"] || row["salesByCp"] || row["Sales by Cp"] || "0",
        );

        const parseValue = (val: string) => {
          let clean = val.replace(/\s/g, "").replace(/,/g, "");
          return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
        };

        const parsedSales = parseValue(rawSales);
        const parsedSalesByCp = parseValue(rawSalesByCp);

        return {
          vendorCode:
            row["vendor code"] || row["vendorCode"] || row["Vendor Code"] || "",
          brandCode:
            row["brand code"] || row["brandCode"] || row["Brand Code"] || "",
          brandName:
            row["brand name"] || row["brandName"] || row["Brand Name"] || "",
          sales: (isNaN(parsedSales) ? 0 : parsedSales) / 1000,
          salesByCp: (isNaN(parsedSalesByCp) ? 0 : parsedSalesByCp) / 1000,
        };
      },
    }),
    [],
  );

  return (
    <DataTable
      title="Dữ Liệu Sales"
      description="Nhập liệu doanh thu chi tiết theo thương hiệu (Brand)"
      columns={columns}
      data={sales}
      onDataChange={handleDataChange}
      importConfig={importConfig}
    />
  );
}
