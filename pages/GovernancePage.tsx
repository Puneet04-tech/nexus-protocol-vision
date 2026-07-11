import React, { useState, useEffect } from 'react';
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
  Unlock,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Play,
  Plus,
  User,
  Activity,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Database,
  ExternalLink,
  Info
} from 'lucide-react';

import { SovereignPersona } from '../core/sovereign-persona/SovereignPersona';
import { GovernanceService } from '../core/governance/services/GovernanceService';
import { GovernancePolicy, PolicyRule, PolicyCondition } from '../core/governance/models/GovernancePolicy';
import { ComplianceResult } from '../core/governance/models/ComplianceResult';
import { AuditEntry } from '../core/governance/models/AuditEntry';
import { PolicyVersion } from '../core/governance/models/PolicyVersion';
import { AuditLogger } from '../core/governance/AuditLogger';
import { GovernanceTestSuite, SuiteResults } from '../core/governance/__tests__/governance.test';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

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

const GovernancePage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Core Service Instances
  const [governanceService] = useState(() => GovernanceService.getInstance());
  const [personaInstance] = useState(() => new SovereignPersona(MOCK_PROFILE));

  // State Management
  const [role, setRole] = useState<'Admin' | 'Security Officer' | 'Auditor' | 'Developer' | 'Read Only'>('Admin');
  const [activeTab, setActiveTab] = useState<'policies' | 'simulator' | 'audit' | 'diagnostics'>('policies');
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [integrityReport, setIntegrityReport] = useState<{ verified: boolean; message: string } | null>(null);

  // Version history map
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [policyVersions, setPolicyVersions] = useState<Record<string, PolicyVersion[]>>({});

  // Simulation Sliders Context State
  const [simCpu, setSimCpu] = useState(30);
  const [simMemory, setSimMemory] = useState(2048);
  const [simEmissions, setSimEmissions] = useState(2.1);
  const [simTrustScore, setSimTrustScore] = useState(92);
  const [simPrivacyBudget, setSimPrivacyBudget] = useState(40);
  const [simNodes, setSimNodes] = useState(15);
  const [simSharingLevel, setSimSharingLevel] = useState<'private' | 'selective' | 'public'>('private');
  const [simBoundariesCount, setSimBoundariesCount] = useState(2);

  // Test Runner State
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Policy Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPolicyId, setNewPolicyId] = useState('');
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyDesc, setNewPolicyDesc] = useState('');
  const [newPolicyPriority, setNewPolicyPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [newPolicyTags, setNewPolicyTags] = useState('custom');
  
  // Rule form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleScope, setNewRuleScope] = useState('*');
  const [newRuleAction, setNewRuleAction] = useState<'ALLOW' | 'DENY' | 'WARN' | 'AUDIT' | 'REQUIRE_APPROVAL'>('WARN');
  const [newRuleField, setNewRuleField] = useState('carbon.emissions');
  const [newRuleOperator, setNewRuleOperator] = useState<'GREATER_THAN' | 'LESS_THAN' | 'EQUALS'>('GREATER_THAN');
  const [newRuleVal, setNewRuleVal] = useState(4.0);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Notification helper
  const triggerNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch / Refresh data
  const refreshData = () => {
    try {
      const activePolicies = governanceService.getEngine().getManager().getPolicies(role);
      setPolicies(activePolicies);

      // Evaluate active compliance in simulated context driven by current sliders
      const simulatedContext = {
        scope: 'system.all',
        carbon: { emissions: simEmissions, budgetUsed: (simEmissions / 5.0) * 100 },
        privacy: { trustScore: simTrustScore, budgetUsed: simPrivacyBudget },
        threat: { activeCount: 0, detectedTotal: 0 },
        system: { cpuLoad: simCpu, memoryUsage: simMemory },
        persona: {
          id: MOCK_PROFILE.id,
          role: MOCK_PROFILE.professionalContext.role,
          sharingLevel: simSharingLevel,
          ethicalBoundariesCount: simBoundariesCount,
        },
        graph: {
          nodesCount: simNodes,
          edgesCount: simNodes * 2,
          averageConfidence: 0.85,
        },
      };

      const engine = governanceService.getEngine();
      const compResult = engine.evaluateSystemState(personaInstance, role);

      // Override with simulated values for custom playground updates
      const realCompResult = engine.getComplianceEngine().evaluateCompliance(activePolicies, simulatedContext);
      setComplianceResult(realCompResult);

      // Load logs
      setAuditLogs(AuditLogger.getLogs());

      // Fetch versions
      const versionsMap: Record<string, PolicyVersion[]> = {};
      activePolicies.forEach((p) => {
        versionsMap[p.id] = engine.getManager().getVersions(p.id);
      });
      setPolicyVersions(versionsMap);
    } catch (err: any) {
      triggerNotify(err.message || 'Error updating data', 'error');
    }
  };

  // Run initial loading
  useEffect(() => {
    refreshData();
  }, [
    role,
    simCpu,
    simMemory,
    simEmissions,
    simTrustScore,
    simPrivacyBudget,
    simNodes,
    simSharingLevel,
    simBoundariesCount,
  ]);

  // Handle policy status toggle
  const handleToggleStatus = (policyId: string, currentStatus: string) => {
    const manager = governanceService.getEngine().getManager();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      manager.setStatus(policyId, newStatus, role);
      triggerNotify(`Policy state toggled to ${newStatus}.`);
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Handle state approval transitions
  const handleTransitionApproval = (policyId: string, state: 'approved' | 'rejected' | 'pending_approval' | 'draft') => {
    const manager = governanceService.getEngine().getManager();
    try {
      manager.transitionApprovalState(policyId, state, role);
      triggerNotify(`Approval transition completed: policy marked ${state}.`);
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Handle version rollback
  const handleRollback = (policyId: string, targetVersion: string) => {
    const manager = governanceService.getEngine().getManager();
    try {
      manager.rollbackPolicy(policyId, targetVersion, role);
      triggerNotify(`Policy successfully rolled back to version ${targetVersion}`);
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Handle policy delete
  const handleDeletePolicy = (policyId: string) => {
    const manager = governanceService.getEngine().getManager();
    try {
      manager.deletePolicy(policyId, role);
      triggerNotify('Policy deleted successfully.');
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Verify audit chain integrity
  const handleVerifyChain = () => {
    const report = AuditLogger.verifyIntegrity();
    setIntegrityReport(report);
    if (report.verified) {
      triggerNotify('Audit log hash chain verified successfully.');
    } else {
      triggerNotify('Validation warning: Hash chain break detected!', 'error');
    }
  };

  // Clear Audit Logs
  const handleClearAuditLogs = () => {
    if (role !== 'Admin' && role !== 'Security Officer') {
      triggerNotify('Only Admins or Security Officers can modify audit logs.', 'error');
      return;
    }
    AuditLogger.clearLogs();
    triggerNotify('Audit trail logs wiped.');
    refreshData();
  };

  // Run diagnostics test suite
  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await GovernanceTestSuite.runTests(personaInstance);
      setTestResults(results);
      if (results.failed === 0) {
        triggerNotify(`All ${results.total} governance tests passed!`);
      } else {
        triggerNotify(`${results.failed} diagnostics assertions failed.`, 'error');
      }
    } catch (e: any) {
      triggerNotify('Diagnostic suite hit a fatal runner error.', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Export JSON Report
  const handleExportJson = () => {
    if (!complianceResult) return;
    const engine = governanceService.getEngine();
    const dataStr = engine.getReporter().exportToJson(complianceResult, policies, role);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_governance_report_${Date.now()}.json`;
    link.click();
    triggerNotify('JSON Compliance report downloaded.');
  };

  // Export CSV Report
  const handleExportCsv = () => {
    if (!complianceResult) return;
    const engine = governanceService.getEngine();
    const { policiesCsv, violationsCsv } = engine.getReporter().exportToCsv(complianceResult, policies, role);
    
    // Download Policies CSV
    const blobPol = new Blob([policiesCsv], { type: 'text/csv' });
    const urlPol = URL.createObjectURL(blobPol);
    const linkPol = document.createElement('a');
    linkPol.href = urlPol;
    linkPol.download = `nexus_governance_policies_${Date.now()}.csv`;
    linkPol.click();

    // Download Violations CSV
    const blobViol = new Blob([violationsCsv], { type: 'text/csv' });
    const urlViol = URL.createObjectURL(blobViol);
    const linkViol = document.createElement('a');
    linkViol.href = urlViol;
    linkViol.download = `nexus_governance_violations_${Date.now()}.csv`;
    linkViol.click();

    triggerNotify('CSV spreadsheets downloaded.');
  };

  // Save new policy
  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyId.trim() || !newPolicyName.trim()) {
      triggerNotify('Please specify a unique ID and policy name.', 'error');
      return;
    }
    
    const manager = governanceService.getEngine().getManager();
    try {
      const condition: PolicyCondition = {
        operator: newRuleOperator,
        field: newRuleField,
        value: Number(newRuleVal),
      };

      const newPolicy: Omit<GovernancePolicy, 'createdAt' | 'updatedAt' | 'version'> = {
        id: newPolicyId.trim(),
        name: newPolicyName.trim(),
        description: newPolicyDesc.trim(),
        status: 'inactive',
        approvalState: 'draft',
        priority: newPolicyPriority,
        tags: newPolicyTags.split(',').map((t) => t.trim()),
        createdBy: role,
        updatedBy: role,
        rules: [
          {
            id: `rule-${newPolicyId}-${Date.now()}`,
            name: newRuleName.trim() || 'Trigger Limit Rule',
            action: newRuleAction,
            scope: newRuleScope,
            condition,
            severity: newPolicyPriority, // align severity with policy level
          },
        ],
      };

      manager.createPolicy(newPolicy, role);
      triggerNotify('Policy draft created. Transiting approval state.');
      
      // Reset Modal values
      setNewPolicyId('');
      setNewPolicyName('');
      setNewPolicyDesc('');
      setNewRuleName('');
      setNewRuleScope('*');
      setNewRuleField('carbon.emissions');
      setNewRuleVal(4.0);
      setIsCreateModalOpen(false);

      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.eventType.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      (log.policyId && log.policyId.toLowerCase().includes(searchLogQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Floating Notification */}
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

        {/* Header and RBAC Control */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800/80 pb-6 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20`}>
                <Shield className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">AI Governance & Compliance Center</h1>
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Nexus Decentralized Policy Enforcement Layer</p>
              </div>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="bg-slate-900/80 border border-gray-800/80 rounded-xl px-4 py-2.5 flex items-center space-x-3 self-start shadow-inner">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-gray-400">Active Role Context:</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as any);
                triggerNotify(`Active session role switched to: ${e.target.value}`);
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

        {/* Global Compliance Indicators */}
        {complianceResult && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Compliance Gauge Card */}
            <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-gray-700/80 transition-all">
              <div className="space-y-1.5 z-10">
                <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">System Compliance</h4>
                <div className="text-4xl font-black text-white">{complianceResult.complianceScore}%</div>
                <p className="text-xs text-gray-400">
                  {complianceResult.passedPoliciesCount} of {complianceResult.passedPoliciesCount + complianceResult.failedPoliciesCount} policies passing
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke={complianceResult.complianceScore >= 80 ? '#10b981' : complianceResult.complianceScore >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - complianceResult.complianceScore / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute text-xs font-black">Score</div>
              </div>
            </div>

            {/* Risk Indicator Card */}
            <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:border-gray-700/80 transition-all">
              <div className="space-y-1.5">
                <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Risk Score Grade</h4>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-white">{complianceResult.riskScore}</span>
                  <span className="text-xs text-gray-500 font-normal">/ 100</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  complianceResult.riskLevel === 'critical' ? 'bg-red-950 border border-red-500 text-red-400' :
                  complianceResult.riskLevel === 'high' ? 'bg-orange-950 border border-orange-500 text-orange-400' :
                  complianceResult.riskLevel === 'medium' ? 'bg-yellow-950 border border-yellow-500 text-yellow-400' :
                  'bg-emerald-950 border border-emerald-500 text-emerald-400'
                }`}>
                  {complianceResult.riskLevel} Risk
                </span>
              </div>
              <Activity className={`w-10 h-10 ${
                complianceResult.riskLevel === 'critical' || complianceResult.riskLevel === 'high' ? 'text-red-400 animate-pulse' : 'text-emerald-400'
              }`} />
            </div>

            {/* Violations Summary Card */}
            <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:border-gray-700/80 transition-all md:col-span-2">
              <div className="space-y-1.5 w-full">
                <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Violation Summary</h4>
                <div className="text-sm font-semibold text-gray-200">{complianceResult.violationSummary}</div>
                {complianceResult.violations.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {complianceResult.violations.slice(0, 3).map((v, i) => (
                      <span key={i} className="text-[10px] bg-slate-950 text-rose-400 px-2.5 py-0.5 rounded border border-rose-950 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span>{v.ruleName}</span>
                      </span>
                    ))}
                    {complianceResult.violations.length > 3 && (
                      <span className="text-[10px] bg-slate-950 text-gray-400 px-2 py-0.5 rounded border border-gray-800">
                        +{complianceResult.violations.length - 3} more
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-medium">All active rules are satisfied. System is healthy.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800/80 gap-6">
          {[
            { id: 'policies', label: 'Active Policy Registry', icon: FileCheck },
            { id: 'simulator', label: 'Playground Simulator', icon: Play },
            { id: 'audit', label: 'Audit Chain Logs', icon: History },
            { id: 'diagnostics', label: 'Diagnostic Tests', icon: Shield },
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

        {/* Dashboard Tabs Content */}
        <div>
          
          {/* TAB 1: Policy Registry */}
          {activeTab === 'policies' && (
            <div className="space-y-6">
              
              {/* Toolbar */}
              <div className="flex justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-gray-200">Policy Rules List ({policies.length})</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={handleExportJson}
                    className="bg-slate-900 border border-gray-800 text-gray-300 hover:text-white px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="bg-slate-900 border border-gray-800 text-gray-300 hover:text-white px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  
                  {/* Create Button only for Admin / Security Officer */}
                  {(role === 'Admin' || role === 'Security Officer') ? (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1 transition-all active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Policy</span>
                    </button>
                  ) : (
                    <div className="text-gray-500 border border-gray-800/80 bg-slate-900/30 px-3 py-1.5 text-xs font-medium rounded-xl flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Read Only Lock</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Policy List Grid */}
              <div className="grid grid-cols-1 gap-4">
                {policies.map((p) => {
                  const isExpanded = !!expandedVersions[p.id];
                  const versions = policyVersions[p.id] || [];

                  return (
                    <div key={p.id} className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 space-y-4">
                      
                      {/* Top Header */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-sm font-black text-white">{p.name}</span>
                            <span className="text-[10px] text-gray-400 bg-slate-900 px-2 py-0.5 rounded border border-gray-800 font-bold">
                              v{p.version}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${
                              p.priority === 'critical' ? 'bg-red-950 text-red-400 border border-red-900' :
                              p.priority === 'high' ? 'bg-orange-950 text-orange-400 border border-orange-900' :
                              p.priority === 'medium' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                              'bg-blue-950 text-blue-400 border border-blue-900'
                            }`}>
                              {p.priority} Priority
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 max-w-3xl leading-relaxed">{p.description}</p>
                        </div>

                        {/* Status Toggle & Approval Trigger */}
                        <div className="flex items-center space-x-3 self-start">
                          
                          {/* Approval Badge or Dropdown */}
                          {(role === 'Admin' || role === 'Security Officer') ? (
                            <select
                              value={p.approvalState}
                              onChange={(e) => handleTransitionApproval(p.id, e.target.value as any)}
                              className={`text-[10px] font-bold bg-slate-950 border rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none ${
                                p.approvalState === 'approved' ? 'border-emerald-500 text-emerald-400' :
                                p.approvalState === 'rejected' ? 'border-rose-500 text-rose-400' :
                                p.approvalState === 'pending_approval' ? 'border-yellow-500 text-yellow-400 animate-pulse' :
                                'border-gray-600 text-gray-400'
                              }`}
                            >
                              <option value="draft">Draft</option>
                              <option value="pending_approval">Submit for Review</option>
                              <option value="approved">Approve</option>
                              <option value="rejected">Reject</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] font-bold border px-2.5 py-1.5 rounded-lg ${
                              p.approvalState === 'approved' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' :
                              p.approvalState === 'rejected' ? 'border-rose-500 text-rose-400 bg-rose-950/20' :
                              'border-gray-600 text-gray-400 bg-slate-950/20'
                            }`}>
                              {p.approvalState.toUpperCase()}
                            </span>
                          )}

                          {/* Active Status Badge */}
                          <button
                            disabled={role !== 'Admin' && role !== 'Security Officer'}
                            onClick={() => handleToggleStatus(p.id, p.status)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all active:scale-[0.98] ${
                              p.status === 'active'
                                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700/60'
                            } disabled:opacity-80 disabled:cursor-not-allowed`}
                          >
                            {p.status === 'active' ? 'Active' : 'Inactive'}
                          </button>

                          {/* Delete Action */}
                          {(role === 'Admin' || role === 'Security Officer') && (
                            <button
                              onClick={() => handleDeletePolicy(p.id)}
                              className="text-gray-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors"
                              title="Delete Policy"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Rules Nested View */}
                      <div className="bg-slate-950/40 rounded-xl p-4 border border-gray-800/40">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">Rules Engine Schema</div>
                        <div className="space-y-3">
                          {p.rules.map((rule) => (
                            <div key={rule.id} className="text-xs flex flex-col md:flex-row md:items-center justify-between border-l-2 border-blue-500 pl-3 py-1 gap-2">
                              <div>
                                <span className="font-bold text-gray-200">{rule.name}</span>
                                <span className="text-[10px] text-gray-500 bg-slate-900 border border-gray-800 px-1.5 py-0.5 rounded ml-2 uppercase">
                                  Scope: {rule.scope}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-[10px] flex-wrap gap-y-1">
                                <span className="text-gray-400">Trigger Condition:</span>
                                <span className="font-mono text-blue-400 bg-slate-900 px-2 py-0.5 border border-gray-850 rounded">
                                  {rule.condition.operator === 'AND' || rule.condition.operator === 'OR'
                                    ? `Logical group (${rule.condition.operator})`
                                    : `${rule.condition.field} ${rule.condition.operator} ${JSON.stringify(rule.condition.value)}`}
                                </span>
                                <span className="text-gray-400">Action:</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${
                                  rule.action === 'DENY' ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                                  rule.action === 'WARN' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                                  'bg-slate-900 text-gray-400 border border-gray-800'
                                }`}>
                                  {rule.action}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Version History Dropdown Trigger */}
                      {versions.length > 1 && (
                        <div className="pt-1">
                          <button
                            onClick={() => setExpandedVersions({ ...expandedVersions, [p.id]: !isExpanded })}
                            className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>Revision History ({versions.length} versions)</span>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mt-3 bg-slate-950/20 border border-gray-800/40 rounded-xl p-3 space-y-2.5"
                              >
                                {versions.map((ver, i) => (
                                  <div key={i} className="text-xs flex items-center justify-between border-b border-gray-800/40 pb-2 last:border-0 last:pb-0">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-gray-300">v{ver.version}</span>
                                        <span className="text-[10px] text-gray-500">
                                          {new Date(ver.timestamp).toLocaleString()} by {ver.updatedBy}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-gray-400 italic">"{ver.changeSummary || 'No comments'}"</p>
                                    </div>

                                    {/* Rollback Trigger */}
                                    {(role === 'Admin' || role === 'Security Officer') && ver.version !== p.version && (
                                      <button
                                        onClick={() => handleRollback(p.id, ver.version)}
                                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-2 py-1 text-[10px] font-bold rounded-lg transition-colors flex items-center space-x-1 border border-gray-700"
                                      >
                                        <History className="w-3 h-3" />
                                        <span>Rollback</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Playground Simulator */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Simulation Configuration Controls */}
              <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-6 space-y-6 lg:col-span-1">
                <div className="flex items-center space-x-2 border-b border-gray-850 pb-3">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold">Simulator Controls</h3>
                </div>

                <div className="space-y-4">
                  
                  {/* Slider: Emissions */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">Carbon Emissions (kg)</span>
                      <span className="font-bold font-mono text-blue-400">{simEmissions.toFixed(1)} kg</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={simEmissions}
                      onChange={(e) => setSimEmissions(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Slider: Trust Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">Privacy Trust Score</span>
                      <span className="font-bold font-mono text-blue-400">{simTrustScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simTrustScore}
                      onChange={(e) => setSimTrustScore(parseInt(e.target.value))}
                      className="w-full bg-slate-950 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Slider: Nodes Count */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">Cognitive Graph Nodes</span>
                      <span className="font-bold font-mono text-blue-400">{simNodes} nodes</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simNodes}
                      onChange={(e) => setSimNodes(parseInt(e.target.value))}
                      className="w-full bg-slate-950 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Selector: Sharing Level */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-300 font-medium block">Sovereign Sharing Preferences</label>
                    <select
                      value={simSharingLevel}
                      onChange={(e: any) => setSimSharingLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-800 text-xs text-gray-300 focus:outline-none rounded-xl px-3 py-2 cursor-pointer hover:border-gray-700"
                    >
                      <option value="private">Private (Restricted)</option>
                      <option value="selective">Selective Sharing</option>
                      <option value="public">Public Sharing</option>
                    </select>
                  </div>

                  {/* Slider: Boundaries Count */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">Active Ethical Boundaries</span>
                      <span className="font-bold font-mono text-blue-400">{simBoundariesCount} constraints</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={simBoundariesCount}
                      onChange={(e) => setSimBoundariesCount(parseInt(e.target.value))}
                      className="w-full bg-slate-950 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                </div>
              </div>

              {/* Simulation Impact Results Panel */}
              <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-6 space-y-6 lg:col-span-2 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                    <h3 className="text-base font-bold text-gray-200">Playground Real-time Evaluation</h3>
                    <span className="text-[10px] text-gray-400 flex items-center space-x-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>Adjust simulator inputs to trigger rules</span>
                    </span>
                  </div>

                  {/* Simulated Metrics Scores */}
                  {complianceResult && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950/50 p-4 border border-gray-850 rounded-2xl space-y-1">
                        <div className="text-gray-400 text-xs font-semibold">Simulated Compliance Score</div>
                        <div className={`text-3xl font-black ${
                          complianceResult.complianceScore >= 80 ? 'text-emerald-400' : complianceResult.complianceScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {complianceResult.complianceScore}%
                        </div>
                      </div>
                      <div className="bg-slate-950/50 p-4 border border-gray-850 rounded-2xl space-y-1">
                        <div className="text-gray-400 text-xs font-semibold">Simulated Risk Score</div>
                        <div className={`text-3xl font-black ${
                          complianceResult.riskScore >= 75 ? 'text-red-400' : complianceResult.riskScore >= 50 ? 'text-orange-400' : 'text-emerald-400'
                        }`}>
                          {complianceResult.riskScore} <span className="text-xs text-gray-500 font-normal">/ 100</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simulated Violation List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Triggered Policy Warnings</h4>
                    
                    {complianceResult && complianceResult.violations.length > 0 ? (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
                        {complianceResult.violations.map((v, idx) => (
                          <div key={idx} className="bg-rose-950/20 border border-rose-500/30 p-3.5 rounded-xl text-xs space-y-1.5 flex items-start space-x-3">
                            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-gray-200">{v.policyName}</span>
                                <span className="text-[10px] bg-rose-950/60 text-rose-400 px-2 py-0.5 rounded uppercase font-bold border border-rose-900">
                                  {v.action}
                                </span>
                              </div>
                              <p className="text-gray-300 text-[11px] leading-relaxed">{v.message}</p>
                              <div className="text-[10px] text-gray-500 font-mono">
                                Scope: {v.scope} | Context evaluation: {v.condition.field} value {v.condition.actual} exceeded expected limit of {v.condition.expected}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-950/30 border border-gray-850 rounded-xl p-8 text-center text-xs text-gray-500 font-medium">
                        No policy warnings currently active. Simulated parameters satisfy all rules.
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                {complianceResult && complianceResult.recommendations.length > 0 && (
                  <div className="bg-blue-950/15 border border-blue-900/40 p-4 rounded-2xl space-y-2.5 mt-4">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Compliance Remediation Path</span>
                    </h4>
                    <ul className="text-xs text-gray-300 list-disc pl-4 space-y-1">
                      {complianceResult.recommendations.map((rec, idx) => (
                        <li key={idx} className="leading-relaxed">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Audit Trail Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              
              {/* Header controls */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    placeholder="Search logs by actor, event..."
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleVerifyChain}
                    className="bg-slate-900 border border-gray-800 text-gray-300 hover:text-white px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Verify Chain Integrity</span>
                  </button>
                  <button
                    onClick={handleClearAuditLogs}
                    className="bg-rose-950/10 border border-rose-900/30 text-rose-400 hover:text-rose-300 px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Logs</span>
                  </button>
                </div>
              </div>

              {/* Integrity status alert */}
              {integrityReport && (
                <div className={`p-4 rounded-2xl text-xs flex items-start space-x-3 border ${
                  integrityReport.verified
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                }`}>
                  {integrityReport.verified ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                  <div className="space-y-1">
                    <span className="font-bold">{integrityReport.verified ? 'Audit Chain Validated' : 'Audit Chain Compromised'}</span>
                    <p className="text-[11px] text-gray-300">{integrityReport.message}</p>
                  </div>
                </div>
              )}

              {/* Audit Logs Table */}
              <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Event Type</th>
                        <th className="p-4">Actor</th>
                        <th className="p-4">Policy ID</th>
                        <th className="p-4">Details</th>
                        <th className="p-4 font-mono">Hash Chain Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-4 text-gray-400 font-medium">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                                log.eventType.startsWith('VIOLATION') ? 'bg-rose-950/50 border-rose-900 text-rose-400 animate-pulse' :
                                log.eventType.startsWith('ROLLBACK') ? 'bg-yellow-950/50 border-yellow-900 text-yellow-400' :
                                'bg-slate-900 border-gray-800 text-gray-300'
                              }`}>
                                {log.eventType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-gray-200">{log.actor}</td>
                            <td className="p-4 font-mono text-gray-400">{log.policyId || 'N/A'}</td>
                            <td className="p-4 text-gray-300 text-[11px] max-w-xs truncate" title={JSON.stringify(log.details)}>
                              {JSON.stringify(log.details)}
                            </td>
                            <td className="p-4 font-mono text-gray-500 text-[10px] select-all">
                              {log.hash.substr(0, 18)}...
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-gray-500 font-medium">
                            No logs found matching search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Test Diagnostics */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              
              {/* Harness Controls */}
              <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-200">Diagnostics Test Harness</h3>
                  <p className="text-xs text-gray-400">Execute over 15 validation checks covering CRUD operations, simulation boundary checks, version rollback integrity, and security audits.</p>
                </div>

                <button
                  disabled={isRunningTests}
                  onClick={handleRunTests}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all active:scale-[0.98] self-start"
                >
                  {isRunningTests ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Run Compliance Test Suite</span>
                </button>
              </div>

              {/* Test Results Summary Display */}
              {testResults && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                  <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-1 shadow-sm">
                    <div className="text-gray-400 text-xs font-semibold">Execution Timing</div>
                    <div className="text-3xl font-black text-blue-400">{testResults.duration} <span className="text-xs font-normal text-gray-500">ms</span></div>
                  </div>
                  <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-1 shadow-sm">
                    <div className="text-gray-400 text-xs font-semibold">Total Test Cases</div>
                    <div className="text-3xl font-black text-white">{testResults.total} assertions</div>
                  </div>
                  <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-1 shadow-sm">
                    <div className="text-gray-400 text-xs font-semibold">Pass / Fail status</div>
                    <div className={`text-3xl font-black ${testResults.failed === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {testResults.passed} Passed {testResults.failed > 0 && `/ ${testResults.failed} Failed`}
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed assertions list */}
              {testResults && (
                <div className="bg-slate-900/30 border border-gray-800/60 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Test Suite Breakdown</h4>
                  <div className="space-y-2">
                    {testResults.tests.map((test, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/40 border border-gray-850 p-3 rounded-xl flex items-center justify-between text-xs hover:border-gray-800 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wide">{test.suite}</span>
                          <div className="font-semibold text-gray-200">{test.name}</div>
                          {test.error && <p className="text-[10px] text-rose-400 mt-1 font-mono italic">Error: {test.error}</p>}
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-500 font-mono text-[10px]">{test.duration}ms</span>
                          {test.passed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* CREATE POLICY DIALOG MODAL */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-gray-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
              >
                {/* Header */}
                <div className="bg-slate-950 p-5 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Draft New Governance Policy</h3>
                  <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white text-xs">Close</button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreatePolicy} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Policy ID</label>
                      <input
                        type="text"
                        placeholder="policy-carbon-max"
                        value={newPolicyId}
                        onChange={(e) => setNewPolicyId(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Policy Name</label>
                      <input
                        type="text"
                        placeholder="Emissions Ceiling Rule"
                        value={newPolicyName}
                        onChange={(e) => setNewPolicyName(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                    <textarea
                      placeholder="Policy definition detail..."
                      value={newPolicyDesc}
                      onChange={(e) => setNewPolicyDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-gray-250 focus:outline-none focus:border-blue-500 h-16 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Severity Priority</label>
                      <select
                        value={newPolicyPriority}
                        onChange={(e: any) => setNewPolicyPriority(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-800 text-xs text-gray-300 focus:outline-none rounded-xl px-3 py-2 cursor-pointer"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Comma Tags</label>
                      <input
                        type="text"
                        placeholder="security, carbon"
                        value={newPolicyTags}
                        onChange={(e) => setNewPolicyTags(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Nested single rule configuration */}
                  <div className="bg-slate-950/60 p-4 border border-gray-850 rounded-xl space-y-3.5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-850 pb-1.5">Configure Rule Condition</div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Rule Name</label>
                        <input
                          type="text"
                          placeholder="Carbon Limit Exceeded"
                          value={newRuleName}
                          onChange={(e) => setNewRuleName(e.target.value)}
                          className="w-full bg-slate-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-200 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Target Event Scope</label>
                        <input
                          type="text"
                          placeholder="carbon.*"
                          value={newRuleScope}
                          onChange={(e) => setNewRuleScope(e.target.value)}
                          className="w-full bg-slate-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Trigger Context Field</label>
                        <select
                          value={newRuleField}
                          onChange={(e) => setNewRuleField(e.target.value)}
                          className="w-full bg-slate-950 border border-gray-850 text-[11px] text-gray-300 focus:outline-none rounded-lg px-2.5 py-1.5 cursor-pointer"
                        >
                          <option value="carbon.emissions">carbon.emissions (kg)</option>
                          <option value="privacy.trustScore">privacy.trustScore (0-100)</option>
                          <option value="graph.nodesCount">graph.nodesCount (qty)</option>
                          <option value="system.cpuLoad">system.cpuLoad (%)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Action</label>
                        <select
                          value={newRuleAction}
                          onChange={(e: any) => setNewRuleAction(e.target.value)}
                          className="w-full bg-slate-950 border border-gray-850 text-[11px] text-gray-300 focus:outline-none rounded-lg px-2.5 py-1.5 cursor-pointer"
                        >
                          <option value="WARN">WARN</option>
                          <option value="DENY">DENY</option>
                          <option value="REQUIRE_APPROVAL">APPROVE</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Operator</label>
                        <select
                          value={newRuleOperator}
                          onChange={(e: any) => setNewRuleOperator(e.target.value)}
                          className="w-full bg-slate-950 border border-gray-850 text-[11px] text-gray-300 focus:outline-none rounded-lg px-2.5 py-1.5 cursor-pointer"
                        >
                          <option value="GREATER_THAN">GREATER THAN (&gt;)</option>
                          <option value="LESS_THAN">LESS THAN (&lt;)</option>
                          <option value="EQUALS">EQUALS (==)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Comparison Value</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newRuleVal}
                          onChange={(e) => setNewRuleVal(parseFloat(e.target.value))}
                          className="w-full bg-slate-950 border border-gray-850 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                  >
                    Create Policy Draft
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default GovernancePage;
