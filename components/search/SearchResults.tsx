import React from 'react';
import { Sparkles, Terminal, Cpu, Layers, BookOpen, Search } from 'lucide-react';
import { SearchItem as SearchItemType, SearchCategory } from '../../types/search';
import SearchItem from './SearchItem';

interface SearchResultsProps {
  results: SearchItemType[];
  selectedIndex: number;
  onItemClick: (item: SearchItemType) => void;
  selectedCategory: SearchCategory | 'all';
  onCategoryChange: (category: SearchCategory | 'all') => void;
}

interface CategoryFilterTab {
  id: SearchCategory | 'all';
  label: string;
  icon: React.ReactNode;
}

/**
 * Handles category filter tab UI selection and displays filtered result rows.
 */
export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  selectedIndex,
  onItemClick,
  selectedCategory,
  onCategoryChange
}) => {
  const tabs: CategoryFilterTab[] = [
    { id: 'all', label: 'All', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'page', label: 'Pages', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'module', label: 'Modules', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'doc', label: 'Documentation', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'marketplace', label: 'Marketplace', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'plugin', label: 'Plugins', icon: <Terminal className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Category Tabs Scrollbar */}
      <div className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900/30 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex-shrink-0 select-none">
        {tabs.map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              id={`nexus-search-filter-${tab.id}`}
              onClick={() => onCategoryChange(tab.id)}
              className={`
                flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer
                ${isActive 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[380px] min-h-0">
        {results.length > 0 ? (
          <div className="space-y-1.5" id="nexus-search-results-list" role="listbox">
            {results.map((item, index) => (
              <SearchItem
                key={item.id}
                id={`nexus-search-result-${item.id}`}
                item={item}
                isActive={selectedIndex === index}
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 flex-shrink-0">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-500">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white tracking-wide">No results found</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Check spelling, clear active filters, or try another search term.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info bar */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-500 flex justify-between font-mono flex-shrink-0">
        <span>Found {results.length} item{results.length !== 1 ? 's' : ''}</span>
        <span className="hidden sm:inline">Use ↑↓ keys to navigate, ↵ to navigate, ESC to close</span>
      </div>
    </div>
  );
};

export default SearchResults;
