import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  unit?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, unit }) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1 font-bold text-sm tracking-wider text-[#ff8906]">
        <label className="uppercase">{label}</label>
        <span className="text-[#fffffe]">{value}{unit ? unit : ''}</span>
      </div>
      <div className="relative h-6 w-full bg-slate-800 border border-slate-600">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute top-0 left-0 h-full bg-[#f25f4c] border-r-2 border-white pointer-events-none"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          ></div>
          {/* Grid lines for decoration */}
          <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1 pointer-events-none opacity-30">
              {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-px h-full bg-slate-400"></div>
              ))}
          </div>
      </div>
    </div>
  );
};