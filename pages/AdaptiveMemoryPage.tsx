import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Pin,
  Archive,
  Sparkles,
  Trash2,
  Settings,
  Play,
  RefreshCw,
  Sliders,
  Database,
  AlertTriangle,
  Layers,
  Activity,
  Check,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  Inbox
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { useToast } from '../contexts/ToastContext';
import { MemoryLifecycleManager } from '../core/memory/lifecycle/MemoryLifecycleManager';
import { MemoryItem, MemoryStats } from '../core/memory/lifecycle/types';

interface SimulationLog {
  timestamp: string;
  module: 'SCORER' | 'AGING' | 'DUP_DETECTOR' | 'ARCHIVE' | 'COMPRESSOR' | 'SYSTEM';
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const AdaptiveMemoryPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { showToast } = useToast();

  // Lifecycle Manager Instance
  const managerRef = useRef<MemoryLifecycleManager | null>(null);

  // React state synced from manager
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats>({
    activeCount: 0,
    archivedCount: 0,
    pinnedCount: 0,
    duplicateCount: 0,
    totalSavingsBytes: 0,
    lastOptimizationTime: Date.now(),
    storageUsageBytes: 0,
  });

  // UI inputs state
  const [newMemoryText, setNewMemoryText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBackgroundOn, setIsBackgroundOn] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Policy sliders state
  const [archiveAfterDays, setArchiveAfterDays] = useState(15);
  const [compressionThreshold, setCompressionThreshold] = useState(7);
  const [minimumImportance, setMinimumImportance] = useState(0.3);
  const [optimizationInterval, setOptimizationInterval] = useState(10); // 10 seconds for visual simulation speed

  // Simulation Logs
  const [logs, setLogs] = useState<SimulationLog[]>([]);

