import React from 'react';

/**
 * Interface representing a single page navigation item in the sidebar.
 */
export interface NavigationItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

/**
 * Interface representing a categorized group of navigation items.
 */
export interface NavigationGroup {
  id: string;
  name: string;
  icon: string;
  items: NavigationItem[];
}

/**
 * Interface representing a result returned from global search filtering.
 */
export interface SearchResult {
  item: NavigationItem;
  groupName: string;
}
