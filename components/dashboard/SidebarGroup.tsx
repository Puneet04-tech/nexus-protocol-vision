import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { NavigationGroup } from '../../types/dashboard';
import SidebarItem from './SidebarItem';

interface SidebarGroupProps {
  group: NavigationGroup;
  isCollapsed: boolean;
}

/**
 * SidebarGroup component represents a categorized section of sidebar items.
 * Supports manual collapse/expand animations for desktop views.
 */
const SidebarGroup: React.FC<SidebarGroupProps> = ({ group, isCollapsed }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  const toggleExpand = () => {
    if (!isCollapsed) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div className="mb-4">
      {/* Category Header */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-2" aria-hidden="true">
          <div className="text-lg mb-1 filter drop-shadow-md select-none" title={group.name}>
            {group.icon}
          </div>
          <div className="w-8 border-b border-gray-800/80 my-1"></div>
        </div>
      ) : (
        <button
          onClick={toggleExpand}
          className="w-full flex items-center justify-between px-6 py-2 text-gray-500 hover:text-gray-300 font-bold uppercase text-[10px] tracking-wider select-none focus:outline-none focus-visible:text-gray-200 transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`group-content-${group.id}`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm tracking-normal">{group.icon}</span>
            <span>{group.name}</span>
          </div>
          <div>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      )}

      {/* Category Items */}
      {isCollapsed ? (
        // Flat icon list in collapsed mode
        <div>
          {group.items.map((item) => (
            <SidebarItem key={item.path} item={item} isCollapsed={isCollapsed} />
          ))}
        </div>
      ) : (
        // Collapsible list with framer-motion animations
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={`group-content-${group.id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="py-1">
                {group.items.map((item) => (
                  <SidebarItem key={item.path} item={item} isCollapsed={isCollapsed} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default React.memo(SidebarGroup);
