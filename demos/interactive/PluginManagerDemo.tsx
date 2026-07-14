import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, Play, RefreshCw, AlertTriangle, CheckCircle, Terminal, 
  Settings, Send, MessageSquare, Database, List, FileCode, Check 
} from 'lucide-react';

import { PluginManager } from '../../core/plugin-sdk/PluginManager';
import { PluginTestSuite, SuiteResults } from '../../core/plugin-sdk/__tests__/plugin-sdk.test';
import { SovereignPersona } from '../../core/sovereign-persona/SovereignPersona';
import { PluginManifest, PluginInfo, PluginLog, PluginEvent } from '../../core/plugin-sdk/PluginTypes';

// Pre-defined seeds
import { GreetingAgentManifest } from '../../core/plugin-sdk/examples/GreetingAgent';
import { KnowledgeAssistantManifest } from '../../core/plugin-sdk/examples/KnowledgeAssistant';
import { MetricsCollectorManifest } from '../../core/plugin-sdk/examples/MetricsCollector';
import { EventLoggerManifest } from '../../core/plugin-sdk/examples/EventLogger';

// Mock Persona Profile
const MOCK_PROFILE = {
  id: 'sp_dev_user',
  userId: 'Nexus Developer',
  knowledgeDomains: ['programming', 'ethics', 'ai_infrastructure'],
  ethicalBoundaries: [
    { domain: 'safety', constraints: ['do not bypass filters'], severity: 'critical' as const }
  ],
  professionalContext: {
    role: 'Lead Architect',
    industry: 'AI Protocols',
    skills: ['TypeScript', 'React', 'Solidity'],
    experience: '8 years',
    goals: ['Implement decentralized AI agent layers']
  },
  privacyPreferences: {
    dataRetention: 30,
    sharingLevel: 'private' as const,
    encryptionLevel: 'military' as const,
    federatedParticipation: true
  },
  carbonFootprintTarget: 0.5
};

