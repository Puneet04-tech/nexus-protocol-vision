import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClose: () => void;
  placeholder?: string;
}

/**
 * Text box input representing search entries in the Command Palette.
 * Autofocuses on mounting and handles clearing and close shortcuts.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onKeyDown,
  onClose,
  placeholder = "Search modules, pages, whitepapers, agents..."
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative flex items-center border-b border-slate-800 bg-slate-900/60 p-4">
      {/* Search Icon */}
      <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />

      {/* Actual Input Tag */}
      <input
        ref={inputRef}
        type="text"
        id="nexus-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-0 focus:border-transparent leading-relaxed"
        autoComplete="off"
        spellCheck="false"
        role="combobox"
        aria-expanded="true"
        aria-controls="nexus-search-results-list"
        aria-autocomplete="list"
      />

      {/* Clear or Close Button */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {value ? (
          <button
            onClick={handleClear}
            id="nexus-search-clear-btn"
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Clear Search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
        
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-950 border border-slate-800 select-none">
          ESC
        </kbd>
      </div>
    </div>
  );
};

export default SearchInput;
