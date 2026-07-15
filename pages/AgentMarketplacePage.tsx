import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Cpu, ShieldCheck, AlertCircle, CheckCircle, 
  Download, Trash2, Play, AlertTriangle, Wrench, History, 
  Sparkles, TrendingUp, UserCheck, ChevronRight, Star, 
  RefreshCw, FileText, X, Activity, Info, Lock, ShieldAlert,
  ArrowLeftRight
} from 'lucide-react';

import { MarketplaceService } from '../core/agent-marketplace/services/MarketplaceService';
import { MarketplaceTestSuite, SuiteResults } from '../core/agent-marketplace/__tests__/marketplace.test';
import { SecurityVerifier } from '../core/agent-marketplace/verification/SecurityVerifier';
import { 
  MarketplaceAgent, 
  CapabilityRegistryEntry, 
  InstallerQueueItem, 
  InstallerHistoryEntry 
} from '../core/agent-marketplace/types';
import { PluginPermission } from '../core/plugin-sdk/PluginTypes';

const CATEGORIES = [
  'All', 
  'Knowledge Retrieval', 
  'Database', 
  'NLP', 
  'Cognitive Analytics', 
  'Green Computing', 
  'Security', 
  'Utilities'
];

const AgentMarketplacePage: React.FC = () => {
  const service = MarketplaceService.getInstance();

  // --- States ---
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [installedAgents, setInstalledAgents] = useState<CapabilityRegistryEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'newest' | 'alphabetical'>('downloads');
  const [capabilityQuery, setCapabilityQuery] = useState('');

  // Auto update settings
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(service.updater.isAutoUpdateEnabled());
  const [updateChecksReport, setUpdateChecksReport] = useState<Record<string, any>>({});
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // Installer Queue & History
  const [installQueue, setInstallQueue] = useState<InstallerQueueItem[]>([]);
  const [installerHistory, setInstallerHistory] = useState<InstallerHistoryEntry[]>([]);

  // Security Verification Modal
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [targetAgent, setTargetAgent] = useState<MarketplaceAgent | null>(null);
  const [targetVersion, setTargetVersion] = useState<string>('');
  const [agreedToPermissions, setAgreedToPermissions] = useState(false);

  // Diagnostics Suite
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // --- Sync with Services ---
  const refreshMarketplace = async () => {
    const categoriesFilter = selectedCategory === 'All' ? undefined : [selectedCategory];
    const capabilitiesFilter = capabilityQuery.trim() ? [capabilityQuery.trim()] : undefined;
    
    const result = await service.api.getAgents({
      query: searchQuery || undefined,
      categories: categoriesFilter,
      capabilities: capabilitiesFilter,
      sortBy: sortBy,
      sortOrder: 'desc'
    });
    setAgents(result.agents);
  };

  const refreshInstalledList = () => {
    setInstalledAgents(service.registry.list());
  };

  useEffect(() => {
    refreshMarketplace();
    refreshInstalledList();

    // Listen to installation queue changes
    const unsubQueue = service.installer.onQueueChange((queue) => {
      setInstallQueue(queue);
      refreshInstalledList();
    });

    // Listen to progress updates
    const unsubProgress = service.installer.onProgress((item) => {
      // Force UI updates for queue items in progress
      setInstallQueue(service.installer.getQueue());
      if (item.status === 'completed' || item.status === 'failed') {
        refreshInstalledList();
        setInstallerHistory(service.installer.getHistory());
      }
    });

    // Initial load for history
    setInstallerHistory(service.installer.getHistory());

    return () => {
      unsubQueue();
      unsubProgress();
    };
  }, [searchQuery, selectedCategory, sortBy, capabilityQuery]);

  // --- Actions ---
  const checkUpgrades = async () => {
    setIsCheckingUpdates(true);
    try {
      const reports = await service.updater.checkForUpdates();
      setUpdateChecksReport(reports);
      refreshInstalledList();
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleToggleAutoUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoUpdateEnabled(checked);
    service.updater.toggleAutomaticUpdates(checked);
  };

  // Launch Installation with Security Sandbox Check
  const triggerInstallFlow = (agent: MarketplaceAgent, version: string) => {
    setTargetAgent(agent);
    setTargetVersion(version);
    setAgreedToPermissions(false);
    setSecurityModalOpen(true);
  };

  const confirmInstallation = async () => {
    if (!targetAgent) return;
    setSecurityModalOpen(false);

    try {
      // 1. Grant consent first
      service.permissions.grantPermissions(targetAgent.id, targetAgent.permissions);
      // 2. Push onto installation queue
      await service.installer.enqueue(targetAgent.id, targetVersion, 'install');
    } catch (err: any) {
      alert(`Installation failed: ${err.message}`);
    }
  };

  const handleUninstall = async (agentId: string) => {
    if (confirm('Are you sure you want to uninstall this agent?')) {
      try {
        await service.installer.enqueue(agentId, '', 'uninstall');
        refreshInstalledList();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleRepair = async (agentId: string, version: string) => {
    try {
      await service.installer.enqueue(agentId, version, 'repair');
      alert('Repair completed successfully.');
    } catch (err: any) {
      alert(`Repair failed: ${err.message}`);
    }
  };

  const handleRollback = async (agentId: string, currentVersion: string) => {
    try {
      await service.installer.enqueue(agentId, currentVersion, 'rollback');
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  const handleToggleActiveState = async (agentId: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await service.installer.disable(agentId);
      } else {
        await service.installer.enable(agentId);
      }
      refreshInstalledList();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleVersionSwitch = async (agentId: string, version: string) => {
    try {
      await service.installer.enqueue(agentId, version, 'version-switch');
      refreshInstalledList();
    } catch (err: any) {
      alert(`Switch failed: ${err.message}`);
    }
  };

  // Diagnostics test runner
  const runDiagnostics = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await MarketplaceTestSuite.runTests();
      setTestResults(results);
      refreshInstalledList();
    } catch (e: any) {
      alert(`Tests failed: ${e.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800 py-12 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.15),rgba(0,0,0,0))]" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center relative z-10 gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/50 border border-cyan-800/40 rounded-full text-cyan-400 text-xs font-semibold">
              <Sparkles size={12} className="animate-pulse" />
              <span>Protocol v1.0.0 Ready</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              AI Agent Marketplace
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Explore and install verified, sandboxed AI agents natively integrated into the cognitive graph of the Nexus Protocol. Audit capability registry tasks and set fine-grained permissions dynamically.
            </p>
          </div>

          {/* Upgrade & Diagnostics controls */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 w-full md:w-80 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity size={14} className="text-cyan-400" />
              <span>Registry Controller</span>
            </h3>
            
            <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-3">
              <span className="text-slate-400">Automatic Updates</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoUpdateEnabled} 
                  onChange={handleToggleAutoUpdate} 
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-900" />
              </label>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={checkUpgrades}
                disabled={isCheckingUpdates}
                className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-slate-700 disabled:opacity-50"
              >
                <RefreshCw size={12} className={isCheckingUpdates ? 'animate-spin text-cyan-400' : ''} />
                Scan Updates
              </button>
              <button 
                onClick={runDiagnostics}
                disabled={isRunningTests}
                className="flex-1 flex items-center justify-center gap-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-cyan-800/40 disabled:opacity-50"
              >
                <ShieldCheck size={12} />
                Run Suite
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INSTALLED AGENTS IN SERVICE & PROGRESS TRACKER */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        {installQueue.length > 0 && (
          <div className="mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Download className="text-cyan-400 animate-bounce" size={16} />
              <span>Active Deployment Queue ({installQueue.length})</span>
            </h2>
            <div className="space-y-4">
              {installQueue.map(item => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {item.type.toUpperCase()}: <span className="font-mono text-cyan-400">{item.agentId}</span>
                    </span>
                    <span className="font-mono text-slate-400">v{item.version} | {item.status.toUpperCase()}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-900">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>
                      {item.progress < 30 ? 'Resolving dependencies...' : 
                       item.progress < 60 ? 'Running signature validation...' : 
                       item.progress < 90 ? 'Writing registry files...' : 'Linking sandbox context...'}
                    </span>
                    <span>{item.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local capability listing */}
        {installedAgents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="text-cyan-400" size={18} />
              <span>Registry Installed Instances ({installedAgents.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {installedAgents.map(entry => {
                const isUpdateAvailable = entry.updateStatus === 'update-available' || !!updateChecksReport[entry.agentId];
                return (
                  <div key={entry.agentId} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group shadow-lg">
                    {entry.healthStatus === 'healthy' ? (
                      <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-green-400 bg-green-950/40 border border-green-900/40 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                        <span>HEALTHY</span>
                      </div>
                    ) : (
                      <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-red-400 bg-red-950/40 border border-red-900/40 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>DEGRADED</span>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                        {entry.publisher} / {entry.agentId.split('.').pop()}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono mb-3">{entry.agentId}</p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {entry.capabilities.map(cap => (
                          <span key={cap} className="text-[9px] font-mono px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 rounded">
                            {cap}
                          </span>
                        ))}
                      </div>

                      {/* Capabilities registry breakdown */}
                      <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 mb-4 space-y-2 text-xs">
                        <div className="flex justify-between font-mono text-[10px] text-slate-500 border-b border-slate-900 pb-1.5">
                          <span>REGISTRY DATA</span>
                          <span>v{entry.version}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div>
                            <span className="text-slate-500 block uppercase">Permissions</span>
                            <span className="text-slate-300 font-semibold">{entry.permissions.length} approved</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block uppercase">Mode</span>
                            <span className="text-slate-300 font-semibold capitalize">{entry.executionMode}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="border-t border-slate-800 pt-4 space-y-3">
                      {isUpdateAvailable && (
                        <div className="flex justify-between items-center bg-cyan-950/40 border border-cyan-800/40 rounded-xl p-2.5 text-xs text-cyan-400">
                          <span>Upgrade available!</span>
                          <button 
                            onClick={() => service.updater.updateAgent(entry.agentId).then(() => { refreshInstalledList(); refreshMarketplace(); })}
                            className="bg-cyan-500 text-slate-950 font-bold px-2 py-1 rounded text-[10px] hover:bg-cyan-400 transition-colors"
                          >
                            Upgrade
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActiveState(entry.agentId, false)} // Mock simple state toggler
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors border border-slate-700"
                        >
                          <Play size={12} className="rotate-90 text-green-400" />
                          <span>Active</span>
                        </button>
                        
                        <button
                          onClick={() => handleRepair(entry.agentId, entry.version)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                          title="Repair Checksums"
                        >
                          <Wrench size={12} />
                        </button>

                        <button
                          onClick={() => handleRollback(entry.agentId, entry.version)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                          title="Rollback Version"
                        >
                          <History size={12} />
                        </button>

                        <button
                          onClick={() => handleUninstall(entry.agentId)}
                          className="px-2.5 py-1.5 bg-red-950/40 border border-red-900/30 text-red-400 hover:bg-red-900/30 rounded-lg"
                          title="Uninstall Agent"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN WORKSPACE / DISCOVERY LIST */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
        
        {/* Filters Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-5 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Filter size={16} className="text-cyan-400" />
              <span>Search Filters</span>
            </h3>

            {/* Keyword Search */}
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400 uppercase font-mono font-bold">Query</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Name or publisher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500 text-slate-200"
                />
              </div>
            </div>

            {/* Capability Search */}
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400 uppercase font-mono font-bold">Capability Tag</label>
              <div className="relative">
                <Cpu size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text"
                  placeholder="e.g. vector-search"
                  value={capabilityQuery}
                  onChange={(e) => setCapabilityQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500 text-slate-200"
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400 uppercase font-mono font-bold">Category</label>
              <div className="flex flex-col gap-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors font-medium
                      ${selectedCategory === cat 
                        ? 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-400' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'}
                    `}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting Select */}
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400 uppercase font-mono font-bold">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 text-slate-200"
              >
                <option value="downloads">Most Downloaded</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Recently Released</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Agents Grid list */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center text-xs text-slate-500 font-mono px-2">
            <span>SHOWING {agents.length} AGENTS AVAILABLE</span>
            <span className="flex items-center gap-1">
              <TrendingUp size={12} className="text-cyan-400" />
              <span>Trending updates simulated live</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map(agent => {
              const isInstalled = installedAgents.some(e => e.agentId === agent.id);
              const localEntry = installedAgents.find(e => e.agentId === agent.id);
              return (
                <div 
                  key={agent.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-cyan-950/10 hover:border-slate-700 transition-all group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-950 border border-slate-850 rounded-full font-bold text-slate-400 uppercase tracking-wider">
                        {agent.categories[0]}
                      </span>
                      
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                        <Star size={12} fill="currentColor" />
                        <span>{agent.rating}</span>
                      </div>
                    </div>

                    <h3 
                      onClick={() => setSelectedAgent(agent)}
                      className="text-lg font-bold text-white mb-1 hover:text-cyan-400 transition-colors cursor-pointer leading-snug"
                    >
                      {agent.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mb-2">Publisher: {agent.publisher.name}</p>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                      {agent.description}
                    </p>

                    {/* Permissions list preview */}
                    <div className="mb-4 space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Permissions Requested</span>
                      <div className="flex flex-wrap gap-1">
                        {agent.permissions.map(perm => (
                          <span key={perm} className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded border border-slate-900">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(agent.downloadCount).toLocaleString()} downloads
                    </span>

                    {isInstalled ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-cyan-400 font-mono">v{localEntry?.version} Installed</span>
                        <button
                          onClick={() => setSelectedAgent(agent)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Details
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerInstallFlow(agent, agent.version)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all"
                      >
                        <Download size={12} />
                        <span>Install v{agent.version}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. DIAGNOSTICS MONITORING REPORT PANEL */}
      <AnimatePresence>
        {testResults && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-6 mt-12"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Diagnostics Suite Log Report</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Automated containment checks, registry assertions, and rollback verification output.</p>
                </div>
                <button 
                  onClick={() => setTestResults(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Summary counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Tests Run</div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">{testResults.total}</div>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Passed</div>
                  <div className="text-2xl font-bold text-green-400 font-mono mt-1">{testResults.passed}</div>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Failed</div>
                  <div className="text-2xl font-bold text-red-400 font-mono mt-1">{testResults.failed}</div>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Latency</div>
                  <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">{testResults.duration}ms</div>
                </div>
              </div>

              {/* Table details */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-mono font-bold tracking-wider text-[10px]">
                      <th className="p-4">Suite</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {testResults.tests.map((test, index) => (
                      <tr key={index} className="hover:bg-slate-900/40 text-slate-300">
                        <td className="p-4 font-mono font-semibold text-slate-400">{test.suite}</td>
                        <td className="p-4 font-mono">{test.name}</td>
                        <td className="p-4 font-mono text-slate-500">{test.duration}ms</td>
                        <td className="p-4 text-right">
                          {test.passed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-950 text-green-400 border border-green-900">
                              <CheckCircle size={10} />
                              <span>PASS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-900">
                              <AlertTriangle size={10} />
                              <span>FAIL</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. SECURITY MODIFICATION CONSENT DIALOG */}
      <AnimatePresence>
        {securityModalOpen && targetAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-rose-400">
                  <ShieldAlert size={22} />
                  <h2 className="text-lg font-bold text-white">Security Authorization Audit</h2>
                </div>
                <button 
                  onClick={() => setSecurityModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Risk details block */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs uppercase text-slate-500 font-mono">Calculated Sandbox Threat Rating</h4>
                  <span className="text-lg font-extrabold text-white">
                    {SecurityVerifier.calculateRiskScore(targetAgent)} / 100
                  </span>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 text-xs font-black rounded border
                    ${SecurityVerifier.calculateRiskScore(targetAgent) >= 70 
                      ? 'bg-rose-950 border-rose-800 text-rose-400' 
                      : SecurityVerifier.calculateRiskScore(targetAgent) >= 35 
                        ? 'bg-amber-950 border-amber-800 text-amber-400' 
                        : 'bg-green-950 border-green-800 text-green-400'}
                  `}>
                    {SecurityVerifier.calculateRiskScore(targetAgent) >= 70 ? 'HIGH RISK' : 
                     SecurityVerifier.calculateRiskScore(targetAgent) >= 35 ? 'MEDIUM RISK' : 'LOW RISK'}
                  </span>
                </div>
              </div>

              {/* Publisher reputation */}
              <div className="space-y-2 text-xs">
                <h3 className="font-mono text-slate-400 uppercase tracking-wider font-bold">Publisher Integrity</h3>
                <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Publisher:</span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      {targetAgent.publisher.name}
                      {targetAgent.publisher.verified && <UserCheck size={12} className="text-cyan-400" />}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reputation Rating:</span>
                    <span className="font-semibold text-slate-200">{targetAgent.publisher.reputationScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cryptographic Hash Check:</span>
                    <span className="font-mono text-green-400">PASSED</span>
                  </div>
                </div>
              </div>

              {/* Required Scopes and Checkbox */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-mono text-slate-400 uppercase tracking-wider font-bold">Requested Scope Approvals</h3>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-850">
                    {targetAgent.permissions.map(perm => (
                      <div key={perm} className="flex gap-2 text-xs text-slate-300">
                        <Lock size={12} className="text-cyan-400 mt-0.5" />
                        <span className="font-mono font-semibold">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-3 text-xs text-slate-400 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={agreedToPermissions}
                    onChange={(e) => setAgreedToPermissions(e.target.checked)}
                    className="mt-0.5 accent-cyan-500 border border-slate-700 bg-slate-950 rounded text-cyan-500"
                  />
                  <span>
                    I authorize this agent to mount sandbox modules, register capability tasks, and perform execution processes.
                  </span>
                </label>
              </div>

              {/* Form buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSecurityModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!agreedToPermissions}
                  onClick={confirmInstallation}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                >
                  Authorize & Install
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. AGENT DETAILS MODAL */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-3xl p-6 shadow-2xl relative space-y-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white leading-snug">{selectedAgent.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedAgent.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedAgent(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Grid meta info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left: General info */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-mono uppercase text-slate-500 font-bold">Description</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedAgent.description}</p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-mono uppercase text-slate-500 font-bold">Capabilities</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAgent.capabilities.map(cap => (
                        <span key={cap} className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 border border-slate-850 text-cyan-400 rounded">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-mono uppercase text-slate-500 font-bold">Publisher Details</h4>
                    <div className="text-xs space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Name:</span>
                        <span className="text-slate-300">{selectedAgent.publisher.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Website:</span>
                        <span className="text-slate-400">{selectedAgent.publisher.website}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Supported Tasks in Registry */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono uppercase text-slate-500 font-bold">Supported Capability Tasks</h4>
                    <div className="space-y-3">
                      {selectedAgent.supportedTasks.map(task => (
                        <div key={task.name} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 text-xs space-y-2">
                          <div className="font-bold text-slate-200">{task.name}</div>
                          <p className="text-[11px] text-slate-400">{task.description}</p>
                          
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Inputs</span>
                            <div className="flex flex-col gap-1">
                              {task.inputs.map(i => (
                                <div key={i.name} className="text-[10px] font-mono flex justify-between text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                                  <span>{i.name} ({i.type})</span>
                                  <span className="text-slate-500 font-sans">{i.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Version History logs */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase text-slate-500 font-bold">Version History & Release Notes</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-850">
                  {selectedAgent.versionsHistory.map(v => (
                    <div key={v.version} className="text-xs space-y-1 border-b border-slate-900 pb-2 last:border-b-0">
                      <div className="flex justify-between font-mono">
                        <span className="text-cyan-400 font-bold">v{v.version}</span>
                        <span className="text-slate-500 text-[10px] truncate max-w-xs">{v.digitalSignature}</span>
                      </div>
                      <p className="text-slate-400">{v.releaseNotes}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Version Switch Panel */}
              {installedAgents.some(e => e.agentId === selectedAgent.id) && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-mono">Active version: v{installedAgents.find(e => e.agentId === selectedAgent.id)?.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">Switch Version:</span>
                    <select
                      onChange={(e) => handleVersionSwitch(selectedAgent.id, e.target.value)}
                      defaultValue={installedAgents.find(e => e.agentId === selectedAgent.id)?.version}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 focus:outline-none"
                    >
                      {selectedAgent.versionsHistory.map(v => (
                        <option key={v.version} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Reviews section (Simulated in memory) */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-slate-500 font-bold">User Reviews</h4>
                <div className="space-y-3">
                  {selectedAgent.reviews.map(rev => (
                    <div key={rev.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-300">{rev.author}</span>
                        <div className="flex gap-0.5 text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} size={10} fill="currentColor" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-850">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AgentMarketplacePage;
