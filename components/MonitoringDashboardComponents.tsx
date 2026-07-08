import React, { useMemo, useState } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, Activity, Zap, 
  ChevronLeft, ChevronRight, Search, ArrowUpDown, Bell
} from 'lucide-react';
import { ActiveAlert, HealthStatus, SubsystemHealth, MetricRecord } from '../core/monitoring/MonitoringTypes';
import { MonitoringUtils } from '../core/monitoring/MonitoringUtils';

// ───────────────────────────────────────────────────────────────────────────
// 1. LIVE METRIC BADGE
// ───────────────────────────────────────────────────────────────────────────
export const LiveMetricBadge: React.FC<{ status: HealthStatus; label?: string }> = ({ status, label }) => {
  const { color, bg, ping } = useMemo(() => {
    switch (status) {
      case 'Healthy':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', ping: 'bg-emerald-400' };
      case 'Warning':
        return { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', ping: 'bg-amber-400' };
      case 'Critical':
        return { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', ping: 'bg-rose-400' };
      default:
        return { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', ping: 'bg-slate-400' };
    }
  }, [status]);

  return (
    <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border text-xs font-bold ${bg} ${color}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ping}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${ping}`}></span>
      </span>
      <span>{label || status}</span>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 2. METRIC CARD
// ───────────────────────────────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, unit = '', description, icon, trend, className = '' 
}) => {
  return (
    <div className={`bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-950/10 transition-all group ${className}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-sm font-medium text-slate-400">{title}</span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
            {unit && <span className="text-sm text-slate-400 font-medium">{unit}</span>}
          </div>
        </div>
        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-blue-400 group-hover:text-blue-300 transition-colors">
          {icon}
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/40 text-xs">
        <span className="text-slate-400">{description}</span>
        {trend && (
          <span className={`font-semibold ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 3. HEALTH STATUS CARD
// ───────────────────────────────────────────────────────────────────────────
interface HealthStatusCardProps {
  name: string;
  health: SubsystemHealth;
}

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({ name, health }) => {
  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-white">{name}</h4>
        <LiveMetricBadge status={health.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl space-y-0.5">
          <span className="text-slate-500">Latency</span>
          <div className="text-sm font-bold text-white font-mono">{health.responseTime} ms</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl space-y-0.5">
          <span className="text-slate-500">Uptime SLA</span>
          <div className="text-sm font-bold text-emerald-400 font-mono">{health.availability.toFixed(2)}%</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl space-y-0.5">
          <span className="text-slate-500">Error Rate</span>
          <div className="text-sm font-bold text-rose-400 font-mono">{health.errorRate.toFixed(2)}%</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl space-y-0.5">
          <span className="text-slate-500">Last Report</span>
          <div className="text-[10px] font-medium text-slate-400">
            {new Date(health.lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 4. RESOURCE USAGE PANEL
// ───────────────────────────────────────────────────────────────────────────
interface ResourcePanelProps {
  cpu: number;
  memory: number;
  maxMemory?: number;
  storageBytes: number;
  networkSent: number;
  networkReceived: number;
}

export const ResourceUsagePanel: React.FC<ResourcePanelProps> = ({
  cpu, memory, maxMemory = 8192, storageBytes, networkSent, networkReceived
}) => {
  const memoryPct = (memory / maxMemory) * 100;
  const storageStr = MonitoringUtils.formatBytes(storageBytes);
  const netSentStr = MonitoringUtils.formatBytes(networkSent);
  const netRecvStr = MonitoringUtils.formatBytes(networkReceived);

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <h3 className="text-xl font-bold text-white">Resource Allocation</h3>
      <div className="space-y-4">
        {/* CPU Util */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium">CPU Utilization</span>
            <span className="text-white font-mono font-bold">{cpu.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800 p-0.5">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                cpu < 60 ? 'bg-emerald-500' : cpu < 85 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${cpu}%` }}
            />
          </div>
        </div>

        {/* Memory Meter */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium">Memory Footprint</span>
            <span className="text-white font-mono font-bold">
              {memory.toFixed(1)} / {maxMemory} MB
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800 p-0.5">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                memoryPct < 60 ? 'bg-emerald-500' : memoryPct < 80 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${memoryPct}%` }}
            />
          </div>
        </div>

        {/* Storage and Network Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-center">
          <div className="bg-slate-900/60 border border-slate-700/40 p-3 rounded-xl">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage Load</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">{storageStr}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/40 p-3 rounded-xl">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Tx (Sent)</div>
            <div className="text-sm font-bold text-blue-400 mt-1 font-mono">{netSentStr}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/40 p-3 rounded-xl">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Rx (Recv)</div>
            <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">{netRecvStr}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 5. REUSABLE HIGH-FIDELITY SVG SPARKLINE / LINE CHART
// ───────────────────────────────────────────────────────────────────────────
interface SparklineProps {
  dataPoints: number[];
  color?: string;
  fillColor?: string;
  height?: number;
  showLabels?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({ 
  dataPoints, color = '#3b82f6', fillColor = 'rgba(59, 130, 246, 0.1)', height = 150, showLabels = false 
}) => {
  const points = dataPoints.length > 0 ? dataPoints : [0];
  const max = Math.max(...points, 10);
  const min = Math.min(...points, 0);
  const range = max - min;

  const width = 450;
  const padding = showLabels ? 30 : 5;

  const svgPoints = useMemo(() => {
    return points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / (range || 1)) * (height - 2 * padding);
      return { x, y, value: val };
    });
  }, [points, min, range, height, padding]);

  const pathD = useMemo(() => {
    if (svgPoints.length === 0) return '';
    return svgPoints.reduce((path, pt, idx) => {
      return path + (idx === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
    }, '');
  }, [svgPoints]);

  const areaD = useMemo(() => {
    if (svgPoints.length === 0) return '';
    const startX = svgPoints[0].x;
    const endX = svgPoints[svgPoints.length - 1].x;
    const baselineY = height - padding;
    return `${pathD} L ${endX} ${baselineY} L ${startX} ${baselineY} Z`;
  }, [pathD, svgPoints, height, padding]);

  return (
    <div className="w-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {showLabels && (
          <>
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
            
            {/* Axis labels */}
            <text x={padding - 5} y={padding + 4} fill="#64748b" fontSize="10" textAnchor="end" fontWeight="bold">{max.toFixed(0)}</text>
            <text x={padding - 5} y={height / 2 + 4} fill="#64748b" fontSize="10" textAnchor="end" fontWeight="bold">{((max + min) / 2).toFixed(0)}</text>
            <text x={padding - 5} y={height - padding + 4} fill="#64748b" fontSize="10" textAnchor="end" fontWeight="bold">{min.toFixed(0)}</text>
          </>
        )}

        {/* Chart fill */}
        <path d={areaD} fill={`url(#grad-${color})`} />

        {/* Chart line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Interactive node dots */}
        {svgPoints.map((pt, idx) => (
          <circle 
            key={idx} 
            cx={pt.x} 
            cy={pt.y} 
            r={idx === svgPoints.length - 1 ? 4 : 2} 
            fill={color} 
            stroke="#0f172a" 
            strokeWidth="1.5" 
          />
        ))}
      </svg>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 6. DETAILED SPECIFIC CHARTS
// ───────────────────────────────────────────────────────────────────────────
export const LatencyChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#60a5fa" showLabels />
);

export const CPUChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#a78bfa" showLabels />
);

export const MemoryChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#34d399" showLabels />
);

export const CarbonChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#a3e635" showLabels />
);

