import React from 'react';
import { Menu, Wifi, Activity } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { useSidebar } from '../../hooks/useSidebar';
import { useRealTimeMetrics } from '../../contexts/RealTimeContext';
import SearchBar from './SearchBar';
import ThemeSwitcher from '../ThemeSwitcher';
import { NexusLogoIcon } from '../icons';

/**
 * TopBar component.
 * Serves as the minimal header containing search, status indicators,
 * theme controls, and profile options.
 */
const TopBar: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { setIsMobileOpen } = useSidebar();
  
  // Real-time latency tracking
  const { metrics } = useRealTimeMetrics();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-6 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/80">
      
      {/* 1. Left Section: Mobile Menu & Branding */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-850 md:hidden focus:outline-none focus:ring-1 focus:ring-gray-700"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Small Logo for Mobile view only */}
        <div className="flex items-center space-x-2 md:hidden">
          <NexusLogoIcon className={`w-5 h-5 ${themeClasses.text}`} />
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            Nexus
          </span>
        </div>

        {/* System Health Indicators (Desktop only) */}
        <div className="hidden lg:flex items-center space-x-4 pl-2 font-mono text-[10px] uppercase tracking-wider text-gray-500">
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${themeClasses.bg} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${themeClasses.bg}`}></span>
            </span>
            <span>Core: Active</span>
          </div>
          <div className="w-px h-3 bg-gray-850" />
          <div className="flex items-center space-x-1">
            <Wifi className="w-3 h-3 text-gray-500" />
            <span>Ping: {metrics.latencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Search Bar */}
      <div className="flex-1 max-w-md mx-4">
        <SearchBar />
      </div>

      {/* 3. Right Section: Action Controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        
        {/* Theme Switching Button */}
        <ThemeSwitcher />

        <div className="w-px h-5 bg-gray-800/80 hidden sm:block" />

        {/* User Profile Avatar */}
        <button
          className={`flex items-center space-x-2 p-1 rounded-full border border-gray-800 hover:border-gray-700 bg-gray-900 focus:outline-none focus:ring-1 ${themeClasses.focusRing}`}
          aria-label="User profile menu"
        >
          <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${themeClasses.gradientFrom} ${themeClasses.gradientTo} flex items-center justify-center text-xs font-bold text-white shadow`}>
            NX
          </div>
        </button>

      </div>
    </header>
  );
};

export default TopBar;
