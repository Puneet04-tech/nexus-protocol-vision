import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { NAVIGATION_GROUPS } from '../../utils/navigation';
import { SearchResult } from '../../types/dashboard';

/**
 * Global SearchBar component.
 * Allows quick navigation lookup across all modules.
 * Implements keyboard shortcuts (Ctrl+K), keyboard navigation, and responsive styles.
 */
const SearchBar: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const navigate = useNavigate();
  
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten navigation items for quick search indexing
  const searchableItems = useMemo(() => {
    const items: SearchResult[] = [];
    NAVIGATION_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        items.push({ item, groupName: group.name });
      });
    });
    return items;
  }, []);

  // Filter items based on query
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return searchableItems.filter(
      (result) =>
        result.item.name.toLowerCase().includes(lowerQuery) ||
        result.item.description.toLowerCase().includes(lowerQuery) ||
        result.groupName.toLowerCase().includes(lowerQuery)
    );
  }, [query, searchableItems]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Global Ctrl+K / Cmd+K listener to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard navigation within the dropdown results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredResults[activeIndex];
      if (selected) {
        handleNavigate(selected.item.path);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md" onKeyDown={handleKeyDown}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4.5 h-4.5 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search navigation... (Ctrl+K)"
          className={`w-full bg-gray-900/60 border border-gray-800 text-white rounded-lg pl-10 pr-12 py-2 text-sm focus:outline-none focus:border-gray-700 focus:ring-1 ${themeClasses.focusRing} transition-all`}
          aria-expanded={isOpen && filteredResults.length > 0}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        {/* Helper Badge / Clear Button */}
        {query ? (
          <button
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white focus:outline-none"
            aria-label="Clear search query"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="absolute right-3 hidden sm:inline-flex items-center gap-0.5 h-5 select-none pointer-events-none px-1.5 font-mono text-[10px] font-medium text-gray-500 bg-gray-800 rounded border border-gray-700/80">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim() !== '' && (
        <div className="absolute left-0 right-0 mt-2 bg-gray-950/95 border border-gray-800 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden z-50 max-h-[360px] flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800/80 text-[10px] text-gray-500 uppercase tracking-widest font-mono flex justify-between">
            <span>Search Results</span>
            <span>{filteredResults.length} found</span>
          </div>

          <ul
            role="listbox"
            className="overflow-y-auto flex-1 py-1 divide-y divide-gray-900 scrollbar-thin"
          >
            {filteredResults.length > 0 ? (
              filteredResults.map((result, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <li
                    key={result.item.path}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleNavigate(result.item.path)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-gray-800/50 text-white'
                        : 'text-gray-300 hover:bg-gray-900/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`p-1.5 rounded bg-gray-900 border border-gray-800 text-gray-400 group-hover:text-white ${isSelected ? 'text-white border-gray-700' : ''}`}>
                        <result.item.icon className={`w-4 h-4 ${isSelected ? themeClasses.text : ''}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold truncate block">
                          {result.item.name}
                        </span>
                        <span className="text-xs text-gray-500 truncate block font-normal">
                          {result.item.description}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-gray-900 rounded border border-gray-800/60 text-gray-400 uppercase">
                        {result.groupName}
                      </span>
                      {isSelected && (
                        <CornerDownLeft className={`w-3.5 h-3.5 ${themeClasses.text} animate-pulse`} />
                      )}
                    </div>
                  </li>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">No modules found matching "{query}"</p>
                <p className="text-xs mt-1">Try searching for other terms like Persona or Security.</p>
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
