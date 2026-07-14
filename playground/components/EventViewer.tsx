import React, { useState } from 'react';
import { Search, Download, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { SimulationLog } from '../PlaygroundTypes';
import { formatDuration } from '../PlaygroundUtils';

interface EventViewerProps {
  logs: SimulationLog[];
  onClear: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
}

export const EventViewer: React.FC<EventViewerProps> = ({
  logs,
  onClear,
  onExportJSON,
  onExportCSV
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);

  // Extract unique modules for filters
  const modulesList = ['all', ...new Set(logs.map(log => log.module))];

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery
      ? log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.operation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    const matchesModule = selectedModule === 'all'
      ? true
      : log.module.toLowerCase() === selectedModule.toLowerCase();

    const matchesStatus = selectedStatus === 'all'
      ? true
      : log.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesModule && matchesStatus;
  });

  const toggleExpand = (index: number) => {
    setExpandedLogIndex(expandedLogIndex === index ? null : index);
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Simulation Execution Log Console
        </h3>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onExportJSON}
            disabled={logs.length === 0}
            className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            onClick={onExportCSV}
            disabled={logs.length === 0}
            className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="px-2.5 py-1.5 rounded bg-red-950/20 border border-red-900/40 text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Filter items bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search console logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
        >
          {modulesList.map(mod => (
            <option key={mod} value={mod}>
              Module: {mod === 'all' ? 'All Modules' : mod.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="all">Status: All Severities</option>
          <option value="info">INFO</option>
          <option value="success">SUCCESS</option>
          <option value="warning">WARNING</option>
          <option value="error">ERROR</option>
        </select>
      </div>

      {/* Logs output panel */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-h-[280px] overflow-y-auto font-mono scrollbar-thin text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-slate-600 py-12">
            Console output buffer is empty or matches no filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredLogs.map((log, idx) => {
              const isExpanded = expandedLogIndex === idx;
              const hasDetails = !!log.details;

              const statusColor = {
                info: 'text-blue-400 bg-blue-950/10',
                success: 'text-green-400 bg-green-950/10',
                warning: 'text-yellow-400 bg-yellow-950/10',
                error: 'text-red-400 bg-red-950/10'
              };

              return (
                <div key={idx} className="flex flex-col hover:bg-slate-900/40">
                  <div
                    onClick={() => hasDetails && toggleExpand(idx)}
                    className={`flex items-start gap-2.5 p-2.5 cursor-pointer ${hasDetails ? 'hover:bg-slate-800/20' : 'cursor-default'}`}
                  >
                    {/* Time */}
                    <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>

                    {/* Expand Indicator */}
                    <div className="w-4 h-4 flex items-center justify-center text-slate-600 mt-0.5">
                      {hasDetails ? (
                        isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                      ) : null}
                    </div>

                    {/* Badge */}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-slate-700/60 font-mono ${statusColor[log.status]}`}>
                      {log.status}
                    </span>

                    {/* Content */}
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wide bg-slate-900 px-1 py-0.2 rounded border border-slate-800/80">
                          {log.module}
                        </span>
                        <span className="text-slate-500 text-[10px]">{log.operation}</span>
                        {log.duration > 0 && (
                          <span className="text-slate-600 text-[9px]">({formatDuration(log.duration)})</span>
                        )}
                      </div>
                      <p className="text-slate-300 leading-relaxed font-sans">{log.message}</p>
                    </div>
                  </div>

                  {/* Expanded JSON details trace */}
                  {isExpanded && hasDetails && (
                    <div className="bg-slate-900 border-t border-slate-800 p-3 ml-12 mb-2 mr-2 rounded text-[10px] text-slate-400 overflow-x-auto whitespace-pre">
                      {log.details}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
