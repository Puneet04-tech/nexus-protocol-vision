import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '../../hooks/useSearch';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';
import RecentSearches from './RecentSearches';
import { SearchItem as SearchItemType } from '../../types/search';

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
 * Floating Command Palette Modal Dialog.
 * Animates with scale/opacity fade and traps focus inside the input.
 */
export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    isOpen,
    setIsOpen,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    frequentlyVisited,
    trackVisit,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown
  } = useCommandPalette();

  const {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    results
  } = useSearch();

  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute the current set of items that are navigateable based on the query state
  const currentNavigableItems = useMemo<SearchItemType[]>(() => {
    if (!query.trim()) {
      if (frequentlyVisited.length > 0) {
        return frequentlyVisited.map(fv => ({
          id: fv.id,
          type: fv.type,
          title: fv.title,
          description: '',
          url: fv.url
        }));
      }
      return DEFAULT_SUGGESTIONS;
    }
    return results;
  }, [query, results, frequentlyVisited]);

  // Adjust selection bounds when query or results count changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory, setSelectedIndex]);

  // Navigate to target item and log stats
  const handleItemSelect = (item: SearchItemType) => {
    if (item.url) {
      navigate(item.url);
    }
    trackVisit(item);
    if (query.trim()) {
      addRecentSearch(query);
    }
    setQuery('');
    setIsOpen(false);
  };

  // Input keydown dispatcher
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleKeyDown(e, currentNavigableItems.length, (index) => {
      const selectedItem = currentNavigableItems[index];
      if (selectedItem) {
        handleItemSelect(selectedItem);
      }
    });
  };

  // Close on outside click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      setIsOpen(false);
    }
  };

  // Close modal when path change triggers
  useEffect(() => {
    setIsOpen(false);
  }, [navigate]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          id="nexus-command-palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex justify-center items-start pt-[10vh] px-4 select-none"
        >
          <motion.div
            ref={containerRef}
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-slate-900 border border-slate-800/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-cyan-950/15 flex flex-col min-h-0 focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-label="Universal Search & Command Palette"
          >
            {/* Search Input Box */}
            <SearchInput
              value={query}
              onChange={setQuery}
              onKeyDown={onInputKeyDown}
              onClose={() => setIsOpen(false)}
            />

            {/* List Body wrapper */}
            <div className="flex-1 overflow-hidden min-h-0">
              {!query.trim() ? (
                <RecentSearches
                  recentSearches={recentSearches}
                  onSearchClick={setQuery}
                  onClearRecent={clearRecentSearches}
                  frequentlyVisited={frequentlyVisited}
                  onVisitClick={handleItemSelect}
                  selectedIndex={selectedIndex}
                />
              ) : (
                <SearchResults
                  results={results}
                  selectedIndex={selectedIndex}
                  onItemClick={handleItemSelect}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
