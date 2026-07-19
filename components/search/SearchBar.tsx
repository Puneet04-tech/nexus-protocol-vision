import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchContext } from '../../contexts/SearchContext';

/**
 * Global Search Entry bar trigger located in the navigation header.
 * Adapts shortcut hints based on OS env (macOS vs Windows/Linux).
 */
export const SearchBar: React.FC = () => {
  const { setIsOpen } = useSearchContext();
  const [shortcutKey, setShortcutKey] = useState('Ctrl K');

  useEffect(() => {
    // Detect macOS platform to render Cmd instead of Ctrl
    if (typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')) {
      setShortcutKey('⌘K');
    }
  }, []);

  return (
    <button
      id="nexus-search-bar-btn"
      onClick={() => setIsOpen(true)}
      aria-label="Open Universal Search & Command Palette"
      className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-slate-400 hover:text-slate-200 select-none cursor-pointer w-full sm:w-auto"
    >
      <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="text-xs font-semibold tracking-wide hidden lg:inline-block">Search...</span>
      <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 shadow-inner select-none font-bold">
        {shortcutKey}
      </kbd>
    </button>
  );
};

export default SearchBar;
