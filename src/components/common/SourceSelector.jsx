import React from 'react';
import { ChevronDown } from 'lucide-react';

const SourceSelector = ({ options, currentId, onSelect, className = '' }) => {
    const selectedOption = options.find(o => o.id === currentId) || options[0];

    return (
        <div className={`relative group ${className}`}>
            {/* Custom Visual UI */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-full group-hover:border-white/20 transition-all cursor-pointer min-w-[200px] justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Source</span>
                    <span className="text-white font-bold text-sm tracking-wide truncate max-w-[120px]">
                        {selectedOption.name}
                    </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            {/* Hidden Native Select for functionality */}
            <select
                value={currentId}
                onChange={(e) => onSelect(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10"
            >
                {options.map((option) => (
                    <option key={option.id} value={option.id} className="bg-gray-900 text-white">
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default SourceSelector;
