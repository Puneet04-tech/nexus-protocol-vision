import React from 'react';
import { useRealTimeMetrics } from '../../contexts/RealTimeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { Activity, Leaf, Server, Cpu } from 'lucide-react';

/**
 * OverviewCards component.
 * Fetches real-time system statistics and displays them in a premium, responsive grid.
 */
const OverviewCards: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  
  // Dynamic metrics from RealTimeContext
  const { metrics } = useRealTimeMetrics();

  // Convert memory MB to GB
  const memoryGB = (metrics.memoryUsageMb / 1024).toFixed(1);

  const stats = [
    {
      id: 'latency',
      title: 'Decentralized Latency',
      value: `${metrics.latencyMs} ms`,
      subtext: 'Average round-trip consensus',
      icon: Activity,
      color: themeClasses.text,
      extra: (
        <div className="flex items-center space-x-1 mt-2 text-[10px] text-gray-500 uppercase tracking-tighter">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span>Hyper-tunnel optimization active</span>
        </div>
      )
    },
    {
      id: 'sustainability',
      title: 'Energy Savings',
      value: `${metrics.energySavingsPercent}%`,
      subtext: 'Carbon-aware pruning reduction',
      icon: Leaf,
      color: 'text-emerald-400',
      extra: (
        <div className="mt-2.5">
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div
              className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${metrics.energySavingsPercent}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      id: 'nodes',
      title: 'Active Node Connections',
      value: metrics.activeUsers.toLocaleString(),
      subtext: 'P2P sovereign personas online',
      icon: Server,
      color: 'text-indigo-400',
      extra: (
        <div className="flex items-center space-x-1 mt-2 text-[10px] text-gray-500 uppercase tracking-tighter">
          <span>Global Hive load: 42% capacity</span>
        </div>
      )
    },
    {
      id: 'hardware',
      title: 'Local Hardware Load',
      value: `${metrics.cpuLoadPercent}% CPU`,
      subtext: `${memoryGB} GB Memory Allocated`,
      icon: Cpu,
      color: 'text-amber-400',
      extra: (
        <div className="mt-2.5 space-y-1">
          <div className="flex justify-between text-[9px] text-gray-500 font-mono">
            <span>CPU</span>
            <span>{metrics.cpuLoadPercent}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div
              className="bg-amber-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${metrics.cpuLoadPercent}%` }}
            ></div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="group relative bg-gray-900/50 border border-gray-800/80 rounded-xl p-5 hover:border-gray-700/80 hover:bg-gray-900/80 transition-all duration-300 shadow-lg hover:shadow-2xl overflow-hidden"
          >
            {/* Ambient Background Gradient for Hover Effect */}
            <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full bg-gradient-to-br ${themeClasses.gradientFrom} ${themeClasses.gradientTo} opacity-0 group-hover:opacity-5 blur-2xl transition-all duration-500`}></div>

            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-gray-500">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-white mt-1.5 font-sans tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {stat.subtext}
                </p>
              </div>
              <div className={`p-2.5 rounded-lg bg-gray-950/80 border border-gray-850/60 ${stat.color}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
              </div>
            </div>
            
            {stat.extra}
          </div>
        );
      })}
    </div>
  );
};

export default OverviewCards;
