import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Activity,
  Award,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sliders,
  Play,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Settings,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Info,
  Lock,
  UserCheck,
  Percent,
  Clock,
  Sparkles
} from 'lucide-react';

import { TrustEngine } from '../core/trust/TrustEngine';
import { AgentTrustProfile, ReputationHistoryEntry, TrustConfig, TrustAnalyticsReport } from '../core/trust/TrustTypes';
import { TrustTestSuite, SuiteResults } from '../core/trust/__tests__/trust.test';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

const TrustDashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Core Service Instance
  const [trustEngine] = useState(() => TrustEngine.getInstance());

  // State Management
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'audits' | 'diagnostics'>('overview');
  const [profiles, setProfiles] = useState<AgentTrustProfile[]>([]);
  const [history, setHistory] = useState<ReputationHistoryEntry[]>([]);
  const [analytics, setAnalytics] = useState<TrustAnalyticsReport | null>(null);
  const [config, setConfig] = useState<TrustConfig>(() => trustEngine.getConfig());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  
  // Registration Form State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newAgentId, setNewAgentId] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentVerified, setNewAgentVerified] = useState(false);
  const [newAgentInitialScore, setNewAgentInitialScore] = useState(70.0);

  // Simulation State
  const [simCollabSuccess, setSimCollabSuccess] = useState(true);
  const [simCollabQuality, setSimCollabQuality] = useState(0.9);
  const [simCollabDetails, setSimCollabDetails] = useState('');

  const [simComplianceType, setSimComplianceType] = useState<'compliance' | 'violation' | 'misuse' | 'unauthorized' | 'privacy_violation'>('compliance');
  const [simComplianceSeverity, setSimComplianceSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [simComplianceDetails, setSimComplianceDetails] = useState('');

  const [simSecurityType, setSimSecurityType] = useState<'auth_failure' | 'malicious_behavior' | 'suspicious_activity'>('suspicious_activity');
  const [simSecuritySeverity, setSimSecuritySeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [simSecurityDetails, setSimSecurityDetails] = useState('');

  const [simUptime, setSimUptime] = useState(0.98);
  const [simCompletion, setSimCompletion] = useState(0.95);
  const [simQuality, setSimQuality] = useState(0.92);

  // Config Slider State
  const [weightCollab, setWeightCollab] = useState(30);
  const [weightCompliance, setWeightCompliance] = useState(30);
  const [weightSecurity, setWeightSecurity] = useState(25);
  const [weightReliability, setWeightReliability] = useState(15);
  const [decayRate, setDecayRate] = useState(2.0);
  const [recommendationThreshold, setRecommendationThreshold] = useState(75.0);

  // Query Recommendations State
  const [recommendationCriteria, setRecommendationCriteria] = useState<'highest_trust' | 'highest_reliability' | 'lowest_security_risk' | 'highest_compliance' | 'best_recent_performance'>('highest_trust');
  const [recommendations, setRecommendations] = useState<AgentTrustProfile[]>([]);

  // Diagnostics Test Runner State
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Notification helper
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const triggerNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Synchronize dynamic updates
  const refreshData = () => {
    try {
      const activeProfiles = trustEngine.getProfiles();
      setProfiles(activeProfiles);
      setHistory(trustEngine.getHistory());
      setAnalytics(trustEngine.getAnalytics());
      setConfig(trustEngine.getConfig());

      // Update recommendations
      const recs = trustEngine.getRecommendations(recommendationCriteria);
      setRecommendations(recs);

      // Auto-select agent if none selected
      if (activeProfiles.length > 0 && (!selectedAgentId || !activeProfiles.some(p => p.agentId === selectedAgentId))) {
        setSelectedAgentId(activeProfiles[0].agentId);
      }
    } catch (e: any) {
      triggerNotify(e.message || 'Error updating interface data', 'error');
    }
  };

  // Seed sample mock data if database is empty on load
  useEffect(() => {
    trustEngine.seedData();
    refreshData();
  }, []);

  // Update recommendations whenever tab or criteria changes
  useEffect(() => {
    if (profiles.length > 0) {
      setRecommendations(trustEngine.getRecommendations(recommendationCriteria));
    }
  }, [recommendationCriteria, profiles]);

  // Handle agent registration
  const handleRegisterAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentId.trim() || !newAgentName.trim()) {
      triggerNotify('Please specify an agent ID and name.', 'error');
      return;
    }
    try {
      trustEngine.registerAgent(newAgentId.trim(), newAgentName.trim(), newAgentVerified, newAgentInitialScore);
      triggerNotify(`Agent '${newAgentName}' registered successfully.`);
      setIsRegisterModalOpen(false);
      setNewAgentId('');
      setNewAgentName('');
      setNewAgentVerified(false);
      setNewAgentInitialScore(70.0);
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Simulate collaboration
  const triggerCollabSimulation = () => {
    if (!selectedAgentId) return;
    try {
      trustEngine.recordCollaboration(selectedAgentId, simCollabSuccess, simCollabQuality, simCollabDetails.trim() || undefined);
      triggerNotify('Collaboration outcome recorded, score recalculated.');
      setSimCollabDetails('');
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Simulate policy check
  const triggerComplianceSimulation = () => {
    if (!selectedAgentId) return;
    try {
      trustEngine.recordPolicyCompliance(
        selectedAgentId,
        simComplianceType,
        simComplianceSeverity,
        simComplianceDetails.trim() || undefined
      );
      triggerNotify('Policy event recorded, compliance metrics updated.');
      setSimComplianceDetails('');
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Simulate security incident
  const triggerSecuritySimulation = () => {
    if (!selectedAgentId) return;
    try {
      trustEngine.recordSecurityIncident(
        selectedAgentId,
        simSecurityType,
        simSecuritySeverity,
        simSecurityDetails.trim() || undefined
      );
      triggerNotify(`Security penalty applied to agent.`);
      setSimSecurityDetails('');
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Update reliability metrics slider inputs
  const triggerReliabilityUpdate = () => {
    if (!selectedAgentId) return;
    try {
      trustEngine.updateReliability(selectedAgentId, simUptime, simCompletion, simQuality);
      triggerNotify('Operational reliability stats updated.');
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Force decay simulation
  const triggerDecaySimulation = () => {
    if (!selectedAgentId) return;
    try {
      const decayed = trustEngine.forceDecayAgent(selectedAgentId, decayRate);
      if (decayed > 0) {
        triggerNotify(`Manual decay applied: -${decayed} pts deducted.`);
      } else {
        triggerNotify('Decay skipped (agent is verified/exempt or already at 0).', 'error');
      }
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Run global decay checking
  const triggerGlobalDecayScan = () => {
    try {
      const results = trustEngine.runDecay();
      if (results.length > 0) {
        triggerNotify(`Decay scan complete: decayed ${results.length} inactive agents.`);
      } else {
        triggerNotify('Decay scan complete: no inactive agents qualified for decay.');
      }
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Apply weight configurations
  const handleApplyConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const sum = weightCollab + weightCompliance + weightSecurity + weightReliability;
    if (sum !== 100) {
      triggerNotify(`Weights sum up to ${sum}%. They must total exactly 100%.`, 'error');
      return;
    }

    try {
      trustEngine.updateConfig({
        weights: {
          collaboration: weightCollab / 100.0,
          compliance: weightCompliance / 100.0,
          security: weightSecurity / 100.0,
          reliability: weightReliability / 100.0
        },
        decayRate: decayRate,
        recommendationThreshold: recommendationThreshold
      });
      triggerNotify('Config weight profiles updated across all agents.');
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Reset configurations to default
  const handleResetConfig = () => {
    try {
      trustEngine.resetConfig();
      const updated = trustEngine.getConfig();
      setWeightCollab(Math.round(updated.weights.collaboration * 100));
      setWeightCompliance(Math.round(updated.weights.compliance * 100));
      setWeightSecurity(Math.round(updated.weights.security * 100));
      setWeightReliability(Math.round(updated.weights.reliability * 100));
      setDecayRate(updated.decayRate);
      setRecommendationThreshold(updated.recommendationThreshold);
      triggerNotify('Configuration parameters reset to defaults.');
      refreshData();
    } catch (err: any) {
      triggerNotify(err.message, 'error');
    }
  };

  // Run interactive unit diagnostics
  const handleRunDiagnostics = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await TrustTestSuite.runTests();
      setTestResults(results);
      if (results.failed === 0) {
        triggerNotify(`All ${results.total} trust engine tests passed!`);
      } else {
        triggerNotify(`${results.failed} assertions failed.`, 'error');
      }
      refreshData();
    } catch (e) {
      triggerNotify('Failed to execute test runner.', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Wipe database storage completely
  const handleWipeDatabase = () => {
    if (window.confirm('Wipe all local trust records and histories? This cannot be undone.')) {
      trustEngine.clearAllData();
      triggerNotify('Database wiped. Fresh data was seeded.');
      trustEngine.seedData();
      refreshData();
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.agentId.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedProfile = profiles.find((p) => p.agentId === selectedAgentId);
  const totalWeightSum = weightCollab + weightCompliance + weightSecurity + weightReliability;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Floating Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-6 z-50"
            >
              <div className={`p-4 rounded-xl shadow-xl flex items-center space-x-3 border ${
                notification.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-400'
                  : 'bg-rose-950/90 border-rose-500 text-rose-400'
              }`}>
                {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-semibold text-xs">{notification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800 pb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-md shadow-purple-500/20">
              <Shield className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                Trust & Reputation Engine
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                Modular AI Agent Cooperation, Policy & Compliance Orchestrator
              </p>
            </div>
          </div>

          <div className="flex space-x-3 self-start">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Register Agent</span>
            </button>
            <button
              onClick={triggerGlobalDecayScan}
              className="bg-slate-900 border border-gray-850 hover:border-gray-800 text-gray-300 hover:text-white px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
              title="Decay Inactive Agents"
            >
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Scan Inactivity Decay</span>
            </button>
            <button
              onClick={handleWipeDatabase}
              className="bg-rose-950/15 border border-rose-900/30 text-rose-400 hover:text-rose-300 px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
              title="Wipe Local Trust Database"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>

        {/* Global Analytics Overview Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Average Score Gauge */}
            <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/80 transition-all">
              <div className="space-y-1.5">
                <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Average Network Trust</h4>
                <div className="text-4xl font-black text-white">{analytics.averageTrust}</div>
                <p className="text-xs text-gray-500 font-medium">Out of 100.0 ceiling score</p>
              </div>
              <div className="relative flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#1e293b" strokeWidth="5" fill="transparent" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke={analytics.averageTrust >= 75.0 ? '#a855f7' : analytics.averageTrust >= 50.0 ? '#3b82f6' : '#ef4444'}
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - analytics.averageTrust / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute text-[10px] font-black">Score</div>
              </div>
            </div>

            {/* Compliance Rate */}
            <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/80 transition-all">
              <div className="space-y-1.5">
                <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Compliance Rate</h4>
                <div className="text-4xl font-black text-emerald-400">{analytics.complianceRate}%</div>
                <p className="text-xs text-gray-500">Passing policy checks ratio</p>
              </div>
              <CheckCircle className="w-10 h-10 text-emerald-400 opacity-80" />
            </div>

            {/* Incident Alert Counts */}
            <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/80 transition-all">
              <div className="space-y-1.5">
                <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Security Incidents</h4>
                <div className="text-4xl font-black text-rose-400">{analytics.incidentFrequency}</div>
                <p className="text-xs text-gray-500">Threat infractions recorded</p>
              </div>
              <AlertTriangle className={`w-10 h-10 ${analytics.incidentFrequency > 0 ? 'text-rose-400 animate-bounce' : 'text-gray-600'}`} />
            </div>

            {/* Collab Success Rates */}
            <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700/80 transition-all">
              <div className="space-y-1.5">
                <h4 className="text-gray-400 font-bold text-xs tracking-wider uppercase">Collab Success Rate</h4>
                <div className="text-4xl font-black text-purple-400">{analytics.collaborationSuccessRate}%</div>
                <p className="text-xs text-gray-500">Task completion ratio</p>
              </div>
              <Activity className="w-10 h-10 text-purple-400 opacity-80" />
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 gap-6">
          {[
            { id: 'overview', label: 'Agent Profiles Overview', icon: UserCheck },
            { id: 'simulator', label: 'Interactive Event Simulator & Settings', icon: Sliders },
            { id: 'audits', label: 'Audit Logs & Recommendations', icon: History },
            { id: 'diagnostics', label: 'Engine Diagnostics', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tabs Content */}
        <div>

          {/* TAB 1: Agent Profiles Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Agent List Panel */}
              <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-5 space-y-4 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-300">Registered Agents ({filteredProfiles.length})</h3>
                  <div className="relative w-44">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-800 rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-purple-500"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2" />
                  </div>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredProfiles.map((p) => (
                    <button
                      key={p.agentId}
                      onClick={() => setSelectedAgentId(p.agentId)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        selectedAgentId === p.agentId
                          ? 'bg-purple-950/20 border-purple-500/80 shadow-md shadow-purple-500/5'
                          : 'bg-slate-900/20 border-gray-850 hover:border-gray-800 hover:bg-slate-900/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="text-xs font-extrabold text-white">{p.name}</span>
                          {p.verified && (
                            <span className="bg-purple-950 text-purple-300 text-[8px] font-black border border-purple-900 px-1 rounded flex items-center space-x-0.5">
                              <Sparkles className="w-2 h-2" />
                              <span>Verified</span>
                            </span>
                          )}
                          <span className={`text-[8px] px-1 rounded border capitalize ${
                            p.status === 'active' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                            p.status === 'inactive' ? 'bg-slate-800 text-gray-400 border-gray-700' :
                            'bg-rose-950 text-rose-400 border-rose-900'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono">{p.agentId}</p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="text-xs font-black text-gray-200">
                          {p.trustScore.toFixed(1)}
                        </div>
                        <div className="text-[9px] text-gray-500 font-medium">Trust Score</div>
                      </div>
                    </button>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <div className="text-center p-8 text-xs text-gray-500">
                      No matching agents registered.
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Detail Panel */}
              <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-6 lg:col-span-2 space-y-6">
                {selectedProfile ? (
                  <div className="space-y-6">
                    
                    {/* Detail Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-850 pb-5">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h2 className="text-xl font-bold text-white">{selectedProfile.name}</h2>
                          {selectedProfile.verified && (
                            <span className="bg-purple-950 text-purple-300 text-[9px] font-black border border-purple-900 px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Verified Node</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{selectedProfile.agentId}</p>
                      </div>

                      {/* Score Indicator */}
                      <div className="flex items-center space-x-3 bg-slate-950/40 border border-gray-850 px-4 py-2 rounded-xl">
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Composite Trust</div>
                          <div className="text-xs text-gray-400 font-medium">Weights calculated</div>
                        </div>
                        <div className={`text-3xl font-black ${
                          selectedProfile.trustScore >= 75.0 ? 'text-purple-400' :
                          selectedProfile.trustScore >= 50.0 ? 'text-blue-400' :
                          'text-red-400'
                        }`}>
                          {selectedProfile.trustScore.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Metric Breakdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Metric Category: Collaboration */}
                      <div className="bg-slate-950/40 border border-gray-850 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-850/80 pb-2">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <Activity className="w-3.5 h-3.5 text-purple-400" />
                            <span>Cooperation & Feedback</span>
                          </h4>
                          <span className="text-[10px] text-gray-500">Weight: {config.weights.collaboration * 100}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Successful Collaborations</div>
                            <div className="font-bold text-gray-200">{selectedProfile.collaborationMetrics.successfulCollaborations}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Failed Collaborations</div>
                            <div className="font-bold text-rose-400">{selectedProfile.collaborationMetrics.failedCollaborations}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Total Collaborations</div>
                            <div className="font-bold text-gray-200">{selectedProfile.collaborationMetrics.totalCollaborations}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Average Quality Score</div>
                            <div className="font-bold text-purple-400">{(selectedProfile.collaborationMetrics.averageQuality * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Metric Category: Policy Compliance */}
                      <div className="bg-slate-950/40 border border-gray-850 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-850/80 pb-2">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Compliance Registry</span>
                          </h4>
                          <span className="text-[10px] text-gray-500">Weight: {config.weights.compliance * 100}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Checks Passed</div>
                            <div className="font-bold text-emerald-400">{selectedProfile.complianceMetrics.complianceCount}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Policy Violations</div>
                            <div className="font-bold text-rose-400">{selectedProfile.complianceMetrics.violationsCount}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Unauthorized Actions</div>
                            <div className="font-bold text-rose-400">{selectedProfile.complianceMetrics.unauthorizedAccessAttempts}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Privacy Violations</div>
                            <div className="font-bold text-rose-400">{selectedProfile.complianceMetrics.privacyViolationsCount}</div>
                          </div>
                        </div>
                      </div>

                      {/* Metric Category: Security incidents */}
                      <div className="bg-slate-950/40 border border-gray-850 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-850/80 pb-2">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <Shield className="w-3.5 h-3.5 text-rose-400" />
                            <span>Security Logs</span>
                          </h4>
                          <span className="text-[10px] text-gray-500">Weight: {config.weights.security * 100}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Auth Failures</div>
                            <div className="font-bold text-gray-200">{selectedProfile.securityMetrics.authFailuresCount}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Malicious Actions</div>
                            <div className="font-bold text-rose-400">{selectedProfile.securityMetrics.maliciousBehaviorCount}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Suspicious Events</div>
                            <div className="font-bold text-yellow-400">{selectedProfile.securityMetrics.suspiciousActivityCount}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Accumulated Penalties</div>
                            <div className="font-bold text-rose-400">-{selectedProfile.securityMetrics.incidentPenaltiesSum.toFixed(1)} pts</div>
                          </div>
                        </div>
                      </div>

                      {/* Metric Category: Reliability */}
                      <div className="bg-slate-950/40 border border-gray-850 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-850/80 pb-2">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <Award className="w-3.5 h-3.5 text-blue-400" />
                            <span>Performance Quality</span>
                          </h4>
                          <span className="text-[10px] text-gray-500">Weight: {config.weights.reliability * 100}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Uptime Guarantee</div>
                            <div className="font-bold text-blue-400">{(selectedProfile.reliabilityMetrics.uptime * 100).toFixed(0)}%</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Task Completion</div>
                            <div className="font-bold text-emerald-400">{(selectedProfile.reliabilityMetrics.taskCompletionRate * 100).toFixed(0)}%</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Quality Average</div>
                            <div className="font-bold text-purple-400">{(selectedProfile.reliabilityMetrics.responseQuality * 100).toFixed(0)}%</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-gray-500 font-medium">Last Interaction</div>
                            <div className="font-bold text-gray-400 font-mono text-[10px]">
                              {new Date(selectedProfile.lastInteractionTime).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Quick Audit History snippet */}
                    <div className="bg-slate-950/20 border border-gray-850 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-gray-300">Recent Trust Adjustments for {selectedProfile.name}</h4>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {history.filter(h => h.agentId === selectedAgentId).slice(0, 3).map((h, i) => (
                          <div key={i} className="text-xs flex items-center justify-between border-b border-gray-850/50 pb-1.5 last:border-0 last:pb-0">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                  h.eventType === 'security' ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                                  h.eventType === 'compliance' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                                  h.eventType === 'decay' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                                  'bg-slate-900 text-gray-400 border border-gray-800'
                                }`}>
                                  {h.eventType}
                                </span>
                                <span className="text-gray-400 italic text-[11px]">"{h.reason}"</span>
                              </div>
                            </div>
                            <div className="text-right font-mono text-[10px] space-y-0.5">
                              <div className="text-gray-400">
                                {h.previousScore.toFixed(0)} → <span className="font-bold text-white">{h.newScore.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {history.filter(h => h.agentId === selectedAgentId).length === 0 && (
                          <p className="text-xs text-gray-500 italic">No historical events recorded for this agent yet.</p>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center p-20 text-gray-500 italic">
                    Select an agent from the registry panel to inspect details.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Event Simulator & Settings */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Event Simulator Box */}
              <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-6 lg:col-span-2 space-y-6">
                <div className="flex items-center space-x-2 border-b border-gray-850 pb-3">
                  <Play className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold">Simulator Controls</h3>
                </div>

                <div className="bg-slate-950/40 p-4 border border-gray-850 rounded-xl flex items-center justify-between text-xs gap-4">
                  <div className="space-y-1">
                    <span className="text-gray-400 font-medium block">Target Agent Profile</span>
                    <p className="text-gray-500">Trigger events on this selected registered agent:</p>
                  </div>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="bg-slate-900 border border-gray-850 text-purple-400 text-xs font-bold focus:outline-none rounded-lg px-3 py-2 cursor-pointer hover:border-gray-800"
                  >
                    {profiles.map(p => (
                      <option key={p.agentId} value={p.agentId}>{p.name} ({p.agentId})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Simulator Panel: Collaboration */}
                  <div className="bg-slate-950/30 border border-gray-850 rounded-xl p-4.5 space-y-4">
                    <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider border-b border-gray-850 pb-2">Record Cooperation Event</h4>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Collaboration Outcome</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSimCollabSuccess(true)}
                          className={`px-3 py-1 rounded text-[10px] font-bold border ${
                            simCollabSuccess ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-gray-800 text-gray-500'
                          }`}
                        >
                          Success
                        </button>
                        <button
                          onClick={() => setSimCollabSuccess(false)}
                          className={`px-3 py-1 rounded text-[10px] font-bold border ${
                            !simCollabSuccess ? 'bg-rose-950 border-rose-500 text-rose-400' : 'bg-slate-900 border-gray-800 text-gray-500'
                          }`}
                        >
                          Failure
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Interaction Quality</span>
                        <span className="font-bold text-purple-400">{(simCollabQuality * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={simCollabQuality}
                        onChange={(e) => setSimCollabQuality(parseFloat(e.target.value))}
                        className="w-full bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 block font-medium">Log Details / Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Completed federated gradient aggregation"
                        value={simCollabDetails}
                        onChange={(e) => setSimCollabDetails(e.target.value)}
                        className="w-full bg-slate-900 border border-gray-850 text-xs text-gray-200 focus:outline-none rounded-lg px-2.5 py-1.5"
                      />
                    </div>

                    <button
                      onClick={triggerCollabSimulation}
                      className="w-full bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold py-2 rounded-xl transition-all active:scale-[0.98]"
                    >
                      Record Collaboration
                    </button>
                  </div>

                  {/* Simulator Panel: Policy Compliance */}
                  <div className="bg-slate-950/30 border border-gray-850 rounded-xl p-4.5 space-y-4">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider border-b border-gray-850 pb-2">Record Policy Event</h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 block font-medium">Event Type</label>
                      <select
                        value={simComplianceType}
                        onChange={(e: any) => setSimComplianceType(e.target.value)}
                        className="w-full bg-slate-900 border border-gray-850 text-xs text-gray-300 focus:outline-none rounded-lg px-2.5 py-1.5"
                      >
                        <option value="compliance">Successful Compliance</option>
                        <option value="violation">General Policy Violation</option>
                        <option value="misuse">Resource Permission Misuse</option>
                        <option value="unauthorized">Unauthorized Access Attempt</option>
                        <option value="privacy_violation">Direct Privacy Breach</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 block font-medium">Violation Severity</label>
                      <select
                        value={simComplianceSeverity}
                        onChange={(e: any) => setSimComplianceSeverity(e.target.value)}
                        className="w-full bg-slate-900 border border-gray-850 text-xs text-gray-350 focus:outline-none rounded-lg px-2.5 py-1.5"
                      >
                        <option value="low">Low Severity</option>
                        <option value="medium">Medium Severity</option>
                        <option value="high">High Severity</option>
                        <option value="critical">Critical Severity</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 block font-medium">Log Details / Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Accessed sensitive memory space"
                        value={simComplianceDetails}
                        onChange={(e) => setSimComplianceDetails(e.target.value)}
                        className="w-full bg-slate-900 border border-gray-850 text-xs text-gray-200 focus:outline-none rounded-lg px-2.5 py-1.5"
                      />
                    </div>

                    <button
                      onClick={triggerComplianceSimulation}
                      className="w-full bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl transition-all active:scale-[0.98]"
                    >
                      Record Policy Event
                    </button>
                  </div>

                  {/* Simulator Panel: Security Incidents */}
                  <div className="bg-slate-950/30 border border-gray-850 rounded-xl p-4.5 space-y-4">
                    <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider border-b border-gray-850 pb-2">Record Security Incident</h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 block font-medium">Incident Type</label>
                      <select
                        value={simSecurityType}
                        onChange={(e: any) => setSimSecurityType(e.target.value)}
                        className="w-full bg-slate-900 border border-gray-850 text-xs text-gray-300 focus:outline-none rounded-lg px-2.5 py-1.5"
                      >
                        <option value="suspicious_activity">Suspicious Activity Check</option>
                        <option value="auth_failure">Authentication Failure</option>
                        <option value="malicious_behavior">Malicious / Hostile Behavior</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 block font-medium">Incident Severity</label>
                      <select
                        value={simSecuritySeverity}
                        onChange={(e: any) => setSimSecuritySeverity(e.target.value)}
                        className="w-full bg-slate-900 border border-gray-850 text-xs text-gray-350 focus:outline-none rounded-lg px-2.5 py-1.5"
                      >
                        <option value="low">Low Penalty</option>
                        <option value="medium">Medium Penalty</option>
                        <option value="high">High Penalty</option>
                        <option value="critical">Critical Penalty</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 block font-medium">Log Details / Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Invalid cryptographic signature"
                        value={simSecurityDetails}
                        onChange={(e) => setSimSecurityDetails(e.target.value)}
                        className="w-full bg-slate-900 border border-gray-850 text-xs text-gray-200 focus:outline-none rounded-lg px-2.5 py-1.5"
                      />
                    </div>

                    <button
                      onClick={triggerSecuritySimulation}
                      className="w-full bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold py-2 rounded-xl transition-all active:scale-[0.98]"
                    >
                      Record Security Incident
                    </button>
                  </div>

                  {/* Simulator Panel: Reliability & Decay */}
                  <div className="bg-slate-950/30 border border-gray-850 rounded-xl p-4.5 space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider border-b border-gray-850 pb-2">Reliability & Decay</h4>
                      
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-400">Uptime Metric</span>
                            <span className="font-bold text-blue-400">{(simUptime * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.01"
                            value={simUptime}
                            onChange={(e) => setSimUptime(parseFloat(e.target.value))}
                            className="w-full bg-slate-900 h-1 rounded appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-400">Task Completion Rate</span>
                            <span className="font-bold text-emerald-400">{(simCompletion * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.01"
                            value={simCompletion}
                            onChange={(e) => setSimCompletion(parseFloat(e.target.value))}
                            className="w-full bg-slate-900 h-1 rounded appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-400">Response Quality</span>
                            <span className="font-bold text-purple-400">{(simQuality * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.01"
                            value={simQuality}
                            onChange={(e) => setSimQuality(parseFloat(e.target.value))}
                            className="w-full bg-slate-900 h-1 rounded appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-850/50">
                      <button
                        onClick={triggerReliabilityUpdate}
                        className="w-full bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold py-1.5 rounded-xl transition-all active:scale-[0.98]"
                      >
                        Apply Performance Stats
                      </button>
                      <button
                        onClick={triggerDecaySimulation}
                        className="w-full bg-slate-900 hover:bg-slate-850 border border-gray-850 text-gray-300 text-xs font-bold py-1.5 rounded-xl transition-colors"
                      >
                        Force Inactivity Decay cycle
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Weight Configurations drawer */}
              <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-6 lg:col-span-1 space-y-6">
                <div className="flex items-center space-x-2 border-b border-gray-850 pb-3">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold">Weight Configuration</h3>
                </div>

                <form onSubmit={handleApplyConfig} className="space-y-5">
                  <div className="space-y-4">
                    
                    {/* Weight Slider: Collaboration */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">Cooperation (Success/Quality)</span>
                        <span className="font-mono text-purple-400">{weightCollab}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weightCollab}
                        onChange={(e) => setWeightCollab(parseInt(e.target.value))}
                        className="w-full bg-slate-950 h-1 rounded cursor-pointer"
                      />
                    </div>

                    {/* Weight Slider: Compliance */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">Policy Compliance checks</span>
                        <span className="font-mono text-purple-400">{weightCompliance}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weightCompliance}
                        onChange={(e) => setWeightCompliance(parseInt(e.target.value))}
                        className="w-full bg-slate-950 h-1 rounded cursor-pointer"
                      />
                    </div>

                    {/* Weight Slider: Security */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">Security Incident deductions</span>
                        <span className="font-mono text-purple-400">{weightSecurity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weightSecurity}
                        onChange={(e) => setWeightSecurity(parseInt(e.target.value))}
                        className="w-full bg-slate-950 h-1 rounded cursor-pointer"
                      />
                    </div>

                    {/* Weight Slider: Reliability */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">Uptime & Resource performance</span>
                        <span className="font-mono text-purple-400">{weightReliability}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weightReliability}
                        onChange={(e) => setWeightReliability(parseInt(e.target.value))}
                        className="w-full bg-slate-950 h-1 rounded cursor-pointer"
                      />
                    </div>

                    {/* Weight Sum indicator */}
                    <div className={`p-3 rounded-xl text-center text-xs font-bold border ${
                      totalWeightSum === 100
                        ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400'
                        : 'bg-rose-950/20 border-rose-900/50 text-rose-400'
                    }`}>
                      {totalWeightSum === 100 ? (
                        <span>Weights sum to 100% (Valid)</span>
                      ) : (
                        <span>Sum: {totalWeightSum}% (Must equal exactly 100%)</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-850 pt-4 space-y-4">
                    
                    {/* Decay rate slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">Decay Rate (pts/cycle)</span>
                        <span className="font-mono text-purple-400">-{decayRate.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={decayRate}
                        onChange={(e) => setDecayRate(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 h-1 rounded cursor-pointer"
                      />
                    </div>

                    {/* Threshold slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">Recommendation Threshold</span>
                        <span className="font-mono text-purple-400">{recommendationThreshold.toFixed(0)}</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="90"
                        value={recommendationThreshold}
                        onChange={(e) => setRecommendationThreshold(parseInt(e.target.value))}
                        className="w-full bg-slate-950 h-1 rounded cursor-pointer"
                      />
                    </div>

                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={totalWeightSum !== 100}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                      Apply Weights
                    </button>
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="bg-slate-900 hover:bg-slate-850 border border-gray-850 text-gray-300 hover:text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: Audit Logs & Recommendations */}
          {activeTab === 'audits' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Audit history list */}
              <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-6 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-850 pb-3">
                  <h3 className="text-base font-bold">Audit Logs</h3>
                  <span className="text-[10px] text-gray-500">History retention limits configured</span>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {history.map((h, i) => {
                    const matchedAgent = profiles.find((p) => p.agentId === h.agentId);
                    return (
                      <div key={i} className="bg-slate-950/40 border border-gray-855 rounded-xl p-3.5 flex items-start justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-extrabold text-gray-200">
                              {matchedAgent ? matchedAgent.name : (h.agentId === 'system' ? 'System' : 'Unknown Agent')}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              h.eventType === 'security' ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                              h.eventType === 'compliance' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                              h.eventType === 'decay' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                              h.eventType === 'initialization' ? 'bg-blue-950 text-blue-400 border border-blue-900' :
                              'bg-slate-900 text-gray-400 border border-gray-800'
                            }`}>
                              {h.eventType}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-[11px] italic">"{h.reason}"</p>
                        </div>

                        {h.eventType !== 'config_update' && h.agentId !== 'system' && (
                          <div className="text-right font-mono space-y-0.5 flex-shrink-0">
                            <div className="text-gray-400">
                              {h.previousScore.toFixed(0)} → <span className="font-bold text-white">{h.newScore.toFixed(0)}</span>
                            </div>
                            <div className={`text-[9px] font-bold ${h.newScore >= h.previousScore ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {h.newScore >= h.previousScore ? '+' : ''}{(h.newScore - h.previousScore).toFixed(1)} delta
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {history.length === 0 && (
                    <div className="text-center py-20 text-gray-500 italic">
                      No logs found. Seed or record actions to update logs.
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendation Engine queries */}
              <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-6 lg:col-span-1 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-gray-850 pb-3">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <h3 className="text-base font-bold">Agent Recommendation</h3>
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    <label className="text-gray-400 block font-medium">Select Selection Criteria</label>
                    <select
                      value={recommendationCriteria}
                      onChange={(e: any) => setRecommendationCriteria(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 text-xs text-gray-300 focus:outline-none rounded-xl px-3 py-2 cursor-pointer hover:border-gray-800"
                    >
                      <option value="highest_trust">Highest Trust Score</option>
                      <option value="highest_reliability">Highest Reliability</option>
                      <option value="lowest_security_risk">Lowest Security Risk</option>
                      <option value="highest_compliance">Highest Policy Compliance</option>
                      <option value="best_recent_performance">Best Recent Performance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Recommended Agents</h4>
                  <div className="space-y-2">
                    {recommendations.map((p, idx) => (
                      <div
                        key={p.agentId}
                        className="bg-slate-950/40 border border-gray-850 p-3 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-white">#{idx + 1} {p.name}</span>
                            {p.verified && <span className="text-[8px] bg-purple-950 text-purple-300 border border-purple-900 px-1.5 rounded font-black">Verified</span>}
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono">{p.agentId}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-purple-400">{p.trustScore.toFixed(1)}</span>
                          <p className="text-[8px] text-gray-500 uppercase tracking-wider font-semibold">Trust Score</p>
                        </div>
                      </div>
                    ))}
                    {recommendations.length === 0 && (
                      <div className="bg-slate-950/20 border border-gray-850 rounded-xl p-6 text-center text-xs text-gray-500">
                        No agents satisfied the minimum recommendation threshold of {config.recommendationThreshold}.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: Engine Diagnostics */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              
              {/* Diagnostics controls */}
              <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-200">Diagnostics Test Harness</h3>
                  <p className="text-xs text-gray-400">
                    Runs unit assertions on agent registration, composite trust scores, compliance checks, security penalties, decay logs, and sorting recommendations.
                  </p>
                </div>

                <button
                  disabled={isRunningTests}
                  onClick={handleRunDiagnostics}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all active:scale-[0.98] self-start"
                >
                  {isRunningTests ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Run Engine Assertions</span>
                </button>
              </div>

              {/* Summary results */}
              {testResults && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                  <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-1 shadow-sm">
                    <div className="text-gray-400 text-xs font-semibold">Execution Speed</div>
                    <div className="text-3xl font-black text-purple-400">{testResults.duration} <span className="text-xs font-normal text-gray-500">ms</span></div>
                  </div>
                  <div className="bg-slate-900/40 border border-gray-800/80 rounded-2xl p-5 space-y-1 shadow-sm">
                    <div className="text-gray-400 text-xs font-semibold">Total Checks Checked</div>
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
                <div className="bg-slate-900/30 border border-gray-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diagnostic Breakdown</h4>
                  <div className="space-y-2">
                    {testResults.tests.map((test, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/40 border border-gray-855 p-3 rounded-xl flex items-center justify-between text-xs hover:border-gray-800 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="text-purple-400 font-bold uppercase text-[9px] tracking-wide">{test.suite}</span>
                          <div className="font-semibold text-gray-200">{test.name}</div>
                          {test.error && <p className="text-[10px] text-rose-450 mt-1 font-mono italic">Error: {test.error}</p>}
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

      </div>

      {/* MODAL: Register New Agent */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-gray-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-950 border-b border-gray-850 p-5 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-purple-400">
                  <UserCheck className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white">Register AI Agent Profile</h3>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegisterAgent} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold block uppercase">Agent Unique ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. agent-recommendation-service"
                    value={newAgentId}
                    onChange={(e) => setNewAgentId(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-850 text-xs text-gray-200 focus:outline-none focus:border-purple-500 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold block uppercase">Friendly Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Recommendation Engine Node"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-850 text-xs text-gray-200 focus:outline-none focus:border-purple-500 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                    <span>Initial Baseline Trust</span>
                    <span className="font-mono text-purple-400">{newAgentInitialScore.toFixed(0)}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={newAgentInitialScore}
                    onChange={(e) => setNewAgentInitialScore(parseInt(e.target.value))}
                    className="w-full bg-slate-950 h-1 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="newAgentVerified"
                    checked={newAgentVerified}
                    onChange={(e) => setNewAgentVerified(e.target.checked)}
                    className="bg-slate-950 border-gray-800 rounded focus:ring-purple-500 text-purple-600"
                  />
                  <label htmlFor="newAgentVerified" className="text-xs text-gray-300 font-medium cursor-pointer selection:bg-transparent select-none">
                    Exempt from inactivity decay (Verified Node)
                  </label>
                </div>

                <div className="flex space-x-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 rounded-xl transition-all active:scale-[0.98]"
                  >
                    Confirm Register
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="bg-slate-950 hover:bg-slate-900 border border-gray-850 text-gray-400 hover:text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TrustDashboardPage;
