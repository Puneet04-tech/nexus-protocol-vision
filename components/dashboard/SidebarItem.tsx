import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { NavigationItem } from '../../types/dashboard';

interface SidebarItemProps {
  item: NavigationItem;
  isCollapsed: boolean;
}

/**
 * Renders a single sidebar link item.
 * Integrates active state styling based on matching path, custom hover tooltips 
 * when the sidebar is collapsed, and full keyboard accessibility.
 */
const SidebarItem: React.FC<SidebarItemProps> = ({ item, isCollapsed }) => {
  const location = useLocation();
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const Icon = item.icon;

  const isActive = location.pathname === item.path;

  // Determine classes based on active state and theme
  const itemClasses = isActive
    ? `${themeClasses.bg} text-white font-semibold shadow-lg ${themeClasses.shadow}`
    : 'text-gray-400 hover:text-white hover:bg-gray-800/60';

  return (
    <div className="relative group/item my-1 px-3">
      <Link
        to={item.path}
        className={`flex items-center rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 ${themeClasses.focusRing} ${
          isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
        } ${itemClasses}`}
        aria-label={item.name}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover/item:scale-110 ${isActive ? 'text-white' : themeClasses.text}`} />
        
        {!isCollapsed && (
          <span className="text-sm truncate font-medium tracking-wide">
            {item.name}
          </span>
        )}
      </Link>

      {/* Futuristic Hover Tooltip (Only visible when sidebar is collapsed) */}
      {isCollapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-gray-950/95 border border-gray-800 rounded-md text-xs font-semibold text-white whitespace-nowrap opacity-0 pointer-events-none translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:pointer-events-auto transition-all duration-200 z-50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-1.5">
            <span className={`w-1 h-1 rounded-full ${themeClasses.bg}`}></span>
            <span>{item.name}</span>
          </div>
          <span className="text-[10px] text-gray-500 font-normal block mt-0.5">
            {item.description}
          </span>
        </div>
      )}
    </div>
  );
};

export default React.memo(SidebarItem);