export const PluginManagerDemo: React.FC = () => {
  // ── Core References ────────────────────────────────────────────────────────
  const [persona] = useState(() => new SovereignPersona(MOCK_PROFILE));
  const [manager] = useState(() => PluginManager.getInstance(persona));
  const [activeTab, setActiveTab] = useState<'hub' | 'editor' | 'events' | 'logs' | 'tests'>('hub');

  // ── State variables ────────────────────────────────────────────────────────
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<string>('all');
  const [consoleLogs, setConsoleLogs] = useState<PluginLog[]>([]);
  const [eventStream, setEventStream] = useState<PluginEvent[]>([]);
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Chat simulator state
  const [chatInput, setChatInput] = useState('');
  const [chatTopic, setChatTopic] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'System', text: 'Type a message to simulate user input. Greeting Agent will respond if enabled.', time: new Date().toLocaleTimeString() }
  ]);

  // Code editor states
  const [editId, setEditId] = useState('custom.agent');
  const [editName, setEditName] = useState('Custom Assistant');
  const [editDescription, setEditDescription] = useState('A sandboxed developer agent.');
  const [editPermissions, setEditPermissions] = useState<string[]>(['events.subscribe', 'storage.write']);
  const [editCode, setEditCode] = useState(`// Custom Developer Plugin
context.onEnable = function() {
  context.logger.info("Custom Assistant active and listening!");
  
  context.events.subscribe("user.message", function(event) {
    context.logger.warn("Custom assistant intercepted user message: " + event.payload);
    context.storage.save("last_interacted_msg", event.payload);
  });
};

context.onDisable = function() {
  context.logger.info("Custom Assistant stopped.");
};
`);
  const [editorStatus, setEditorStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });

  // ── Sync UI with registry & logs ───────────────────────────────────────────
  const refreshPluginsList = () => {
    setPlugins(manager.listPlugins());
  };

  useEffect(() => {
    // Register seeds if empty
    const current = manager.listPlugins();
    if (current.length === 0) {
      try {
        manager.registerPlugin(GreetingAgentManifest);
        manager.registerPlugin(KnowledgeAssistantManifest);
        manager.registerPlugin(MetricsCollectorManifest);
        manager.registerPlugin(EventLoggerManifest);
      } catch (e) {
        console.error('Failed to register seed plugins:', e);
      }
    }
    refreshPluginsList();

    // Listen to log events and push to consolidated log stream
    const handleLog = (log: PluginLog) => {
      setConsoleLogs(prev => [...prev.slice(-99), log]);
    };

    // Sub to all logs from active instances
    const activeInstances = manager.getActiveInstances();
    const cleanups: (() => void)[] = [];
    activeInstances.forEach((inst, id) => {
      const unsub = inst.logger.onLog(handleLog);
      cleanups.push(unsub);
    });

    // Event Bus listener hook
    const mockPermissions: any = { assert: () => {}, has: () => true };
    const unsubEvent = manager.getEventBus().subscribe('UI_MONITOR', mockPermissions, '*', (e: PluginEvent) => {
      setEventStream(prev => [...prev.slice(-99), e]);
      
      // Auto react in Chat Simulator for Greeting responses
      if (e.type === 'agent.greeting') {
        setChatMessages(prev => [...prev, {
          sender: 'Greeting Agent',
          text: e.payload.message,
          time: new Date().toLocaleTimeString()
        }]);
      }
    });

    return () => {
      cleanups.forEach(c => c());
      unsubEvent();
    };
  }, [plugins.length]);

  // Periodic metrics poller
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPluginsList();
      
      // Re-populate console logs from registry depending on filter
      if (selectedPluginId === 'all') {
        const allLogs: PluginLog[] = [];
        manager.listPlugins().forEach(p => {
          allLogs.push(...p.logs);
        });
        allLogs.sort((a, b) => a.timestamp - b.timestamp);
        setConsoleLogs(allLogs.slice(-100));
      } else {
        const p = manager.getPlugin(selectedPluginId);
        setConsoleLogs(p ? p.logs : []);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedPluginId]);

  // ── Operations ─────────────────────────────────────────────────────────────
  const togglePlugin = async (id: string, currentlyEnabled: boolean) => {
    try {
      if (currentlyEnabled) {
        await manager.disablePlugin(id);
      } else {
        await manager.enablePlugin(id);
      }
      refreshPluginsList();
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`);
    }
  };

  const handleReload = async (id: string) => {
    try {
      await manager.reloadPlugin(id);
      refreshPluginsList();
    } catch (err: any) {
      alert(`Reload failed: ${err.message}`);
    }
  };

  // Chat sender
  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev, {
      sender: 'User',
      text: chatInput,
      time: new Date().toLocaleTimeString()
    }]);

    // Dispatch event to Event Bus
    const mockPerms: any = { assert: () => {}, has: () => true };
    manager.getEventBus().publish('chat_simulator', mockPerms, 'user.message', chatInput);
    setChatInput('');
  };

  const handleQueryTopic = () => {
    if (!chatTopic.trim()) return;

    setChatMessages(prev => [...prev, {
      sender: 'User',
      text: `Requested concept analysis: "${chatTopic}"`,
      time: new Date().toLocaleTimeString()
    }]);

    // Dispatch event to Event Bus
    const mockPerms: any = { assert: () => {}, has: () => true };
    manager.getEventBus().publish('chat_simulator', mockPerms, 'user.query_topic', { topic: chatTopic });
    setChatTopic('');
  };

  // Compile and load custom plugin from editor
  const handleDeployCustom = () => {
    setEditorStatus({ type: null, msg: '' });
    try {
      const customManifest: PluginManifest = {
        id: editId.trim(),
        name: editName.trim(),
        version: '1.0.0',
        author: 'Developer Sandbox',
        description: editDescription.trim(),
        permissions: editPermissions as any[],
        supportedProtocolVersion: '1.0.0',
        entry: editCode
      };

      // Unregister if already present to allow hot overwrites
      const existing = manager.getPlugin(customManifest.id);
      if (existing) {
        manager.unregisterPlugin(customManifest.id);
      }

      manager.registerPlugin(customManifest);
      manager.enablePlugin(customManifest.id);
      
      setEditorStatus({ type: 'success', msg: `Successfully compiled and enabled agent '${customManifest.id}'!` });
      refreshPluginsList();
      setActiveTab('hub');
    } catch (err: any) {
      setEditorStatus({ type: 'error', msg: err.message || 'Validation/Sandbox execution failed.' });
    }
  };

  // Run suite
  const runDiagnostics = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await PluginTestSuite.runTests(persona);
      setTestResults(results);
    } catch (e: any) {
      alert(`Tests failed: ${e.message}`);
    } finally {
      setIsRunningTests(false);
      refreshPluginsList();
    }
  };

  // Permission selection toggle
  const togglePermission = (perm: string) => {
    setEditPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b border-gray-700 gap-1">
        {[
          { id: 'hub', label: 'Plugin Hub', icon: Settings },
          { id: 'editor', label: 'Developer Sandbox', icon: FileCode },
          { id: 'events', label: 'Event Simulator', icon: Send },
          { id: 'logs', label: 'Console Logs', icon: Terminal },
          { id: 'tests', label: 'Diagnostics Suite', icon: List }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all
                ${isActive 
                  ? 'border-blue-500 text-blue-400 bg-blue-900/10' 
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}
              `}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="min-h-[400px]"
        >
          
          {/* TAB 1: PLUGIN HUB */}
          {activeTab === 'hub' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plugins.map(p => {
                  const state = p.status.state;
                  const isEnabled = state === 'ENABLED';
                  const isError = state === 'ERROR';
                  return (
                    <div 
                      key={p.manifest.id} 
                      className={`bg-slate-800/80 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-blue-950/20
                        ${isError ? 'border-red-900/50 bg-red-950/5' : isEnabled ? 'border-blue-800/40' : 'border-gray-700/60'}
                      `}
                    >
                      {/* Top metadata */}
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold border
                            ${isEnabled 
                              ? 'bg-blue-950/40 text-blue-400 border-blue-800/40' 
                              : isError 
                                ? 'bg-red-950/40 text-red-400 border-red-900/40'
                                : 'bg-gray-950/40 text-gray-400 border-gray-700'}
                          `}>
                            {state}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">v{p.manifest.version}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1 leading-snug">{p.manifest.name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono mb-2">{p.manifest.id}</p>
                        <p className="text-gray-300 text-xs line-clamp-2 leading-relaxed mb-4">{p.manifest.description}</p>
                        
                        {/* Permissions checklist */}
                        <div className="mb-4">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Permissions</div>
                          <div className="flex flex-wrap gap-1">
                            {p.manifest.permissions.length === 0 ? (
                              <span className="text-[10px] text-gray-500 font-mono italic">None</span>
                            ) : (
                              p.manifest.permissions.map(perm => (
                                <span key={perm} className="text-[9px] px-1.5 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 rounded">
                                  {perm}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metrics and Controls */}
                      <div className="border-t border-gray-700/60 pt-4 mt-auto space-y-4">
                        {/* Metrics panel */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-gray-900/60 border border-gray-800 p-2 rounded-lg">
                            <div className="text-[9px] text-gray-500">CPU LOAD</div>
                            <div className="text-xs font-bold text-gray-200 font-mono">{(p.metrics.cpuTimeMs).toFixed(1)}ms</div>
                          </div>
                          <div className="bg-gray-900/60 border border-gray-800 p-2 rounded-lg">
                            <div className="text-[9px] text-gray-500">API CALLS</div>
                            <div className="text-xs font-bold text-gray-200 font-mono">{p.metrics.apiCallsCount}</div>
                          </div>
                          <div className="bg-gray-900/60 border border-gray-800 p-2 rounded-lg">
                            <div className="text-[9px] text-gray-500">EVENTS</div>
                            <div className="text-xs font-bold text-gray-200 font-mono">{p.metrics.eventsProcessed}</div>
                          </div>
                        </div>

                        {/* Error info if available */}
                        {isError && (
                          <div className="p-2 bg-red-950/40 border border-red-900/50 rounded-lg text-[10px] text-red-300 flex items-start gap-1.5 leading-snug">
                            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                            <span>{p.status.error}</span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => togglePlugin(p.manifest.id, isEnabled)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors
                              ${isEnabled 
                                ? 'bg-red-900/20 text-red-300 border-red-800/40 hover:bg-red-900/40' 
                                : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'}
                            `}
                          >
                            <Play size={12} className={isEnabled ? 'rotate-90 text-red-400' : ''} />
                            {isEnabled ? 'Disable' : 'Enable'}
                          </button>
                          
                          {isEnabled && (
                            <button
                              onClick={() => handleReload(p.manifest.id)}
                              className="px-2.5 py-1.5 border border-gray-600 bg-gray-700/60 text-gray-300 rounded-lg hover:text-white hover:bg-gray-700 transition-colors"
                              title="Hot Reload"
                            >
                              <RefreshCw size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DEVELOPER SANDBOX */}
          {activeTab === 'editor' && (
            <div className="bg-slate-800/60 border border-gray-700 rounded-2xl p-5 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileCode className="text-blue-400" />
                  <span>Agent Sandbox Sandbox Developer Workspace</span>
                </h2>
                <p className="text-gray-400 text-xs leading-relaxed mt-1">
                  Draft a custom AI agent configuration, bind security permissions, and dynamically inject it into the runtime context.
                </p>
              </div>

              {/* Validation Status */}
              {editorStatus.type && (
                <div className={`p-3 border rounded-xl text-xs flex items-center gap-2
                  ${editorStatus.type === 'success' 
                    ? 'bg-green-950/40 border-green-800 text-green-300' 
                    : 'bg-red-950/40 border-red-800 text-red-300'}
                `}>
                  {editorStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  <span>{editorStatus.msg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Meta details column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Plugin ID</label>
                    <input 
                      type="text" 
                      value={editId}
                      onChange={(e) => setEditId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Display Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Description</label>
                    <textarea 
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Permissions Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Requested Permissions</label>
                    <div className="space-y-1.5">
                      {[
                        'persona.read', 'persona.write',
                        'graph.read', 'graph.write',
                        'events.subscribe', 'events.publish',
                        'storage.read', 'storage.write',
                        'network.access'
                      ].map(perm => {
                        const isChecked = editPermissions.includes(perm);
                        return (
                          <button
                            key={perm}
                            type="button"
                            onClick={() => togglePermission(perm)}
                            className={`
                              w-full flex items-center justify-between px-3 py-1.5 border rounded-lg text-left text-xs transition-colors
                              ${isChecked 
                                ? 'bg-blue-950/40 border-blue-800 text-blue-300' 
                                : 'bg-gray-900/60 border-gray-800 text-gray-500 hover:border-gray-700'}
                            `}
                          >
                            <span className="font-mono">{perm}</span>
                            {isChecked && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Code editor column */}
                <div className="lg:col-span-2 flex flex-col">
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">JavaScript Implementation</label>
                  <textarea
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    rows={17}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500 resize-none flex-grow"
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={handleDeployCustom}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Compile & Live Deploy (Hot-Reload)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVENT SIMULATOR */}
          {activeTab === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chat Simulator */}
              <div className="bg-slate-800/60 border border-gray-700 rounded-2xl p-5 flex flex-col justify-between min-h-[480px]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <MessageSquare className="text-blue-400" />
                    <span>Cross-Agent Interaction Simulator</span>
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed mb-4">
                    Send simulated user statements and request cognitive graph assimilation. Enabled agents will intercept these events and publish custom actions.
                  </p>

                  {/* Messages box */}
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 h-[280px] overflow-y-auto space-y-3 font-sans text-xs">
                    {chatMessages.map((msg, index) => {
                      const isUser = msg.sender === 'User';
                      const isSystem = msg.sender === 'System';
                      return (
                        <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                          <div className="flex gap-2 mb-0.5 items-baseline">
                            <span className="font-bold text-gray-400">{msg.sender}</span>
                            <span className="text-[9px] text-gray-600">{msg.time}</span>
                          </div>
                          <div className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed border
                            ${isUser 
                              ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none' 
                              : isSystem 
                                ? 'bg-gray-900 border-gray-800 text-gray-400 italic' 
                                : 'bg-slate-800 border-slate-700 text-gray-200 rounded-tl-none'}
                          `}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Input control rows */}
                <div className="space-y-3 pt-4">
                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message (fires user.message)..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendChat();
                      }}
                      className="flex-grow bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSendChat}
                      className="px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1"
                    >
                      Send
                    </button>
                  </div>

                  {/* Topic gap trigger input */}
                  <div className="flex gap-2 border-t border-gray-700 pt-3">
                    <input
                      type="text"
                      placeholder="Enter study topic (fires user.query_topic)..."
                      value={chatTopic}
                      onChange={(e) => setChatTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQueryTopic();
                      }}
                      className="flex-grow bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleQueryTopic}
                      className="px-3 border border-orange-500 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Database size={12} />
                      Query
                    </button>
                  </div>
                </div>
              </div>

              {/* Event Stream Visualizer */}
              <div className="bg-slate-800/60 border border-gray-700 rounded-2xl p-5 flex flex-col justify-between min-h-[480px]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <List className="text-blue-400" />
                    <span>Real-Time Event Bus Stream</span>
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed mb-4">
                    Monitor events flowing through the `PluginEventBus` in real-time.
                  </p>

                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 h-[380px] overflow-y-auto space-y-2 font-mono text-[10px]">
                    {eventStream.length === 0 ? (
                      <div className="text-gray-600 text-center py-12 italic">No events emitted yet. Interact on the left to trigger events.</div>
                    ) : (
                      eventStream.map((evt, idx) => (
                        <div key={idx} className="p-2 border border-gray-800 bg-gray-900/60 rounded-lg space-y-1">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-blue-400 font-bold">{evt.type}</span>
                            <span className="text-gray-600">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-gray-500">Emitter: <span className="text-gray-400 font-semibold">{evt.emitterId}</span></div>
                          <div className="text-gray-400 max-h-12 overflow-y-auto break-words bg-gray-950 p-1.5 rounded border border-gray-900 mt-1">
                            Payload: {JSON.stringify(evt.payload, null, 2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: CONSOLE LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-slate-800/60 border border-gray-700 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Terminal className="text-blue-400" />
                    <span>Sandboxed Logs console</span>
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed mt-1">
                    Isolated debug statement streams collected from execution sandboxes.
                  </p>
                </div>
                
                {/* Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Filter Agent:</span>
                  <select 
                    value={selectedPluginId}
                    onChange={(e) => setSelectedPluginId(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value="all">All Console Logs</option>
                    {plugins.map(p => (
                      <option key={p.manifest.id} value={p.manifest.id}>{p.manifest.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Logs Screen */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 h-[400px] overflow-y-auto font-mono text-xs space-y-1">
                {consoleLogs.length === 0 ? (
                  <div className="text-gray-600 text-center py-20 italic">Console output is empty. Enable a plugin or trigger interaction events.</div>
                ) : (
                  consoleLogs.map((log, index) => {
                    const isError = log.level === 'error';
                    const isWarn = log.level === 'warn';
                    const isDebug = log.level === 'debug';
                    return (
                      <div key={index} className="flex gap-3 leading-relaxed py-0.5 hover:bg-gray-900/60 rounded px-1">
                        <span className="text-gray-600 select-none font-mono">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-bold select-none w-10 font-mono uppercase
                          ${isError ? 'text-red-500' : isWarn ? 'text-orange-500' : isDebug ? 'text-cyan-500' : 'text-blue-400'}
                        `}>
                          {log.level}
                        </span>
                        <span className={`break-all ${isError ? 'text-red-300' : isWarn ? 'text-orange-300' : 'text-gray-300'}`}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: TESTS RUNNER */}
          {activeTab === 'tests' && (
            <div className="bg-slate-800/60 border border-gray-700 rounded-2xl p-5 space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-gray-700/60 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <List className="text-blue-400" />
                    <span>SDK Diagnostics Suite</span>
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed mt-1">
                    Execute automated tests validating sandbox containment, ACL permissions, isolated storage, event priorities, and error recovery.
                  </p>
                </div>
                
                <button
                  onClick={runDiagnostics}
                  disabled={isRunningTests}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:bg-gray-700 disabled:border-transparent disabled:text-gray-500"
                >
                  {isRunningTests ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
                  {isRunningTests ? 'Running tests...' : 'Run Diagnostics'}
                </button>
              </div>

              {testResults ? (
                <div className="space-y-6">
                  {/* Results banner metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center">
                      <div className="text-xs text-gray-500 mb-0.5">TOTAL TESTS</div>
                      <div className="text-2xl font-black text-gray-200 font-mono">{testResults.total}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center">
                      <div className="text-xs text-gray-500 mb-0.5">PASSED</div>
                      <div className="text-2xl font-black text-green-400 font-mono">{testResults.passed}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center">
                      <div className="text-xs text-gray-500 mb-0.5">FAILED</div>
                      <div className="text-2xl font-black text-red-400 font-mono">{testResults.failed}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center">
                      <div className="text-xs text-gray-500 mb-0.5">DURATION</div>
                      <div className="text-2xl font-black text-cyan-400 font-mono">{testResults.duration}ms</div>
                    </div>
                  </div>

                  {/* Individual test list */}
                  <div className="space-y-2 border border-gray-700/60 rounded-xl overflow-hidden bg-gray-900/40">
                    <div className="grid grid-cols-6 text-xs text-gray-400 bg-slate-800/40 border-b border-gray-700 p-3 font-bold uppercase tracking-wider">
                      <div className="col-span-2">Suite</div>
                      <div className="col-span-2">Test Name</div>
                      <div>Duration</div>
                      <div className="text-right">Result</div>
                    </div>

                    <div className="divide-y divide-gray-800">
                      {testResults.tests.map((test, index) => (
                        <div key={index} className="grid grid-cols-6 items-center p-3 text-xs text-gray-300 hover:bg-gray-800/20">
                          <div className="col-span-2 text-gray-400 font-medium">{test.suite}</div>
                          <div className="col-span-2 font-mono">{test.name}</div>
                          <div className="text-gray-500 font-mono">{test.duration}ms</div>
                          <div className="text-right flex items-center justify-end gap-1.5">
                            {test.passed ? (
                              <>
                                <span className="text-green-400 font-bold">PASS</span>
                                <CheckCircle size={14} className="text-green-400" />
                              </>
                            ) : (
                              <>
                                <span className="text-red-400 font-bold" title={test.error}>FAIL</span>
                                <AlertTriangle size={14} className="text-red-400" />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-20 italic">
                  Diagnostics run is empty. Click "Run Diagnostics" to execute browser verification tests.
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
};
export default PluginManagerDemo;
