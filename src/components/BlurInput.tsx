import React, { useState, useEffect } from "react";
import { cn } from "../lib/utils";

export default function BlurInput({
  value,
  onChange,
  isLocked,
  className,
  type = "text",
  placeholder = "..."
}: {
  value: string | number;
  onChange: (val: string) => void;
  isLocked?: boolean;
  className?: string;
  type?: string;
  placeholder?: string;
}) {
  const [localVal, setLocalVal] = useState(value === 0 ? '' : value || '');

  useEffect(() => {
    setLocalVal(value === 0 ? '' : value || '');
  }, [value]);

  return (
    <input
      type={type}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => {
        if (localVal !== value && localVal !== (value === 0 ? '' : value || '')) {
          onChange(localVal as string);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (localVal !== value && localVal !== (value === 0 ? '' : value || '')) {
            onChange(localVal as string);
          }
          (e.target as HTMLInputElement).blur();
        }
      }}
      disabled={isLocked}
      className={className}
      placeholder={placeholder}
    />
  );
}
