import React from 'react';
import { SidebarProvider } from '../../hooks/useSidebar';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * DashboardLayout wraps the entire application.
 * Manages responsive sidebar state, provides the top navigation bar,
 * and frames the inner pages inside a scrollable layout.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100 font-sans">
        
        {/* Collapsible/Drawer Left Sidebar */}
        <Sidebar />

        {/* Right Main Container (TopBar + Page Content) */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          
          {/* Compact Top Navigation Bar */}
          <TopBar />

          {/* Scrollable Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-900">
            {children}
          </div>
        </div>
        
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
