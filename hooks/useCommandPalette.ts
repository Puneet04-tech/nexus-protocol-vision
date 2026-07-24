import { useState, useCallback, useEffect } from 'react';
import { useSearchContext } from '../contexts/SearchContext';

export interface UseCommandPaletteResult {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  frequentlyVisited: any[];
  trackVisit: (item: any) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent | KeyboardEvent, itemsLength: number, onSelect: (index: number) => void) => void;
}

/**
 * Custom React hook consumed by components to access search states and manage
 * focus index offsets for active results.
 */
export function useCommandPalette(): UseCommandPaletteResult {
  const context = useSearchContext();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection index whenever the palette view toggles
  useEffect(() => {
    setSelectedIndex(0);
  }, [context.isOpen]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent | KeyboardEvent,
    itemsLength: number,
    onSelect: (index: number) => void
  ) => {
    if (!context.isOpen || itemsLength === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % itemsLength);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + itemsLength) % itemsLength);
        break;
      case 'Enter':
        e.preventDefault();
        onSelect(selectedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        context.setIsOpen(false);
        break;
      default:
        break;
    }
  }, [context.isOpen, context.setIsOpen, selectedIndex]);

  return {
    ...context,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown
  };
}
export default useCommandPalette;
