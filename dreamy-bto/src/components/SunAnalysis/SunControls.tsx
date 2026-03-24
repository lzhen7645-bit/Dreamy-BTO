import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SunControlsProps {
  month: number;
  setMonth: (month: number) => void;
  timeMode: 'morning' | 'afternoon';
  setTimeMode: (mode: 'morning' | 'afternoon') => void;
}

export const SunControls: React.FC<SunControlsProps> = ({ 
  month, 
  setMonth, 
  timeMode, 
  setTimeMode 
}) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  return (
    <div className="bg-[#fdfcf9] border border-[#d4a373]/10 rounded-3xl p-8 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div className="text-lg font-serif font-medium text-gray-800">
          Analysis Date: <span className="text-[#d4a373]">21 {months[month]}</span>
        </div>
        <div className="text-[11px] font-bold text-[#5a5a40] uppercase tracking-[0.2em]">
          {timeMode === 'morning' ? 'Morning Session (9:00)' : 'Afternoon Session (15:00)'}
        </div>
      </div>

      {/* Month Slider */}
      <div className="relative pt-4 pb-8">
        <input
          type="range"
          min="0"
          max="11"
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#5a5a40]"
        />
        <div className="flex justify-between mt-4 px-1">
          {monthLabels.map((label, i) => (
            <span 
              key={i} 
              className={cn(
                "text-[10px] font-bold tracking-tighter transition-colors",
                month === i ? "text-[#5a5a40]" : "text-gray-300"
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Morning / Afternoon Toggle */}
      <div className="flex bg-gray-100/50 p-1.5 rounded-full w-fit border border-gray-100">
        <button
          onClick={() => setTimeMode('morning')}
          className={cn(
            "px-8 py-2.5 rounded-full text-xs font-bold transition-all tracking-widest uppercase",
            timeMode === 'morning' ? "bg-white text-[#5a5a40] shadow-sm" : "text-gray-400 hover:text-gray-600"
          )}
        >
          Morning
        </button>
        <button
          onClick={() => setTimeMode('afternoon')}
          className={cn(
            "px-8 py-2.5 rounded-full text-xs font-bold transition-all tracking-widest uppercase",
            timeMode === 'afternoon' ? "bg-[#d4a373] text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
          )}
        >
          Afternoon
        </button>
      </div>
    </div>
  );
};
