import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";

export default function AutocompleteCell({
  value,
  onChange,
  onSelect,
  onBlur,
  options,
  minChars,
  isLocked,
  placeholder = "...",
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: any) => boolean | void;
  onBlur?: (val: string) => boolean | void;
  options: { value: string; label: string; item: any }[];
  minChars: number;
  isLocked: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const [localVal, setLocalVal] = useState(value || "");
  const isSelectingRef = useRef(false);

  useEffect(() => {
    setLocalVal(value || "");
  }, [value]);

  const filtered = options.filter((o) =>
    String(o.value || "").toLowerCase().includes(localVal.toLowerCase()),
  );

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={localVal}
        onChange={(e) => {
          const newVal = e.target.value;
          setLocalVal(newVal);
          onChange(newVal);
          if (newVal.length >= minChars) {
            setShow(true);
          } else {
            setShow(false);
          }
        }}
        onFocus={() => {
          if (localVal.length >= minChars) setShow(true);
        }}
        onBlur={() => {
          setTimeout(() => setShow(false), 200);
          if (!isSelectingRef.current && onBlur) {
            const success = onBlur(localVal);
            if (success === false) {
              setLocalVal(value || "");
              onChange(value || "");
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            isSelectingRef.current = true;
            // First check if the exact typed value matches an option.
            const exactMatch = filtered.find(o => (o.value || '').toLowerCase() === localVal.toLowerCase());
            
            let success;
            if (exactMatch) {
                success = onSelect(exactMatch.item);
            } else if (onBlur) {
                // Not picking from dropdown, just commit the text
                success = onBlur(localVal);
            } else {
                success = onSelect(localVal);
            }

            if (success === false) {
              setLocalVal(value || "");
              onChange(value || "");
            }
            setShow(false);
            setTimeout(() => { isSelectingRef.current = false; }, 200);
          }
        }}
        disabled={isLocked}
        className={cn(
          "bg-transparent border-0 text-slate-300 w-full outline-none",
          isLocked
            ? "bg-transparent opacity-50 cursor-not-allowed"
            : "cursor-text bg-slate-900/80 hover:bg-slate-800 transition-colors focus:bg-brand-600/20 focus:text-white rounded px-3 py-1.5 shadow-inner shadow-black/40 border border-slate-700/50 hover:border-slate-500 focus:border-brand-500/50",
        )}
        placeholder={placeholder}
      />
      {show && filtered.length > 0 && !isLocked && (
        <div className="absolute z-[9999] top-full left-0 mt-1 max-h-48 overflow-y-auto w-max min-w-full bg-slate-800 border border-slate-700 rounded shadow-xl">
          {filtered.map((opt, i) => (
            <div
              key={i}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input from losing focus immediately
                isSelectingRef.current = true;
                const success = onSelect(opt.item);
                if (success === false) {
                  setLocalVal(value || "");
                  onChange(value || "");
                }
                setShow(false);
                setTimeout(() => { isSelectingRef.current = false; }, 200);
              }}
              className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-xs flex flex-col gap-0.5"
            >
              <span className="font-medium text-brand-400">{opt.value || "-"}</span>
              {opt.label && (
                <span className="text-[10px] text-slate-300">{opt.label}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
