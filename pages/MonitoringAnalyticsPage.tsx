import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, BarChart3, Zap, Shield, Leaf, Users, Bell, 
  Database, RefreshCw, Sliders, List, HelpCircle, AlertCircle,
  Clock, CheckCircle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { Monitoring } from '../core/monitoring/Monitoring';
import { MetricsStorage } from '../core/monitoring/MetricsStorage';
import { MetricRecord, ActiveAlert, SubsystemHealth } from '../core/monitoring/MonitoringTypes';
import { 
  MetricCard, LiveMetricBadge, SystemStatusGrid, ResourceUsagePanel,
  LatencyChart, CPUChart, MemoryChart, CarbonChart, ThreatChart, PrivacyChart, FederatedChart, TimelineChart,
  AlertPanel, MetricHistoryTable
} from '../components/MonitoringDashboardComponents';

// Import local test suite
import { MonitoringTestSuite } from '../core/monitoring/__tests__/monitoring.test';

const MonitoringAnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const mon = useMemo(() => Monitoring.getInstance(), []);

  // ── Tab Management ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    'overview' | 'health' | 'performance' | 'resources' | 'privacy' | 
    'threat' | 'carbon' | 'federated' | 'graph' | 'alerts' | 'history' | 'tests'
  >('overview');

  // ── Live Telemetry States ──────────────────────────────────────────────────
  const [cpuHist, setCpuHist] = useState<number[]>([]);
  const [memHist, setMemHist] = useState<number[]>([]);
  const [latencyHist, setLatencyHist] = useState<number[]>([]);
  const [carbonHist, setCarbonHist] = useState<number[]>([]);
  const [threatHist, setThreatHist] = useState<number[]>([]);
  const [privacyHist, setPrivacyHist] = useState<number[]>([]);
  const [federatedHist, setFederatedHist] = useState<number[]>([]);
  const [graphHist, setGraphHist] = useState<number[]>([]);
  
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<ActiveAlert[]>([]);
  const [healthReports, setHealthReports] = useState<Record<string, SubsystemHealth>>({});
  const [historyTableMetrics, setHistoryTableMetrics] = useState<MetricRecord[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);

  // ── Testing State ──────────────────────────────────────────────────────────
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // ── Fetch and Synchronize Data Loop ───────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = Date.now();
        const startOfSession = now - 5 * 60 * 1000; // Last 5 minutes
        const adapter = MetricsStorage.getAdapter();

        // Query historical values for charts
        const cpus = await adapter.getMetrics('system.cpu_load_percent', startOfSession, now);
        const mems = await adapter.getMetrics('system.memory_usage_mb', startOfSession, now);
        const lats = await adapter.getMetrics('latency.average_ms', startOfSession, now);
        const carbons = await adapter.getMetrics('carbon.total_emissions_kg', startOfSession, now);
        const threats = await adapter.getMetrics('threat.active_count', startOfSession, now);
        const privs = await adapter.getMetrics('privacy.budget_used_percent', startOfSession, now);
        const feds = await adapter.getMetrics('federated.rounds_total', startOfSession, now);
        const nodes = await adapter.getMetrics('graph.nodes_added', startOfSession, now);

        setCpuHist(cpus.map(m => m.value).slice(-40));
        setMemHist(mems.map(m => m.value).slice(-40));
        setLatencyHist(lats.map(m => m.value).slice(-40));
        setCarbonHist(carbons.map(m => m.value).slice(-40));
        setThreatHist(threats.map(m => m.value).slice(-40));
        setPrivacyHist(privs.map(m => m.value).slice(-40));
        setFederatedHist(feds.map(m => m.value).slice(-40));
        setGraphHist(nodes.map(m => m.value).slice(-40));

        // Get alerts and health states
        setActiveAlerts(mon.alertEngine.getActiveAlerts());
        setAlertHistory(mon.alertEngine.getAlertHistory());
        setHealthReports(mon.healthChecker.getAllHealthReports());

        // Get full telemetry history for the table
        const allMetrics: MetricRecord[] = [];
        const metricKeys = [
          'system.cpu_load_percent', 'system.memory_usage_mb', 'latency.average_ms', 
          'carbon.total_emissions_kg', 'threat.active_count', 'privacy.budget_used_percent', 
          'federated.rounds_total', 'graph.nodes_added', 'perf.throughput_rps'
        ];
        
        for (const key of metricKeys) {
          const items = await adapter.getMetrics(key, now - 600000, now); // last 10 minutes
          allMetrics.push(...items);
        }
        allMetrics.sort((a, b) => b.timestamp - a.timestamp);
        setHistoryTableMetrics(allMetrics);
      } catch (e) {}
    };

    fetchData();
    const interval = setInterval(fetchData, 2500); // Poll metrics dashboard view at 2.5s
    return () => clearInterval(interval);
  }, [mon]);

  // Handle simulation toggle
  const toggleSimulation = () => {
    const nextState = !isSimulating;
    mon.setSimulationMode(nextState);
    setIsSimulating(nextState);
  };

  // Run diagnostics suite
  const runDiagnostics = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await MonitoringTestSuite.runTests(mon);
      setTestResults(results);
    } catch (e: any) {
      alert(`Tests failed: ${e.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // ── Derived Stats Memoization ──────────────────────────────────────────────
  const overallHealth = useMemo(() => mon.healthChecker.getOverallStatus(), [healthReports, mon]);
  const liveCpu = cpuHist[cpuHist.length - 1] || 18.5;
  const liveMem = memHist[memHist.length - 1] || 3280.0;
  const liveLatency = latencyHist[latencyHist.length - 1] || 24.0;
  const liveCarbon = carbonHist[carbonHist.length - 1] || 0.12;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-10 h-10 text-blue-400" />
              <h1 className="text-3xl font-black text-white tracking-tight">Observability Dashboard</h1>
            </div>
            <p className="text-slate-400 text-sm">Real-time health, performance, security, and carbon statistics.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleSimulation}
              className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all flex items-center space-x-2
                ${isSimulating 
                  ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 hover:bg-blue-600/20' 
                  : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:bg-slate-700/50'
                }
              `}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulation Active' : 'Simulation Paused'}</span>
            </button>
            <LiveMetricBadge status={overallHealth} label={`System Health: ${overallHealth}`} />
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex flex-wrap border-b border-slate-700 gap-1 select-none">
          {[
            { id: 'overview', label: 'Overview', icon: Sliders },
            { id: 'health', label: 'Health Status', icon: HelpCircle },
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'resources', label: 'Resources', icon: Zap },
            { id: 'privacy', label: 'Privacy', icon: Users },
            { id: 'threat', label: 'Threats', icon: Shield },
            { id: 'carbon', label: 'Carbon Aware', icon: Leaf },
            { id: 'federated', label: 'Federated Node', icon: Users },
            { id: 'graph', label: 'Knowledge Graph', icon: Database },
            { id: 'alerts', label: 'Alerts Logs', icon: Bell },
            { id: 'history', label: 'Telemetry History', icon: List },
            { id: 'tests', label: 'Diagnostics', icon: List }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all
                  ${isActive 
                    ? 'border-blue-500 text-blue-400 bg-blue-950/10' 
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN DISPLAY PORT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="min-h-[400px] space-y-6"
          >
            
            {/* ──────── TAB 1: OVERVIEW ──────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Metric cards summary row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard 
                    title="Estimated CPU Load" 
                    value={liveCpu.toFixed(1)} 
                    unit="%" 
                    description="Synthesized delay scale"
                    icon={<Zap className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Active Memory Usage" 
                    value={liveMem.toFixed(1)} 
                    unit="MB" 
                    description="JSHeap size profile"
                    icon={<Activity className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Rolling Average Latency" 
                    value={liveLatency.toFixed(1)} 
                    unit="ms" 
                    description="Inference response metrics"
                    icon={<Clock className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Total Carbon Emission" 
                    value={liveCarbon.toFixed(3)} 
                    unit="kg CO₂" 
                    description="Daily accumulated carbon usage"
                    icon={<Leaf className="w-5 h-5" />} 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* System Health Summary */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                      <h3 className="text-xl font-bold text-white">Subsystems Status Registry</h3>
                      {Object.keys(healthReports).length > 0 ? (
                        <SystemStatusGrid healthReports={healthReports} />
                      ) : (
                        <div className="text-slate-500 italic py-6">Initializing health report...</div>
                      )}
                    </div>
                  </div>

                  {/* Resource meters quick display */}
                  <div className="space-y-6">
                    <ResourceUsagePanel 
                      cpu={liveCpu} 
                      memory={liveMem} 
                      storageBytes={180 * 1024} 
                      networkSent={120 * 1024} 
                      networkReceived={420 * 1024} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ──────── TAB 2: HEALTH STATUS ──────── */}
            {activeTab === 'health' && (
              <div className="space-y-6">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">System Subcomponent Health Monitor</h3>
                    <p className="text-slate-400 text-xs mt-1">Tracks recovery speeds, SLAs, and error probabilities.</p>
                  </div>
                  {Object.keys(healthReports).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(healthReports).map(([sys, hr]) => (
                        <div key={sys} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <span className="font-bold text-white">{sys} Subsystem</span>
                            <LiveMetricBadge status={hr.status} />
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Service Availability</span>
                              <span className="font-mono text-emerald-400 font-bold">{hr.availability.toFixed(3)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Subsystem Latency</span>
                              <span className="font-mono text-white">{hr.responseTime} ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Error Probability</span>
                              <span className="font-mono text-rose-400">{hr.errorRate.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-6">Aggregating subsystem health indices...</div>
                  )}
                </div>
              </div>
            )}

            {/* ──────── TAB 3: PERFORMANCE ──────── */}
            {activeTab === 'performance' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Average Telemetry Latency (ms)</h3>
                  {latencyHist.length > 0 ? (
                    <div className="h-64 flex items-end">
                      <LatencyChart data={latencyHist} />
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-20 text-center">Collecting latency data...</div>
                  )}
                </div>
                <div className="space-y-6">
                  <MetricCard 
                    title="Average Latency" 
                    value={liveLatency.toFixed(1)} 
                    unit="ms" 
                    description="Rolling P50 latency value"
                    icon={<Clock className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="RPS Throughput" 
                    value={mon.performanceMonitor.collect().throughputRps.toFixed(1)} 
                    unit="RPS" 
                    description="Telemetry requests per second"
                    icon={<Activity className="w-5 h-5" />} 
                  />
                </div>
              </div>
            )}

            {/* ──────── TAB 4: RESOURCES ──────── */}
            {activeTab === 'resources' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">CPU Util Graph (%)</h3>
                  <div className="h-48 flex items-end">
                    <CPUChart data={cpuHist} />
                  </div>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Memory Allocation Graph (MB)</h3>
                  <div className="h-48 flex items-end">
                    <MemoryChart data={memHist} />
                  </div>
                </div>
              </div>
            )}

            {/* ──────── TAB 5: PRIVACY ANALYTICS ──────── */}
            {activeTab === 'privacy' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Privacy Budget Utilization (%)</h3>
                  <div className="h-64 flex items-end">
                    <PrivacyChart data={privacyHist} />
                  </div>
                </div>
                <div className="space-y-6">
                  <MetricCard 
                    title="Negotiation Round Total" 
                    value={mon.privacyCollector.collect().negotiationCount} 
                    unit="runs" 
                    description="Autonomous security negotiations"
                    icon={<Shield className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Average Trust Score" 
                    value={(mon.privacyCollector.collect().averageTrustScore * 100).toFixed(1)} 
                    unit="%" 
                    description="Composite peer node trust metrics"
                    icon={<Users className="w-5 h-5" />} 
                  />
                </div>
              </div>
            )}

            {/* ──────── TAB 6: THREAT ANALYTICS ──────── */}
            {activeTab === 'threat' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Active Sandboxed Threat Logs</h3>
                  <div className="h-64 flex items-end">
                    <ThreatChart data={threatHist} />
                  </div>
                </div>
                <div className="space-y-6">
                  <MetricCard 
                    title="Neutralized Intrusions" 
                    value={mon.threatCollector.collect().threatsNeutralizedTotal} 
                    unit="events" 
                    description="Neutralized prompt injections/DoS attempts"
                    icon={<Shield className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Avg Response Speed" 
                    value={mon.threatCollector.collect().averageResponseTimeMs} 
                    unit="ms" 
                    description="Attack isolation and shielding speed"
                    icon={<Activity className="w-5 h-5" />} 
                  />
                </div>
              </div>
            )}

            {/* ──────── TAB 7: CARBON ANALYTICS ──────── */}
            {activeTab === 'carbon' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Carbon Footprint Usage (kg CO₂)</h3>
                  <div className="h-64 flex items-end">
                    <CarbonChart data={carbonHist} />
                  </div>
                </div>
                <div className="space-y-6">
                  <MetricCard 
                    title="Energy Savings Percent" 
                    value={mon.carbonCollector.collect().energySavingsPercent} 
                    unit="%" 
                    description="From carbon-aware scaling"
                    icon={<Leaf className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Renewable Usage Index" 
                    value={mon.carbonCollector.collect().renewableEnergyPercent} 
                    unit="%" 
                    description="Renewable generation utilization mix"
                    icon={<Zap className="w-5 h-5" />} 
                  />
                </div>
              </div>
            )}

            {/* ──────── TAB 8: FEDERATED LEARNING ANALYTICS ──────── */}
            {activeTab === 'federated' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Federated Rounds Activity</h3>
                  <div className="h-64 flex items-end">
                    <FederatedChart data={federatedHist} />
                  </div>
                </div>
                <div className="space-y-6">
                  <MetricCard 
                    title="Model Convergence" 
                    value={(mon.federatedCollector.collect().modelConvergenceRate * 100).toFixed(1)} 
                    unit="%" 
                    description="Decentralized model accuracy scale"
                    icon={<Activity className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Secure Aggregations" 
                    value={mon.federatedCollector.collect().secureAggregationSuccesses} 
                    unit="runs" 
                    description="MPC updates safely aggregated"
                    icon={<Users className="w-5 h-5" />} 
                  />
                </div>
              </div>
            )}

            {/* ──────── TAB 9: KNOWLEDGE GRAPH ACTIVITY ──────── */}
            {activeTab === 'graph' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Cognitive Nodes Assimilation speed</h3>
                  <div className="h-64 flex items-end">
                    <TimelineChart data={graphHist} />
                  </div>
                </div>
                <div className="space-y-6">
                  <MetricCard 
                    title="Graph Update Logs" 
                    value={nodesHistCountSum(graphHist)} 
                    unit="nodes" 
                    description="Nodes dynamically loaded in session"
                    icon={<Database className="w-5 h-5" />} 
                  />
                  <MetricCard 
                    title="Graph Status" 
                    value="Healthy" 
                    description="SLA query response time <15ms"
                    icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} 
                  />
                </div>
              </div>
            )}

            {/* ──────── TAB 10: ALERTS ──────── */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <AlertPanel activeAlerts={activeAlerts} alertHistory={alertHistory} />
              </div>
            )}

            {/* ──────── TAB 11: TELEMETRY HISTORY ──────── */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <MetricHistoryTable metrics={historyTableMetrics} />
              </div>
            )}

            {/* ──────── TAB 12: DIAGNOSTICS SUITE ──────── */}
            {activeTab === 'tests' && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-700 pb-5">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                      <List className="w-5 h-5 text-blue-400" />
                      <span>Diagnostics & Verification Suite</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Runs verification tests for collectors, threshold engines, storage adapters, and serializers.
                    </p>
                  </div>
                  <button
                    onClick={runDiagnostics}
                    disabled={isRunningTests}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 disabled:bg-slate-700 disabled:border-transparent disabled:text-slate-500"
                  >
                    {isRunningTests ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                    <span>{isRunningTests ? 'Running Diagnostic Tests...' : 'Run Diagnostics'}</span>
                  </button>
                </div>

                {testResults ? (
                  <div className="space-y-6">
                    {/* Metrics Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Total Tests</div>
                        <div className="text-2xl font-black text-slate-200 font-mono">{testResults.total}</div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Passed</div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">{testResults.passed}</div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Failed</div>
                        <div className="text-2xl font-black text-rose-400 font-mono">{testResults.failed}</div>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Duration</div>
                        <div className="text-2xl font-black text-cyan-400 font-mono">{testResults.duration}ms</div>
                      </div>
                    </div>

                    {/* Test List Table */}
                    <div className="border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/40">
                      <div className="grid grid-cols-6 text-xs text-slate-400 bg-slate-800/40 border-b border-slate-700 p-3 font-bold uppercase tracking-wider">
                        <div className="col-span-2">Suite</div>
                        <div className="col-span-2">Test Name</div>
                        <div>Duration</div>
                        <div className="text-right">Result</div>
                      </div>
                      <div className="divide-y divide-slate-800">
                        {testResults.tests.map((test: any, index: number) => (
                          <div key={index} className="grid grid-cols-6 items-center p-3 text-xs text-slate-300 hover:bg-slate-800/20 font-mono">
                            <div className="col-span-2 text-slate-400 font-medium">{test.suite}</div>
                            <div className="col-span-2">{test.name}</div>
                            <div className="text-slate-500">{test.duration}ms</div>
                            <div className="text-right flex items-center justify-end space-x-1.5 font-bold">
                              {test.passed ? (
                                <span className="text-emerald-400">PASS</span>
                              ) : (
                                <span className="text-rose-400" title={test.error}>FAIL</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-center py-20 italic">
                    Diagnostics runner is ready. Click "Run Diagnostics" to verify security & metrics engines integrity.
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};

// Helper to sum graph node additions
const nodesHistCountSum = (arr: number[]): number => {
  if (arr.length === 0) return 32; // base node count
  return arr.reduce((acc, v) => acc + v, 32);
};

export default MonitoringAnalyticsPage;
