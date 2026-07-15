import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  Settings,
  HelpCircle,
  Cpu,
  Brain,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Compass,
  Database,
  History,
  FileCheck,
  TrendingUp,
  UserCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';

// Core imports
import { mockCollaborationAPI } from '../core/collaboration-studio/api/CollaborationAPI';
import { CollaborationWorkflow, AgentNode, AgentEdge, NodeState, WorkflowState, LogEntry, ApprovalRequest } from '../core/collaboration-studio/types';
import { CollaborationStudioTestSuite, SuiteResults } from '../core/collaboration-studio/__tests__/collaboration-studio.test';
import { mockAgentRepository } from '../core/agent-marketplace/repository/AgentRepository';
import { SovereignPersona } from '../core/sovereign-persona/SovereignPersona';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { useToast } from '../contexts/ToastContext';
import { DAGResolver } from '../core/collaboration-studio/workflow-engine/DAGResolver';

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

const CollaborationStudioPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { showToast } = useToast();

  const [personaInstance] = useState(() => new SovereignPersona(MOCK_PROFILE));

  // Workspace state
  const [workflows, setWorkflows] = useState<CollaborationWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<CollaborationWorkflow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'diagnostics' | 'about'>('editor');

  // Canvas zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging nodes
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Connecting nodes
  const [connectingSource, setConnectingSource] = useState<{ id: string; port: string } | null>(null);

  // Inspector panel
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([]);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [activeExecutionState, setActiveExecutionState] = useState<WorkflowState>(WorkflowState.PENDING);
  const [currentStepNodeId, setCurrentStepNodeId] = useState<string | undefined>(undefined);
  const [metrics, setMetrics] = useState({
    runsCount: 0,
    avgLatencyMs: 0,
    totalCarbonSavingsKg: 0,
    avgEnergyUsedKwh: 0,
    avgPrivacyScore: 100
  });

  // Approvals & Overrides
  const [activeApprovalRequest, setActiveApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [approvalOverrideComments, setApprovalOverrideComments] = useState('');
  const [approvalOverrideField, setApprovalOverrideField] = useState('');

  // Diagnostic Test state
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Initialize
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async (selectId?: string) => {
    const list = await mockCollaborationAPI.getWorkflows();
    setWorkflows(list);
    if (list.length > 0) {
      const target = selectId ? list.find(w => w.id === selectId) : list[0];
      setSelectedWorkflow(target || list[0]);
      if (target) loadMetrics(target.id);
    }
  };

  const loadMetrics = async (workflowId: string) => {
    const data = await mockCollaborationAPI.getWorkflowMetrics(workflowId);
    setMetrics(data);
  };

  const handleSelectWorkflow = (wf: CollaborationWorkflow) => {
    setSelectedWorkflow(wf);
    setSelectedNodeId(null);
    loadMetrics(wf.id);
    setExecutionLog([]);
    setActiveExecutionId(null);
    setActiveExecutionState(WorkflowState.PENDING);
  };

  // Drag agent template from library sidebar into canvas
  const handleDragStartAgent = (e: React.DragEvent, agentId: string) => {
    e.dataTransfer.setData('text/plain', agentId);
  };

  const handleDropCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedWorkflow || !canvasRef.current) return;

    const agentId = e.dataTransfer.getData('text/plain');
    if (!agentId) return;

    const agent = mockAgentRepository.get(agentId);
    if (!agent) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const newNode: AgentNode = {
      id: `node-${Date.now()}`,
      name: agent.name,
      type: 'agent',
      position: { x, y },
      config: {
        agentId,
        taskName: agent.supportedTasks[0]?.name || '',
        inputMappings: {}
      },
      state: NodeState.PENDING,
      retriesAttempted: 0
    };

    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode]
    };

    saveAndRefresh(updatedWorkflow);
  };

  const saveAndRefresh = async (wf: CollaborationWorkflow) => {
    await mockCollaborationAPI.saveWorkflow(wf);
    setWorkflows(prev => prev.map(w => w.id === wf.id ? wf : w));
    setSelectedWorkflow(wf);
  };

  // Node operations
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingSource) return;

    const node = selectedWorkflow?.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggedNodeId(nodeId);
    dragOffset.current = {
      x: e.clientX / zoom - node.position.x,
      y: e.clientY / zoom - node.position.y
    };
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (draggedNodeId && selectedWorkflow) {
      const x = e.clientX / zoom - dragOffset.current.x;
      const y = e.clientY / zoom - dragOffset.current.y;

      const updatedNodes = selectedWorkflow.nodes.map(node =>
        node.id === draggedNodeId ? { ...node, position: { x, y } } : node
      );

      setSelectedWorkflow({ ...selectedWorkflow, nodes: updatedNodes });
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    }
  };

  const handleMouseUpCanvas = () => {
    if (draggedNodeId && selectedWorkflow) {
      mockCollaborationAPI.saveWorkflow(selectedWorkflow);
      setDraggedNodeId(null);
    }
    setIsPanning(false);
  };

  // SVG lines coordinates calculations
  const getNodePortCoords = (nodeId: string, isSource: boolean) => {
    const node = selectedWorkflow?.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    // Estimate coords based on node size width: 192px (w-48), height: ~80px
    const w = 192;
    const h = 76;
    if (isSource) {
      return { x: node.position.x + w, y: node.position.y + h / 2 };
    } else {
      return { x: node.position.x, y: node.position.y + h / 2 };
    }
  };

  // Create links
  const handleStartConnection = (e: React.MouseEvent, nodeId: string, port: string) => {
    e.stopPropagation();
    setConnectingSource({ id: nodeId, port });
  };

  const handleCompleteConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!connectingSource || !selectedWorkflow || connectingSource.id === nodeId) {
      setConnectingSource(null);
      return;
    }

    const newEdge: AgentEdge = {
      id: `edge-${Date.now()}`,
      source: connectingSource.id,
      target: nodeId
    };

    const updated = {
      ...selectedWorkflow,
      edges: [...selectedWorkflow.edges, newEdge]
    };

    saveAndRefresh(updated);
    setConnectingSource(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!selectedWorkflow) return;
    const updatedNodes = selectedWorkflow.nodes.filter(n => n.id !== nodeId);
    const updatedEdges = selectedWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    
    saveAndRefresh({
      ...selectedWorkflow,
      nodes: updatedNodes,
      edges: updatedEdges
    });
    setSelectedNodeId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    if (!selectedWorkflow) return;
    const updatedEdges = selectedWorkflow.edges.filter(e => e.id !== edgeId);
    saveAndRefresh({
      ...selectedWorkflow,
      edges: updatedEdges
    });
  };

  const handleCreateNewWorkflow = async () => {
    const id = `wf_${Date.now()}`;
    const newWf: CollaborationWorkflow = {
      id,
      name: 'Custom Agent Collaboration',
      description: 'Drag agents into the canvas and configure dependencies.',
      version: 1,
      isDraft: true,
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      globalContext: {
        query: 'Decentralized AI identity parameters'
      },
      nodes: [
        {
          id: 'node-start',
          name: 'Start Trigger',
          type: 'start',
          position: { x: 50, y: 150 },
          config: { inputMappings: {} },
          state: NodeState.PENDING,
          retriesAttempted: 0
        }
      ],
      edges: []
    };

    await mockCollaborationAPI.saveWorkflow(newWf);
    loadWorkflows(id);
    showToast('Created new collaboration canvas draft');
  };

  // Execution flow
  const handleExecuteWorkflow = async () => {
    if (!selectedWorkflow || isExecuting) return;
    setIsExecuting(true);
    setExecutionLog([]);
    setActiveApprovalRequest(null);

    try {
      const exec = await mockCollaborationAPI.executeWorkflow(
        selectedWorkflow.id,
        personaInstance,
        2, // Max concurrency
        updatedExec => {
          setExecutionLog([...updatedExec.logs]);
          setActiveExecutionState(updatedExec.state);
          setActiveExecutionId(updatedExec.id);
          setCurrentStepNodeId(updatedExec.currentNodeId);

          // Update active nodes visual state
          const list = workflows.find(w => w.id === selectedWorkflow.id);
          if (list) {
            setSelectedWorkflow({ ...list });
          }

          // Listen for human approvals pause
          if (updatedExec.state === WorkflowState.PAUSED) {
            loadPendingApproval(updatedExec.id);
          }
        }
      );

      // Await execution finish check
      let state = exec.state;
      while (state === WorkflowState.RUNNING || state === WorkflowState.PENDING || state === WorkflowState.PAUSED) {
        await new Promise(r => setTimeout(r, 500));
        const active = await mockCollaborationAPI.getWorkflowById(selectedWorkflow.id);
        if (active) {
          setSelectedWorkflow({ ...active });
        }
        const updated = (await mockCollaborationAPI.getWorkflows()).find(w => w.id === selectedWorkflow.id);
        const stats = await mockCollaborationAPI.getWorkflowMetrics(selectedWorkflow.id);
        setMetrics(stats);

        const currentExec = (await mockCollaborationAPI.getWorkflowMetrics(selectedWorkflow.id)); // update metrics
      }
      
    } catch (err: any) {
      showToast(err.message || 'Execution error');
    } finally {
      setIsExecuting(false);
      setCurrentStepNodeId(undefined);
    }
  };

  const loadPendingApproval = async (executionId: string) => {
    const approvals = await mockCollaborationAPI.getPendingApprovals(executionId);
    if (approvals.length > 0) {
      setActiveApprovalRequest(approvals[0]);
      setApprovalOverrideField(JSON.stringify(approvals[0].inputData, null, 2));
    }
  };

  const handleCancelExecution = async () => {
    if (activeExecutionId) {
      await mockCollaborationAPI.cancelExecution(activeExecutionId);
      showToast('Workflow execution cancelled.');
      setIsExecuting(false);
      setCurrentStepNodeId(undefined);
    }
  };

  const handleResolveApproval = async (status: 'APPROVED' | 'REJECTED' | 'OVERRIDDEN') => {
    if (!activeApprovalRequest) return;
    
    let overrideData = undefined;
    if (status === 'OVERRIDDEN') {
      try {
        overrideData = JSON.parse(approvalOverrideField);
      } catch {
        showToast('Invalid override JSON format.');
        return;
      }
    }

    await mockCollaborationAPI.resolveApproval(
      activeApprovalRequest.id,
      status,
      overrideData,
      approvalOverrideComments
    );

    showToast(`Gate resolved: ${status}`);
    setActiveApprovalRequest(null);
    setApprovalOverrideComments('');
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Run tests
  const handleRunTests = async () => {
    if (isRunningTests) return;
    setIsRunningTests(true);
    setTestResults(null);

    await new Promise(r => setTimeout(r, 100));
    try {
      const res = await CollaborationStudioTestSuite.runTests(personaInstance);
      setTestResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Auto layout (topological level positioning coordinates mapping)
  const handleAutoLayout = () => {
    if (!selectedWorkflow) return;
    try {
      const levels = DAGResolver.groupIntoLevels(selectedWorkflow.nodes, selectedWorkflow.edges);
      const updatedNodes = selectedWorkflow.nodes.map(node => {
        let levelIdx = -1;
        let nodeIdx = -1;
        levels.forEach((lvl, lIdx) => {
          const nIdx = lvl.findIndex(n => n.id === node.id);
          if (nIdx > -1) {
            levelIdx = lIdx;
            nodeIdx = nIdx;
          }
        });

        if (levelIdx === -1) return node;

        const x = 80 + levelIdx * 240;
        const y = 80 + nodeIdx * 140;
        return { ...node, position: { x, y } };
      });

      const updated = { ...selectedWorkflow, nodes: updatedNodes };
      saveAndRefresh(updated);
      showToast('Auto-layout coordinates generated successfully');
    } catch (err) {
      showToast('Cannot layout: Cyclic loops detected. Check connections.');
    }
  };

  // Export / Import
  const handleExport = () => {
    if (!selectedWorkflow) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedWorkflow, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `nexus-collab-${selectedWorkflow.id}.json`);
    dlAnchorElem.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.id && parsed.nodes && parsed.edges) {
            await mockCollaborationAPI.saveWorkflow(parsed);
            loadWorkflows(parsed.id);
            showToast('Workflow imported successfully');
          } else {
            showToast('Invalid file format: missing keys');
          }
        } catch {
          showToast('File reading failed');
        }
      };
    }
  };

  const selectedNode = selectedWorkflow?.nodes.find(n => n.id === selectedNodeId);

  // Search filtered agents
  const filteredAgents = useMemo(() => {
    const list = mockAgentRepository.list();
    if (!searchQuery) return list;
    return list.filter(a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 text-white font-sans selection:bg-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800/80 pb-5 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-md shadow-cyan-500/20">
              <GitBranch className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Multi-Agent Collaboration Studio
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                Visual Workflow Orchestration, Mesh Communication & Consensus Engine
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="bg-slate-900/80 border border-gray-800/80 rounded-xl px-1.5 py-1.5 flex space-x-1 self-start shadow-inner">
            {[
              { id: 'editor', label: 'Collaboration Builder', icon: Layers },
              { id: 'diagnostics', label: 'Unit Test Assertions', icon: FileCheck },
              { id: 'about', label: 'Architectural Guide', icon: BookOpen }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white shadow'
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

        {activeTab === 'editor' && (
          <div className="space-y-6">
            
            {/* Top aggregate metrics stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Runs</div>
                <div className="text-2xl font-black text-white mt-1">{metrics.runsCount} runs</div>
              </div>
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avg Latency</div>
                <div className="text-2xl font-black text-cyan-400 mt-1">{metrics.avgLatencyMs} ms</div>
              </div>
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Carbon Savings</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.totalCarbonSavingsKg} kg</div>
              </div>
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Energy Consumption</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{metrics.avgEnergyUsedKwh} kWh</div>
              </div>
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Privacy Integrity</div>
                <div className="text-2xl font-black text-purple-400 mt-1">{metrics.avgPrivacyScore}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Workflows library & drag elements */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Workflow Select */}
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Canvas</span>
                    <button
                      onClick={handleCreateNewWorkflow}
                      className="p-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 hover:bg-cyan-900 transition-colors"
                      title="New workflow"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {workflows.map(wf => (
                      <button
                        key={wf.id}
                        onClick={() => handleSelectWorkflow(wf)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedWorkflow?.id === wf.id
                            ? 'bg-cyan-950/30 border-cyan-700 text-white shadow-inner shadow-cyan-950'
                            : 'bg-transparent border-transparent text-gray-400 hover:bg-slate-900/40 hover:text-white'
                        }`}
                      >
                        <div className="truncate">{wf.name}</div>
                        <span className="text-[8px] text-gray-500 font-mono tracking-normal">
                          {wf.isTemplate ? 'Template' : 'Draft'} • {wf.nodes.length} nodes
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drag-and-Drop Library */}
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-4">
                  <div className="border-b border-gray-850 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Zap size={10} className="text-cyan-400" />
                      <span>Mesh Agent Nodes</span>
                    </span>
                    <span className="cursor-help" title="Drag agent templates into the canvas board to connect them."><HelpCircle size={12} className="text-gray-500" /></span>
                  </div>
                  
                  {/* Search filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter by capability..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-gray-700"
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {filteredAgents.map(agent => (
                      <div
                        key={agent.id}
                        draggable
                        onDragStart={e => handleDragStartAgent(e, agent.id)}
                        className="bg-slate-950/60 border border-gray-850 p-2.5 rounded-xl text-xs cursor-grab hover:border-cyan-700 hover:bg-slate-950 transition-all select-none group"
                      >
                        <div className="font-extrabold text-white flex items-center justify-between">
                          <span>{agent.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-900 border border-gray-800 text-gray-400 group-hover:text-cyan-400">
                            DRAG
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 leading-normal">{agent.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.capabilities.slice(0, 2).map(c => (
                            <span key={c} className="text-[8px] bg-slate-900 px-1 py-0.5 rounded text-gray-500 font-mono">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Center Column: Visual Drag & Drop Canvas Board */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Board controls card */}
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-3xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-850 pb-3">
                    <div>
                      <h3 className="text-sm font-bold flex items-center space-x-1.5">
                        <span className="truncate">{selectedWorkflow?.name}</span>
                        {selectedWorkflow?.isTemplate && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800 text-cyan-400 uppercase tracking-wide">
                            Template
                          </span>
                        )}
                      </h3>
                      <p className="text-[9px] text-gray-500 mt-0.5 max-w-sm truncate">{selectedWorkflow?.description}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleAutoLayout}
                        className="px-2.5 py-1.5 bg-slate-950 border border-gray-850 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                        title="Auto Layout topological columns"
                      >
                        Auto-Layout
                      </button>
                      <button
                        onClick={handleExport}
                        className="p-1.5 bg-slate-950 border border-gray-850 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Export JSON"
                      >
                        <Download size={14} />
                      </button>
                      <label className="p-1.5 bg-slate-950 border border-gray-850 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer">
                        <Upload size={14} />
                        <input type="file" onChange={handleImport} className="hidden" accept=".json" />
                      </label>
                    </div>
                  </div>

                  {/* Drag drop board wrapper */}
                  <div
                    ref={canvasRef}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDropCanvas}
                    onMouseMove={handleMouseMoveCanvas}
                    onMouseUp={handleMouseUpCanvas}
                    className="relative w-full h-[380px] bg-slate-950 border border-gray-850 rounded-2xl overflow-hidden cursor-crosshair shadow-inner"
                    style={{
                      backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0)',
                      backgroundSize: '16px 16px'
                    }}
                  >
                    
                    {/* Zoom / Pan dynamic offset wrapper */}
                    <div
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                        transition: draggedNodeId ? 'none' : 'transform 0.05s ease'
                      }}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      {/* Connection cables */}
                      <svg className="absolute top-0 left-0 w-[2000px] h-[2000px] pointer-events-none z-0">
                        {selectedWorkflow?.edges.map(edge => {
                          const startCoords = getNodePortCoords(edge.source, true);
                          const endCoords = getNodePortCoords(edge.target, false);
                          
                          // Draw smooth cubic curve path
                          const dx = Math.abs(endCoords.x - startCoords.x) * 0.5;
                          const pathStr = `M ${startCoords.x} ${startCoords.y} C ${startCoords.x + dx} ${startCoords.y}, ${endCoords.x - dx} ${endCoords.y}, ${endCoords.x} ${endCoords.y}`;

                          return (
                            <g key={edge.id} className="pointer-events-auto">
                              {/* Selection overlay path */}
                              <path
                                d={pathStr}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={8}
                                className="cursor-pointer hover:stroke-rose-600/30 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEdge(edge.id);
                                }}
                              />
                              {/* Actual cable path */}
                              <path
                                d={pathStr}
                                fill="none"
                                stroke={currentStepNodeId === edge.source ? '#06b6d4' : '#334155'}
                                strokeWidth={2}
                                className="transition-all"
                              />
                            </g>
                          );
                        })}

                        {/* Temp drag line from connecting handle */}
                        {connectingSource && canvasRef.current && (() => {
                          const start = getNodePortCoords(connectingSource.id, true);
                          return (
                            <path
                              d={`M ${start.x} ${start.y} L ${start.x + 10} ${start.y}`} // simplified tracking
                              fill="none"
                              stroke="#0891b2"
                              strokeWidth={2}
                              strokeDasharray="4 4"
                            />
                          );
                        })()}
                      </svg>

                      {/* Nodes card overlay */}
                      {selectedWorkflow?.nodes.map(node => {
                        const isNodeSelected = selectedNodeId === node.id;
                        const isNodeExecuting = currentStepNodeId === node.id;
                        
                        let borderClass = 'border-gray-800 bg-slate-900/60 text-gray-400';
                        let icon = <HelpCircle size={12} className="text-gray-500" />;

                        if (node.state === NodeState.RUNNING) {
                          borderClass = 'border-cyan-500 bg-cyan-950/20 text-cyan-200';
                          icon = <RotateCcw size={12} className="text-cyan-400 animate-spin" />;
                        } else if (node.state === NodeState.COMPLETED) {
                          borderClass = 'border-emerald-500 bg-emerald-950/15 text-emerald-300';
                          icon = <CheckCircle size={12} className="text-emerald-400" />;
                        } else if (node.state === NodeState.FAILED) {
                          borderClass = 'border-rose-500 bg-rose-950/20 text-rose-300';
                          icon = <XCircle size={12} className="text-rose-500" />;
                        } else if (node.state === NodeState.PAUSED) {
                          borderClass = 'border-amber-500 bg-amber-950/20 text-amber-300 animate-pulse';
                          icon = <Clock size={12} className="text-amber-500" />;
                        }

                        return (
                          <div
                            key={node.id}
                            style={{
                              position: 'absolute',
                              left: node.position.x,
                              top: node.position.y
                            }}
                            className={`w-48 bg-slate-900 border p-3 rounded-2xl flex flex-col space-y-1.5 shadow-lg select-none pointer-events-auto ${borderClass} ${
                              isNodeSelected ? 'ring-2 ring-cyan-500' : ''
                            } ${isNodeExecuting ? 'shadow-[0_0_20px_rgba(6,182,212,0.25)]' : ''}`}
                            onMouseDown={e => handleMouseDownNode(e, node.id)}
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedNodeId(node.id);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide">
                                {node.type}
                              </span>
                              <div className="flex items-center space-x-1">
                                {icon}
                                {node.type !== 'start' && node.type !== 'end' && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleDeleteNode(node.id);
                                    }}
                                    className="p-0.5 text-gray-500 hover:text-rose-400 transition-colors"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-black text-white leading-tight truncate">{node.name}</h4>
                              {node.config.agentId && (
                                <p className="text-[8px] text-gray-400 font-mono mt-0.5 truncate">{node.config.agentId}</p>
                              )}
                            </div>

                            {/* Node handles ports */}
                            <div className="flex justify-between items-center pt-1">
                              {node.type !== 'start' ? (
                                <div
                                  className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-gray-600 cursor-pointer -ml-4 flex items-center justify-center hover:bg-cyan-600 transition-colors"
                                  onClick={e => handleCompleteConnection(e, node.id)}
                                  title="Inlet port"
                                >
                                  <div className="w-1 h-1 bg-white rounded-full" />
                                </div>
                              ) : <div />}
                              
                              {node.type !== 'end' ? (
                                <div
                                  className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-gray-600 cursor-pointer -mr-4 flex items-center justify-center hover:bg-cyan-600 transition-colors"
                                  onMouseDown={e => handleStartConnection(e, node.id, 'output')}
                                  title="Outlet port"
                                >
                                  <div className="w-1 h-1 bg-white rounded-full" />
                                </div>
                              ) : <div />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Canvas Floating Overlay Controls */}
                    <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-gray-800 px-3 py-2 rounded-xl flex items-center space-x-2 text-xs backdrop-blur pointer-events-auto">
                      <button onClick={handleZoomOut} className="p-1 hover:text-white text-gray-400" title="Zoom Out">-</button>
                      <span className="font-mono text-[10px] text-gray-400">{Math.round(zoom * 100)}%</span>
                      <button onClick={handleZoomIn} className="p-1 hover:text-white text-gray-400" title="Zoom In">+</button>
                      <div className="h-3 w-[1px] bg-gray-800" />
                      <button onClick={handleResetZoom} className="text-[10px] text-gray-400 hover:text-white font-bold">Reset</button>
                    </div>

                  </div>

                  {/* Actions execution bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      disabled={isExecuting || !selectedWorkflow}
                      onClick={handleExecuteWorkflow}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play size={14} />
                      <span>Execute Collaboration</span>
                    </button>
                    {isExecuting && (
                      <button
                        onClick={handleCancelExecution}
                        className="px-4 py-2.5 rounded-xl bg-slate-950 border border-rose-950 text-rose-400 font-bold text-xs flex items-center space-x-1.5 hover:bg-rose-950/20 transition-all"
                      >
                        <Pause size={14} />
                        <span>Cancel Run</span>
                      </button>
                    )}
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold border uppercase tracking-wider ${
                      activeExecutionState === WorkflowState.COMPLETED ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' :
                      activeExecutionState === WorkflowState.FAILED ? 'bg-rose-950/40 border-rose-800 text-rose-400' :
                      activeExecutionState === WorkflowState.PAUSED ? 'bg-amber-950/40 border-amber-800 text-amber-400 animate-pulse' :
                      activeExecutionState === WorkflowState.RUNNING ? 'bg-cyan-950/40 border-cyan-800 text-cyan-400 animate-pulse' :
                      'bg-slate-900 border-gray-800 text-gray-500'
                    }`}>
                      Pipeline: {activeExecutionState}
                    </span>
                  </div>

                </div>

                {/* Telemetry diagnostics logs */}
                <div className="bg-slate-950 border border-gray-850 rounded-2xl overflow-hidden flex flex-col h-48 shadow-2xl">
                  <div className="bg-slate-900 border-b border-gray-850 px-4 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Activity size={10} className="text-cyan-400 animate-pulse" />
                      <span>Telemetry Logs</span>
                    </span>
                    <button
                      onClick={() => setExecutionLog([])}
                      className="text-[9px] text-gray-500 hover:text-gray-300 font-bold"
                    >
                      Clear Log
                    </button>
                  </div>
                  <div className="p-3 font-mono text-[9px] text-gray-400 overflow-y-auto flex-1 space-y-1 select-text selection:bg-slate-800">
                    {executionLog.length === 0 ? (
                      <div className="text-gray-500 italic text-center py-10">No execution logs in console. Run workflow to check telemetry feedback.</div>
                    ) : (
                      executionLog.map((log, i) => {
                        let color = 'text-gray-400';
                        if (log.level === 'error') color = 'text-rose-400';
                        else if (log.level === 'warn') color = 'text-amber-400';
                        else if (log.level === 'success') color = 'text-emerald-400';
                        return (
                          <div key={i} className={`${color} leading-relaxed break-all`}>
                            [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Node Inspector & Settings panel */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Node parameters config panel */}
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-4">
                  <div className="border-b border-gray-850 pb-2 flex items-center space-x-1.5">
                    <Settings className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Node Inspector</span>
                  </div>

                  {!selectedNode ? (
                    <div className="text-center py-12 text-gray-500 text-xs italic">
                      No node selected. Click on a node in the canvas to inspect its variables and retry configurations.
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      
                      <div>
                        <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Node Label</label>
                        <input
                          type="text"
                          value={selectedNode.name}
                          onChange={e => {
                            if (!selectedWorkflow) return;
                            const updated = selectedWorkflow.nodes.map(n =>
                              n.id === selectedNode.id ? { ...n, name: e.target.value } : n
                            );
                            setSelectedWorkflow({ ...selectedWorkflow, nodes: updated });
                          }}
                          className="w-full bg-slate-950 border border-gray-800 rounded-lg px-2.5 py-1.5 mt-1 text-white focus:outline-none"
                        />
                      </div>

                      {/* Config mapping inputs if agent node */}
                      {selectedNode.type === 'agent' && selectedNode.config.agentId && (() => {
                        const agentObj = mockAgentRepository.get(selectedNode.config.agentId);
                        const taskName = selectedNode.config.taskName || '';
                        const task = agentObj?.supportedTasks.find(t => t.name === taskName);

                        return (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Agent Module</label>
                              <div className="text-white font-bold bg-slate-950 px-2.5 py-1.5 rounded-lg border border-gray-850 mt-1 font-mono text-[10px]">
                                {selectedNode.config.agentId}
                              </div>
                            </div>

                            <div>
                              <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Select Task</label>
                              <select
                                value={taskName}
                                onChange={e => {
                                  if (!selectedWorkflow) return;
                                  const updated = selectedWorkflow.nodes.map(n =>
                                    n.id === selectedNode.id ? {
                                      ...n,
                                      config: { ...n.config, taskName: e.target.value }
                                    } : n
                                  );
                                  setSelectedWorkflow({ ...selectedWorkflow, nodes: updated });
                                }}
                                className="w-full bg-slate-950 border border-gray-800 rounded-lg px-2 py-1.5 mt-1 text-white focus:outline-none"
                              >
                                {agentObj?.supportedTasks.map(t => (
                                  <option key={t.name} value={t.name}>{t.name}</option>
                                ))}
                              </select>
                            </div>

                            {task && task.inputs.length > 0 && (
                              <div className="space-y-2 border-t border-gray-850 pt-2">
                                <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Bind Parameters</label>
                                {task.inputs.map(input => {
                                  const boundVal = selectedNode.config.inputMappings[input.name] || '';
                                  return (
                                    <div key={input.name} className="space-y-1">
                                      <div className="flex justify-between text-[10px]">
                                        <span className="text-gray-300 font-bold">{input.name}</span>
                                        <span className="text-gray-500 italic">({input.type})</span>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="e.g. $.global.query or literal string"
                                        value={boundVal}
                                        onChange={e => {
                                          if (!selectedWorkflow) return;
                                          const updated = selectedWorkflow.nodes.map(n =>
                                            n.id === selectedNode.id ? {
                                              ...n,
                                              config: {
                                                ...n.config,
                                                inputMappings: {
                                                  ...n.config.inputMappings,
                                                  [input.name]: e.target.value
                                                }
                                              }
                                            } : n
                                          );
                                          setSelectedWorkflow({ ...selectedWorkflow, nodes: updated });
                                        }}
                                        className="w-full bg-slate-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {selectedNode.type === 'conditional' && (
                        <div>
                          <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Branch condition Expression</label>
                          <input
                            type="text"
                            placeholder="e.g. score > 0"
                            value={selectedNode.config.conditionalExpression || ''}
                            onChange={e => {
                              if (!selectedWorkflow) return;
                              const updated = selectedWorkflow.nodes.map(n =>
                                n.id === selectedNode.id ? {
                                  ...n,
                                  config: { ...n.config, conditionalExpression: e.target.value }
                                } : n
                              );
                              setSelectedWorkflow({ ...selectedWorkflow, nodes: updated });
                            }}
                            className="w-full bg-slate-950 border border-gray-800 rounded-lg px-2.5 py-1.5 mt-1 font-mono text-[10px] text-white focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Retry policies panel */}
                      <div className="border-t border-gray-850 pt-2 space-y-2">
                        <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Retry Policy</label>
                        <div>
                          <label className="text-[8px] text-gray-500">Max Retries</label>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            value={selectedNode.config.retryConfig?.maxRetries || 0}
                            onChange={e => {
                              if (!selectedWorkflow) return;
                              const maxRetries = parseInt(e.target.value, 10);
                              const updated = selectedWorkflow.nodes.map(n =>
                                n.id === selectedNode.id ? {
                                  ...n,
                                  config: {
                                    ...n.config,
                                    retryConfig: {
                                      policy: n.config.retryConfig?.policy || 'CONSTANT' as any,
                                      maxRetries,
                                      baseDelayMs: n.config.retryConfig?.baseDelayMs || 200,
                                      maxDelayMs: n.config.retryConfig?.maxDelayMs || 1000,
                                      jitter: n.config.retryConfig?.jitter || false
                                    }
                                  }
                                } : n
                              );
                              setSelectedWorkflow({ ...selectedWorkflow, nodes: updated });
                            }}
                            className="w-full bg-slate-950 border border-gray-800 rounded-lg px-2.5 py-1.5 mt-1 text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Nodes Execution Results */}
                      {selectedNode.outputResults && (
                        <div className="bg-slate-950 border border-gray-800 p-2.5 rounded-xl space-y-1.5">
                          <label className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Node Outputs</label>
                          <pre className="text-[9px] font-mono text-gray-300 overflow-x-auto max-h-40">
                            {JSON.stringify(selectedNode.outputResults, null, 2)}
                          </pre>
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* Human approval overlay dialog */}
                <AnimatePresence>
                  {activeApprovalRequest && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="bg-gradient-to-br from-slate-900 to-amber-950/20 border border-amber-500/50 p-4 rounded-2xl space-y-4 shadow-xl"
                    >
                      <div className="flex items-center space-x-2 border-b border-amber-800/40 pb-2">
                        <UserCheck className="w-5 h-5 text-amber-400" />
                        <h4 className="text-sm font-bold text-white">Compliance Checkpoint</h4>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <p className="text-gray-300 leading-normal">
                          Task execution halted at compliance check gate. Review context parameters before permitting thread continuation:
                        </p>
                        
                        <div className="bg-slate-950 p-2 rounded-lg border border-gray-850 font-mono text-[9px] text-gray-400">
                          <strong>Inputs resolved:</strong>
                          <textarea
                            value={approvalOverrideField}
                            onChange={e => setApprovalOverrideField(e.target.value)}
                            className="w-full h-16 bg-slate-950 text-white border-none mt-1 focus:outline-none resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Comments</label>
                          <input
                            type="text"
                            placeholder="Add compliance notes..."
                            value={approvalOverrideComments}
                            onChange={e => setApprovalOverrideComments(e.target.value)}
                            className="w-full bg-slate-950 border border-gray-800 rounded-lg px-2 py-1 text-white focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleResolveApproval('APPROVED')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveApproval('OVERRIDDEN')}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
                            title="Apply overrides and run"
                          >
                            Override
                          </button>
                          <button
                            onClick={() => handleResolveApproval('REJECTED')}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </div>

          </div>
        )}

        {/* Diagnostic unit tests tab */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-850 pb-4 gap-4">
                <div>
                  <h3 className="text-base font-bold">Isolated Test Assertions</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Triggers automated unit tests validating graph parsing validation, DAG cycle audits, scoped context maps interpolation, and communication.
                  </p>
                </div>

                <button
                  disabled={isRunningTests}
                  onClick={handleRunTests}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                  <span>{isRunningTests ? 'Executing assertions...' : 'Run Test Suite'}</span>
                </button>
              </div>

              {testResults && (
                <div className="space-y-6">
                  
                  {/* Aggregated results summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 p-4 border border-gray-850 rounded-2xl font-sans">
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Total Asserts</div>
                      <div className="text-2xl font-black text-white mt-0.5">{testResults.total} tests</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Passed</div>
                      <div className="text-2xl font-black text-emerald-400 mt-0.5">{testResults.passed} passed</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Failed</div>
                      <div className="text-2xl font-black text-rose-400 mt-0.5">{testResults.failed} failed</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Total Duration</div>
                      <div className="text-2xl font-black text-cyan-400 mt-0.5">{testResults.duration} ms</div>
                    </div>
                  </div>

                  {/* Assertions Table */}
                  <div className="bg-slate-950 border border-gray-850 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-gray-850 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="p-3.5">Module Target</th>
                          <th className="p-3.5">Assertion Description</th>
                          <th className="p-3.5">Duration</th>
                          <th className="p-3.5">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850">
                        {testResults.tests.map((test, index) => (
                          <tr key={index} className="hover:bg-slate-900/20">
                            <td className="p-3.5 font-bold text-gray-300">{test.suite}</td>
                            <td className="p-3.5 text-gray-400">
                              <div>{test.name}</div>
                              {test.error && (
                                <div className="text-[10px] text-rose-400 font-mono mt-1 bg-rose-950/20 border border-rose-950/50 p-2 rounded-lg">
                                  {test.error}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-gray-400">{test.duration}ms</td>
                            <td className="p-3.5">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                test.passed
                                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                                  : 'bg-rose-950/40 border-rose-800 text-rose-400'
                              }`}>
                                {test.passed ? 'PASS' : 'FAIL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {!testResults && !isRunningTests && (
                <div className="text-center py-16 text-gray-500">
                  <FileCheck size={48} className="mx-auto text-gray-700 animate-pulse mb-3" />
                  <span>Test suite is idle. Trigger diagnostic suite assertions above.</span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Architectural specifications guidelines tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6 max-w-4xl mx-auto">
              <div>
                <h3 className="text-lg font-bold border-b border-gray-850 pb-2 mb-4">Multi-Agent Collaboration Architecture Specifications</h3>
                <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                  <p>
                    The Multi-Agent Collaboration Studio functions as a local-first coordination orchestration environment inside the Nexus Protocol.
                    It enables users to define, construct, and run complex inter-agent networks securely.
                  </p>

                  <h4 className="text-white font-bold mt-4">1. Directed Acyclic Graph (DAG) Executions</h4>
                  <p>
                    Workflow layouts map task dependencies. Kahn's sorting structures verify that tasks execute parallel levels or sequential chains without introducing deadlock cycles.
                    Variables are dynamically compiled from precursors via mapping interpolation parameters (e.g. <code>$.node_id.output_field</code>).
                  </p>

                  <h4 className="text-white font-bold mt-4">2. Sovereign Persona Constraint Guard</h4>
                  <p>
                    Before executing an agent task, the runtime engine queries the user's active digital twin (the <code>SovereignPersona</code>) to validate:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                    <li>Ethical Constraints compliance (e.g. check variables inputs for data leakage).</li>
                    <li>Compute energy budgets (e.g. abort loops if carbon density limits are exceeded).</li>
                    <li>Privacy negotiation consent for storage operations.</li>
                  </ul>

                  <h4 className="text-white font-bold mt-4">3. Inter-Agent Communications Bus</h4>
                  <p>
                    Node scripts coordinate values exchange over a local sandbox message bus. Direct messages or broadcasts route payloads.
                    When multiple agents return conflicting decisions (e.g., green-grid selections), resolution adapters apply:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
                    <li><strong>Consensus Voting</strong>: Count highest parameter occurrences.</li>
                    <li><strong>Reputation Rank</strong>: Override decisions using marketplace publisher trust scores.</li>
                    <li><strong>Human Decision</strong>: Pause the execution for manual override parameters.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default CollaborationStudioPage;
