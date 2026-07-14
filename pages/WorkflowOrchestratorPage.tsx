import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  History,
  Sparkles,
  TrendingUp,
  Lock,
  Activity,
  FileCheck,
  Layers,
  Terminal,
  Settings,
  HelpCircle,
  Info
} from 'lucide-react';

// Core imports
import { WorkflowOrchestrator } from '../core/workflow-orchestrator/WorkflowOrchestrator';
import { WorkflowState, TaskState, TaskType, Workflow as IWorkflow } from '../core/workflow-orchestrator/types';
import { WorkflowOrchestratorTestSuite, SuiteResults } from '../core/workflow-orchestrator/__tests__/workflow-orchestrator.test';
import { DependencyResolver } from '../core/workflow-orchestrator/DependencyResolver';
import { SovereignPersona } from '../core/sovereign-persona/SovereignPersona';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import ProtocolDiagnostics from '../components/ProtocolDiagnostics';

const MOCK_PROFILE = {
  id: 'persona-active-user',
  userId: 'user-007',
  knowledgeDomains: ['programming', 'security', 'cryptography', 'ai'],
  ethicalBoundaries: [
    { domain: 'data-privacy', constraints: ['Do not leak raw user interactions'], severity: 'critical' as const },
    { domain: 'carbon-budget', constraints: ['Keep daily emissions below target'], severity: 'medium' as const }
  ],
  professionalContext: {
    role: 'Lead Cryptographer',
    industry: 'Cybersecurity',
    skills: ['Rust', 'TypeScript', 'AES-GCM', 'ZK-Proofs'],
    experience: '8 years',
    goals: ['Verify local decentralization integrity', 'Minimize carbon impact']
  },
  privacyPreferences: {
    dataRetention: 90,
    sharingLevel: 'private' as const,
    encryptionLevel: 'military' as const,
    federatedParticipation: true
  },
  carbonFootprintTarget: 80
};

const WorkflowOrchestratorPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Core Service Instances
  const [orchestrator] = useState(() => WorkflowOrchestrator.getInstance());
  const [personaInstance] = useState(() => new SovereignPersona(MOCK_PROFILE));

  // Options & Control State
  const [goalInput, setGoalInput] = useState('End-to-End Secure, Sustainable Collaborative Learning (Full Coordination)');
  const [injectFailure, setInjectFailure] = useState<'none' | 'federated' | 'carbon'>('none');
  const [concurrency, setConcurrency] = useState<number>(2);
  const [activeWorkflow, setActiveWorkflow] = useState<IWorkflow | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'simulator' | 'diagnostics' | 'about'>('simulator');

  // Test Runner State
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Telemetry Aggregated Metrics State
  const [successCount, setSuccessCount] = useState(12);
  const [failedCount, setFailedCount] = useState(1);
  const [totalCarbonSaved, setTotalCarbonSaved] = useState(4.28);
  const [avgLatency, setAvgLatency] = useState(420);
  const [avgPrivacy, setAvgPrivacy] = useState(94.5);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  const activeWorkflowRef = useRef(activeWorkflow);
  useEffect(() => {
    activeWorkflowRef.current = activeWorkflow;
  }, [activeWorkflow]);

  // Memoized calculation of topological task levels for visualization
  const workflowLevels = useMemo(() => {
    if (!activeWorkflow) return [];
    
    const tasksList = Array.from(activeWorkflow.tasks.values());
    const levels: string[][] = [];
    const taskLevels = new Map<string, number>();

    let sorted: typeof tasksList = [];
    try {
      sorted = DependencyResolver.resolve(tasksList);
    } catch (e) {
      sorted = tasksList;
    }

    for (const t of sorted) {
      let maxDepLevel = -1;
      for (const depId of t.dependencies) {
        const depLevel = taskLevels.get(depId);
        if (depLevel !== undefined && depLevel > maxDepLevel) {
          maxDepLevel = depLevel;
        }
      }
      taskLevels.set(t.id, maxDepLevel + 1);
    }

    for (const [taskId, lvl] of taskLevels.entries()) {
      if (!levels[lvl]) levels[lvl] = [];
      levels[lvl].push(taskId);
    }

    return levels.filter((lvl) => lvl && lvl.length > 0);
  }, [activeWorkflow]);

  // Predefined Preset Goals
  const presets = [
    {
      title: 'Full Coordination (Parallel DAG)',
      desc: 'Verify twin identity, negotiate privacy, profile carbon footprint, prune architecture, and run secure federated training round in parallel.',
      goal: 'End-to-End Secure, Sustainable Collaborative Learning (Full Coordination)'
    },
    {
      title: 'Secure Privacy Negotiation Chain',
      desc: 'Perform identity twin validation, execute adversarial security scans, and establish cryptographic privacy multi-party terms.',
      goal: 'Verify digital twin identity and perform privacy negotiation'
    },
    {
      title: 'Sustainable Learning Optimization',
      desc: 'Monitor environmental footprint, compress dynamic layers recursively using MorphNet, and submit learning weights.',
      goal: 'Optimize and train global collaborative learning models'
    }
  ];

  // Subscribe to Orchestrator Events to print logs and update states in real time
  useEffect(() => {
    const eventBus = orchestrator.getEventBus();
    const subId = 'orchestrator-ui-sub';

    eventBus.subscribe(subId, '*', (evt) => {
      const timestamp = new Date(evt.timestamp).toLocaleTimeString();
      let logMsg = `[${timestamp}] Event: ${evt.type}`;

      if (evt.taskId) {
        logMsg += ` (Task: ${evt.taskId})`;
      }

      if (evt.payload.error) {
        logMsg += ` - Error: ${evt.payload.error}`;
      } else if (evt.payload.reason) {
        logMsg += ` - Reason: ${evt.payload.reason}`;
      } else if (evt.type === 'task.completed') {
        logMsg += ` - Output: ${JSON.stringify(evt.payload.results)}`;
      }

      setExecutionLogs((prev) => [...prev, logMsg]);

      // Automatically refresh the active workflow state in memory using ref
      const currentWf = activeWorkflowRef.current;
      if (currentWf && evt.workflowId === currentWf.id) {
        const updated = orchestrator.getWorkflow(currentWf.id);
        if (updated) {
          setActiveWorkflow({ ...updated });
        }
      }
    });

    return () => {
      eventBus.unsubscribe(subId, '*');
    };
  }, [orchestrator]);

  // Scroll to bottom of terminal logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);

  // Execute Planned Workflow
  const handleRunWorkflow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setExecutionLogs([`[${new Date().toLocaleTimeString()}] Initializing Orchestrator...`]);

    // Yield control to let React flush the loading/disabled state updates to the UI
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      // 1. Plan workflow based on goal input
      const wf = orchestrator.plan(goalInput);
      
      // 2. Inject simulated errors if selected
      if (injectFailure !== 'none') {
        if (injectFailure === 'federated') {
          const t = wf.tasks.get('task-federated-round');
          if (t) {
            t.execute = async () => {
              await new Promise((resolve) => setTimeout(resolve, 600));
              throw new Error('Federated client aggregation failure (secure key exchange lost).');
            };
          }
        } else if (injectFailure === 'carbon') {
          const t = wf.tasks.get('task-carbon-optimization');
          if (t) {
            t.execute = async () => {
              await new Promise((resolve) => setTimeout(resolve, 400));
              throw new Error('Carbon footprint limit exceeded: renewable energy source offline.');
            };
          }
        }
      }

      setActiveWorkflow({ ...wf });

      // 3. Set up integration system instances context
      const systemContext = {
        personaInstance,
        cognitiveGraphInstance: personaInstance.getCognitiveGraph(),
        privacyNegotiatorInstance: (personaInstance as any).privacyNegotiator,
        federatedClientInstance: (personaInstance as any).federatedClient,
        morphNetInstance: (personaInstance as any).morphOptimizer || null,
        monitoringInstance: (personaInstance as any).monitoring || null,
        carbonOptimizerInstance: (personaInstance as any).carbonOptimizer,
        immuneSystemInstance: (personaInstance as any).immuneSystem || null
      };

      // 4. Trigger Execution asynchronously
      await orchestrator.execute(wf, systemContext, concurrency);
      
      // Update metrics upon finish
      const finalWf = orchestrator.getWorkflow(wf.id);
      if (finalWf) {
        setActiveWorkflow({ ...finalWf });
        if (finalWf.state === WorkflowState.COMPLETED) {
          setSuccessCount((prev) => prev + 1);
          
          // Accumulate carbon savings from completed tasks
          let saved = 0;
          for (const task of finalWf.tasks.values()) {
            if (task.outputResults && typeof task.outputResults.estimatedSavings === 'number') {
              saved += task.outputResults.estimatedSavings;
            }
          }
          if (saved > 0) {
            setTotalCarbonSaved((prev) => parseFloat((prev + saved).toFixed(2)));
          }
        } else if (finalWf.state === WorkflowState.ROLLED_BACK || finalWf.state === WorkflowState.FAILED) {
          setFailedCount((prev) => prev + 1);
        }
      }

      setExecutionLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Execution cycle ended with status: ${wf.state.toUpperCase()}`
      ]);
    } catch (err: any) {
      setExecutionLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Fatal Orchestration Crash: ${err.message}`
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Reset Workflow State
  const handleResetWorkflow = () => {
    if (isExecuting) return;
    setActiveWorkflow(null);
    setExecutionLogs([`[${new Date().toLocaleTimeString()}] Reset simulator workspace.`]);
  };

  // Run unit tests diagnostics
  const handleRunTests = async () => {
    if (isRunningTests) return;
    setIsRunningTests(true);
    setTestResults(null);

    // Yield control to let React flush the loading state updates to the UI
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const results = await WorkflowOrchestratorTestSuite.runTests(personaInstance);
      setTestResults(results);
    } catch (e) {
      console.error('Fatal test runner error:', e);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800/80 pb-6 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-md shadow-blue-500/20">
                <Workflow className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  Autonomous Workflow Orchestrator
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                  Nexus Multi-Module Coordination, Scheduling, & Recovery Engine
                </p>
              </div>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="bg-slate-900/80 border border-gray-800/80 rounded-xl px-1.5 py-1.5 flex space-x-1 self-start shadow-inner">
            {[
              { id: 'simulator', label: 'Orchestrator Simulator', icon: Cpu },
              { id: 'diagnostics', label: 'Diagnostic Tests', icon: FileCheck },
              { id: 'about', label: 'Architecture Spec', icon: Info }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Telemetry Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700/80 transition-all">
            <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Successful Runs</h4>
            <div className="text-3xl font-black text-white mt-1">{successCount}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-1">✓ Active execution pipelines</div>
          </div>

          <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700/80 transition-all">
            <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Failed / Rolled Back</h4>
            <div className="text-3xl font-black text-white mt-1">{failedCount}</div>
            <div className="text-[10px] text-rose-400 font-medium mt-1">⚠ Automatically neutralized</div>
          </div>

          <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700/80 transition-all">
            <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Carbon Offset Savings</h4>
            <div className="text-3xl font-black text-green-400 mt-1">{totalCarbonSaved} kg</div>
            <div className="text-[10px] text-gray-400 font-medium mt-1">Accumulated carbon reduction</div>
          </div>

          <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700/80 transition-all">
            <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Avg Execution Latency</h4>
            <div className="text-3xl font-black text-blue-400 mt-1">{avgLatency} ms</div>
            <div className="text-[10px] text-gray-400 font-medium mt-1">Parallel execution benchmark</div>
          </div>

          <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700/80 transition-all">
            <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Avg Privacy Budget</h4>
            <div className="text-3xl font-black text-purple-400 mt-1">{avgPrivacy}%</div>
            <div className="text-[10px] text-purple-400 font-medium mt-1">Trust evaluation integrity</div>
          </div>

        </div>

        {/* TAB 1: Simulator Workspace */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Configuration Controls */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-slate-900/40 border border-gray-800/60 rounded-2xl p-5 space-y-6">
                <div className="flex items-center space-x-2 border-b border-gray-850 pb-3">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold">Simulator Panel</h3>
                </div>

                <div className="space-y-4">
                  {/* Presets List */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Goal Presets</label>
                    <div className="space-y-2">
                      {presets.map((preset, index) => (
                        <button
                          key={index}
                          disabled={isExecuting}
                          onClick={() => setGoalInput(preset.goal)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                            goalInput === preset.goal
                              ? 'bg-blue-950/40 border-blue-500/80 text-white'
                              : 'bg-slate-950/40 border-gray-800/60 text-gray-300 hover:border-gray-700/85'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>{preset.title}</span>
                            {goalInput === preset.goal && <Sparkles size={12} className="text-blue-400 animate-pulse" />}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 leading-normal">{preset.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Goal Input field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Goal Input</label>
                    <textarea
                      disabled={isExecuting}
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      placeholder="Type a goal (e.g. Optimize privacy terms...)"
                      className="w-full h-16 bg-slate-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gray-700 transition-all font-sans leading-relaxed resize-none"
                    />
                  </div>

                  {/* Parallel Concurrency Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Max Parallel Tasks</span>
                      <span className="font-bold font-mono text-blue-400">{concurrency} tasks</span>
                    </div>
                    <input
                      disabled={isExecuting}
                      type="range"
                      min="1"
                      max="4"
                      value={concurrency}
                      onChange={(e) => setConcurrency(parseInt(e.target.value))}
                      className="w-full bg-slate-950 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Simulated Failures Option */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inject Simulated Failure</label>
                    <select
                      disabled={isExecuting}
                      value={injectFailure}
                      onChange={(e) => setInjectFailure(e.target.value as any)}
                      className="w-full bg-slate-950 text-xs font-bold text-rose-400 border border-gray-850 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-gray-700"
                    >
                      <option value="none" className="text-white">None (Standard Success Flow)</option>
                      <option value="federated" className="text-rose-400">Fail Federated Round (Triggers Rollback)</option>
                      <option value="carbon" className="text-rose-400">Fail Carbon Optimizer (Triggers Rollback)</option>
                    </select>
                  </div>

                  {/* Execution & Reset Buttons */}
                  <div className="flex gap-3">
                    <button
                      disabled={isExecuting || !goalInput.trim()}
                      onClick={handleRunWorkflow}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
                        isExecuting
                          ? 'bg-slate-800 text-gray-500 cursor-not-allowed border border-gray-700/40'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-950 cursor-pointer'
                      }`}
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-white" />
                          <span>Run Workflow</span>
                        </>
                      )}
                    </button>

                    <button
                      disabled={isExecuting}
                      onClick={handleResetWorkflow}
                      className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all border border-gray-800 hover:border-gray-750 active:scale-[0.98] ${
                        isExecuting
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'bg-slate-950/40 hover:bg-slate-900/60 text-gray-300 cursor-pointer'
                      }`}
                      title="Reset current workflow visualization and state"
                    >
                      <RefreshCw size={14} className={isExecuting ? '' : 'text-gray-400'} />
                      <span>Reset</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Terminal Logs Panel */}
              <div className="bg-slate-950 border border-gray-850 rounded-2xl overflow-hidden flex flex-col h-64 shadow-2xl">
                <div className="bg-slate-900 border-b border-gray-850 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Terminal size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Console Telemetry logs</span>
                  </div>
                  <button
                    onClick={() => setExecutionLogs([])}
                    className="text-[10px] text-gray-500 hover:text-gray-300 font-bold"
                  >
                    Clear Log
                  </button>
                </div>
                <div className="p-3 font-mono text-[9px] text-gray-300 overflow-y-auto flex-1 space-y-1.5 leading-relaxed selection:bg-slate-800">
                  {executionLogs.length === 0 ? (
                    <div className="text-gray-500 italic text-center py-16">No log messages. Start a workflow to observe telemetry.</div>
                  ) : (
                    executionLogs.map((log, i) => {
                      let color = 'text-gray-300';
                      if (log.includes('Error:') || log.includes('failed')) color = 'text-rose-400';
                      else if (log.includes('completed successfully') || log.includes('completed')) color = 'text-emerald-400';
                      else if (log.includes('rollback.started')) color = 'text-amber-400';
                      else if (log.includes('Event:')) color = 'text-blue-400';

                      return (
                        <div key={i} className={`${color} break-all`}>
                          {log}
                        </div>
                      );
                    })
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </div>

            </div>

            {/* Right Column: Interactive DAG Visualizer */}
            <div className="lg:col-span-8 bg-slate-900/40 border border-gray-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[500px]">
              
              <div className="flex justify-between items-center border-b border-gray-850 pb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center space-x-2">
                    <span>Task Dependency Graph (DAG)</span>
                    {activeWorkflow && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        activeWorkflow.state === WorkflowState.COMPLETED ? 'bg-emerald-950 border border-emerald-500 text-emerald-400' :
                        activeWorkflow.state === WorkflowState.FAILED ? 'bg-rose-950 border border-rose-500 text-rose-400' :
                        activeWorkflow.state === WorkflowState.ROLLED_BACK ? 'bg-amber-950 border border-amber-500 text-amber-400' :
                        activeWorkflow.state === WorkflowState.RUNNING ? 'bg-blue-950 border border-blue-500 text-blue-400 animate-pulse' :
                        'bg-slate-800 text-gray-400'
                      }`}>
                        {activeWorkflow.state}
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Visual layout mapping workflow parallel level pathways. Arrows represent dependency constraints.
                  </p>
                </div>
              </div>

              {/* DAG Canvas */}
              <div className="flex-1 flex flex-col justify-center py-8 relative">
                {!activeWorkflow ? (
                  <div className="text-center py-24 space-y-3">
                    <Workflow className="w-16 h-16 text-gray-700 mx-auto animate-pulse" />
                    <h4 className="text-sm font-bold text-gray-400">Visualizer Standby</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Plan and execute a goal on the control panel to generate the dependency graph structure.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-10 relative">
                    {/* Parallel Level Rows */}
                    {(() => {
                      return (
                        <div className="space-y-12 relative flex flex-col items-center">
                          {workflowLevels.map((lvlTaskIds, rowIdx) => (
                            <div key={rowIdx} className="flex justify-center items-center gap-6 sm:gap-12 relative w-full">
                              {lvlTaskIds.map((taskId) => {
                                const task = activeWorkflow.tasks.get(taskId)!;

                                // Colors based on status
                                let borderClass = 'border-gray-800/80 bg-slate-950/40 text-gray-400';
                                let icon = <HelpCircle size={14} className="text-gray-500" />;
                                let glow = '';

                                if (task.state === TaskState.RUNNING) {
                                  borderClass = 'border-blue-500 bg-blue-950/20 text-blue-200';
                                  icon = <RefreshCw size={14} className="text-blue-400 animate-spin" />;
                                  glow = 'shadow-[0_0_15px_rgba(59,130,246,0.25)]';
                                } else if (task.state === TaskState.COMPLETED) {
                                  borderClass = 'border-emerald-500/70 bg-emerald-950/15 text-emerald-300';
                                  icon = <CheckCircle size={14} className="text-emerald-400" />;
                                  glow = 'shadow-[0_0_10px_rgba(16,185,129,0.15)]';
                                } else if (task.state === TaskState.FAILED) {
                                  borderClass = 'border-rose-500 bg-rose-950/20 text-rose-300';
                                  icon = <XCircle size={14} className="text-rose-500" />;
                                  glow = 'shadow-[0_0_15px_rgba(239,68,68,0.25)]';
                                } else if (task.state === TaskState.ROLLED_BACK) {
                                  borderClass = 'border-amber-500 bg-amber-950/20 text-amber-300';
                                  icon = <History size={14} className="text-amber-500" />;
                                  glow = 'shadow-[0_0_10px_rgba(245,158,11,0.15)]';
                                } else if (task.state === TaskState.SKIPPED) {
                                  borderClass = 'border-dashed border-gray-800 bg-slate-900/10 text-gray-500';
                                  icon = <AlertTriangle size={14} className="text-gray-600" />;
                                }

                                return (
                                  <motion.div
                                    key={task.id}
                                    layout
                                    className={`w-48 border p-3 rounded-2xl flex flex-col space-y-2 relative transition-all ${borderClass} ${glow}`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                                        {task.type.replace('_', ' ')}
                                      </span>
                                      {icon}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-extrabold text-white leading-snug">{task.name}</h4>
                                      {task.error && (
                                        <p className="text-[8px] text-rose-400 mt-1 leading-normal break-words max-h-12 overflow-y-auto">
                                          {task.error}
                                        </p>
                                      )}
                                      {task.retriesAttempted > 0 && task.state === TaskState.RUNNING && (
                                        <div className="text-[8px] text-amber-400 mt-1 flex items-center space-x-1 animate-pulse">
                                          <span>Attempt {task.retriesAttempted} retry...</span>
                                        </div>
                                      )}
                                      {task.outputResults && task.state === TaskState.COMPLETED && (
                                        <div className="text-[8px] text-emerald-400 mt-1 font-mono">
                                          {task.outputResults.status === 'success' || task.outputResults.status === 'simulated_success' ? (
                                            <span>✔ Validated</span>
                                          ) : (
                                            <span>
                                              {task.outputResults.estimatedSavings ? `Saved ${task.outputResults.estimatedSavings} kg` : 
                                               task.outputResults.accuracy ? `Acc: ${task.outputResults.accuracy}` : 'Done'}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Active goal summary footer */}
              {activeWorkflow && (
                <div className="bg-slate-950/50 border border-gray-850 rounded-2xl p-4 mt-6">
                  <h4 className="text-xs font-bold text-blue-400">Current Workflow Spec</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mt-2 text-[10px] text-gray-400">
                    <div>
                      <strong>ID:</strong> <span className="font-mono text-gray-300">{activeWorkflow.id}</span>
                    </div>
                    <div>
                      <strong>Goal Presets:</strong> <span className="text-gray-300">{activeWorkflow.name}</span>
                    </div>
                    <div>
                      <strong>Tasks Count:</strong> <span className="text-gray-300">{activeWorkflow.tasks.size} steps</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 2: Diagnostic Tests */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            
            <div className="bg-slate-900/40 border border-gray-800/60 rounded-3xl p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-850 pb-4 gap-3">
                <div>
                  <h3 className="text-base font-bold">In-Browser Automated Test Suite</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Execute isolated TypeScript tests covering workflow planning, topological dependencies sorting, cyclic checks, backoff delays, failures, and event bus handlers.
                  </p>
                </div>

                <button
                  disabled={isRunningTests}
                  onClick={handleRunTests}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isRunningTests
                      ? 'bg-slate-800 text-gray-500 cursor-not-allowed border border-gray-700/40'
                      : 'bg-blue-600 hover:bg-blue-500 text-white font-bold active:scale-[0.98]'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                  <span>{isRunningTests ? 'Running Diagnostic assertions...' : 'Run Diagnostic Suite'}</span>
                </button>
              </div>

              {/* Test Results Dashboard */}
              <AnimatePresence>
                {testResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    
                    {/* Summary row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/50 p-4 border border-gray-850 rounded-2xl">
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Assertions</div>
                        <div className="text-2xl font-black text-white">{testResults.total} tests</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Passed</div>
                        <div className="text-2xl font-black text-emerald-400">{testResults.passed} passed</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Failed</div>
                        <div className="text-2xl font-black text-rose-500">{testResults.failed} failed</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Duration</div>
                        <div className="text-2xl font-black text-blue-400">{testResults.duration} ms</div>
                      </div>
                    </div>

                    {/* Test List Table */}
                    <div className="bg-slate-950/20 border border-gray-800/80 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-gray-800 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3.5">Suite Target</th>
                            <th className="p-3.5">Assertion Description</th>
                            <th className="p-3.5">Duration</th>
                            <th className="p-3.5">Outcome</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850">
                          {testResults.tests.map((test, index) => (
                            <tr key={index} className="hover:bg-slate-900/30">
                              <td className="p-3.5 font-bold text-gray-300">{test.suite}</td>
                              <td className="p-3.5 text-gray-400">
                                <div>{test.name}</div>
                                {test.error && (
                                  <div className="text-[10px] text-rose-400 font-mono mt-1 bg-rose-950/20 border border-rose-950 p-2 rounded-lg">
                                    {test.error}
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5 font-mono text-gray-400">{test.duration}ms</td>
                              <td className="p-3.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                  test.passed
                                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                                    : 'bg-rose-950 border-rose-500 text-rose-400'
                                }`}>
                                  {test.passed ? 'PASS' : 'FAIL'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

              {!testResults && !isRunningTests && (
                <div className="text-center py-16 text-gray-500">
                  <FileCheck size={48} className="mx-auto text-gray-700 animate-pulse mb-3" />
                  <span>Test suite is idle. Click the button above to execute diagnostics.</span>
                </div>
              )}

            </div>

            {/* Diagnostic system logs */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white px-2">Subsystem Observability Logs</h2>
              <ProtocolDiagnostics />
            </div>

          </div>
        )}

        {/* TAB 3: About Spec */}
        {activeTab === 'about' && (
          <div className="bg-slate-900/40 border border-gray-800/60 rounded-3xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white">Autonomous Workflow Orchestrator Architecture Specification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300 leading-relaxed">
              
              <div className="space-y-4 bg-slate-950/30 border border-gray-850 p-5 rounded-2xl">
                <h4 className="text-base font-bold text-blue-400">Core Capabilities</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Intelligent Goal Planning:</strong> Translates abstract user intentions into fully fleshed-out task DAGs, identifying requisite subsystems automatically.
                  </li>
                  <li>
                    <strong>Dynamic Parallel Scheduling:</strong> Groups independent task operations into parallelizable levels, reducing end-to-end execution times.
                  </li>
                  <li>
                    <strong>Topological Sorting:</strong> Resolves dependencies recursively and throws explicit verification exceptions on cyclical definition locks.
                  </li>
                  <li>
                    <strong>Configurable Retries:</strong> Features linear/exponential retry algorithms with randomized jitter to prevent resource starvation.
                  </li>
                </ul>
              </div>

              <div className="space-y-4 bg-slate-950/30 border border-gray-850 p-5 rounded-2xl">
                <h4 className="text-base font-bold text-purple-400">Fault Tolerance & Recovery</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Reverse Topological Rollbacks:</strong> Reverts failed workflows by executing compensating tasks in the strict reverse order of completion.
                  </li>
                  <li>
                    <strong>Isolated State Sandbox:</strong> Stores step inputs and outputs under isolated contexts, interpolating properties using JSON-path templates.
                  </li>
                  <li>
                    <strong>Priority Event Hub:</strong> Publishes execution status updates to a dedicated event bus, sorting subscribers by priority weights.
                  </li>
                  <li>
                    <strong>Unified Analytics Telemetry:</strong> Integrates with central monitoring to record carbon footprints, MPC latencies, and security scans.
                  </li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkflowOrchestratorPage;
