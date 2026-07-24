import React from 'react';
import { Cpu, Layers, BookOpen, Sparkles, Terminal, CornerDownLeft } from 'lucide-react';
import { SearchItem as SearchItemType } from '../../types/search';

interface SearchItemProps {
  item: SearchItemType;
  isActive: boolean;
  onClick: () => void;
  id?: string;
}

/**
 * Renders a single search result item in the Command Palette list.
 * React.memo avoids re-rendering unaffected items when scrolling with arrow keys.
 */
export const SearchItem: React.FC<SearchItemProps> = React.memo(({ item, isActive, onClick, id }) => {
  // Get corresponding icon for the item category
  const getCategoryIcon = () => {
    switch (item.type) {
      case 'module':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      case 'page':
        return <Layers className="w-5 h-5 text-blue-400" />;
      case 'doc':
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case 'marketplace':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'plugin':
        return <Terminal className="w-5 h-5 text-cyan-400" />;
      default:
        return <Layers className="w-5 h-5 text-slate-400" />;
    }
  };

  // Get human-friendly label for categories
  const getCategoryLabel = () => {
    switch (item.type) {
      case 'module':
        return 'Core Module';
      case 'page':
        return 'App Page';
      case 'doc':
        return 'Document';
      case 'marketplace':
        return 'Marketplace Agent';
      case 'plugin':
        return 'SDK Plugin';
      default:
        return item.type;
    }
  };

  return (
    <div
      id={id}
      onClick={onClick}
      role="option"
      aria-selected={isActive}
      className={`
        flex items-center justify-between p-3.5 rounded-xl cursor-pointer select-none transition-all duration-150 border
        ${isActive 
          ? 'bg-slate-800/80 border-slate-700/80 shadow-md shadow-slate-950/20 translate-x-1' 
          : 'bg-transparent border-transparent hover:bg-slate-900/40 hover:border-slate-800/50'}
      `}
    >
      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
        {/* Category Icon */}
        <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center`}>
          {getCategoryIcon()}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white tracking-wide truncate">
              {item.title}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-400">
              {getCategoryLabel()}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Action Indicator */}
      <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
        {isActive ? (
          <div className="flex items-center space-x-1.5 text-xs text-cyan-400 font-mono">
            <span className="text-[10px] hidden sm:inline opacity-70">Go</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="w-3.5 h-3.5" />
        )}
      </div>
    </div>
  );
});

SearchItem.displayName = 'SearchItem';
export default SearchItem;
