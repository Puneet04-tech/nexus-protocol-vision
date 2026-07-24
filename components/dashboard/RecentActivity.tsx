import React, { useEffect } from 'react';
import { useDiagnosticLogs, DiagnosticLog } from '../../contexts/DiagnosticLogContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeClasses } from '../../utils/themeUtils';
import { Terminal, Shield, RefreshCw } from 'lucide-react';

/**
 * RecentActivity component.
 * Displays a live feed of the system logs and user interactions.
 */
const RecentActivity: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { logs, addLog } = useDiagnosticLogs();

  // Populate system initialization events if log history is empty
  useEffect(() => {
    if (logs.length === 0) {
      const initSequence = [
        { type: 'CORE' as const, msg: 'SYSTEM: Nexus Kernel boot sequence initialized.', status: 'success' as const },
        { type: 'SHIELD' as const, msg: 'IMMUNE: Threat scanner activated on secure shards.', status: 'success' as const },
        { type: 'MPC' as const, msg: 'P2P: Connected to bootstrap node: wss://bootstrap.nexus.net', status: 'success' as const },
        { type: 'ZKP' as const, msg: 'CRYPTO: Local persona blind verification proofs generated.', status: 'success' as const }
      ];

      initSequence.forEach((item, index) => {
        // Stagger logs slightly to look realistic
        setTimeout(() => {
          addLog(item.type, item.msg, item.status, false);
        }, index * 200);
      });
    }
  }, [logs.length, addLog]);

  // Take the latest 8 logs and reverse them to show newest first
  const latestLogs = [...logs].reverse().slice(0, 8);

  const getLogTypeBadgeClasses = (type: string) => {
    switch (type) {
      case 'MPC':
        return 'bg-purple-950/40 text-purple-400 border-purple-800/60';
      case 'ZKP':
        return 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60';
      case 'SHIELD':
        return 'bg-red-950/40 text-red-400 border-red-800/60';
      case 'CORE':
      default:
        return 'bg-amber-950/40 text-amber-400 border-amber-800/60';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'denied':
        return <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Denied/Error" />;
      case 'warning':
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Warning" />;
      case 'success':
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Success" />;
    }
  };

  return (
    <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-5 shadow-lg flex flex-col h-[340px] overflow-hidden">
      {/* Title */}
      <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-4 flex items-center justify-between">
        <span className="flex items-center">
          <Terminal className="w-4.5 h-4.5 text-gray-500 mr-2" />
          Live Event Monitor
        </span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </h3>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-thin pr-1 select-none font-mono">
        {latestLogs.length > 0 ? (
          latestLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between p-2 rounded bg-gray-950/30 border border-gray-900/60 hover:bg-gray-900/20 hover:border-gray-850/40 transition-all text-[11px]"
            >
              <div className="flex items-start space-x-2.5 min-w-0">
                {/* Timestamp */}
                <span className="text-gray-600 flex-shrink-0 pt-0.5 select-none text-[10px]">
                  {log.timestamp}
                </span>

                {/* Type Badge */}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex-shrink-0 ${getLogTypeBadgeClasses(log.type)}`}>
                  {log.type}
                </span>

                {/* Message */}
                <span className="text-gray-300 truncate font-sans text-xs tracking-wide">
                  {log.message}
                </span>
              </div>

              {/* Status indicator */}
              <div className="flex-shrink-0 ml-2 pt-1">
                {getStatusIndicator(log.status)}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 py-10 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-700" />
            <span className="text-xs">Initializing secure connection feed...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