export const ThreatChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#f87171" showLabels />
);

export const PrivacyChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#f472b6" showLabels />
);

export const FederatedChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#22d3ee" showLabels />
);

export const TimelineChart: React.FC<{ data: number[] }> = ({ data }) => (
  <Sparkline dataPoints={data} color="#e2e8f0" showLabels />
);

// ───────────────────────────────────────────────────────────────────────────
// 7. ALERT PANEL
// ───────────────────────────────────────────────────────────────────────────
interface AlertPanelProps {
  activeAlerts: ActiveAlert[];
  alertHistory: ActiveAlert[];
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ activeAlerts, alertHistory }) => {
  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Bell className="w-5 h-5 text-red-400" />
          <span>Active Alerts</span>
        </h3>
        <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-full">
          {activeAlerts.length} trigger{activeAlerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Active Alerts List */}
      <div className="space-y-3 max-h-56 overflow-y-auto">
        {activeAlerts.length === 0 ? (
          <div className="text-slate-500 text-center py-6 text-sm italic">
            No active threshold alerts. Everything is normal!
          </div>
        ) : (
          activeAlerts.map(alert => (
            <div 
              key={alert.id} 
              className={`p-4 rounded-xl border flex items-start space-x-3 text-sm
                ${alert.severity === 'critical' 
                  ? 'bg-rose-950/10 border-rose-500/30 text-rose-300' 
                  : 'bg-amber-950/10 border-amber-500/30 text-amber-300'
                }
              `}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold flex items-center space-x-2">
                  <span className="uppercase tracking-wider text-[10px] font-black">{alert.severity}</span>
                  <span>•</span>
                  <span>{alert.metricName}</span>
                </div>
                <div className="text-xs">{alert.message}</div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Triggered at {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert History Section */}
      <div className="border-t border-slate-700/50 pt-5">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Alert Activity Log</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto text-xs font-mono">
          {alertHistory.length === 0 ? (
            <div className="text-slate-600 italic py-2">No historical alerts recorded yet.</div>
          ) : (
            [...alertHistory].reverse().map((hist, idx) => (
              <div key={idx} className="flex justify-between items-center py-1 hover:bg-slate-900/30 rounded px-1.5 border border-transparent">
                <span className="text-slate-500">[{new Date(hist.timestamp).toLocaleTimeString()}]</span>
                <span className={`font-bold uppercase ${hist.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {hist.severity}
                </span>
                <span className="text-slate-400 truncate max-w-[200px]">{hist.metricName}</span>
                <span className={hist.resolvedAt ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold animate-pulse'}>
                  {hist.resolvedAt ? 'RESOLVED' : 'ACTIVE'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 8. METRIC HISTORY TABLE
// ───────────────────────────────────────────────────────────────────────────
interface MetricHistoryTableProps {
  metrics: MetricRecord[];
}

export const MetricHistoryTable: React.FC<MetricHistoryTableProps> = ({ metrics }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'value' | 'timestamp'>('timestamp');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredMetrics = useMemo(() => {
    return metrics.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags && Object.entries(item.tags).some(([k, v]) => 
        k.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }, [metrics, searchTerm]);

  const sortedMetrics = useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc 
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      return sortAsc 
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
  }, [filteredMetrics, sortField, sortAsc]);

  const paginatedMetrics = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedMetrics.slice(start, start + itemsPerPage);
  }, [sortedMetrics, currentPage]);

  const totalPages = Math.ceil(sortedMetrics.length / itemsPerPage) || 1;

  const toggleSort = (field: 'name' | 'value' | 'timestamp') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-white">Historical Telemetry</h3>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Search metric name or tags..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table Screen */}
      <div className="overflow-x-auto border border-slate-700/50 rounded-xl bg-slate-900/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800/40 border-b border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
              <th onClick={() => toggleSort('timestamp')} className="p-3 cursor-pointer hover:text-white select-none">
                <div className="flex items-center space-x-1">
                  <span>Timestamp</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th onClick={() => toggleSort('name')} className="p-3 cursor-pointer hover:text-white select-none">
                <div className="flex items-center space-x-1">
                  <span>Metric Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th onClick={() => toggleSort('value')} className="p-3 cursor-pointer hover:text-white select-none text-right">
                <div className="flex items-center justify-end space-x-1">
                  <span>Value</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {paginatedMetrics.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 italic">No telemetry data matching filter query.</td>
              </tr>
            ) : (
              paginatedMetrics.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 font-mono">
                  <td className="p-3 text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-3 font-bold text-white">{item.name}</td>
                  <td className="p-3 text-right font-bold text-blue-400">{item.value.toFixed(4)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {item.tags ? (
                        Object.entries(item.tags).map(([k, v]) => (
                          <span key={k} className="text-[9px] bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400">
                            {k}:{v}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">none</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
        <div>
          Showing {Math.min(filteredMetrics.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
          {Math.min(filteredMetrics.length, currentPage * itemsPerPage)} of {filteredMetrics.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-1.5 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-white">Page {currentPage} of {totalPages}</span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-1.5 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// 9. SYSTEM STATUS GRID
// ───────────────────────────────────────────────────────────────────────────
interface SystemStatusGridProps {
  healthReports: Record<string, SubsystemHealth>;
}

export const SystemStatusGrid: React.FC<SystemStatusGridProps> = ({ healthReports }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Object.entries(healthReports).map(([name, health]) => (
        <HealthStatusCard key={name} name={name} health={health} />
      ))}
    </div>
  );
};
