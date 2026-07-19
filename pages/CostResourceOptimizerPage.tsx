import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Cpu, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Check, 
  Download, 
  Play, 
  Database, 
  Zap, 
  Activity, 
  FileText, 
  ShieldAlert, 
  Clock, 
  RefreshCw 
} from 'lucide-react';
import { mockCostOptimizerService } from '../core/cost-optimizer/services/CostOptimizerService';
import { CostOptimizerAPI } from '../core/cost-optimizer/api/CostOptimizerAPI';
import { CostOptimizerTestSuite, SuiteResults } from '../core/cost-optimizer/__tests__/cost-optimizer.test';
import { Budget, ScheduledJob, AlertRule, AlertNotification } from '../core/cost-optimizer/types';

const CostResourceOptimizerPage: React.FC = () => {
  const [api] = useState(() => new CostOptimizerAPI(mockCostOptimizerService));
  const [role, setRole] = useState<'admin' | 'finops' | 'viewer'>('admin');
  
  // Dashboard states
  const [summary, setSummary] = useState<any>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Telemetry Snapshot
  const [liveResources, setLiveResources] = useState<any>(null);
  
  // Forms & Inputs
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState(250);
  const [newBudgetType, setNewBudgetType] = useState<'daily' | 'weekly' | 'monthly' | 'project' | 'department'>('monthly');
  const [newBudgetOwner, setNewBudgetOwner] = useState('admin');
  const [newBudgetThresholds, setNewBudgetThresholds] = useState('0.8, 1.0');
  const [newBudgetProject, setNewBudgetProject] = useState('');
  
  // Test states
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state from APIs
  const refreshData = () => {
    try {
      const summaryData = api.getCostSummaryData();
      const currentBudgets = api.getBudgets(role);
      const currentRecs = api.getRecommendations();
      const currentJobs = api.getScheduledJobs();
      const currentRules = api.getAlertRules();
      const currentAlerts = api.getAlerts();
      const logs = api.getAuditLogs();

      // Collect current snapshot
      const activeSnapshot = mockCostOptimizerService.monitor.collectResourceMetrics();

      setSummary(summaryData);
      setBudgets(currentBudgets);
      setRecs(currentRecs);
      setJobs(currentJobs);
      setRules(currentRules);
      setAlerts(currentAlerts);
      setAuditLogs(logs);
      setLiveResources(activeSnapshot);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Set polling interval for live resource updates (every 2.5s)
    const interval = setInterval(() => {
      try {
        const activeSnapshot = mockCostOptimizerService.monitor.collectResourceMetrics();
        setLiveResources(activeSnapshot);
        
        // Evaluate alerts dynamically on metric arrivals
        const newAlerts = mockCostOptimizerService.alerts.evaluateResourceMetrics(activeSnapshot);
        if (newAlerts.length > 0) {
          setAlerts(api.getAlerts());
        }

        // Keep budgets status synced
        const currentBudgets = api.getBudgets(role);
        setBudgets(currentBudgets);
      } catch (e) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [role]);

  // Simulate usage triggers
  const handleSimulateInvocation = (model: string) => {
    try {
      // Simulate input/output token counts
      const input = 500 + Math.floor(Math.random() * 8000);
      const output = 200 + Math.floor(Math.random() * 3000);
      
      const record = mockCostOptimizerService.monitor.recordInvocation(
        model, 
        input, 
        output, 
        'user-sim', 
        'marketplace.rag.searcher', 
        'wf-simulated'
      );

      // Perform budget evaluations and generate alerts if breached
      const budgetsToEvaluate = mockCostOptimizerService.repository.getBudgets();
      budgetsToEvaluate.forEach(b => {
        const newlyBreached = mockCostOptimizerService.budgeting.checkThresholdBreaches(b);
        if (newlyBreached.length > 0) {
          mockCostOptimizerService.alerts.evaluateBudgetStatus(b, newlyBreached);
        }
      });

      setSuccessMsg(`Simulated ${model} call: input=${input}, output=${output}. Estimated charge: $${record.calculatedCost}`);
      refreshData();

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Add Budget
  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const thresholds = newBudgetThresholds.split(',').map(t => parseFloat(t.trim()));
      const budgetPayload: Partial<Budget> = {
        name: newBudgetName,
        type: newBudgetType,
        limit: Number(newBudgetLimit),
        ownerId: newBudgetOwner,
        alertThresholds: thresholds,
        targetId: newBudgetProject || undefined,
        currentSpent: 0
      };

      const result = api.createBudget(budgetPayload, role);
      if (result.success) {
        setSuccessMsg('Budget created successfully.');
        setNewBudgetName('');
        refreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(result.errors.join(', '));
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Delete Budget
  const handleDeleteBudget = (id: string) => {
    try {
      const result = api.deleteBudget(id, role);
      if (result.success) {
        setSuccessMsg('Budget deleted successfully.');
        refreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(result.errors.join(', '));
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Apply Recommendations
  const handleApplyRec = (id: string) => {
    try {
      const success = api.applyRecommendation(id);
      if (success) {
        setSuccessMsg('Optimization recommendation applied successfully.');
        refreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Exporters
  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    try {
      const report = api.exportData(format);
      
      const blob = new Blob([report.content], { type: report.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', report.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMsg(`Downloaded report: ${report.fileName}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      refreshData();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Clear Alerts
  const handleClearAlerts = () => {
    try {
      api.clearAllAlerts();
      setSuccessMsg('All alert notifications cleared.');
      refreshData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Run Diagnostics Suite
  const handleRunDiagnostics = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await CostOptimizerTestSuite.runTests();
      setTestResults(results);
      refreshData();
    } catch (e: any) {
      setErrorMsg(`Diagnostics failed: ${e.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="animate-spin text-blue-500" size={40} />
          <h2 className="text-xl font-bold text-gray-300">Initializing Optimization Center Telemetry...</h2>
          <div className="w-64 bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-purple-900/20 to-gray-950 border border-blue-500/30 rounded-xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-blue-400" size={28} />
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-blue-400 bg-clip-text text-transparent">
              AI Cost & Resource Optimization Center
            </h1>
          </div>
          <p className="text-gray-400 mt-2 text-sm max-w-2xl">
            Real-time token cost allocation, hardware utilization monitoring, carbon-aware cluster optimization, and automated FinOps budget controls.
          </p>
        </div>

        {/* User Role Selector */}
        <div className="flex items-center space-x-2 bg-gray-900/80 border border-gray-700 rounded-lg p-2 self-start md:self-auto">
          <span className="text-xs text-gray-400 px-2 uppercase font-semibold">FinOps Role:</span>
          {(['admin', 'finops', 'viewer'] as const).map((r) => (
            <button
              key={r}
              id={`role-btn-${r}`}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                role === r ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              onClick={() => setRole(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications / Toast */}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-start space-x-3 text-sm animate-pulse">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-950/60 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6 flex items-start space-x-3 text-sm">
          <Check className="text-green-400 shrink-0 mt-0.5" size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-900/60 border border-gray-800 hover:border-blue-500/40 rounded-xl p-5 transition-all shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400 uppercase font-semibold">Total Spent (30 Days)</span>
            <DollarSign className="text-blue-500" size={18} />
          </div>
          <div className="text-3xl font-bold">${summary?.totalSpent30Days?.toFixed(2) || '0.00'}</div>
          <div className="text-xs text-green-400 flex items-center mt-2">
            <TrendingUp size={12} className="mr-1" />
            <span>Projected: ${summary?.forecast?.projectedCost?.toFixed(2)} next week</span>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 hover:border-purple-500/40 rounded-xl p-5 transition-all shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400 uppercase font-semibold">Active Budgets</span>
            <Database className="text-purple-500" size={18} />
          </div>
          <div className="text-3xl font-bold">{budgets.length}</div>
          <p className="text-xs text-gray-400 mt-2">
            Remaining average: {((budgets[0]?.limit - budgets[0]?.currentSpent) || 0) > 0 ? `$${(budgets[0].limit - budgets[0].currentSpent).toFixed(1)} left` : 'No limits breached'}
          </p>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 hover:border-green-500/40 rounded-xl p-5 transition-all shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400 uppercase font-semibold">Carbon Offset Saving</span>
            <Zap className="text-green-500" size={18} />
          </div>
          <div className="text-3xl font-bold">{summary?.roi?.totalSavingsUsd ? (summary.roi.totalSavingsUsd * 0.385).toFixed(1) : '0.0'} kg</div>
          <div className="text-xs text-green-400 mt-2">
            Renewable power optimizer aligned
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 hover:border-yellow-500/40 rounded-xl p-5 transition-all shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400 uppercase font-semibold">Pending Savings</span>
            <AlertTriangle className="text-yellow-500" size={18} />
          </div>
          <div className="text-3xl font-bold">${summary?.roi?.potentialSavingsRemainingUsd || '0.00'}</div>
          <p className="text-xs text-yellow-500/80 mt-2 font-medium">
            {recs.filter(r => !r.applied).length} actionable optimization advices
          </p>
        </div>
      </div>

      {/* Main Sections grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Telemetry & Invocations */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Live Telemetry View */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <Activity className="text-blue-500" size={20} />
                <h2 className="text-lg font-bold">Hardware Resource Utilization snap (Live)</h2>
              </div>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            </div>

            {liveResources ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">CPU Load</div>
                  <div className="text-2xl font-extrabold text-blue-400">{liveResources.cpuUtilization}%</div>
                  <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${liveResources.cpuUtilization}%` }} />
                  </div>
                </div>

                <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">GPU Compute</div>
                  <div className="text-2xl font-extrabold text-purple-400">{liveResources.gpuUtilization}%</div>
                  <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${liveResources.gpuUtilization}%` }} />
                  </div>
                </div>

                <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">Memory (Orchestration)</div>
                  <div className="text-2xl font-extrabold text-yellow-400">{liveResources.memoryUsageMb} MB</div>
                  <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full" style={{ width: `${Math.min(100, (liveResources.memoryUsageMb/4096)*100)}%` }} />
                  </div>
                </div>

                <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">Disk Allocation</div>
                  <div className="text-2xl font-extrabold text-green-400">{liveResources.diskUsageGb} GB</div>
                </div>

                <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">Concurrency</div>
                  <div className="text-2xl font-extrabold text-indigo-400">{liveResources.concurrentExecutions} tasks</div>
                </div>

                <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase font-medium mb-1">Energy Draw</div>
                  <div className="text-2xl font-extrabold text-pink-400">{liveResources.energyConsumptionKwh.toFixed(3)} KWh</div>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-500">Connecting to telemetry streams...</div>
            )}

            {/* Simulated execution trigger */}
            <div className="mt-6 border-t border-gray-800/80 pt-6">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Simulate LLM Telemetry Invocations (Generate Cost)</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  id="sim-pro-btn"
                  className="px-4 py-2 bg-blue-900/60 hover:bg-blue-800 text-blue-300 border border-blue-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                  onClick={() => handleSimulateInvocation('gemini-2.5-pro')}
                >
                  <Play size={12} />
                  <span>Call Gemini Pro</span>
                </button>
                <button
                  id="sim-flash-btn"
                  className="px-4 py-2 bg-purple-900/60 hover:bg-purple-800 text-purple-300 border border-purple-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                  onClick={() => handleSimulateInvocation('gemini-2.5-flash')}
                >
                  <Play size={12} />
                  <span>Call Gemini Flash</span>
                </button>
                <button
                  id="sim-gemma-btn"
                  className="px-4 py-2 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 border border-indigo-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                  onClick={() => handleSimulateInvocation('gemma-2b-it')}
                >
                  <Play size={12} />
                  <span>Call Gemma (Edge Node)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Budgets Management Dashboard */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <Database className="text-purple-400" size={20} />
              <span>FinOps Budget Allocations</span>
            </h2>

            {/* List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase font-semibold">
                    <th className="py-3 px-2">Budget Name</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-2">Spent / Cap</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-sm">
                  {budgets.map(b => {
                    const ratio = b.currentSpent / b.limit;
                    const spentPercent = Math.round(ratio * 100);
                    let statusLabel = 'Healthy';
                    let statusClass = 'text-green-400 bg-green-950/40 border-green-800/40';
                    if (ratio >= 1.0) {
                      statusLabel = 'Breached';
                      statusClass = 'text-red-400 bg-red-950/40 border-red-800/40';
                    } else if (ratio >= 0.8) {
                      statusLabel = 'Warning';
                      statusClass = 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40';
                    }

                    return (
                      <tr key={b.id} className="hover:bg-gray-800/20">
                        <td className="py-4 px-2 font-medium">{b.name}</td>
                        <td className="py-4 px-2 capitalize text-xs text-gray-400">{b.type}</td>
                        <td className="py-4 px-2">
                          <div className="flex flex-col w-36">
                            <span className="font-semibold text-xs">${b.currentSpent.toFixed(2)} / $${b.limit}</span>
                            <div className="w-full bg-gray-850 h-1.5 rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full ${ratio >= 1.0 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, spentPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <button
                            id={`del-budget-${b.id}`}
                            className="p-1 hover:text-red-400 hover:bg-gray-850 rounded transition-all inline-flex"
                            onClick={() => handleDeleteBudget(b.id)}
                            title="Delete budget allocation"
                            disabled={role === 'viewer'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Create Budget Form */}
            <div className="mt-8 border-t border-gray-850 pt-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center space-x-2">
                <Plus size={16} className="text-blue-400" />
                <span>Configure New Budget Allocation</span>
              </h3>
              <form onSubmit={handleAddBudget} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Budget Name *</label>
                  <input
                    id="budget-name-input"
                    type="text"
                    required
                    placeholder="e.g. Fine-Tuning Sandbox"
                    className="w-full bg-gray-950 border border-gray-850 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={newBudgetName}
                    onChange={(e) => setNewBudgetName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Spending Cap (USD) *</label>
                  <input
                    id="budget-limit-input"
                    type="number"
                    required
                    min={1}
                    className="w-full bg-gray-950 border border-gray-850 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={newBudgetLimit}
                    onChange={(e) => setNewBudgetLimit(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Budget Interval *</label>
                  <select
                    id="budget-type-select"
                    className="w-full bg-gray-950 border border-gray-850 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={newBudgetType}
                    onChange={(e) => setNewBudgetType(e.target.value as any)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="project">Project Bound</option>
                    <option value="department">Department Bound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Alert Thresholds (ratio csv)</label>
                  <input
                    id="budget-thresholds-input"
                    type="text"
                    placeholder="0.5, 0.8, 1.0"
                    className="w-full bg-gray-950 border border-gray-850 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={newBudgetThresholds}
                    onChange={(e) => setNewBudgetThresholds(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Project / Dept ID</label>
                  <input
                    id="budget-project-input"
                    type="text"
                    placeholder="e.g. marketplace"
                    className="w-full bg-gray-950 border border-gray-850 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={newBudgetProject}
                    onChange={(e) => setNewBudgetProject(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    id="create-budget-btn"
                    type="submit"
                    className="w-full py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                    disabled={role === 'viewer'}
                  >
                    <Plus size={14} />
                    <span>Authorize & Create</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Model Utilization Efficiency Breakdown */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <TrendingUp className="text-blue-400" size={20} />
              <span>Model Utilization & Token Efficiency metrics</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {summary?.modelEfficiency?.map((m: any) => (
                <div key={m.modelName} className="bg-gray-950 p-4 border border-gray-850 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-sm text-gray-200">{m.modelName}</span>
                    <span className="text-xs text-blue-400 font-semibold">{m.totalInvocations} calls</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                    <div>
                      <div>Total Surcharged Spent:</div>
                      <div className="text-white font-bold text-base mt-0.5">${m.totalCost.toFixed(4)}</div>
                    </div>
                    <div>
                      <div>Cost / 1M Tokens:</div>
                      <div className="text-white font-bold text-base mt-0.5">${m.costPerMillionTokens.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Optimization Recommendations, Reports, Test Suite */}
        <div className="space-y-8">
          
          {/* Optimization Engine recommendations */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Zap className="text-yellow-400" size={20} />
              <span>Optimization Recommendations</span>
            </h2>
            
            <div className="space-y-4">
              {recs.map(r => (
                <div 
                  key={r.id} 
                  className={`border rounded-lg p-4 transition-all ${
                    r.applied 
                      ? 'bg-green-950/20 border-green-500/30' 
                      : 'bg-gray-950 border-gray-850 hover:border-yellow-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      r.applied ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                    }`}>
                      {r.applied ? 'Applied' : `${r.impactLevel} Impact`}
                    </span>
                    <span className="text-xs text-green-400 font-bold">${r.potentialSavingsUsd.toFixed(2)} saved</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">{r.title}</h4>
                  <p className="text-xs text-gray-400 mb-3">{r.description}</p>
                  
                  {!r.applied && (
                    <button
                      id={`apply-rec-${r.id}`}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-[11px] font-semibold flex items-center space-x-1 transition-all"
                      onClick={() => handleApplyRec(r.id)}
                    >
                      <Check size={12} />
                      <span>Execute Optimization</span>
                    </button>
                  )}
                </div>
              ))}
              {recs.length === 0 && (
                <div className="text-gray-500 text-xs py-4 text-center">No optimization advisories active.</div>
              )}
            </div>
          </div>

          {/* Reporting Panel */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <FileText className="text-blue-400" size={20} />
              <span>Financial Reports & Export Center</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Compile infrastructure spending profiles and download audits.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="export-json-btn"
                className="py-2 bg-gray-850 hover:bg-gray-800 text-white border border-gray-700 rounded-lg text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all"
                onClick={() => handleExport('json')}
              >
                <Download size={14} />
                <span>JSON</span>
              </button>
              <button
                id="export-csv-btn"
                className="py-2 bg-gray-850 hover:bg-gray-800 text-white border border-gray-700 rounded-lg text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all"
                onClick={() => handleExport('csv')}
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
              <button
                id="export-pdf-btn"
                className="py-2 bg-gray-850 hover:bg-gray-800 text-white border border-gray-700 rounded-lg text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all"
                onClick={() => handleExport('pdf')}
              >
                <FileText size={14} />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Alerts & Threshold Notifications */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <ShieldAlert className="text-red-400" size={20} />
                <span>Alerts Notification History</span>
              </h2>
              {alerts.length > 0 && (
                <button
                  id="clear-alerts-btn"
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                  onClick={handleClearAlerts}
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {alerts.map(a => (
                <div 
                  key={a.id} 
                  className={`p-3 border rounded-lg text-xs flex items-start space-x-2 bg-gray-950 ${
                    a.severity === 'critical' ? 'border-red-900/80 text-red-200' : 'border-yellow-900/80 text-yellow-200'
                  }`}
                >
                  <AlertTriangle className={a.severity === 'critical' ? 'text-red-400 shrink-0 mt-0.5' : 'text-yellow-400 shrink-0 mt-0.5'} size={15} />
                  <div>
                    <h5 className="font-bold">{a.title}</h5>
                    <p className="text-[11px] text-gray-400 mt-1">{a.message}</p>
                    <span className="text-[9px] text-gray-500 mt-1 block">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-gray-500 text-xs py-4 text-center">No alert violations triggered.</div>
              )}
            </div>
          </div>

          {/* Developer Verification diagnostics */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Clock className="text-indigo-400" size={20} />
              <span>Developer Diagnostics Suite</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Execute unit and integration tests programmatically directly in the sandbox context.
            </p>
            <button
              id="run-diagnostics-btn"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
              onClick={handleRunDiagnostics}
              disabled={isRunningTests}
            >
              {isRunningTests ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
              <span>{isRunningTests ? 'Running Checks...' : 'Execute Test suite'}</span>
            </button>

            {testResults && (
              <div className="mt-4 bg-gray-950 p-4 border border-gray-850 rounded-lg text-xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold">Test Run Results:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    testResults.failed > 0 ? 'bg-red-950 text-red-400' : 'bg-green-950 text-green-400'
                  }`}>
                    {testResults.failed > 0 ? `${testResults.failed} Failed` : 'All Passed'}
                  </span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto text-[11px] divide-y divide-gray-850">
                  {testResults.tests.map((t, idx) => (
                    <div key={idx} className="py-1 flex justify-between">
                      <span className="text-gray-400">{t.suite} &rsaquo; <span className="text-white">{t.name}</span></span>
                      <span className={t.passed ? 'text-green-400' : 'text-red-400'}>
                        {t.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostResourceOptimizerPage;
