import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  FileCheck,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Lock,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Play,
  User,
  Activity,
  ChevronDown,
  ChevronRight,
  GitMerge,
  ListFilter,
  Check,
  GitCommit,
  TrendingUp,
  Database,
  Info,
  AlertCircle
} from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { CognitiveGraph } from '../core/sovereign-persona/CognitiveGraph';
import { ConflictResolutionService } from '../core/conflict-resolution/services/ConflictResolutionService';
import { ConflictResolutionTestSuite, SuiteResults } from '../core/conflict-resolution/__tests__/conflict-resolution.test';
import { ResolutionStrategy, ResolutionRecommendation } from '../core/conflict-resolution/models/ResolutionRecommendation';
import { ConflictType, KnowledgeConflict } from '../core/conflict-resolution/models/KnowledgeConflict';
import { DiffGenerator, NodeDiff } from '../core/conflict-resolution/utils/DiffGenerator';
import { ValidationReport, ValidationIssue } from '../core/conflict-resolution/ConsistencyValidator';
import { ConflictAuditEntry } from '../core/conflict-resolution/ConflictHistoryManager';
import { KnowledgeVersion } from '../core/conflict-resolution/models/KnowledgeVersion';

const MOCK_PROFILE = {
  id: 'persona-cryptographer',
  userId: 'user-009',
  knowledgeDomains: ['cryptography', 'ai', 'physics'],
  ethicalBoundaries: [],
  professionalContext: {
    role: 'Lead AI Engineer',
    industry: 'Advanced Computing',
    skills: ['Quantum Physics', 'Neural Networks', 'Rust'],
    experience: '10 years',
    goals: ['Resolve graph conflicts', 'Optimize cognition stability']
  },
  privacyPreferences: {
    dataRetention: 365,
    sharingLevel: 'private' as const,
    encryptionLevel: 'military' as const,
    federatedParticipation: true
  },
  carbonFootprintTarget: 100
};

