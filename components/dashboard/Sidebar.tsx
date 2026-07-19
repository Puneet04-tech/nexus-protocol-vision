import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { useSidebar } from '../../hooks/useSidebar';
import { NAVIGATION_GROUPS } from '../../utils/navigation';
import { NexusLogoIcon } from '../icons';
import SidebarGroup from './SidebarGroup';
import { Link } from 'react-router-dom';

/**
 * Sidebar component.
 * Displays navigation items grouped by categories.
 * Adapts to desktop (collapsible sidebar) and mobile (overlay drawer).
 */
const Sidebar: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  const handleCollapseToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Reusable Sidebar Content
  const renderSidebarContent = (collapsed: boolean, isMobileView: boolean) => (
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800/80">
      {/* Brand Header */}
      <div className={`flex items-center border-b border-gray-800/80 py-4 ${collapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
        <Link to="/" className="flex items-center space-x-3 group focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-700 rounded-md">
          <NexusLogoIcon className={`w-7 h-7 flex-shrink-0 transition-transform group-hover:scale-110 ${themeClasses.text}`} />
          {!collapsed && (
            <h1 className="text-md font-bold tracking-widest text-white whitespace-nowrap">
              NEXUS <span className="font-light text-gray-500">PROTOCOL</span>
            </h1>
          )}
        </Link>
        {isMobileView && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto pt-4 scrollbar-thin select-none">
        {NAVIGATION_GROUPS.map((group) => (
          <SidebarGroup key={group.id} group={group} isCollapsed={collapsed} />
        ))}
      </nav>

      {/* Footer Collapse Button (Desktop only) */}
      {!isMobileView && (
        <div className="p-4 border-t border-gray-800/80 flex items-center justify-end">
          <button
            onClick={handleCollapseToggle}
            className={`p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all border border-gray-800/60 focus:outline-none focus-visible:ring-2 ${themeClasses.focusRing}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar Container */}
      <div
        className={`hidden md:block h-screen sticky top-0 transition-all duration-300 ease-in-out z-30 flex-shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(isCollapsed, false)}
      </div>

      {/* 2. Mobile Sidebar Overlay Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
            />
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-64 z-50 flex flex-col md:hidden"
            >
              {renderSidebarContent(false, true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
