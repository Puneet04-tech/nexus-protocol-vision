export type SearchCategory = 'module' | 'page' | 'doc' | 'marketplace' | 'plugin';

export interface SearchItem {
  id: string;
  type: SearchCategory;
  title: string;
  description: string;
  url?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
}

export interface FrequentlyVisited {
  id: string;
  type: SearchCategory;
  title: string;
  url?: string;
  count: number;
  lastVisited: number;
}

export interface SearchState {
  query: string;
  results: SearchItem[];
  recentSearches: RecentSearch[];
  frequentlyVisited: FrequentlyVisited[];
}