  // Log helper
  const addLog = useCallback((
    module: SimulationLog['module'],
    message: string,
    type: SimulationLog['type'] = 'info'
  ) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ timestamp: time, module, message, type }, ...prev].slice(0, 100));
  }, []);

  // Sync state helper
  const syncStateFromManager = useCallback(() => {
    if (!managerRef.current) return;
    setMemories(managerRef.current.getAllMemories());
    setStats(managerRef.current.getStats());
  }, []);

  // Initialize
  useEffect(() => {
    const now = Date.now();
    const defaultMemories: MemoryItem[] = [
      {
        id: 'mem_1',
        content: 'Sovereign Persona ethical boundary configuration files and local-first data privacy filters.',
        importance: 0.9,
        age: 0.0,
        accessCount: 8,
        lastAccessed: now - 3 * 3600 * 1000, // 3 hours ago
        createdAt: now - 3 * 24 * 3600 * 1000, // 3 days ago
        status: 'active',
        isPinned: true,
        metadata: { tags: ['ethics', 'privacy'] }
      },
      {
        id: 'mem_2',
        content: 'Latent representation mapping indices for multi-party cryptographic negotiation handshakes.',
        importance: 0.75,
        age: 0.05,
        accessCount: 4,
        lastAccessed: now - 12 * 3600 * 1000, // 12 hours ago
        createdAt: now - 2 * 24 * 3600 * 1000, // 2 days ago
        status: 'active',
        isPinned: false,
        metadata: { tags: ['latent-space', 'cryptography'] }
      },
      {
        id: 'mem_3',
        content: 'Meeting summary notes discussing AMD EPYC processor optimizations for high-core count operations.',
        importance: 0.45,
        age: 0.35,
        accessCount: 2,
        lastAccessed: now - 6 * 24 * 3600 * 1000, // 6 days ago
        createdAt: now - 8 * 24 * 3600 * 1000, // 8 days ago
        status: 'active',
        isPinned: false,
        metadata: { tags: ['hardware', 'notes'] }
      },
      {
        id: 'mem_4',
        content: 'Temporary debug log: Connection handshake verification key mismatch on port 8080.',
        importance: 0.15,
        age: 0.85,
        accessCount: 1,
        lastAccessed: now - 28 * 24 * 3600 * 1000, // 28 days ago
        createdAt: now - 30 * 24 * 3600 * 1000, // 30 days ago
        status: 'active',
        isPinned: false,
        metadata: { tags: ['debug', 'logs'] }
      },
      {
        id: 'mem_5',
        content: 'User core preference: Always select lowest energy/carbon footprint execution targets.',
        importance: 0.95,
        age: 0.0,
        accessCount: 12,
        lastAccessed: now - 1 * 3600 * 1000, // 1 hour ago
        createdAt: now - 15 * 24 * 3600 * 1000, // 15 days ago
        status: 'active',
        isPinned: true,
        metadata: { tags: ['carbon-aware', 'preferences'] }
      }
    ];

    const manager = new MemoryLifecycleManager(
      {
        archiveAfterDays,
        deleteAfterDays: 90,
        compressionThreshold,
        minimumImportance,
        optimizationInterval,
      },
      defaultMemories
    );

    managerRef.current = manager;
    syncStateFromManager();

    addLog('SYSTEM', 'Adaptive Memory Lifecycle Manager initialized.', 'success');
    addLog('SCORER', 'Initial importance scores computed for persona memory store.', 'info');
    addLog('SYSTEM', 'Local-first architecture secured. No data will leave the device.', 'success');

    return () => {
      manager.stopBackgroundOptimization();
    };
  }, []);

  // Update policy configuration inside the manager whenever state changes
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updatePolicy({
        archiveAfterDays,
        compressionThreshold,
        minimumImportance,
        optimizationInterval,
      });
      addLog('SYSTEM', `Retention policies adjusted: Archive > ${archiveAfterDays}d, Compress > ${compressionThreshold}d, MinImportance < ${minimumImportance}`, 'warning');
    }
  }, [archiveAfterDays, compressionThreshold, minimumImportance, optimizationInterval, addLog]);

  const runOptimizationStep = useCallback(async () => {
    if (!managerRef.current || isOptimizing) return;

    setIsOptimizing(true);
    addLog('SYSTEM', 'Asynchronous background optimization cycle started...', 'info');

    try {
      const previousMemories = JSON.parse(JSON.stringify(managerRef.current.getAllMemories()));
      await managerRef.current.optimizeNow();
      const currentMemories = managerRef.current.getAllMemories();

      let actionsTaken = 0;
      // Scan for lifecycle events to log them to the console log
      currentMemories.forEach((curr) => {
        const prev = previousMemories.find((p) => p.id === curr.id);
        if (prev) {
          // Archival event
          if (prev.status === 'active' && curr.status === 'archived') {
            addLog('ARCHIVE', `Memory "${curr.content.substring(0, 30)}..." automatically archived due to low relevance/inactivity.`, 'warning');
            actionsTaken++;
          }
          // Compression event
          if (!prev.isCompressed && curr.isCompressed) {
            addLog('COMPRESSOR', `Compressed memory "${curr.content.substring(0, 30)}..." into: "${curr.compressedContent}"`, 'success');
            actionsTaken++;
          }
          // Aging log
          if (curr.age !== prev.age && curr.age > 0) {
            addLog('AGING', `Memory ID ${curr.id.substring(4, 9)} age factor calculated: ${(curr.age * 100).toFixed(0)}%. Effective score decayed: ${curr.importance.toFixed(2)}`, 'info');
            actionsTaken++;
          }
        }
      });

      syncStateFromManager();
      if (actionsTaken === 0) {
        addLog('SYSTEM', 'Optimization complete. All active memories are within policy thresholds.', 'success');
      } else {
        addLog('SYSTEM', 'Background optimization cycle completed successfully.', 'success');
      }
    } catch (err: any) {
      addLog('SYSTEM', `Optimization failed: ${err.message || err}`, 'error');
      console.error(err);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, syncStateFromManager, addLog]);

  const runOptimizationStepRef = useRef(runOptimizationStep);
  useEffect(() => {
    runOptimizationStepRef.current = runOptimizationStep;
  }, [runOptimizationStep]);

  // Periodic Optimization Runner (simulating background worker)
  useEffect(() => {
    if (!isBackgroundOn) return;

    const interval = setInterval(async () => {
      await runOptimizationStepRef.current();
    }, optimizationInterval * 1000);

    return () => clearInterval(interval);
  }, [isBackgroundOn, optimizationInterval]);

  // Add Memory handler
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim() || !managerRef.current) return;

    addLog('DUP_DETECTOR', 'Assimilating memory: running token-based Jaccard similarity index...', 'info');

    const result = await managerRef.current.addMemory(newMemoryText.trim());

    if (result.success && result.item) {
      addLog('DUP_DETECTOR', `Duplicate check passed. Maximum similarity was ${(result.similarity! * 100).toFixed(1)}%.`, 'success');
      addLog('SCORER', `Initial importance score for new memory set to: ${result.item.importance.toFixed(2)}`, 'info');
      showToast('Memory added successfully.');
      setNewMemoryText('');
      syncStateFromManager();
    } else {
      addLog('DUP_DETECTOR', `Duplicate BLOCKED! High similarity detected: ${(result.similarity! * 100).toFixed(1)}% with memory: "${result.duplicateOf!.substring(0, 20)}..."`, 'error');
      showToast(`Rejected: Duplicate memory (similarity ${(result.similarity! * 100).toFixed(0)}%)`);
    }
  };

  // Pin / Unpin handlers
  const togglePin = async (item: MemoryItem) => {
    if (!managerRef.current) return;
    if (item.isPinned) {
      await managerRef.current.unpinMemory(item.id);
      addLog('SCORER', `Unpinned memory ${item.id.substring(4, 9)}. Score re-evaluated.`, 'info');
      showToast('Memory unpinned.');
    } else {
      await managerRef.current.pinMemory(item.id);
      addLog('SCORER', `Pinned memory ${item.id.substring(4, 9)}. Score locked to 1.0 (Maximum).`, 'success');
      showToast('Memory pinned.');
    }
    syncStateFromManager();
  };

  // Manual archive handler
  const handleArchive = (item: MemoryItem) => {
    if (!managerRef.current) return;
    try {
      managerRef.current.archiveService.archive(item);
      addLog('ARCHIVE', `Memory ${item.id.substring(4, 9)} manually archived.`, 'warning');
      showToast('Memory archived.');
      syncStateFromManager();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Manual restore handler
  const handleRestore = async (id: string) => {
    if (!managerRef.current) return;
    const success = await managerRef.current.restoreMemory(id);
    if (success) {
      addLog('ARCHIVE', `Memory ${id.substring(4, 9)} restored to active store.`, 'success');
      showToast('Memory restored.');
      syncStateFromManager();
    }
  };

  // Hard delete handler
  const handleDelete = async (id: string) => {
    if (!managerRef.current) return;
    const success = await managerRef.current.deleteMemory(id);
    if (success) {
      addLog('SYSTEM', `Memory ${id.substring(4, 9)} permanently deleted from local store.`, 'error');
      showToast('Memory deleted.');
      syncStateFromManager();
    }
  };

  // Filter memories by status
  const filteredMemories = memories.filter((m) => m.status === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 text-gray-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 ${themeClasses.text}`}>
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Adaptive Memory Lifecycle
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Local-First
                  </span>
                </h1>
                <p className="text-gray-400 text-sm md:text-base mt-0.5">
                  Decentralized cognitive memory decay, deduplication, and local summarization pipeline.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBackgroundOn(!isBackgroundOn)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                isBackgroundOn
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-700/50 border-slate-600 text-gray-400 hover:bg-slate-700'
              }`}
            >
              <Activity className={`w-4 h-4 ${isBackgroundOn ? 'animate-pulse' : ''}`} />
              Auto-Optimize: {isBackgroundOn ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={runOptimizationStep}
              disabled={isOptimizing}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              Run Optimizer
            </button>
          </div>
        </div>

        {/* Top Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            {
              label: 'Active Memories',
              value: stats.activeCount,
              icon: <Layers className="w-4 h-4 text-blue-400" />,
              color: 'border-blue-500/20 bg-blue-500/5'
            },
            {
              label: 'Archived Memories',
              value: stats.archivedCount,
              icon: <Archive className="w-4 h-4 text-amber-400" />,
              color: 'border-amber-500/20 bg-amber-500/5'
            },
            {
              label: 'Pinned Memories',
              value: stats.pinnedCount,
              icon: <Pin className="w-4 h-4 text-rose-400" />,
              color: 'border-rose-500/20 bg-rose-500/5'
            },
            {
              label: 'Deduplicated Hits',
              value: stats.duplicateCount,
              icon: <AlertTriangle className="w-4 h-4 text-purple-400" />,
              color: 'border-purple-500/20 bg-purple-500/5'
            },
            {
              label: 'Local Storage',
              value: `${(stats.storageUsageBytes / 1024).toFixed(2)} KB`,
              icon: <Database className="w-4 h-4 text-teal-400" />,
              color: 'border-teal-500/20 bg-teal-500/5'
            },
            {
              label: 'Savings (Bytes)',
              value: stats.totalSavingsBytes,
              icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
              color: 'border-emerald-500/20 bg-emerald-500/5'
            }
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-xl border ${stat.color} flex flex-col justify-between`}>
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span>{stat.label}</span>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-white mt-2 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Middle Main Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Memory Store View */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === 'active'
                      ? 'bg-slate-700 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Active Store ({stats.activeCount})
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === 'archived'
                      ? 'bg-slate-700 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Archived Cache ({stats.archivedCount})
                </button>
              </div>
              
              <span className="text-xs text-gray-400 italic">
                Local-first secure sandbox database
              </span>
            </div>

            {/* Memory List Cards */}
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredMemories.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center bg-slate-800/20 border border-slate-700/40 rounded-xl flex flex-col items-center justify-center space-y-3"
                  >
                    <Inbox className="w-10 h-10 text-gray-500" />
                    <p className="text-gray-400 text-sm">No memories in this local storage partition.</p>
                  </motion.div>
                ) : (
                  filteredMemories.map((item) => (
                    <motion.div
                      layoutId={item.id}
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-5 rounded-xl border transition-all ${
                        item.isPinned
                          ? 'bg-slate-800/80 border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                          : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-grow">
                          
                          {/* Badges / Header details */}
                          <div className="flex flex-wrap items-center gap-2">
                            {item.isPinned && (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase tracking-wider">
                                <Pin className="w-2.5 h-2.5 fill-rose-400" /> Pinned
                              </span>
                            )}
                            {item.isCompressed && (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                                <Sparkles className="w-2.5 h-2.5" /> Compressed
                              </span>
                            )}
                            <span className="text-[11px] text-gray-400 font-mono">
                              ID: {item.id.substring(4, 12)}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              • Accessed {item.accessCount}x
                            </span>
                          </div>

                          {/* Content */}
                          <p className="text-white text-sm md:text-base font-normal leading-relaxed">
                            {item.isCompressed && item.compressedContent ? (
                              <span className="italic text-gray-300">
                                {item.compressedContent}
                                <span className="ml-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  ({Math.max(0, item.content.length - item.compressedContent.length)} chars saved)
                                </span>
                              </span>
                            ) : (
                              item.content
                            )}
                          </p>

                          {/* Original Expanded Preview if compressed */}
                          {item.isCompressed && (
                            <details className="text-xs text-gray-400 mt-2 bg-slate-900/30 p-2.5 rounded border border-slate-700/30 cursor-pointer">
                              <summary className="font-semibold text-gray-300 select-none">Show original memory string</summary>
                              <p className="mt-1 font-mono break-all whitespace-pre-wrap">{item.content}</p>
                            </details>
                          )}

                          {/* Scoring and Decay bars */}
                          <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
                            <div>
                              <div className="flex justify-between text-gray-400 mb-1">
                                <span>Importance Score</span>
                                <span className="font-bold text-blue-400">{item.importance.toFixed(2)}</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: `${item.importance * 100}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-gray-400 mb-1">
                                <span>Inactivity Age Factor</span>
                                <span className="font-bold text-amber-400">{(item.age * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-amber-500 h-1.5 rounded-full"
                                  style={{ width: `${item.age * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Card Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => togglePin(item)}
                            title={item.isPinned ? 'Unpin Memory' : 'Pin Memory'}
                            className={`p-2 rounded-lg border transition-all ${
                              item.isPinned
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                : 'bg-slate-700/50 border-slate-600 text-gray-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          
                          {item.status === 'active' ? (
                            <button
                              onClick={() => handleArchive(item)}
                              disabled={item.isPinned}
                              title={item.isPinned ? 'Cannot archive pinned memory' : 'Archive Memory'}
                              className="p-2 rounded-lg bg-slate-700/50 border border-slate-600 text-gray-400 hover:bg-slate-700 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(item.id)}
                              title="Restore to Active"
                              className="p-2 rounded-lg bg-slate-700/50 border border-slate-600 text-gray-400 hover:bg-slate-700 hover:text-emerald-400 transition-all"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(item.id)}
                            title="Delete Permanently"
                            className="p-2 rounded-lg bg-slate-700/50 border border-slate-600 text-gray-400 hover:bg-slate-700 hover:text-rose-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Column 3: Ingestion Form, Configuration & Logs */}
          <div className="space-y-6">
            
            {/* Memory Ingestion Form */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Ingest Memory
              </h3>
              
              <form onSubmit={handleAddMemory} className="space-y-3">
                <textarea
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Enter a new concept, system configuration, or personal note to commit to memory..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
                <button
                  type="submit"
                  disabled={!newMemoryText.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold text-sm py-2 px-4 rounded-lg shadow transition-all flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4" /> Commit to Memory
                </button>
              </form>
            </div>

            {/* Retention Policies Configurations */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                Retention Policy
              </h3>

              <div className="space-y-4 text-xs">
                
                {/* Archive Days */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Archive After Days (Inactivity)</span>
                    <span className="text-white font-bold">{archiveAfterDays} days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={archiveAfterDays}
                    onChange={(e) => setArchiveAfterDays(Number(e.target.value))}
                    className="w-full accent-blue-500 bg-slate-700 h-1 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Compression Days */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Compression Threshold (Inactivity)</span>
                    <span className="text-white font-bold">{compressionThreshold} days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={compressionThreshold}
                    onChange={(e) => setCompressionThreshold(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-700 h-1 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Minimum Importance */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Minimum Importance Threshold</span>
                    <span className="text-white font-bold">{minimumImportance.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={minimumImportance}
                    onChange={(e) => setMinimumImportance(Number(e.target.value))}
                    className="w-full accent-rose-500 bg-slate-700 h-1 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Auto-Optimization Interval */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Optimization Loop Period</span>
                    <span className="text-white font-bold">{optimizationInterval} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    value={optimizationInterval}
                    onChange={(e) => setOptimizationInterval(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-700 h-1 rounded-lg cursor-pointer"
                  />
                </div>

              </div>
            </div>

            {/* Lifecycle Simulation Real-Time Logs */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Lifecycle Pipeline Logs
                </h3>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear Logs
                </button>
              </div>

              <div className="h-56 overflow-y-auto space-y-2 border border-slate-700/40 bg-slate-900/60 p-3 rounded-lg font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                {logs.length === 0 ? (
                  <p className="text-gray-600 text-center py-10">No lifecycle events recorded yet.</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="border-b border-slate-800/60 pb-1 last:border-b-0">
                      <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                      <span
                        className={`font-semibold ${
                          log.module === 'SCORER'
                            ? 'text-blue-400'
                            : log.module === 'AGING'
                            ? 'text-amber-400'
                            : log.module === 'DUP_DETECTOR'
                            ? 'text-purple-400'
                            : log.module === 'ARCHIVE'
                            ? 'text-orange-400'
                            : log.module === 'COMPRESSOR'
                            ? 'text-emerald-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {log.module}
                      </span>{' '}
                      <span
                        className={
                          log.type === 'success'
                            ? 'text-emerald-400'
                            : log.type === 'warning'
                            ? 'text-amber-400'
                            : log.type === 'error'
                            ? 'text-rose-400'
                            : 'text-gray-300'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default AdaptiveMemoryPage;
