import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

const PREDEFINED_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#78716c', // stone
];

export function ColorPicker({ 
  color, 
  onChange, 
  className 
}: { 
  color: string; 
  onChange: (color: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = React.useId();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded-full flex items-center justify-center border border-slate-600 hover:ring-2 hover:ring-brand-500 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
        style={{ backgroundColor: color }}
        aria-label="Select color"
        title="Select color"
        type="button"
      />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[9999] left-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 w-[200px] flex flex-col gap-3"
          >
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Predefined Colors
            </div>
            <div className="grid grid-cols-5 gap-2">
              {PREDEFINED_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                  className="w-7 h-7 rounded flex items-center justify-center hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-500 shadow-sm"
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <Check size={12} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="h-px bg-slate-700 w-full" />
            
            <div className="flex items-center gap-2">
              <label htmlFor={uniqueId} className="text-xs text-slate-300 font-medium flex-1">
                Custom Color
              </label>
              <input
                id={uniqueId}
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
