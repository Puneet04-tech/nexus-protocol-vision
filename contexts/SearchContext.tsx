import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SearchItem, FrequentlyVisited } from '../types/search';

interface SearchContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  frequentlyVisited: FrequentlyVisited[];
  trackVisit: (item: SearchItem) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

/**
 * Context Provider wrapping the application to hold open state,
 * global keyboard hooks, and local search/navigation statistics.
 */
export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  // LocalStorage state for recent searches (limit to 10)
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>('nexus-recent-searches', []);

  // LocalStorage state for frequently visited items (limit to 10)
  const [frequentlyVisited, setFrequentlyVisited] = useLocalStorage<FrequentlyVisited[]>('nexus-frequent-visits', []);

  // 1. Listen for global keyboard shortcuts (Ctrl+K / Cmd+K) to toggle palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // 2. Add queries to recent search history
  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered];
      return updated.slice(0, 10);
    });
  }, [setRecentSearches]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

  // 3. Track visits to calculate frequently visited list sorted by visit frequency
  const trackVisit = useCallback((item: SearchItem) => {
    setFrequentlyVisited(prev => {
      const existingIdx = prev.findIndex(v => v.id === item.id);
      let updated: FrequentlyVisited[];

      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        const refreshed: FrequentlyVisited = {
          ...existing,
          count: existing.count + 1,
          lastVisited: Date.now(),
          title: item.title,
          url: item.url
        };
        const next = [...prev];
        next[existingIdx] = refreshed;
        updated = next;
      } else {
        const newVisit: FrequentlyVisited = {
          id: item.id,
          type: item.type,
          title: item.title,
          url: item.url,
          count: 1,
          lastVisited: Date.now()
        };
        updated = [...prev, newVisit];
      }

      // Sort by count descending, then by lastVisited descending
      return updated
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return b.lastVisited - a.lastVisited;
        })
        .slice(0, 10);
    });
  }, [setFrequentlyVisited]);

  return (
    <SearchContext.Provider
      value={{
        isOpen,
        setIsOpen,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
        frequentlyVisited,
        trackVisit
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearchContext = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
};
export default SearchContext;