export const ConflictResolutionPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Core Service Instances
  const [conflictService] = useState(() => ConflictResolutionService.getInstance());
  const [graph] = useState(() => new CognitiveGraph(MOCK_PROFILE.id));

  // State Management
  const [role, setRole] = useState<'Admin' | 'Security Officer' | 'Auditor' | 'Developer' | 'Read Only'>('Admin');
  const [activeTab, setActiveTab] = useState<'conflicts' | 'health' | 'timeline' | 'audit' | 'tests'>('conflicts');
  
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>([]);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<ConflictAuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ResolutionRecommendation[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>(ResolutionStrategy.MERGE);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [integrityReport, setIntegrityReport] = useState<{ verified: boolean; message: string } | null>(null);

  // Version Timeline States
  const [selectedNodeHistory, setSelectedNodeHistory] = useState<string>('quantum_computing');
  const [nodeVersions, setNodeVersions] = useState<KnowledgeVersion[]>([]);
  const [comparisonVersions, setComparisonVersions] = useState<{ v1?: number; v2?: number }>({});
  
  // Test Runner State
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Setup mock conflict data on initial render
  const initializeBaseData = () => {
    // Check if data already exists in LocalStorage
    const stored = localStorage.getItem('nexus_conflict_list');
    if (!stored) {
      // Import a set of conflicting nodes into the graph
      const nodes = [
        {
          id: 'quantum_computing',
          domain: 'physics',
          complexity: 0.9,
          confidence: 0.8,
          lastAccessed: Date.now(),
          accessCount: 15,
          relatedConcepts: ['physics', 'mathematics'],
          metadata: {
            interactions: [
              { timestamp: Date.now() - 1000 * 60 * 60, type: 'source_a', context: { confidence: 0.8 } },
              { timestamp: Date.now(), type: 'source_b', context: { confidence: 0.3 } } // diverged confidence
            ]
          }
        },
        {
          id: 'quantum_compute', // duplicate node key
          domain: 'physics',
          complexity: 0.85,
          confidence: 0.7,
          lastAccessed: Date.now() - 10000,
          accessCount: 3,
          relatedConcepts: ['programming'],
          metadata: {}
        },
        {
          id: 'neural_networks',
          domain: 'ai',
          complexity: 0.75,
          confidence: 0.9,
          lastAccessed: Date.now(),
          accessCount: 8,
          relatedConcepts: ['programming'],
          metadata: {}
        },
        {
          id: 'deep_learning',
          domain: 'ai',
          complexity: 0.7,
          confidence: 0.8,
          lastAccessed: Date.now() - 5000,
          accessCount: 4,
          relatedConcepts: ['programming'],
          metadata: {}
        },
        {
          id: 'cryptography',
          domain: 'security',
          complexity: 0.8,
          confidence: 0.9,
          lastAccessed: Date.now(),
          accessCount: 10,
          relatedConcepts: ['zero_knowledge_proofs'],
          metadata: {}
        },
        {
          id: 'zero_knowledge_proofs',
          domain: 'security',
          complexity: 0.95,
          confidence: 0.75,
          lastAccessed: Date.now(),
          accessCount: 6,
          relatedConcepts: ['cryptography'],
          metadata: {}
        }
      ];

      const edges = [
        { id: 'qc-p', source: 'quantum_computing', target: 'physics', weight: 0.8, type: 'domain-related', strength: 0.8 },
        // Cyclic Dependency Cycle: cryptography -> zero_knowledge_proofs -> cryptography
        { id: 'c-zkp', source: 'cryptography', target: 'zero_knowledge_proofs', weight: 0.9, type: 'prerequisite', strength: 0.9 },
        { id: 'zkp-c', source: 'zero_knowledge_proofs', target: 'cryptography', weight: 0.85, type: 'prerequisite', strength: 0.85 }
      ];

      graph.importGraph({ nodes, edges });
      
      // Seed initial version history
      const manager = conflictService.getEngine().getVersionManager();
      manager.clear();
      nodes.forEach(n => {
        manager.saveVersion(n, 'Genesis', 'Initial cognitive ingestion');
      });
    }

    // Run scanning to save conflicts in storage and load audit log
    conflictService.scanForConflicts(graph);
    refreshData();
  };

  const refreshData = () => {
    try {
      const activeConflicts = conflictService.getEngine().getHistoryManager().getConflicts();
      setConflicts(activeConflicts);

      const valReport = conflictService.runValidation(graph);
      setValidationReport(valReport);

      const logs = conflictService.getEngine().getHistoryManager().getAuditLogs();
      setAuditLogs(logs);

      // Load versions for the currently selected node
      const history = conflictService.getEngine().getVersionManager().getHistory(selectedNodeHistory);
      setNodeVersions(history);

      // Update recommendations if a conflict is selected
      if (selectedConflictId) {
        const recs = conflictService.getEngine().getRecommendationsForConflict(selectedConflictId, graph);
        setRecommendations(recs);
        if (recs.length > 0) {
          setSelectedStrategy(recs[0].strategy);
        }
      }
    } catch (err: any) {
      triggerNotify(err.message || 'Error updating data', 'error');
    }
  };

  useEffect(() => {
    initializeBaseData();
  }, []);

  useEffect(() => {
    refreshData();
  }, [selectedConflictId, selectedNodeHistory]);

  const handleResolveConflict = () => {
    if (!selectedConflictId) return;
    if (role === 'Read Only' || role === 'Auditor') {
      triggerNotify('Unauthorized: Your active role does not permit modifying the Cognitive Graph.', 'error');
      return;
    }

    try {
      conflictService.resolve(
        graph,
        selectedConflictId,
        selectedStrategy,
        role,
        resolutionNotes || `Resolved using strategy ${selectedStrategy}`
      );
      triggerNotify(`Conflict resolved successfully using strategy: ${selectedStrategy}`);
      setSelectedConflictId(null);
      setResolutionNotes('');
      refreshData();
    } catch (e: any) {
      triggerNotify(e.message, 'error');
    }
  };

  const handleRollbackNode = (nodeId: string, versionNum: number) => {
    if (role === 'Read Only' || role === 'Auditor' || role === 'Developer') {
      triggerNotify('Unauthorized: Only Admins or Security Officers can perform rollback operations.', 'error');
      return;
    }

    try {
      conflictService.rollback(graph, nodeId, versionNum, role);
      triggerNotify(`Node '${nodeId}' rolled back to version ${versionNum}`);
      refreshData();
    } catch (e: any) {
      triggerNotify(e.message, 'error');
    }
  };

  const handleVerifyChain = () => {
    const report = conflictService.getEngine().getHistoryManager().verifyIntegrity();
    setIntegrityReport(report);
    if (report.verified) {
      triggerNotify('Audit log hash chain verified successfully.');
    } else {
      triggerNotify('Tampering detected in historical audit logs!', 'error');
    }
  };

  const handleTamperLogs = () => {
    const logs = [...auditLogs];
    if (logs.length > 0) {
      logs[0].actor = 'Malicious Hack';
      localStorage.setItem('nexus_conflict_audit_logs', JSON.stringify(logs));
      setAuditLogs(logs);
      triggerNotify('Injected tampered actor into index 0 in storage.', 'error');
      
      // Reset verification report state
      setIntegrityReport(null);
    } else {
      triggerNotify('No audit logs available to tamper.', 'error');
    }
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await ConflictResolutionTestSuite.runTests(graph);
      setTestResults(results);
      if (results.failed === 0) {
        triggerNotify(`All ${results.total} conflict diagnostic tests passed!`);
      } else {
        triggerNotify(`${results.failed} test assertions failed.`, 'error');
      }
    } catch (e: any) {
      triggerNotify('Diagnostic runner encountered a fatal error.', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleResetWorkspace = () => {
    localStorage.removeItem('nexus_conflict_list');
    localStorage.removeItem('nexus_conflict_decisions');
    localStorage.removeItem('nexus_conflict_audit_logs');
    localStorage.removeItem('nexus_conflict_node_versions');
    initializeBaseData();
    triggerNotify('Reset conflict workspace back to mock standards.');
  };

  // Computed Values
  const selectedConflict = conflicts.find(c => c.id === selectedConflictId);
  
  const selectedNodeDiff = useMemo<NodeDiff | null>(() => {
    if (!selectedConflict || !selectedConflict.conflictingNodeId) return null;
    const { nodes } = graph.exportGraph();
    const nodeA = nodes.find(n => n.id === selectedConflict.targetNodeId);
    const nodeB = nodes.find(n => n.id === selectedConflict.conflictingNodeId);
    if (nodeA && nodeB) {
      return DiffGenerator.compareNodes(nodeA, nodeB);
    }
    return null;
  }, [selectedConflict, conflicts]);

  // Filtering conflicts
  const filteredConflicts = conflicts.filter(c => {
    const matchesSearch = c.targetNodeId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    const matchesSeverity = severityFilter === 'ALL' || 
                            (severityFilter === 'HIGH' && c.severity >= 0.7) ||
                            (severityFilter === 'MEDIUM' && c.severity >= 0.4 && c.severity < 0.7) ||
                            (severityFilter === 'LOW' && c.severity < 0.4);
    return matchesSearch && matchesType && matchesSeverity;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Toast notifications */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 animate-bounce">
            <div className={`p-4 rounded-xl shadow-xl flex items-center space-x-3 border ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-400'
                : 'bg-rose-950/90 border-rose-500 text-rose-400'
            }`}>
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-semibold text-xs">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800/80 pb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
              <GitMerge className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                Knowledge Conflict Resolution
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                Cognitive Graph Consistency & Auto-Resolution Suite
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Reset Button */}
            <button 
              onClick={handleResetWorkspace}
              className="bg-slate-900 border border-gray-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Standards</span>
            </button>

            {/* RBAC context selector */}
            <div className="bg-slate-900/85 border border-gray-800 rounded-xl px-4 py-2 flex items-center space-x-2.5 shadow-inner">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-gray-400">Actor Context:</span>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as any);
                  triggerNotify(`Active session actor switched to: ${e.target.value}`);
                }}
                className="bg-slate-950 text-xs font-bold text-blue-400 focus:outline-none border border-gray-800 rounded-lg px-2.5 py-1 cursor-pointer hover:border-gray-700"
              >
                <option value="Admin">Admin</option>
                <option value="Security Officer">Security Officer</option>
                <option value="Auditor">Auditor</option>
                <option value="Developer">Developer</option>
                <option value="Read Only">Read Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Indicators Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Health Gauge */}
          <div className="bg-slate-900/40 border border-gray-800/60 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/60 transition-all shadow-sm">
            <div className="space-y-1">
              <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Graph Integrity</h4>
              <div className="text-3xl font-black text-white">
                {validationReport ? `${validationReport.graphHealthScore}%` : 'N/A'}
              </div>
              <p className="text-[10px] text-gray-400">
                {validationReport?.issues.length || 0} issues detected during scan
              </p>
            </div>
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="#1e293b" strokeWidth="5" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={validationReport && validationReport.graphHealthScore >= 80 ? '#10b981' : '#f59e0b'}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - (validationReport?.graphHealthScore || 0) / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-[9px] font-bold">Health</div>
            </div>
          </div>

          {/* Active Conflicts */}
          <div className="bg-slate-900/40 border border-gray-800/60 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/60 transition-all shadow-sm">
            <div className="space-y-1">
              <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Active Conflicts</h4>
              <div className="text-3xl font-black text-orange-400">
                {conflicts.filter(c => c.status === 'PENDING').length}
              </div>
              <p className="text-[10px] text-gray-400">
                {conflicts.filter(c => c.status === 'RESOLVED').length} resolved historically
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-400 animate-pulse" />
          </div>

          {/* Severity distribution */}
          <div className="bg-slate-900/40 border border-gray-800/60 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/60 transition-all shadow-sm">
            <div className="space-y-1">
              <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Avg Severity</h4>
              <div className="text-3xl font-black text-rose-500">
                {conflicts.length > 0 
                  ? `${(conflicts.reduce((sum, c) => sum + c.severity, 0) / conflicts.length * 100).toFixed(0)}%` 
                  : '0%'}
              </div>
              <span className="text-[9px] bg-rose-950 text-rose-400 border border-rose-900 px-2 py-0.5 rounded-full font-bold uppercase">
                {conflicts.some(c => c.severity >= 0.7 && c.status === 'PENDING') ? 'Critical Pending' : 'Stable'}
              </span>
            </div>
            <Activity className="w-8 h-8 text-rose-500" />
          </div>

          {/* Verification indicator */}
          <div className="bg-slate-900/40 border border-gray-800/60 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/60 transition-all shadow-sm">
            <div className="space-y-1.5 w-full">
              <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Audit Chain Ledger</h4>
              <div className="text-xs font-semibold text-gray-200">Hash validation check</div>
              <div className="flex gap-2">
                <button
                  onClick={handleVerifyChain}
                  className="bg-blue-600/25 hover:bg-blue-600 border border-blue-500 text-blue-400 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold transition-all"
                >
                  Verify Trail
                </button>
                <button
                  onClick={handleTamperLogs}
                  className="bg-rose-950/20 hover:bg-rose-950 border border-rose-900 text-rose-400 px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                >
                  Inject Tamper
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab selection bar */}
        <div className="flex border-b border-gray-800/80 gap-6">
          {[
            { id: 'conflicts', label: 'Conflicts Registry', icon: GitMerge },
            { id: 'health', label: 'Graph Health Dashboard', icon: Shield },
            { id: 'timeline', label: 'Version Snapshot Logs', icon: History },
            { id: 'audit', label: 'Audit Trail logs', icon: FileText },
            { id: 'tests', label: 'Self-Test Suite', icon: CheckCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab contents */}
        <div>
          
          {/* TAB 1: Conflicts Registry */}
          {activeTab === 'conflicts' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Conflict Registry Left list */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-300">Conflict Records ({filteredConflicts.length})</h3>
                    <ListFilter className="w-4 h-4 text-gray-400" />
                  </div>

                  {/* Search and filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search target concept..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-gray-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-slate-950 border border-gray-850 text-gray-400 rounded p-1"
                      >
                        <option value="ALL">All Types</option>
                        <option value="DUPLICATE_NODE">Duplicate</option>
                        <option value="SEMANTIC_OVERLAP">Semantic Overlap</option>
                        <option value="SOURCE_CONFLICT">Source Conflict</option>
                        <option value="OUTDATED_INFORMATION">Outdated Info</option>
                        <option value="RELATIONSHIP_CONFLICT">Relationship Cycle</option>
                      </select>

                      <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="bg-slate-950 border border-gray-850 text-gray-400 rounded p-1"
                      >
                        <option value="ALL">All Severities</option>
                        <option value="HIGH">High (&gt;= 0.7)</option>
                        <option value="MEDIUM">Medium (0.4 - 0.7)</option>
                        <option value="LOW">Low (&lt; 0.4)</option>
                      </select>
                    </div>
                  </div>

                  {/* List */}
                  <div className="space-y-2 max-h-[480px] overflow-y-auto">
                    {filteredConflicts.map((c) => {
                      const isSelected = selectedConflictId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedConflictId(c.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                            isSelected
                              ? 'bg-blue-600/10 border-blue-500/50 shadow-md'
                              : 'bg-slate-950/45 border-gray-850 hover:border-gray-750'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="text-xs font-bold text-white truncate max-w-[150px]">{c.targetNodeId}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              c.severity >= 0.7 ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                              c.severity >= 0.4 ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                              'bg-blue-950 text-blue-400 border border-blue-900'
                            }`}>
                              {(c.severity * 10).toFixed(0)} Severity
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{c.description}</p>
                          
                          <div className="flex justify-between items-center text-[9px] text-gray-500 pt-1 border-t border-gray-900">
                            <span className="font-semibold">{c.type}</span>
                            <span className={`font-bold uppercase ${
                              c.status === 'RESOLVED' ? 'text-emerald-400' :
                              c.status === 'IGNORED' ? 'text-gray-400' :
                              'text-orange-400 animate-pulse'
                            }`}>{c.status}</span>
                          </div>
                        </button>
                      );
                    })}
                    {filteredConflicts.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-8">No conflict events found matching filter criteria.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Conflict Details Panel Right */}
              <div className="lg:col-span-8 space-y-6">
                {selectedConflict ? (
                  <div className="space-y-6">
                    {/* Header Details */}
                    <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wide">{selectedConflict.type}</span>
                          <h2 className="text-xl font-bold text-white">Target Concept: {selectedConflict.targetNodeId}</h2>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          selectedConflict.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          selectedConflict.status === 'IGNORED' ? 'bg-slate-950 text-gray-400 border border-gray-800' :
                          'bg-orange-950 text-orange-400 border border-orange-900 animate-pulse'
                        }`}>
                          {selectedConflict.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{selectedConflict.description}</p>
                    </div>

                    {/* Comparison Side-by-side Panel */}
                    {selectedNodeDiff && selectedConflict.conflictingNodeId && (
                      <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center space-x-2 border-b border-gray-850 pb-2">
                          <GitMerge className="w-4 h-4 text-blue-400" />
                          <h3 className="text-sm font-bold text-gray-200">Side-by-side Attribute Difference</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Target Node */}
                          <div className="bg-slate-950/60 border border-gray-850 p-4 rounded-xl space-y-3">
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded uppercase">Active Graph State</span>
                            <div className="space-y-2 pt-2">
                              <div className="flex justify-between border-b border-gray-900 pb-1">
                                <span className="text-gray-500">Concept ID</span>
                                <span className="font-mono text-white font-bold">{selectedConflict.targetNodeId}</span>
                              </div>
                              <div className={`flex justify-between border-b border-gray-900 pb-1 ${selectedNodeDiff.domain.changed ? 'bg-rose-950/20 border-rose-900' : ''}`}>
                                <span className="text-gray-500">Domain</span>
                                <span className="font-bold">{selectedNodeDiff.domain.oldValue}</span>
                              </div>
                              <div className={`flex justify-between border-b border-gray-900 pb-1 ${selectedNodeDiff.complexity.changed ? 'bg-rose-950/20 border-rose-900' : ''}`}>
                                <span className="text-gray-500">Complexity</span>
                                <span className="font-mono font-bold">{(selectedNodeDiff.complexity.oldValue * 100).toFixed(0)}%</span>
                              </div>
                              <div className={`flex justify-between border-b border-gray-900 pb-1 ${selectedNodeDiff.confidence.changed ? 'bg-rose-950/20 border-rose-900' : ''}`}>
                                <span className="text-gray-500">Confidence Master</span>
                                <span className="font-mono font-bold text-orange-400">{(selectedNodeDiff.confidence.oldValue * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Conflicting Node */}
                          <div className="bg-slate-950/60 border border-gray-850 p-4 rounded-xl space-y-3">
                            <span className="text-[10px] font-bold text-orange-400 bg-orange-950/30 px-2 py-0.5 rounded uppercase">Incoming / Contradicting State</span>
                            <div className="space-y-2 pt-2">
                              <div className="flex justify-between border-b border-gray-900 pb-1">
                                <span className="text-gray-500">Concept ID</span>
                                <span className="font-mono text-white font-bold">{selectedConflict.conflictingNodeId}</span>
                              </div>
                              <div className={`flex justify-between border-b border-gray-900 pb-1 ${selectedNodeDiff.domain.changed ? 'bg-emerald-950/20 border-emerald-900' : ''}`}>
                                <span className="text-gray-500">Domain</span>
                                <span className="font-bold text-emerald-400">{selectedNodeDiff.domain.newValue}</span>
                              </div>
                              <div className={`flex justify-between border-b border-gray-900 pb-1 ${selectedNodeDiff.complexity.changed ? 'bg-emerald-950/20 border-emerald-900' : ''}`}>
                                <span className="text-gray-500">Complexity</span>
                                <span className="font-mono font-bold text-emerald-400">{(selectedNodeDiff.complexity.newValue * 100).toFixed(0)}%</span>
                              </div>
                              <div className={`flex justify-between border-b border-gray-900 pb-1 ${selectedNodeDiff.confidence.changed ? 'bg-emerald-950/20 border-emerald-900' : ''}`}>
                                <span className="text-gray-500">Confidence Master</span>
                                <span className="font-mono font-bold text-emerald-400">{(selectedNodeDiff.confidence.newValue * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Evidence Analyzer Panel */}
                    <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center space-x-2 border-b border-gray-850 pb-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold text-gray-200">Evidence Assessment & Reliability</h3>
                      </div>

                      <div className="space-y-4">
                        {selectedConflict.evidence.map((ev, i) => (
                          <div key={i} className="bg-slate-950/60 border border-gray-850 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-200">Source: {ev.source}</span>
                              <span className="text-gray-500 text-[10px]">Age: {new Date(ev.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 italic">"{ev.details}"</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                              {/* Reliability Progress */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                                  <span>Source Credibility</span>
                                  <span>{(ev.reliability * 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full" style={{ width: `${ev.reliability * 100}%` }} />
                                </div>
                              </div>

                              {/* Confidence Progress */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                                  <span>Evidence Confidence</span>
                                  <span>{(ev.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-teal-500 h-full" style={{ width: `${ev.confidence * 100}%` }} />
                                </div>
                              </div>

                              {/* supporting/contradicting stats */}
                              <div className="flex items-center justify-between text-[10px] text-gray-400 bg-slate-900/50 rounded-lg px-3 py-1.5 border border-gray-850/50">
                                <span>Relations support: <strong className="text-emerald-400">+{ev.supportingCount}</strong></span>
                                <span>Contradict: <strong className="text-rose-400">-{ev.contradictingCount}</strong></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resolution recommendation Panel */}
                    {selectedConflict.status === 'PENDING' && (
                      <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center space-x-2 border-b border-gray-850 pb-2">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <h3 className="text-sm font-bold text-gray-200">Resolution Strategy Panel</h3>
                        </div>

                        {/* Recommendations mapping */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {recommendations.slice(0, 2).map((rec, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedStrategy(rec.strategy);
                                setResolutionNotes(`Auto resolved conflict using recommended strategy: ${rec.strategy}`);
                              }}
                              className={`text-left p-4 rounded-xl border transition-all relative ${
                                selectedStrategy === rec.strategy
                                  ? 'bg-emerald-600/10 border-emerald-500/50 shadow-inner'
                                  : 'bg-slate-950/60 border-gray-850 hover:border-gray-750'
                              }`}
                            >
                              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-gray-900">
                                <span className="font-extrabold text-white flex items-center space-x-1.5">
                                  {i === 0 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                  <span>{rec.strategy}</span>
                                  {i === 0 && <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-1 rounded-md ml-1 font-bold">Best Match</span>}
                                </span>
                                <span className="font-bold text-emerald-400 text-[10px]">{(rec.confidence * 100).toFixed(0)}% Match</span>
                              </div>
                              <p className="text-[10px] text-gray-400 leading-relaxed pt-2">{rec.rationale}</p>
                            </button>
                          ))}
                        </div>

                        {/* Form controls to finalize resolve */}
                        <div className="bg-slate-950/60 border border-gray-850 rounded-xl p-4 space-y-4 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <span className="text-gray-500 font-bold">Selected Strategy Target</span>
                              <select
                                value={selectedStrategy}
                                onChange={(e) => setSelectedStrategy(e.target.value as any)}
                                className="w-full bg-slate-950 border border-gray-850 text-blue-400 font-bold rounded-lg p-2 focus:outline-none focus:border-gray-700"
                              >
                                <option value={ResolutionStrategy.MERGE}>MERGE (Recommended)</option>
                                <option value={ResolutionStrategy.KEEP_EXISTING}>KEEP_EXISTING</option>
                                <option value={ResolutionStrategy.REPLACE_EXISTING}>REPLACE_EXISTING</option>
                                <option value={ResolutionStrategy.KEEP_BOTH}>KEEP_BOTH (Disambiguate)</option>
                                <option value={ResolutionStrategy.ARCHIVE}>ARCHIVE (Soft Delete)</option>
                                <option value={ResolutionStrategy.IGNORE}>IGNORE (Mute Alert)</option>
                                <option value={ResolutionStrategy.MANUAL_REVIEW}>MANUAL_REVIEW</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-gray-500 font-bold">Resolution Notes / Audit Summary</span>
                              <input
                                type="text"
                                placeholder="Details about this decision..."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 text-gray-300 focus:outline-none focus:border-gray-700"
                              />
                            </div>
                          </div>

                          <button
                            onClick={handleResolveConflict}
                            disabled={role === 'Read Only' || role === 'Auditor'}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                          >
                            <GitMerge className="w-4 h-4" />
                            <span>Commit Resolution decision</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                    <GitMerge className="w-12 h-12 text-gray-600" />
                    <h3 className="text-sm font-bold text-gray-400">No Conflict Selected</h3>
                    <p className="text-xs text-gray-500 max-w-sm">Select an active conflict record from the registry sidebar to inspect attributes, examine evidence strengths, and commit resolution strategies.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Graph Health Dashboard */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-bold">Static Graph Consistency Audits</h3>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Static Analysis Mode</span>
                </div>

                {validationReport && (
                  <div className="space-y-6">
                    {/* Gauge Display */}
                    <div className="flex items-center space-x-6 bg-slate-950/60 border border-gray-850 p-6 rounded-2xl">
                      <div className="relative flex items-center justify-center w-24 h-24">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke={validationReport.graphHealthScore >= 80 ? '#10b981' : '#f59e0b'}
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - validationReport.graphHealthScore / 100)}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute text-xl font-black">{validationReport.graphHealthScore}%</div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm">Overall Stability Rating: {
                          validationReport.graphHealthScore >= 90 ? 'Excellent' :
                          validationReport.graphHealthScore >= 75 ? 'Good (Warning Alert)' :
                          'Critical Degradation'
                        }</h4>
                        <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
                          Graph health is computed based on critical references, prerequisites loops, and orphans. Critical and High severity issues will block learning updates.
                        </p>
                      </div>
                    </div>

                    {/* Issue List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Validation Reports ({validationReport.issues.length})</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {validationReport.issues.map((issue) => (
                          <div key={issue.id} className="bg-slate-950/60 border border-gray-850 rounded-xl p-4 flex items-start justify-between gap-4 text-xs border-l-4 border-l-rose-500">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                  issue.severity === 'critical' ? 'bg-red-950 text-red-400 border-red-900' :
                                  issue.severity === 'high' ? 'bg-orange-950 text-orange-400 border-orange-900' :
                                  'bg-blue-950 text-blue-400 border-blue-900'
                                }`}>
                                  {issue.severity} Severity
                                </span>
                                <span className="font-mono text-gray-500 text-[10px]">{issue.type}</span>
                              </div>
                              <p className="text-gray-300">{issue.message}</p>
                            </div>
                            <AlertCircle className={`w-4 h-4 flex-shrink-0 ${
                              issue.severity === 'critical' || issue.severity === 'high' ? 'text-rose-400 animate-pulse' : 'text-blue-400'
                            }`} />
                          </div>
                        ))}
                        {validationReport.issues.length === 0 && (
                          <div className="p-8 text-center text-gray-500 text-xs bg-slate-950/60 border border-gray-850 rounded-xl flex items-center justify-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span>Zero static integrity warnings found. The cognitive graph is completely consistent.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Version Snapshots Logs */}
          {activeTab === 'timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Concept Selector Left */}
              <div className="lg:col-span-4 bg-slate-900/30 border border-gray-800/60 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-850 pb-2">
                  <h3 className="text-xs font-bold text-gray-300 uppercase">Knowledge Concepts</h3>
                  <Database className="w-4 h-4 text-gray-500" />
                </div>
                
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {graph.exportGraph().nodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNodeHistory(node.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex justify-between items-center ${
                        selectedNodeHistory === node.id
                          ? 'bg-blue-600/10 border-blue-500/50'
                          : 'bg-slate-950/50 border-gray-850 hover:border-gray-850'
                      }`}
                    >
                      <span className="font-bold truncate max-w-[150px]">{node.id}</span>
                      <span className="text-[10px] text-gray-500 font-mono">v{
                        conflictService.getEngine().getVersionManager().getHistory(node.id).length
                      }</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Version History Timeline Right */}
              <div className="lg:col-span-8 bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-850 pb-2">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-gray-200">Revision History for node '{selectedNodeHistory}'</h3>
                  </div>
                </div>

                {nodeVersions.length > 0 ? (
                  <div className="space-y-6">
                    <div className="relative border-l-2 border-gray-800 pl-6 ml-3 space-y-6 text-xs">
                      {nodeVersions.map((ver, idx) => (
                        <div key={ver.versionId} className="relative group space-y-2">
                          {/* Timeline dot */}
                          <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-slate-950 group-hover:scale-125 transition-transform" />

                          <div className="bg-slate-950/60 border border-gray-850 rounded-xl p-4 flex flex-col md:flex-row md:justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-white text-xs">Version {ver.version}</span>
                                <span className="text-[10px] text-gray-500 font-mono">({ver.versionId})</span>
                              </div>
                              <p className="text-gray-400 text-xs italic">"{ver.changeSummary}"</p>
                              <div className="flex items-center space-x-4 text-[10px] text-gray-500">
                                <span>Author: <strong className="text-gray-400">{ver.author}</strong></span>
                                <span>Timestamp: <strong className="text-gray-400">{new Date(ver.timestamp).toLocaleString()}</strong></span>
                              </div>

                              {/* Attributes snap */}
                              <div className="flex flex-wrap gap-3 pt-2 text-[10px] font-mono">
                                <span className="bg-slate-900 border border-gray-800 px-2 py-0.5 rounded text-blue-400">Confidence: {(ver.nodeState.confidence * 100).toFixed(0)}%</span>
                                <span className="bg-slate-900 border border-gray-800 px-2 py-0.5 rounded text-teal-400">Complexity: {(ver.nodeState.complexity * 100).toFixed(0)}%</span>
                                <span className="bg-slate-900 border border-gray-800 px-2 py-0.5 rounded text-purple-400">Domain: {ver.nodeState.domain}</span>
                              </div>
                            </div>

                            {/* Actions rollback */}
                            {idx < nodeVersions.length - 1 && (
                              <div className="self-start md:self-center">
                                <button
                                  onClick={() => handleRollbackNode(selectedNodeHistory, ver.version)}
                                  disabled={role === 'Read Only' || role === 'Auditor' || role === 'Developer'}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Rollback to this point</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-12">No version history recorded for this node yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Audit Trail logs */}
          {activeTab === 'audit' && (
            <div className="space-y-6 bg-slate-900/30 border border-gray-800/60 rounded-2xl p-6">
              <div className="flex justify-between items-center border-b border-gray-850 pb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold">Immutable rolling Audit Trail</h3>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cryptographic Hash validation</span>
              </div>

              {/* Tampering message */}
              {integrityReport && (
                <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
                  integrityReport.verified
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                }`}>
                  {integrityReport.verified ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5 animate-bounce" />}
                  <div className="space-y-1">
                    <h5 className="font-extrabold">{integrityReport.verified ? 'Chain Ledger Verified' : 'TAMPER WARNING ALERT'}</h5>
                    <p>{integrityReport.message}</p>
                  </div>
                </div>
              )}

              {/* Logs registry list */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.index} className="bg-slate-950/60 border border-gray-850 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-white font-mono bg-slate-900 border border-gray-800 px-2 py-0.5 rounded">Block #{log.index}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.eventType === 'CONFLICT_RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          log.eventType === 'CONFLICT_DETECTED' ? 'bg-orange-950 text-orange-400 border border-orange-900' :
                          log.eventType === 'ROLLBACK_EXECUTED' ? 'bg-blue-950 text-blue-400 border border-blue-900' :
                          'bg-slate-900 text-gray-400 border border-gray-800'
                        }`}>{log.eventType}</span>
                        <span className="text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed font-mono">{log.details}</p>
                      <div className="flex items-center space-x-3 text-[10px] text-gray-500">
                        <span>Actor context: <strong className="text-gray-400">{log.actor}</strong></span>
                        {log.conflictId && <span>Conflict ID: <strong className="text-gray-400">{log.conflictId}</strong></span>}
                        {log.nodeId && <span>Node ID: <strong className="text-gray-400">{log.nodeId}</strong></span>}
                      </div>
                    </div>

                    {/* Hash block signatures */}
                    <div className="bg-slate-900/60 border border-gray-850 rounded-lg p-2.5 flex flex-col gap-1 text-[9px] font-mono text-gray-500 self-start md:self-center">
                      <div>Current Hash: <span className="text-blue-400 font-bold">{log.hash.substr(0, 16)}</span></div>
                      <div>Previous Hash: <span className="text-gray-400">{log.previousHash.substr(0, 16)}</span></div>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-12">No audit entries found in storage.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Diagnostics Test Runner */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h3 className="text-base font-bold">Diagnostics Assertion Engine</h3>
                  </div>
                  <button
                    onClick={handleRunTests}
                    disabled={isRunningTests}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>{isRunningTests ? 'Running Diagnostic Checks...' : 'Execute Test Suite'}</span>
                  </button>
                </div>

                {testResults && (
                  <div className="space-y-6">
                    {/* Diagnostic Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-950/60 border border-gray-850 rounded-xl p-4 text-center">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Total Tests</span>
                        <div className="text-2xl font-black text-white">{testResults.total}</div>
                      </div>
                      <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4 text-center">
                        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Assertions Passed</span>
                        <div className="text-2xl font-black text-emerald-400">{testResults.passed}</div>
                      </div>
                      <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 text-center">
                        <span className="text-rose-400 text-[10px] font-bold uppercase tracking-wider">Assertions Failed</span>
                        <div className="text-2xl font-black text-rose-400">{testResults.failed}</div>
                      </div>
                      <div className="bg-slate-950/60 border border-gray-850 rounded-xl p-4 text-center">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Runner Duration</span>
                        <div className="text-2xl font-black text-white">{testResults.duration}ms</div>
                      </div>
                    </div>

                    {/* Assertion details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diagnostic Assertion Outputs</h4>
                      <div className="space-y-2">
                        {testResults.tests.map((t, idx) => (
                          <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            t.passed
                              ? 'bg-emerald-950/20 border-emerald-900/35 text-emerald-400'
                              : 'bg-rose-950/20 border-rose-900/35 text-rose-400'
                          }`}>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-gray-200">[{t.suite}]</span>
                                <span>{t.name}</span>
                              </div>
                              {t.error && <p className="text-[10px] text-rose-400 bg-slate-950/50 p-2 rounded-lg font-mono border border-rose-950/60 mt-1">{t.error}</p>}
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-gray-500">{t.duration}ms</span>
                              {t.passed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
