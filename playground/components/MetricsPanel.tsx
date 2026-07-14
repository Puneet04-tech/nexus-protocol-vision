import React from 'react';
import { Cpu, Database, Activity, ShieldCheck, Zap, BrainCircuit, Globe, RefreshCcw } from 'lucide-react';
import { RealTimeMetrics } from '../PlaygroundTypes';
import { formatDuration } from '../PlaygroundUtils';

interface MetricsPanelProps {
  metrics: RealTimeMetrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const metricsItems = [
    {
      name: 'System Latency',
      value: formatDuration(metrics.executionTime % 1200 + 40),
      icon: Cpu,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/20 border-blue-800/40',
      description: 'Total roundtrip protocol compute time.'
    },
    {
      name: 'Local Sandbox Memory',
      value: `${metrics.memory} MB`,
      icon: Database,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-950/20 border-indigo-800/40',
      description: 'Memory allocated to sandbox runtime.'
    },
    {
      name: 'CPU Estimate Load',
      value: `${metrics.cpu}%`,
      icon: Activity,
      color: 'text-teal-400',
      bgColor: 'bg-teal-950/20 border-teal-800/40',
      description: 'Simulated processor load factor.',
      gaugeValue: metrics.cpu
    },
    {
      name: 'Privacy Index',
      value: `${metrics.privacyScore}/100`,
      icon: ShieldCheck,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/20 border-purple-800/40',
      description: 'Privacy preservation rating.',
      gaugeValue: metrics.privacyScore
    },
    {
      name: 'Carbon Impact Saved',
      value: `${metrics.carbonImpact.toFixed(3)} kg`,
      icon: Zap,
      color: 'text-green-400',
      bgColor: 'bg-green-950/20 border-green-800/40',
      description: 'Savings from energy optimizations.'
    },
    {
      name: 'Knowledge Nodes Added',
      value: `+${metrics.knowledgeGrowth}`,
      icon: BrainCircuit,
      color: 'text-pink-400',
      bgColor: 'bg-pink-950/20 border-pink-800/40',
      description: 'Cognitive graph concepts assimilated.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Grid of basic parameters indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metricsItems.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 hover:scale-101 hover:shadow-lg backdrop-blur-md ${item.bgColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium">{item.name}</span>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>

            <div className="space-y-2">
              <span className="text-xl font-extrabold text-slate-100 font-mono tracking-tight">
                {item.value}
              </span>

              {item.gaugeValue !== undefined && (
                <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${item.gaugeValue}%` }}
                  />
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-normal">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer list showing active components */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400 animate-pulse" />
          <span className="text-xs text-slate-300 font-bold">Active Protocol Nodes:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {metrics.activeModules.length === 0 ? (
            <span className="text-xs text-slate-500 font-mono">Idle state. Waiting for simulation.</span>
          ) : (
            metrics.activeModules.map(mod => (
              <span
                key={mod}
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-slate-700 bg-slate-900 text-slate-300 font-mono"
              >
                {mod.replace('-', ' ')}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
