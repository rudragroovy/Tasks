'use client';

import { useState } from 'react';

export default function FilterPills({ 
  currentFilter, 
  currentStatus, 
  currentTrend,
  currentWeight,
  currentDiet
}: { 
  currentFilter: string;
  currentStatus: string;
  currentTrend: string;
  currentWeight: string;
  currentDiet: string;
}) {
  const [showAdvanced, setShowAdvanced] = useState(!!currentStatus || !!currentTrend || !!currentWeight || !!currentDiet);

  // Core visible categories
  const mainCategories = ['Mammals', 'Birds', 'Reptiles', 'Amphibians', 'Fish', 'Invertebrates', 'Plants'];

  const renderPill = (cat: string) => {
    const isActive = currentFilter === cat;
    return (
      <label key={cat} className={`cursor-pointer transition-all duration-300 rounded-full px-6 py-2 font-bold text-sm border shadow-sm hover:-translate-y-1 ${
        isActive
          ? 'bg-[#1B5E4A] border-[#D1D5DB] text-[#FFFFFF] shadow-md scale-105' 
          : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#EAF4EF]'
      }`}>
        <input 
          type="radio" 
          name="type" 
          value={cat} 
          className="hidden" 
          defaultChecked={isActive} 
        />
        {cat}
      </label>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
      {/* Primary Row */}
      <div className="flex flex-wrap justify-center gap-3 w-full">
        {/* Deselect / Reset option disguised as a hidden radio to allow clearing filters */}
        <input type="radio" name="type" value="" className="hidden" defaultChecked={!currentFilter} />
        
        {mainCategories.map(renderPill)}
        
        <button 
          type="button" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="cursor-pointer transition-all duration-300 rounded-full px-6 py-2 font-bold text-sm border shadow-sm bg-[#F8FAF8] border-[#E5E7EB] text-[#0F766E] hover:bg-[#EAF4EF] flex items-center gap-2"
        >
          <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          Advanced Filters
        </button>
      </div>

      {/* Advanced Row */}
      {showAdvanced && (
        <div className="flex flex-wrap justify-center gap-6 w-full p-6 bg-[#F8FAF8] border border-[#E5E7EB] rounded-[24px] animate-in fade-in slide-in-from-top-2">
          
          {/* Conservation Status */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <label className="text-[12px] font-bold uppercase tracking-widest text-[#6B7280]">Conservation Status</label>
            <div className="relative">
              <select name="status" defaultValue={currentStatus} className="appearance-none w-full bg-[#FFFFFF] border border-[#D1D5DB] text-[#1A1A1A] text-[14px] rounded-xl px-4 py-3 pr-10 focus:border-[#1B5E4A] focus:ring-2 focus:ring-[#1B5E4A]/20 outline-none shadow-sm cursor-pointer hover:border-[#1B5E4A] transition-all">
                <option value="">Any Status</option>
                <option value="Least Concern">Least Concern</option>
                <option value="Near Threatened">Near Threatened</option>
                <option value="Vulnerable">Vulnerable</option>
                <option value="Endangered">Endangered</option>
                <option value="Critically Endangered">Critically Endangered</option>
              </select>
              <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* Population Trend */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <label className="text-[12px] font-bold uppercase tracking-widest text-[#6B7280]">Population Trend</label>
            <div className="relative">
              <select name="trend" defaultValue={currentTrend} className="appearance-none w-full bg-[#FFFFFF] border border-[#D1D5DB] text-[#1A1A1A] text-[14px] rounded-xl px-4 py-3 pr-10 focus:border-[#1B5E4A] focus:ring-2 focus:ring-[#1B5E4A]/20 outline-none shadow-sm cursor-pointer hover:border-[#1B5E4A] transition-all">
                <option value="">Any Trend</option>
                <option value="Increasing">Increasing</option>
                <option value="Stable">Stable</option>
                <option value="Decreasing">Decreasing</option>
              </select>
              <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* Weight / Size */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <label className="text-[12px] font-bold uppercase tracking-widest text-[#6B7280]">Weight / Size</label>
            <div className="relative">
              <select name="weight" defaultValue={currentWeight} className="appearance-none w-full bg-[#FFFFFF] border border-[#D1D5DB] text-[#1A1A1A] text-[14px] rounded-xl px-4 py-3 pr-10 focus:border-[#1B5E4A] focus:ring-2 focus:ring-[#1B5E4A]/20 outline-none shadow-sm cursor-pointer hover:border-[#1B5E4A] transition-all">
                <option value="">Any Weight</option>
                <option value="light">Light (&lt; 10 kg)</option>
                <option value="medium">Medium (10 - 100 kg)</option>
                <option value="heavy">Heavy (&gt; 100 kg)</option>
              </select>
              <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* Diet */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <label className="text-[12px] font-bold uppercase tracking-widest text-[#6B7280]">Diet</label>
            <div className="relative">
              <select name="diet" defaultValue={currentDiet} className="appearance-none w-full bg-[#FFFFFF] border border-[#D1D5DB] text-[#1A1A1A] text-[14px] rounded-xl px-4 py-3 pr-10 focus:border-[#1B5E4A] focus:ring-2 focus:ring-[#1B5E4A]/20 outline-none shadow-sm cursor-pointer hover:border-[#1B5E4A] transition-all">
                <option value="">Any Diet</option>
                <option value="carnivore">Carnivore</option>
                <option value="herbivore">Herbivore</option>
                <option value="omnivore">Omnivore</option>
                <option value="insectivore">Insectivore</option>
              </select>
              <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
