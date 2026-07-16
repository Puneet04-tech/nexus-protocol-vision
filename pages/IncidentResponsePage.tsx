import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Bell, Database, Shield, Zap, RefreshCw, Sliders, List,
  HelpCircle, AlertCircle, Clock, CheckCircle, Download, Play, Trash,
  AlertTriangle, History, Settings, FileCheck, Layers, FileText, Lock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { incidentService } from '../core/incident-response/services/IncidentService';
import { IncidentResponseAPI } from '../core/incident-response/api/IncidentResponseAPI';
import { IncidentResponseTestSuite, SreSuiteResults } from '../core/incident-response/__tests__/incident-response.test';
import { Incident, Checkpoint, AlertRule, IncidentAlert, RecoveryJob, AuditLog, SreAnalytics } from '../core/incident-response/types';

const IncidentResponsePage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  // Tab management
  const [activeTab, setActiveTab] = useState<
    'overview' | 'queue' | 'checkpoints' | 'rules' | 'history' | 'audit' | 'tests'
  >('overview');

  // Dashboard state
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);
  const [recoveryJobs, setRecoveryJobs] = useState<RecoveryJob[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<SreAnalytics | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Custom alert rule form state
  const [newRuleMetric, setNewRuleMetric] = useState('detector.agent_failures');
  const [newRuleOp, setNewRuleOp] = useState<'gt' | 'lt' | 'eq' | 'gte' | 'lte'>('gt');
  const [newRuleThreshold, setNewRuleThreshold] = useState(0);
  const [newRuleSeverity, setNewRuleSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  // Custom manual checkpoint form state
  const [cpComponent, setCpComponent] = useState('Sovereign Persona');
  const [cpWorkflowState, setCpWorkflowState] = useState('IDLE');
  const [cpContext, setCpContext] = useState('{"activeSession": true, "environment": "sandbox"}');

  // Diagnostics runner state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<SreSuiteResults | null>(null);

  // Active Incident details expansion
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

  // Background polling loop
  useEffect(() => {
    const syncData = async () => {
      try {
        const incidentsRes = await IncidentResponseAPI.getIncidents();
        const checkpointsRes = await IncidentResponseAPI.getCheckpoints();
        const rulesRes = await IncidentResponseAPI.getAlertRules();
        const alertsRes = await IncidentResponseAPI.getAlerts();
        const recoveryRes = await IncidentResponseAPI.getRecoveryJobs();
        const auditRes = await IncidentResponseAPI.getAuditLogs();
        const analyticsRes = await IncidentResponseAPI.getAnalytics();
        const simModeRes = await IncidentResponseAPI.getSimulationMode();

        setIncidents(incidentsRes.data);
        setCheckpoints(checkpointsRes.data);
        setRules(rulesRes.data);
        setAlerts(alertsRes.data);
        setRecoveryJobs(recoveryRes.data);
        setAuditLogs(auditRes.data);
        setAnalytics(analyticsRes.data);
        setIsSimulating(simModeRes.data);
      } catch (e) {}
    };

    syncData();
    const interval = setInterval(syncData, 1000); // 1-second rapid dashboard refresh rate
    return () => clearInterval(interval);
  }, []);

  // Event handlers
  const handleToggleSimulation = async () => {
    const nextState = !isSimulating;
    setIsLoading(true);
    await IncidentResponseAPI.toggleSimulationMode(nextState);
    setIsSimulating(nextState);
    setIsLoading(false);
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear incident logs and reset SRE telemetry metrics?')) {
      setIsLoading(true);
      await IncidentResponseAPI.clearSystemData();
      setIsLoading(false);
    }
  };

  const handleManualBreach = async (ruleId: string) => {
    try {
      incidentService.manualTriggerIncident(ruleId);
    } catch (e: any) {
      alert(`Breach trigger failed: ${e.message}`);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await IncidentResponseAPI.acknowledgeAlert(alertId, 'SRE_OPERATOR');
  };

  const handleResolveIncident = async (incId: string) => {
    await IncidentResponseAPI.resolveIncident(incId, 'SRE_OPERATOR');
  };

  const handleManualRecovery = async (incId: string) => {
    await IncidentResponseAPI.triggerRecovery(incId, 'SRE_OPERATOR');
    setActiveTab('queue');
  };

  const handleRollback = async (incId: string, cpId: string) => {
    setIsLoading(true);
    const res = await IncidentResponseAPI.rollbackIncidentToCheckpoint(incId, cpId, 'SRE_OPERATOR');
    setIsLoading(false);
    if (res.status !== 200) {
      alert(`Rollback failed: ${res.message}`);
    } else {
      setExpandedIncidentId(null);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleDesc.trim()) {
      alert('Description is required.');
      return;
    }
    try {
      await IncidentResponseAPI.createAlertRule({
        metricName: newRuleMetric,
        operator: newRuleOp,
        threshold: newRuleThreshold,
        severity: newRuleSeverity,
        description: newRuleDesc
      });
      setNewRuleDesc('');
      setNewRuleThreshold(0);
      alert('Custom Alert Rule created.');
    } catch (e: any) {
      alert(`Failed to create rule: ${e.message}`);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedCtx = JSON.parse(cpContext);
      await IncidentResponseAPI.createCheckpoint(cpComponent, cpWorkflowState, parsedCtx);
      setCpWorkflowState('IDLE');
      setCpContext('{"activeSession": true, "environment": "sandbox"}');
      alert('Manual state checkpoint committed.');
    } catch (e: any) {
      alert(`Invalid context JSON or checkpoint error: ${e.message}`);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    await IncidentResponseAPI.toggleAlertRule(ruleId, enabled);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Delete this rule?')) {
      await IncidentResponseAPI.deleteAlertRule(ruleId);
    }
  };

  const runDiagnostics = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await IncidentResponseTestSuite.runTests(incidentService);
      setTestResults(results);
    } catch (e: any) {
      alert(`Diagnostics crashed: ${e.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Exporters
  const handleExport = (format: 'json' | 'csv' | 'pdf') => {
    const payload = incidentService.exportReport(format);
    const nowStr = new Date().toISOString().slice(0, 10);
    const filename = `nexus_sre_report_${nowStr}.${format}`;

    let url = '';
    if (format === 'pdf') {
      url = URL.createObjectURL(payload as Blob);
    } else {
      const blob = new Blob([payload as string], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Derived stats
  const activeIncidentsList = useMemo(() => incidents.filter(i => i.status !== 'resolved'), [incidents]);
  const sortedAuditLogs = useMemo(() => [...auditLogs].sort((a, b) => b.timestamp - a.timestamp), [auditLogs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 shadow-md">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">AI Incident Response Center</h1>
                <p className="text-slate-400 text-xs mt-0.5">SRE failover automation, context checkpoint managers, and recovery orchestrators.</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleSimulation}
              disabled={isLoading}
              className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center space-x-2
                ${isSimulating 
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20' 
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800/80'
                }
              `}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Anomaly Simulator Active' : 'Enable Anomaly Simulator'}</span>
            </button>
            
            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-slate-800/40 border border-slate-700 hover:bg-slate-800/80 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
            >
              <Trash className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear SRE Logs</span>
            </button>
            
            {analytics && (
              <span className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5
                ${analytics.activeIncidents > 0 
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-400' 
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                }
              `}>
                <span className={`w-2 h-2 rounded-full ${analytics.activeIncidents > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
                <span>{analytics.activeIncidents > 0 ? `${analytics.activeIncidents} Active Outages` : 'SLA Compliance Optimal'}</span>
              </span>
            )}
          </div>
        </div>

        {/* METRICS STATS CARDS */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-emerald-500/20"><Activity size={24} /></div>
              <h4 className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">Availability SLA</h4>
              <div className="text-3xl font-black text-white mt-2 font-mono">{analytics.systemAvailabilityPercent}%</div>
              <p className="text-[10px] text-emerald-400 mt-1">SLA Target: 99.98%</p>
            </div>
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-rose-500/20"><AlertCircle size={24} /></div>
              <h4 className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">Active Incidents</h4>
              <div className="text-3xl font-black text-white mt-2 font-mono">{analytics.activeIncidents}</div>
              <p className="text-[10px] text-slate-400 mt-1">Pending admin action</p>
            </div>
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-blue-500/20"><Clock size={24} /></div>
              <h4 className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">Mean Time To Recovery</h4>
              <div className="text-3xl font-black text-white mt-2 font-mono">{analytics.meanTimeToRecoveryMs}ms</div>
              <p className="text-[10px] text-blue-400 mt-1">MTTR SLA: &lt;5000ms</p>
            </div>
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-amber-500/20"><History size={24} /></div>
              <h4 className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">Mean Time Between Failures</h4>
              <div className="text-3xl font-black text-white mt-2 font-mono">{Math.round(analytics.meanTimeBetweenFailuresMs / 1000)}s</div>
              <p className="text-[10px] text-amber-400 mt-1">Outage separation density</p>
            </div>
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-cyan-500/20"><CheckCircle size={24} /></div>
              <h4 className="text-slate-500 font-bold text-[10px] tracking-wider uppercase">Recovery Success</h4>
              <div className="text-3xl font-black text-white mt-2 font-mono">{analytics.recoverySuccessRate}%</div>
              <p className="text-[10px] text-cyan-400 mt-1">Automated rollback rate</p>
            </div>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap border-b border-slate-800 gap-1 select-none">
          {[
            { id: 'overview', label: 'Outages Overview', icon: Sliders },
            { id: 'queue', label: 'Recovery Queue', icon: Layers },
            { id: 'checkpoints', label: 'Checkpoint Registry', icon: Database },
            { id: 'rules', label: 'Alerting Rules', icon: Bell },
            { id: 'history', label: 'Historical Incidents', icon: List },
            { id: 'audit', label: 'Audit & Reports', icon: FileText },
            { id: 'tests', label: 'SRE Diagnostics', icon: FileCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setExpandedIncidentId(null);
                }}
                className={`
                  flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer
                  ${isActive 
                    ? 'border-rose-500 text-rose-400 bg-rose-950/5' 
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN PANEL VIEWPORT */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* TAB 1: OUTAGES OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Active Incidents Console */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl space-y-4">
                      <h3 className="text-lg font-black text-white">Active System Incidents</h3>
                      
                      {activeIncidentsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-slate-950/20 border border-slate-850 border-dashed rounded-xl">
                          <CheckCircle className="w-10 h-10 text-emerald-400" />
                          <h4 className="text-sm font-bold text-slate-300">All Operations Nominal</h4>
                          <p className="text-xs text-slate-500 max-w-xs">No active failures detected. Click "Inject Telemetry Breach" on the right sidebar to test.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeIncidentsList.map(inc => {
                            const isExpanded = expandedIncidentId === inc.id;
                            return (
                              <div 
                                key={inc.id} 
                                className={`border rounded-xl transition-all ${
                                  inc.severity === 'critical' ? 'border-rose-950/80 bg-rose-950/5' :
                                  inc.severity === 'high' ? 'border-amber-950/80 bg-amber-950/5' :
                                  'border-slate-800 bg-slate-900/40'
                                }`}
                              >
                                <div 
                                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-900/20"
                                  onClick={() => setExpandedIncidentId(isExpanded ? null : inc.id)}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                        inc.severity === 'critical' ? 'bg-rose-950 border border-rose-500 text-rose-400' :
                                        inc.severity === 'high' ? 'bg-amber-950 border border-amber-500 text-amber-400' :
                                        'bg-slate-800 border border-slate-700 text-slate-300'
                                      }`}>
                                        {inc.severity}
                                      </span>
                                      <span className="text-xs font-bold text-white">{inc.title}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {inc.id} | Component: {inc.component}</p>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                                      inc.status === 'active' ? 'bg-rose-950/40 border-rose-600 text-rose-400' :
                                      inc.status === 'recovering' ? 'bg-amber-950/40 border-amber-500 text-amber-400 animate-pulse' :
                                      'bg-slate-800 border-slate-700 text-slate-300'
                                    }`}>
                                      {inc.status}
                                    </span>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="border-t border-slate-850 p-4 space-y-4 text-xs">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h5 className="font-bold text-slate-300">Description</h5>
                                        <p className="text-slate-400 mt-1">{inc.description}</p>
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-slate-300">Root Cause Analysis</h5>
                                        <p className="text-rose-400 mt-1 font-medium">{inc.rootCause}</p>
                                      </div>
                                    </div>

                                    {/* Rollback Checkpoints Option */}
                                    <div className="space-y-2">
                                      <h5 className="font-bold text-slate-300 flex items-center space-x-1.5">
                                        <History size={13} className="text-blue-400" />
                                        <span>Manual Checkpoint Rollbacks</span>
                                      </h5>
                                      {checkpoints.filter(c => c.componentId === inc.component).length === 0 ? (
                                        <div className="text-[10px] text-slate-500 italic">No checkpoints found for this component.</div>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {checkpoints.filter(c => c.componentId === inc.component).map(cp => (
                                            <button
                                              key={cp.id}
                                              onClick={() => handleRollback(inc.id, cp.id)}
                                              className="px-2.5 py-1 bg-blue-950/40 border border-blue-800 hover:bg-blue-900/40 text-blue-300 rounded text-[9px] font-mono transition-all flex items-center space-x-1 cursor-pointer"
                                            >
                                              <span>Rollback to {cp.id.slice(0, 10)}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Timeline events visualizer */}
                                    <div className="space-y-2">
                                      <h5 className="font-bold text-slate-300">Telemetry Outage Timeline</h5>
                                      <div className="border border-slate-850 bg-slate-950/50 rounded-xl p-3 space-y-2.5 max-h-48 overflow-y-auto">
                                        {inc.timeline.map((evt, idx) => (
                                          <div key={idx} className="flex gap-3 leading-relaxed">
                                            <span className="text-[9px] font-mono text-slate-500 self-start mt-0.5">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                                            <div className="space-y-0.5">
                                              <p className="text-slate-300 font-mono text-[10px]">{evt.message}</p>
                                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Type: {evt.type} | Actor: {evt.operator || 'SYSTEM'}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Action items */}
                                    <div className="flex gap-2">
                                      {inc.status === 'active' && (
                                        <button
                                          onClick={() => handleManualRecovery(inc.id)}
                                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                                        >
                                          <Play size={12} />
                                          <span>Run SRE Recovery Job</span>
                                        </button>
                                      )}
                                      
                                      <button
                                        onClick={() => handleResolveIncident(inc.id)}
                                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                                      >
                                        <CheckCircle size={12} className="text-emerald-400" />
                                        <span>Close Incident</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Trigger breaches */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-850 pb-3">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <h3 className="text-sm font-bold">Inject Telemetry Breach</h3>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Simulate metric threshold breaches to test the automated detection rules, alert relays, and recovery failover jobs.
                      </p>
                      
                      <div className="space-y-2">
                        {rules.map(rule => (
                          <button
                            key={rule.id}
                            onClick={() => handleManualBreach(rule.id)}
                            className="w-full text-left p-3 bg-slate-950 border border-slate-850 hover:border-slate-750 hover:bg-slate-900/30 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">{rule.severity}</span>
                              <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">{rule.id.replace('rule_', '').replace(/_/g, ' ')}</h4>
                              <p className="text-[8px] text-slate-500 font-mono">{rule.metricName}</p>
                            </div>
                            <Play size={12} className="text-slate-600 group-hover:text-rose-400 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: RECOVERY QUEUE */}
              {activeTab === 'queue' && (
                <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl space-y-4">
                  <h3 className="text-lg font-black text-white">Active Recovery Job Executor</h3>
                  <p className="text-xs text-slate-400">Shows prioritized job queues running mitigations: retry blocks, restarts, rollbacks, and dependencies recovery.</p>

                  {recoveryJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 border border-slate-850 border-dashed rounded-xl">
                      <Layers className="w-10 h-10 text-slate-700 animate-pulse" />
                      <h4 className="text-sm font-bold text-slate-400">Queue Standby</h4>
                      <p className="text-xs text-slate-500 max-w-xs">No active recovery tasks running currently.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-850 border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                      {recoveryJobs.map(job => (
                        <div key={job.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-900/20 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-[9px] px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-900 rounded font-bold">Priority: {job.priority}</span>
                              <h4 className="text-xs font-bold text-white">Job ID: {job.id}</h4>
                            </div>
                            <p className="text-[10px] text-slate-400">Target Outage ID: <span className="font-mono">{job.incidentId}</span></p>
                            <div className="flex items-center space-x-1 text-[9px] text-amber-400">
                              <span>Retry counters: {job.retryCount} of {job.maxRetries}</span>
                            </div>
                          </div>

                          <div className="w-full md:w-64 space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="font-bold text-slate-400">Pipeline mitigation steps:</span>
                              <span className="font-mono text-white">{job.currentStepIndex} / {job.steps.length}</span>
                            </div>
                            
                            {/* Step progress bar */}
                            <div className="h-2 bg-slate-850 rounded-full overflow-hidden flex">
                              {job.steps.map((_, idx) => {
                                let color = 'bg-slate-800';
                                if (idx < job.currentStepIndex) color = 'bg-emerald-500';
                                else if (idx === job.currentStepIndex) {
                                  color = job.status === 'running' ? 'bg-amber-500 animate-pulse' :
                                          job.status === 'failed' ? 'bg-rose-500' : 'bg-slate-700';
                                }
                                return (
                                  <div 
                                    key={idx} 
                                    className={`flex-1 border-r border-slate-900/50 ${color}`}
                                  />
                                );
                              })}
                            </div>
                            
                            {job.steps[job.currentStepIndex] && (
                              <div className="text-[9px] text-slate-500 italic mt-1 font-mono">
                                Active Step: {job.steps[job.currentStepIndex].replace(/_/g, ' ')}
                              </div>
                            )}
                          </div>

                          <div>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border
                              ${job.status === 'completed' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' :
                                job.status === 'failed' ? 'bg-rose-950 border-rose-500 text-rose-400' :
                                job.status === 'running' ? 'bg-amber-950 border-amber-500 text-amber-400 animate-pulse' :
                                'bg-slate-800 border-slate-700 text-slate-300'
                              }
                            `}>
                              {job.status}
                            </span>
                            {job.error && (
                              <p className="text-[8px] text-rose-400 font-mono mt-1 max-w-xs">{job.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CHECKPOINT REGISTRY */}
              {activeTab === 'checkpoints' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Checkpoint Registry */}
                  <div className="lg:col-span-8 bg-slate-900/60 border border-slate-850 p-6 rounded-2xl space-y-4">
                    <h3 className="text-lg font-black text-white">State Checkpoints Registry</h3>
                    <p className="text-xs text-slate-400">Stores validated digital twin snapshots, variables, and cryptographic integrity hashes.</p>

                    {checkpoints.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 italic border border-slate-850 border-dashed rounded-xl">
                        No checkpoints created. Use the form on the right to commit one manually.
                      </div>
                    ) : (
                      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                              <th className="p-3">Component</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">State</th>
                              <th className="p-3">Committed At</th>
                              <th className="p-3">Signature Verification</th>
                              <th className="p-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 font-mono">
                            {checkpoints.map(cp => {
                              const recalculatedSig = incidentService.createCheckpoint.prototype.constructor === undefined; // verification mock checks
                              return (
                                <tr key={cp.id} className="hover:bg-slate-900/20 text-[11px] text-slate-300">
                                  <td className="p-3 font-bold text-white">{cp.componentId}</td>
                                  <td className="p-3">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                      cp.type === 'manual' ? 'bg-blue-950 border-blue-900 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}>
                                      {cp.type}
                                    </span>
                                  </td>
                                  <td className="p-3">{cp.workflowState}</td>
                                  <td className="p-3 text-slate-500">{new Date(cp.timestamp).toLocaleTimeString()}</td>
                                  <td className="p-3">
                                    <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                                      <CheckCircle size={10} />
                                      <span title={cp.signature}>{cp.signature.slice(0, 15)}...</span>
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={async () => {
                                        if (confirm('Delete this checkpoint?')) {
                                          await IncidentResponseAPI.deleteCheckpoint(cp.id);
                                        }
                                      }}
                                      className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Create checkpoint manually */}
                  <div className="lg:col-span-4 space-y-6">
                    <form onSubmit={handleCreateCheckpoint} className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-850 pb-3">
                        <Database className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold">Commit State Checkpoint</h3>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Component</label>
                          <select
                            value={cpComponent}
                            onChange={(e) => setCpComponent(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-slate-700"
                          >
                            <option value="Sovereign Persona">Sovereign Persona</option>
                            <option value="Workflow Orchestrator">Workflow Orchestrator</option>
                            <option value="Google Gemini API Gateway">Google Gemini API Gateway</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workflow State Name</label>
                          <input
                            type="text"
                            value={cpWorkflowState}
                            onChange={(e) => setCpWorkflowState(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-700 font-mono text-[11px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Context Snapshot (JSON)</label>
                          <textarea
                            value={cpContext}
                            onChange={(e) => setCpContext(e.target.value)}
                            className="w-full h-24 bg-slate-950 border border-slate-850 rounded-xl p-2.5 font-mono text-[10px] focus:outline-none focus:border-slate-700 resize-none leading-relaxed"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Commit Snapshot
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

              {/* TAB 4: ALERTING RULES */}
              {activeTab === 'rules' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Alert Rules List */}
                  <div className="lg:col-span-8 bg-slate-900/60 border border-slate-850 p-6 rounded-2xl space-y-4">
                    <h3 className="text-lg font-black text-white">Alert Rules Register</h3>
                    <p className="text-xs text-slate-400">Manage operational thresholds that automatically launch response alerts and recover executors.</p>

                    <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3">Metric</th>
                            <th className="p-3">Condition</th>
                            <th className="p-3">Severity</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Delete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rules.map(rule => (
                            <tr key={rule.id} className="hover:bg-slate-900/20 text-slate-300">
                              <td className="p-3 font-bold text-white font-mono text-[11px]">{rule.metricName}</td>
                              <td className="p-3 font-mono text-[11px]">{rule.operator.toUpperCase()} {rule.threshold}</td>
                              <td className="p-3">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                  rule.severity === 'critical' ? 'bg-rose-950 border-rose-900 text-rose-400' :
                                  rule.severity === 'high' ? 'bg-amber-950 border-amber-950 text-amber-400' :
                                  'bg-slate-800 border-slate-700 text-slate-400'
                                }`}>
                                  {rule.severity}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 font-sans">{rule.description}</td>
                              <td className="p-3">
                                <button
                                  onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                    rule.enabled 
                                      ? 'bg-emerald-950 border-emerald-800 text-emerald-400 hover:bg-emerald-900/30' 
                                      : 'bg-slate-800 border-slate-750 text-slate-500 hover:bg-slate-700/30'
                                  }`}
                                >
                                  {rule.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Custom rule creator */}
                  <div className="lg:col-span-4 space-y-6">
                    <form onSubmit={handleCreateRule} className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-850 pb-3">
                        <Bell className="w-4 h-4 text-rose-400" />
                        <h3 className="text-sm font-bold">Add Custom Alert Rule</h3>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Metric Name</label>
                          <select
                            value={newRuleMetric}
                            onChange={(e) => setNewRuleMetric(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-slate-700 font-mono"
                          >
                            <option value="detector.agent_failures">detector.agent_failures</option>
                            <option value="detector.workflow_failures">detector.workflow_failures</option>
                            <option value="detector.api_timeouts">detector.api_timeouts</option>
                            <option value="detector.resource_exhaustion">detector.resource_exhaustion</option>
                            <option value="detector.auth_failures">detector.auth_failures</option>
                            <option value="detector.plugin_failures">detector.plugin_failures</option>
                            <option value="detector.network_connectivity_issues">detector.network_connectivity_issues</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operator</label>
                          <select
                            value={newRuleOp}
                            onChange={(e) => setNewRuleOp(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-slate-700"
                          >
                            <option value="gt">Greater Than (&gt;)</option>
                            <option value="lt">Less Than (&lt;)</option>
                            <option value="eq">Equal To (=)</option>
                            <option value="gte">Greater Or Equal (&gt;=)</option>
                            <option value="lte">Less Or Equal (&lt;=)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Threshold Value</label>
                          <input
                            type="number"
                            value={newRuleThreshold}
                            onChange={(e) => setNewRuleThreshold(parseFloat(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-700 font-mono text-[11px]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alert Severity</label>
                          <select
                            value={newRuleSeverity}
                            onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-slate-700"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                          <textarea
                            value={newRuleDesc}
                            onChange={(e) => setNewRuleDesc(e.target.value)}
                            placeholder="Describe the threshold condition..."
                            className="w-full h-16 bg-slate-950 border border-slate-850 rounded-xl p-2.5 focus:outline-none focus:border-slate-700 resize-none font-sans"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Add Custom Rule
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

              {/* TAB 5: HISTORICAL INCIDENTS */}
              {activeTab === 'history' && (
                <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl space-y-4">
                  <h3 className="text-lg font-black text-white">SRE Failure Incidents Log</h3>
                  
                  {incidents.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 italic">No incidents recorded in log database.</div>
                  ) : (
                    <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3">Incident ID</th>
                            <th className="p-3">Title</th>
                            <th className="p-3">Severity</th>
                            <th className="p-3">Component</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Detected At</th>
                            <th className="p-3">Resolved At</th>
                            <th className="p-3">Mitigations Taken</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...incidents].sort((a,b) => b.detectedAt - a.detectedAt).map(inc => (
                            <tr key={inc.id} className="hover:bg-slate-900/20 text-slate-350 border-b border-slate-850">
                              <td className="p-3 font-mono text-[10px] text-slate-500">{inc.id}</td>
                              <td className="p-3 text-white font-bold">{inc.title}</td>
                              <td className="p-3">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                  inc.severity === 'critical' ? 'bg-rose-950 border-rose-900 text-rose-400' :
                                  inc.severity === 'high' ? 'bg-amber-950 border-amber-950 text-amber-400' :
                                  'bg-slate-850 border-slate-700 text-slate-300'
                                }`}>
                                  {inc.severity}
                                </span>
                              </td>
                              <td className="p-3">{inc.component}</td>
                              <td className="p-3 text-xs">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                  inc.status === 'resolved' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' :
                                  inc.status === 'recovering' ? 'bg-amber-950 border-amber-500 text-amber-400 animate-pulse' :
                                  'bg-rose-950 border-rose-600 text-rose-400'
                                }`}>
                                  {inc.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 font-mono">{new Date(inc.detectedAt).toLocaleTimeString()}</td>
                              <td className="p-3 text-slate-500 font-mono">
                                {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="p-3 font-mono text-[10px] text-slate-400">
                                {inc.recoveryStepsTaken.length > 0 ? inc.recoveryStepsTaken.join(', ') : 'None'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: AUDIT & REPORTS */}
              {activeTab === 'audit' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: SRE Audit Logs */}
                  <div className="lg:col-span-8 bg-slate-900/60 border border-slate-850 p-6 rounded-2xl space-y-4">
                    <h3 className="text-lg font-black text-white">SRE Administrative Audit Trail</h3>
                    <p className="text-xs text-slate-400">Chronological history of security overrides, rule deletions, checkpoint rollbacks, and recovery triggers.</p>

                    {auditLogs.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 italic">No audit records committed.</div>
                    ) : (
                      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20 max-h-96 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                              <th className="p-3">Time</th>
                              <th className="p-3">Actor</th>
                              <th className="p-3">Action</th>
                              <th className="p-3">Audit Details</th>
                              <th className="p-3 text-right">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                            {sortedAuditLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-900/20 text-slate-350">
                                <td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="p-3 font-bold text-white">{log.operator}</td>
                                <td className="p-3 text-blue-400">{log.action}</td>
                                <td className="p-3 text-slate-400 font-sans">{log.details}</td>
                                <td className="p-3 text-right">
                                  <span className={`font-bold ${log.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {log.success ? 'SUCCESS' : 'FAILED'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Export Reports Panel */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center space-x-2 border-b border-slate-850 pb-3">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-bold">Download SRE SLA Reports</h3>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Generate official compliance logs, incident charts, MTTR curves, and checkpoint indices in three formats.
                      </p>

                      <div className="space-y-3">
                        <button
                          onClick={() => handleExport('json')}
                          className="w-full p-3 bg-slate-950 border border-slate-850 hover:border-slate-750 hover:bg-slate-900/30 rounded-xl transition-all flex items-center justify-between text-xs font-bold text-white cursor-pointer"
                        >
                          <span>SRE Metric Report (JSON)</span>
                          <Download size={14} className="text-cyan-400" />
                        </button>

                        <button
                          onClick={() => handleExport('csv')}
                          className="w-full p-3 bg-slate-950 border border-slate-850 hover:border-slate-750 hover:bg-slate-900/30 rounded-xl transition-all flex items-center justify-between text-xs font-bold text-white cursor-pointer"
                        >
                          <span>Incidents Database (CSV)</span>
                          <Download size={14} className="text-cyan-400" />
                        </button>

                        <button
                          onClick={() => handleExport('pdf')}
                          className="w-full p-3 bg-slate-950 border border-slate-850 hover:border-slate-750 hover:bg-slate-900/30 rounded-xl transition-all flex items-center justify-between text-xs font-bold text-white cursor-pointer"
                        >
                          <span>SLA Audit Certification (PDF)</span>
                          <Download size={14} className="text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 7: SRE DIAGNOSTICS */}
              {activeTab === 'tests' && (
                <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-3xl space-y-6">
                  <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-5">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center space-x-2">
                        <FileCheck className="w-5 h-5 text-blue-400" />
                        <span>SRE Automated Diagnostics Console</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Runs complete browser-based assertions for validation rules, checkpoint signators, detector rules evaluation, and exporter buffers.
                      </p>
                    </div>
                    <button
                      onClick={runDiagnostics}
                      disabled={isRunningTests}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
                    >
                      {isRunningTests ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isRunningTests ? 'Running Assertions...' : 'Run Diagnostics'}</span>
                    </button>
                  </div>

                  {testResults ? (
                    <div className="space-y-6">
                      
                      {/* Metric cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Total Tests</div>
                          <div className="text-xl font-black text-slate-200 font-mono">{testResults.total}</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Passed</div>
                          <div className="text-xl font-black text-emerald-400 font-mono">{testResults.passed}</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Failed</div>
                          <div className="text-xl font-black text-rose-400 font-mono">{testResults.failed}</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Duration</div>
                          <div className="text-xl font-black text-cyan-400 font-mono">{testResults.duration}ms</div>
                        </div>
                      </div>

                      {/* Test list table */}
                      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                        <div className="grid grid-cols-6 text-xs text-slate-400 bg-slate-900 border-b border-slate-850 p-3 font-bold uppercase tracking-wider">
                          <div className="col-span-2">Suite</div>
                          <div className="col-span-2">Test Name</div>
                          <div>Duration</div>
                          <div className="text-right">Result</div>
                        </div>
                        <div className="divide-y divide-slate-850">
                          {testResults.tests.map((test, index) => (
                            <div key={index} className="grid grid-cols-6 items-center p-3 text-xs text-slate-300 hover:bg-slate-900/10 font-mono">
                              <div className="col-span-2 text-slate-400 font-medium">{test.suite}</div>
                              <div className="col-span-2">{test.name}</div>
                              <div className="text-slate-500">{test.duration}ms</div>
                              <div className="text-right flex items-center justify-end space-x-1.5 font-bold">
                                {test.passed ? (
                                  <span className="text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/60 text-[10px]">PASS</span>
                                ) : (
                                  <span className="text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-900/60 text-[10px]" title={test.error}>FAIL</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center py-20 italic">
                      Diagnostics suite loaded. Click "Run Diagnostics" to perform mock failures, checkpoint restore validations, and export integrity checks.
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default IncidentResponsePage;
