import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchableDropdown = ({ label, options, value, onChange, placeholder = 'Search...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">{label}</label>}
      
      {/* Selected Box */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 flex items-center justify-between cursor-pointer hover:border-teal-500 transition-colors"
      >
        <span className={`text-sm ${selectedOption ? 'text-slate-900' : 'text-slate-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <ul className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-sm text-center text-slate-500">No results found</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer mb-0.5 ${
                    opt.value === value 
                      ? 'bg-teal-50 text-teal-700 font-medium' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="h-4 w-4 text-teal-600" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
