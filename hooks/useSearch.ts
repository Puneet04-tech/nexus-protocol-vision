import { useState, useMemo } from 'react';
import { SearchItem, SearchCategory } from '../types/search';
import { buildSearchIndex } from '../utils/searchIndex';
import { fuzzySearch } from '../utils/searchHelpers';

export interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  selectedCategory: SearchCategory | 'all';
  setSelectedCategory: (category: SearchCategory | 'all') => void;
  results: SearchItem[];
  fullIndex: SearchItem[];
}

/**
 * Custom React hook that coordinates client-side search querying and scoring.
 * Employs memoization to isolate search index rebuilds and query scans.
 */
export function useSearch(): UseSearchResult {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory | 'all'>('all');

  // Build the search index. Note: built dynamically but memoized to reduce overhead.
  const fullIndex = useMemo(() => {
    return buildSearchIndex();
  }, [query === '' /* Rebuild index only when search query is cleared/re-opened */]);

  // Filter the index by the selected category before executing search matching
  const filteredIndex = useMemo(() => {
    if (selectedCategory === 'all') return fullIndex;
    return fullIndex.filter(item => item.type === selectedCategory);
  }, [fullIndex, selectedCategory]);

  // Compute search results via fuzzy matching
  const results = useMemo(() => {
    return fuzzySearch(filteredIndex, query);
  }, [filteredIndex, query]);

  return {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    results,
    fullIndex
  };
}
export default useSearch;
