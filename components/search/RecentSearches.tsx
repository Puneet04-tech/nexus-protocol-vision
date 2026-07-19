import React from 'react';
import { History, Sparkles, Trash2, Clock } from 'lucide-react';
import { FrequentlyVisited, SearchItem as SearchItemType } from '../../types/search';
import SearchItem from './SearchItem';

interface RecentSearchesProps {
  recentSearches: string[];
  onSearchClick: (query: string) => void;
  onClearRecent: () => void;
  frequentlyVisited: FrequentlyVisited[];
  onVisitClick: (item: SearchItemType) => void;
  selectedIndex: number;
}

// Pre-defined default suggestions when frequentlyVisited is empty
const DEFAULT_SUGGESTIONS: SearchItemType[] = [
  {
    id: 'page-home',
    type: 'page',
    title: 'Home Dashboard',
    description: 'Nexus Protocol Vision Main Dashboard showcasing the system paradigm.',
    url: '/'
  },
  {
    id: 'page-sovereign-persona',
    type: 'page',
    title: 'Sovereign Persona Profile',
    description: 'Local-first digital twin and cognitive identity manager.',
    url: '/sovereign-persona'
  },
  {
    id: 'page-cognitive-graph',
    type: 'page',
    title: 'Cognitive Graph Visualizer',
    description: 'Dynamic mapping representing concepts and learning paths.',
    url: '/cognitive-graph'
  },
  {
    id: 'page-marketplace',
    type: 'page',
    title: 'AI Agent Marketplace',
    description: 'Explore, verify, and download sandboxed AI utility agents.',
    url: '/marketplace'
  }
];

/**
 * Renders the default empty query state showing search history
 * and frequently visited destinations (or default suggestions).
 */
export const RecentSearches: React.FC<RecentSearchesProps> = ({
  recentSearches,
  onSearchClick,
  onClearRecent,
  frequentlyVisited,
  onVisitClick,
  selectedIndex
}) => {
  // Convert frequently visited items or default suggestions to SearchItemType list
  const displayItems = React.useMemo<SearchItemType[]>(() => {
    if (frequentlyVisited.length > 0) {
      return frequentlyVisited.map(fv => ({
        id: fv.id,
        type: fv.type,
        title: fv.title,
        description: `Visited ${fv.count} time${fv.count > 1 ? 's' : ''}. Last active ${new Date(fv.lastVisited).toLocaleDateString()}`,
        url: fv.url
      }));
    }
    return DEFAULT_SUGGESTIONS;
  }, [frequentlyVisited]);

  return (
    <div className="p-4 space-y-6 max-h-[450px] overflow-y-auto">
      {/* 1. RECENT SEARCH QUERIES */}
      {recentSearches.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center">
              <History className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Recent Searches</span>
            </span>
            <button
              onClick={onClearRecent}
              id="nexus-clear-recent-btn"
              className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center transition-colors font-mono"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear History
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentSearches.map((query, index) => (
              <button
                key={index}
                onClick={() => onSearchClick(query)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all cursor-pointer font-sans"
              >
                <Clock className="w-3 h-3 mr-1.5 text-slate-500" />
                <span>{query}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. FREQUENTLY VISITED / RECOMMENDATIONS */}
      <div className="space-y-3">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center px-1">
          {frequentlyVisited.length > 0 ? (
            <>
              <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Frequently Visited Destinations</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-slate-500 animate-pulse" />
              <span>Suggested Destinations</span>
            </>
          )}
        </span>

        <div className="space-y-1.5" id="nexus-search-results-list" role="listbox">
          {displayItems.map((item, index) => (
            <SearchItem
              key={item.id}
              id={`nexus-search-result-${item.id}`}
              item={item}
              isActive={selectedIndex === index}
              onClick={() => onVisitClick(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentSearches;
