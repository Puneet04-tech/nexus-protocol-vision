import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  Pause,
  XCircle,
  Plus,
  Trash2,
  Database,
  TrendingUp,
  Download,
  Upload,
  Cpu,
  Shield,
  FileCheck,
  AlertTriangle,
  Award,
  Zap,
  Info,
  Clock,
  Code,
  DollarSign,
  BarChart2,
  CheckCircle2,
  Search,
  BookOpen,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { mockBenchmarkAPI } from '../core/benchmark-lab/api/BenchmarkAPI';
import { BenchmarkConfig, BenchmarkRun, Dataset, LeaderboardEntry, ComparisonMatrix, TrendDataPoint } from '../core/benchmark-lab/types';
import { BenchmarkLabTestSuite, SuiteResults } from '../core/benchmark-lab/__tests__/benchmark-lab.test';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { useToast } from '../contexts/ToastContext';

const BenchmarkLabPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { showToast } = useToast();

  // State Tabs
  const [activeTab, setActiveTab] = useState<'runner' | 'comparison' | 'datasets' | 'reports' | 'tests'>('runner');

  // Database lists
  const [configs, setConfigs] = useState<BenchmarkConfig[]>([]);
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  // Selected entities
  const [selectedConfig, setSelectedConfig] = useState<BenchmarkConfig | null>(null);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRun | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Runner controls
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<BenchmarkRun | null>(null);
  const [runLogs, setRunLogs] = useState<string[]>([]);

  // Form states (Create Config)
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigDesc, setNewConfigDesc] = useState('');
  const [newConfigSubjectType, setNewConfigSubjectType] = useState<'model' | 'agent' | 'workflow' | 'prompt'>('model');
  const [newConfigSubjectId, setNewConfigSubjectId] = useState('gemini-3.5-flash');
  const [newConfigDatasetId, setNewConfigDatasetId] = useState('');
  const [newConfigTemp, setNewConfigTemp] = useState(0.2);
  const [newConfigMaxTokens, setNewConfigMaxTokens] = useState(150);
  const [newConfigBatchSize, setNewConfigBatchSize] = useState(5);
  const [newConfigSystemPrompt, setNewConfigSystemPrompt] = useState('');
  const [newConfigMetrics, setNewConfigMetrics] = useState<string[]>(['accuracy', 'f1', 'latency', 'throughput', 'cost']);
  const [newConfigSafeties, setNewConfigSafeties] = useState<string[]>(['hallucination', 'safety', 'bias', 'robustness', 'consistency']);

  // Comparison states
  const [compareRunId1, setCompareRunId1] = useState('');
  const [compareRunId2, setCompareRunId2] = useState('');
  const [comparisonMatrix, setComparisonMatrix] = useState<ComparisonMatrix | null>(null);
  const [trendConfigId, setTrendConfigId] = useState('');
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);

  // Dataset Import states
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);

  // Unit Test states
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Initial Seed Loading
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = (selectConfigId?: string) => {
    const listConfigs = mockBenchmarkAPI.getConfigs();
    const listRuns = mockBenchmarkAPI.getRuns();
    const listDatasets = mockBenchmarkAPI.getDatasets();

    setConfigs(listConfigs);
    setRuns(listRuns.sort((a, b) => b.startedAt - a.startedAt));
    setDatasets(listDatasets);

    if (listConfigs.length > 0) {
      const selected = selectConfigId ? listConfigs.find(c => c.id === selectConfigId) : listConfigs[0];
      setSelectedConfig(selected || listConfigs[0]);
      if (selected) {
        setTrendConfigId(selected.id);
        loadTrends(selected.id);
      }
    }
    if (listRuns.length > 0) {
      setSelectedRun(listRuns[0]);
      if (listRuns.length >= 2) {
        setCompareRunId1(listRuns[0].id);
        setCompareRunId2(listRuns[1].id);
      } else {
        setCompareRunId1(listRuns[0].id);
      }
    }
    if (listDatasets.length > 0) {
      setSelectedDataset(listDatasets[0]);
      setNewConfigDatasetId(listDatasets[0].id);
    }
  };

  const handleSelectConfig = (config: BenchmarkConfig) => {
    setSelectedConfig(config);
    setTrendConfigId(config.id);
    loadTrends(config.id);
  };

  const loadTrends = (configId: string) => {
    const data = mockBenchmarkAPI.getConfigTrends(configId);
    setTrends(data);
  };

  // Run execution handler
  const handleExecuteBenchmark = async () => {
    if (!selectedConfig || activeRunId) return;

    setRunLogs([]);
    setRunLogs(prev => [...prev, `[INIT] Starting benchmark pipeline for config: ${selectedConfig.name}...`]);

    try {
      const run = mockBenchmarkAPI.createRun(selectedConfig);
      setActiveRunId(run.id);
      setActiveRun(run);
      setRunLogs(prev => [...prev, `[INIT] Run created successfully (ID: ${run.id}). Dataset size: ${run.totalItems} elements.`]);

      const completedRun = await mockBenchmarkAPI.startRun(run.id, (progressRun) => {
        setActiveRun({ ...progressRun });
        
        // Log item outputs on the fly
        if (progressRun.results.length > 0) {
          const latest = progressRun.results[progressRun.results.length - 1];
          setRunLogs(prev => [
            ...prev,
            `[EXEC] [Item ${progressRun.results.length}/${progressRun.totalItems}] - Output length: ${latest.actualOutput.length} char | Latency: ${latest.latencyMs} ms | Accuracy: ${latest.scores.accuracy}`
          ]);
        }
      });

      if (completedRun.status === 'COMPLETED') {
        setRunLogs(prev => [...prev, `[COMPLETE] Benchmark run completed successfully! Overall F1: ${completedRun.metricsSummary.avgF1}`]);
        showToast('Benchmark run completed successfully.');
      } else if (completedRun.status === 'CANCELLED') {
        setRunLogs(prev => [...prev, `[CANCEL] Benchmark run was cancelled by user.`]);
        showToast('Benchmark run was cancelled.');
      }

      loadAllData(selectedConfig.id);
      setActiveRunId(null);
      setActiveRun(null);
    } catch (err: any) {
      setRunLogs(prev => [...prev, `[ERROR] Benchmark execution failed: ${err.message || String(err)}`]);
      showToast(err.message || 'Execution error');
      setActiveRunId(null);
      setActiveRun(null);
    }
  };

  const handlePauseBenchmark = () => {
    if (activeRunId) {
      mockBenchmarkAPI.pauseRun(activeRunId);
      setRunLogs(prev => [...prev, `[PAUSE] Pause requested. Waiting for current item to finish...`]);
    }
  };

  const handleCancelBenchmark = () => {
    if (activeRunId) {
      mockBenchmarkAPI.cancelRun(activeRunId);
      setRunLogs(prev => [...prev, `[CANCEL] Cancellation requested...`]);
    }
  };

  const handleCreateConfig = () => {
    if (!newConfigName.trim()) {
      showToast('Please enter a configuration name');
      return;
    }

    const newConfig: BenchmarkConfig = {
      id: `config_${Date.now()}`,
      name: newConfigName,
      description: newConfigDesc || 'Custom configured benchmark.',
      subjectType: newConfigSubjectType,
      subjectId: newConfigSubjectId,
      subjectVersion: '1.0',
      datasetId: newConfigDatasetId,
      systemPrompt: newConfigSystemPrompt,
      temperature: newConfigTemp,
      maxTokens: newConfigMaxTokens,
      batchSize: newConfigBatchSize,
      metrics: newConfigMetrics,
      safetyEvaluations: newConfigSafeties,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mockBenchmarkAPI.saveConfig(newConfig);
    showToast('New benchmark configuration saved.');
    loadAllData(newConfig.id);
    setShowConfigModal(false);

    // Reset Form
    setNewConfigName('');
    setNewConfigDesc('');
    setNewConfigSystemPrompt('');
  };

  const handleDeleteConfig = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this configuration?')) {
      mockBenchmarkAPI.deleteConfig(id);
      showToast('Configuration deleted.');
      loadAllData();
    }
  };

  // Compare runs logic
  const handleCompare = () => {
    if (!compareRunId1 || !compareRunId2) {
      showToast('Please select two benchmark runs to compare.');
      return;
    }
    const matrix = mockBenchmarkAPI.compareRuns([compareRunId1, compareRunId2]);
    setComparisonMatrix(matrix);
    showToast('Comparison matrix computed successfully.');
  };

  // Pre-trigger comparisons when runs are available
  useEffect(() => {
    if (compareRunId1 && compareRunId2) {
      const matrix = mockBenchmarkAPI.compareRuns([compareRunId1, compareRunId2]);
      setComparisonMatrix(matrix);
    }
  }, [compareRunId1, compareRunId2, runs]);

  // Dataset imports
  const handleImportDataset = () => {
    if (!importJsonText.trim()) {
      showToast('Please insert dataset JSON content.');
      return;
    }
    const result = mockBenchmarkAPI.importDataset(importJsonText);
    if (result.success) {
      showToast('Custom dataset imported successfully.');
      loadAllData();
      setImportJsonText('');
      setShowImportArea(false);
    } else {
      showToast(`Import failed: ${result.errors.join('; ')}`);
    }
  };

  const handleExportDataset = (id: string) => {
    const exported = mockBenchmarkAPI.exportDataset(id);
    if (exported) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exported);
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `dataset-${id}.json`);
      dlAnchorElem.click();
      showToast('Dataset exported.');
    }
  };

  const handleDeleteDataset = (id: string) => {
    if (confirm('Are you sure you want to delete this dataset?')) {
      mockBenchmarkAPI.deleteDataset(id);
      showToast('Dataset deleted.');
      loadAllData();
    }
  };

  // Export report methods
  const handleDownloadCSV = (run: BenchmarkRun) => {
    const csv = mockBenchmarkAPI.getCSVExport(run);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `benchmark-run-${run.id}.csv`);
    link.click();
    showToast('CSV downloaded successfully.');
  };

  const handleDownloadJSON = (run: BenchmarkRun) => {
    const json = JSON.stringify(run, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `benchmark-run-${run.id}.json`);
    link.click();
    showToast('JSON exported successfully.');
  };

  const handlePrintReport = (run: BenchmarkRun) => {
    const config = configs.find(c => c.id === run.configId);
    if (!config) return;
    const printHTML = mockBenchmarkAPI.getPrintReportHTML(run, config);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
    }
  };

  // Run tests unit tester
  const handleRunTests = async () => {
    if (isRunningTests) return;
    setIsRunningTests(true);
    setTestResults(null);

    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await BenchmarkLabTestSuite.runTests();
      setTestResults(res);
      showToast(`Diagnostic tests finished: ${res.passed}/${res.total} passed`);
    } catch (e) {
      console.error(e);
      showToast('Diagnostic tests crashed');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Aggregated score summary ribbons
  const globalSummaryStats = useMemo(() => {
    const completedRuns = runs.filter(r => r.status === 'COMPLETED');
    if (completedRuns.length === 0) return null;

    let f1Sum = 0, latSum = 0, costSum = 0;
    completedRuns.forEach(r => {
      f1Sum += r.metricsSummary.avgF1 || 0;
      latSum += r.metricsSummary.avgLatencyMs;
      costSum += r.metricsSummary.totalCost;
    });

    return {
      runsCount: completedRuns.length,
      avgF1: Math.round((f1Sum / completedRuns.length) * 100),
      avgLatencyMs: Math.round(latSum / completedRuns.length),
      totalCost: costSum
    };
  }, [runs]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 text-white font-sans selection:bg-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800/80 pb-5 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/20">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                AI Benchmark & Evaluation Lab
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                Model Verification, Safety Guardrails, Cost/Performance Profiling & Leaderboards
              </p>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="bg-slate-900/80 border border-gray-800/85 rounded-xl p-1 flex space-x-1 self-start shadow-inner">
            {[
              { id: 'runner', label: 'Evaluation Runner', icon: Sliders },
              { id: 'comparison', label: 'Model Comparison', icon: BarChart2 },
              { id: 'datasets', label: 'Dataset Manager', icon: Database },
              { id: 'reports', label: 'Analysis & Reports', icon: BookOpen },
              { id: 'tests', label: 'Diagnostic Assertion Lab', icon: FileCheck }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Summary Ribbon */}
        {globalSummaryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Completed Audits</div>
                <div className="text-2xl font-black text-white mt-1">{globalSummaryStats.runsCount} runs</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-indigo-400 opacity-60" />
            </div>
            <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Global Average F1</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">{globalSummaryStats.avgF1}%</div>
              </div>
              <Award className="w-8 h-8 text-indigo-400 opacity-60" />
            </div>
            <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avg Latency</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{globalSummaryStats.avgLatencyMs} ms</div>
              </div>
              <Clock className="w-8 h-8 text-emerald-400 opacity-60" />
            </div>
            <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Accrued Cost</div>
                <div className="text-2xl font-black text-amber-400 mt-1">${globalSummaryStats.totalCost.toFixed(5)}</div>
              </div>
              <DollarSign className="w-8 h-8 text-amber-400 opacity-60" />
            </div>
          </div>
        )}

        {/* Dynamic Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* TAB 1: RUNNER PANEL */}
          {activeTab === 'runner' && (
            <>
              {/* Left Side: Config list */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-850 pb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evaluation Configs</span>
                    <button
                      onClick={() => setShowConfigModal(true)}
                      className="p-1.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-400 hover:bg-indigo-900 transition-colors flex items-center space-x-1 text-xs"
                      title="New evaluation configuration"
                    >
                      <Plus size={12} />
                      <span className="font-bold">Add</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {configs.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectConfig(c)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group flex justify-between items-center ${
                          selectedConfig?.id === c.id
                            ? 'bg-indigo-950/20 border-indigo-700 text-white'
                            : 'bg-slate-900/20 border-gray-850 text-gray-400 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className={`font-bold text-xs ${selectedConfig?.id === c.id ? 'text-white' : 'text-gray-200'}`}>{c.name}</div>
                          <div className="text-[10px] font-mono text-gray-500">
                            {c.subjectId} &bull; temp: {c.temperature}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConfig(c.id, e)}
                          className="text-gray-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Configuration details card */}
                {selectedConfig && (
                  <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-3 text-xs">
                    <h3 className="font-bold text-gray-200 uppercase tracking-wide text-[10px] border-b border-gray-850 pb-2">Active Config Attributes</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-gray-400">Subject Model/Agent:</span> <span className="font-mono font-bold text-white">{selectedConfig.subjectId}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Subject Type:</span> <span className="capitalize text-white">{selectedConfig.subjectType}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Temperature:</span> <span className="text-white font-bold">{selectedConfig.temperature}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Max Tokens:</span> <span className="text-white font-bold">{selectedConfig.maxTokens}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Batch Size:</span> <span className="text-white font-bold">{selectedConfig.batchSize}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Dataset Target:</span> <span className="text-indigo-400 font-bold truncate max-w-[150px]">{selectedConfig.datasetId}</span></div>
                      
                      <div className="pt-2 border-t border-gray-850 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Enabled Performance Metrics</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedConfig.metrics.map(m => (
                            <span key={m} className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 border border-indigo-950 font-mono capitalize">{m}</span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Enabled Quality & Safeties</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedConfig.safetyEvaluations.map(s => (
                            <span key={s} className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-purple-400 border border-purple-950 font-mono capitalize">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Runner active logs & graphs */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6">
                  
                  {/* Action banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-850 pb-4 gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                        <span>{selectedConfig ? selectedConfig.name : 'Select a configuration'}</span>
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">{selectedConfig?.description}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {activeRunId ? (
                        <>
                          <button
                            onClick={handlePauseBenchmark}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                          >
                            <Pause size={12} />
                            <span>Pause</span>
                          </button>
                          <button
                            onClick={handleCancelBenchmark}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                          >
                            <XCircle size={12} />
                            <span>Cancel</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleExecuteBenchmark}
                          disabled={!selectedConfig}
                          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-2"
                        >
                          <Play size={14} className="fill-white" />
                          <span>Run Audit Suite</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress indicator */}
                  {activeRun && (
                    <div className="space-y-2 bg-slate-950/60 border border-gray-850 p-4 rounded-2xl">
                      <div className="flex justify-between text-xs font-bold text-gray-300">
                        <span className="flex items-center space-x-1.5">
                          <RefreshCw size={12} className="animate-spin text-indigo-400" />
                          <span>Processing Dataset: {activeRun.currentItemIndex} / {activeRun.totalItems}</span>
                        </span>
                        <span>{activeRun.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-gray-850">
                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${activeRun.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Run Logs stdout window */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Terminal Outputs</span>
                    <div className="w-full h-40 bg-slate-950 border border-gray-850 rounded-2xl p-4 font-mono text-[10px] text-gray-300 overflow-y-auto space-y-1 shadow-inner select-text">
                      {runLogs.length === 0 ? (
                        <div className="text-gray-500 italic">Auditing system idle. Click "Run Audit Suite" to start benchmark pipeline execution logs.</div>
                      ) : (
                        runLogs.map((log, idx) => (
                          <div key={idx} className={log.includes('[ERROR]') ? 'text-red-400' : log.includes('[COMPLETE]') ? 'text-green-400' : 'text-gray-300'}>
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Historical Trends chart visualization placeholder */}
                  {trends.length > 0 && (
                    <div className="bg-slate-950/20 border border-gray-850/60 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                        <TrendingUp size={12} className="text-indigo-400" />
                        <span>F1 & Accuracy Development Trend ({trends.length} Audits)</span>
                      </h4>

                      <div className="h-32 flex items-end justify-between gap-1 pt-6 px-4 border-b border-l border-gray-850 relative">
                        <div className="absolute left-2 top-0 text-[8px] text-gray-500 font-mono">1.0</div>
                        <div className="absolute left-2 top-14 text-[8px] text-gray-500 font-mono">0.5</div>
                        
                        {trends.map((t, idx) => {
                          const accH = t.accuracy * 100;
                          const f1H = t.f1 * 100;
                          return (
                            <div key={t.runId} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                              {/* Hover tooltip */}
                              <div className="absolute bottom-full mb-2 bg-slate-900 text-[8px] border border-gray-850 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 w-24">
                                <div className="text-[7px] text-gray-500 font-mono">{new Date(t.timestamp).toLocaleDateString()}</div>
                                <div className="text-indigo-400">F1: {Math.round(t.f1 * 100)}%</div>
                                <div className="text-emerald-400">Acc: {Math.round(t.accuracy * 100)}%</div>
                                <div className="text-amber-400">Lat: {t.latencyMs}ms</div>
                              </div>
                              
                              {/* Double bars */}
                              <div className="flex items-end justify-center w-full gap-0.5 h-full">
                                <div className="w-1.5 bg-emerald-500 rounded-t-sm" style={{ height: `${accH}%` }} />
                                <div className="w-1.5 bg-indigo-500 rounded-t-sm" style={{ height: `${f1H}%` }} />
                              </div>
                              <div className="text-[6px] text-gray-500 font-mono mt-1">#{idx + 1}</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-center items-center space-x-4 text-[9px] text-gray-400 pt-1">
                        <div className="flex items-center space-x-1"><div className="w-2 h-2 bg-emerald-500 rounded-sm" /><span>Accuracy</span></div>
                        <div className="flex items-center space-x-1"><div className="w-2 h-2 bg-indigo-500 rounded-sm" /><span>F1 Semantic Score</span></div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}

          {/* TAB 2: COMPARISON MATRIX PANEL */}
          {activeTab === 'comparison' && (
            <div className="lg:col-span-12 space-y-6">
              
              {/* Selector Bar */}
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">Run A (Baseline):</span>
                  <select
                    value={compareRunId1}
                    onChange={e => setCompareRunId1(e.target.value)}
                    className="bg-slate-950 border border-gray-850 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-700 text-white font-bold"
                  >
                    {runs.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.configName} ({r.id.substring(4, 9)}) - F1: {r.metricsSummary.avgF1 !== undefined ? `${Math.round(r.metricsSummary.avgF1 * 100)}%` : 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">Run B (Candidate):</span>
                  <select
                    value={compareRunId2}
                    onChange={e => setCompareRunId2(e.target.value)}
                    className="bg-slate-950 border border-gray-850 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-700 text-white font-bold"
                  >
                    {runs.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.configName} ({r.id.substring(4, 9)}) - F1: {r.metricsSummary.avgF1 !== undefined ? `${Math.round(r.metricsSummary.avgF1 * 100)}%` : 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCompare}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer ml-auto"
                >
                  Recalculate Matrix
                </button>
              </div>

              {/* Warnings and Leaderboard row */}
              {comparisonMatrix && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Warnings & Regressions */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold text-gray-200 border-b border-gray-850 pb-2 uppercase tracking-wider flex items-center space-x-1.5">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span>Regression Warning Monitor</span>
                      </h3>

                      {comparisonMatrix.regressionWarnings.length === 0 ? (
                        <div className="p-3 bg-emerald-950/20 border border-emerald-900 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
                          <CheckCircle2 size={14} />
                          <span>No performance or latency regressions detected.</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {comparisonMatrix.regressionWarnings.map((w, idx) => (
                            <div
                              key={idx}
                              className={`p-3 border rounded-xl space-y-1 ${
                                w.severity === 'critical'
                                  ? 'bg-red-950/30 border-red-900 text-red-300'
                                  : 'bg-amber-950/20 border-amber-900 text-amber-300'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span>{w.metric} Degradation</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border capitalize ${
                                  w.severity === 'critical' ? 'bg-red-950 border-red-800' : 'bg-amber-950 border-amber-800'
                                }`}>
                                  {w.severity}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400">
                                Subject: <span className="font-mono text-gray-200">{w.subjectId}</span>
                              </p>
                              <p className="text-[10px] font-medium leading-normal">
                                Dropped from {w.previousValue} to {w.currentValue} ({w.percentDrop}% decay).
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Comparative Metrics Matrix Grid */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6">
                      
                      <div className="border-b border-gray-850 pb-3 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white">Side-by-Side Verification Matrix</h3>
                        <span className="text-[10px] text-gray-500">Comparing Run A vs Run B</span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-xs font-bold border-b border-gray-850 pb-2">
                        <div className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Evaluation Metric</div>
                        <div className="text-indigo-400">Run A (Baseline)</div>
                        <div className="text-purple-400">Run B (Candidate)</div>
                      </div>

                      {comparisonMatrix.runs.length >= 2 && (() => {
                        const runA = comparisonMatrix.runs[0];
                        const runB = comparisonMatrix.runs[1];
                        const metricRows = [
                          { label: 'Accuracy Score', valA: `${Math.round((runA.metricsSummary.avgAccuracy || 0) * 100)}%`, valB: `${Math.round((runB.metricsSummary.avgAccuracy || 0) * 100)}%` },
                          { label: 'F1 Semantic Score', valA: runA.metricsSummary.avgF1 !== undefined ? `${Math.round(runA.metricsSummary.avgF1 * 100)}%` : 'N/A', valB: runB.metricsSummary.avgF1 !== undefined ? `${Math.round(runB.metricsSummary.avgF1 * 100)}%` : 'N/A' },
                          { label: 'Avg Latency', valA: `${runA.metricsSummary.avgLatencyMs} ms`, valB: `${runB.metricsSummary.avgLatencyMs} ms` },
                          { label: 'Avg Throughput', valA: `${runA.metricsSummary.avgThroughput} tok/s`, valB: `${runB.metricsSummary.avgThroughput} tok/s` },
                          { label: 'Hallucination Rate', valA: `${runA.metricsSummary.hallucinationRate}%`, valB: `${runB.metricsSummary.hallucinationRate}%` },
                          { label: 'Safety Violations', valA: `${runA.metricsSummary.safetyViolationRate}%`, valB: `${runB.metricsSummary.safetyViolationRate}%` },
                          { label: 'Total Tokens', valA: runA.metricsSummary.totalTokens, valB: runB.metricsSummary.totalTokens },
                          { label: 'Accrued Cost', valA: `$${runA.metricsSummary.totalCost.toFixed(5)}`, valB: `$${runB.metricsSummary.totalCost.toFixed(5)}` }
                        ];

                        return (
                          <div className="space-y-3">
                            {metricRows.map((row, idx) => (
                              <div key={idx} className="grid grid-cols-3 gap-4 text-xs py-2 border-b border-gray-850/40 items-center">
                                <div className="text-gray-400 font-medium">{row.label}</div>
                                <div className="text-gray-200 font-mono">{row.valA}</div>
                                <div className="text-gray-200 font-mono">{row.valB}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Global Leaderboard Card */}
                    <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-4">
                      <div className="border-b border-gray-850 pb-2">
                        <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center space-x-1.5">
                          <Award size={12} className="text-indigo-400" />
                          <span>Global Subject Leaderboard Rankings</span>
                        </h3>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-850 text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                              <th className="py-2.5">Rank</th>
                              <th>Subject</th>
                              <th>Version</th>
                              <th>Score</th>
                              <th>F1 Score</th>
                              <th>Avg Latency</th>
                              <th>Safety Score</th>
                              <th>Runs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonMatrix.leaderboard.map(e => (
                              <tr key={e.subjectId} className="border-b border-gray-850/60 hover:bg-slate-900/10">
                                <td className="py-3 font-bold text-indigo-400">#{e.rank}</td>
                                <td className="font-bold text-white capitalize">{e.subjectId}</td>
                                <td className="text-gray-400 font-mono">{e.version}</td>
                                <td>
                                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">{e.score}/100</span>
                                </td>
                                <td className="font-mono">{e.f1Score !== undefined ? `${Math.round(e.f1Score * 100)}%` : 'N/A'}</td>
                                <td className="font-mono">{e.avgLatencyMs} ms</td>
                                <td>
                                  <span className={e.safetyScore >= 90 ? 'text-green-400' : 'text-amber-400'}>{e.safetyScore}%</span>
                                </td>
                                <td className="text-gray-500">{e.totalRunsEvaluated} runs</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATASET MANAGER */}
          {activeTab === 'datasets' && (
            <>
              {/* Left Column: Datasets List */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-850 pb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loaded Datasets</span>
                    <button
                      onClick={() => setShowImportArea(!showImportArea)}
                      className="p-1.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-400 hover:bg-indigo-900 transition-colors flex items-center space-x-1 text-xs"
                      title="Import custom dataset JSON"
                    >
                      <Upload size={12} />
                      <span className="font-bold">Import</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {datasets.map(d => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDataset(d)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center group ${
                          selectedDataset?.id === d.id
                            ? 'bg-indigo-950/20 border-indigo-700 text-white'
                            : 'bg-slate-900/20 border-gray-850 text-gray-400 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className={`font-bold text-xs ${selectedDataset?.id === d.id ? 'text-white' : 'text-gray-200'}`}>{d.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            v{d.version} &bull; {d.items.length} items &bull; {d.isPredefined ? 'Predefined' : 'Custom'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExportDataset(d.id); }}
                            className="text-gray-500 hover:text-indigo-400 p-1"
                            title="Export JSON"
                          >
                            <Download size={12} />
                          </button>
                          {!d.isPredefined && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteDataset(d.id); }}
                              className="text-gray-500 hover:text-red-500 p-1"
                              title="Delete dataset"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Import Area */}
                {showImportArea && (
                  <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-3">
                    <h3 className="text-xs font-bold text-gray-200 border-b border-gray-850 pb-2 uppercase tracking-wide">Import Dataset JSON</h3>
                    <p className="text-[9px] text-gray-400 leading-normal">
                      Must conform to schema: <code>{"{ id, name, version, items: [{ id, input, expectedOutput }] }"}</code>
                    </p>
                    <textarea
                      placeholder='Paste JSON here...'
                      value={importJsonText}
                      onChange={e => setImportJsonText(e.target.value)}
                      className="w-full h-32 bg-slate-950 border border-gray-850 rounded-lg p-2 font-mono text-[10px] text-gray-300 focus:outline-none focus:border-indigo-700"
                    />
                    <button
                      onClick={handleImportDataset}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Verify and Import
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Dataset Items Details */}
              <div className="lg:col-span-8">
                <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6">
                  
                  <div className="border-b border-gray-850 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedDataset ? selectedDataset.name : 'Select a Dataset'}</h3>
                      <p className="text-xs text-gray-400 mt-1">{selectedDataset?.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider">Items View</span>
                  </div>

                  {selectedDataset && (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {selectedDataset.items.map((item, idx) => (
                        <div key={item.id} className="bg-slate-950/60 border border-gray-850/80 p-4 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-gray-850/60 pb-1.5">
                            <span className="font-bold text-gray-400 font-mono">Item #{idx + 1} ({item.id})</span>
                            {item.category && (
                              <span className="text-[8px] bg-slate-900 text-purple-400 border border-purple-950 rounded px-1.5 py-0.5 capitalize">{item.category}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-gray-500 font-bold block uppercase">Prompt Input:</span>
                            <p className="text-gray-200 leading-relaxed font-sans">{item.input}</p>
                          </div>
                          {item.expectedOutput && (
                            <div className="space-y-1 pt-1 border-t border-gray-850/20">
                              <span className="text-[9px] text-emerald-500 font-bold block uppercase">Expected Output Reference:</span>
                              <p className="text-emerald-400/90 leading-relaxed font-mono text-[11px]">{item.expectedOutput}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </>
          )}

          {/* TAB 4: REPORTS PANEL */}
          {activeTab === 'reports' && (
            <>
              {/* Left Column: Past Runs List */}
              <div className="lg:col-span-4">
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-4">
                  <div className="border-b border-gray-850 pb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Past Execution Runs</span>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {runs.length === 0 ? (
                      <div className="text-xs text-gray-500 italic p-2 text-center">No completed runs. Execute a benchmark runner first.</div>
                    ) : (
                      runs.map(r => (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRun(r)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedRun?.id === r.id
                              ? 'bg-indigo-950/20 border-indigo-700 text-white'
                              : 'bg-slate-900/20 border-gray-850 text-gray-400 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="font-bold text-xs text-gray-200 truncate">{r.configName}</div>
                          <div className="flex justify-between text-[9px] text-gray-500 mt-1.5 font-mono">
                            <span>Status: {r.status}</span>
                            <span>{new Date(r.startedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Active Report Viewer */}
              <div className="lg:col-span-8">
                <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6">
                  
                  <div className="border-b border-gray-850 pb-3 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">Benchmark Audit Report Summary</h3>
                      {selectedRun && (
                        <p className="text-[10px] font-mono text-gray-500 mt-0.5">Run ID: {selectedRun.id}</p>
                      )}
                    </div>
                    {selectedRun && selectedRun.status === 'COMPLETED' && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleDownloadCSV(selectedRun)}
                          className="px-2.5 py-1.5 bg-slate-950 border border-gray-850 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-colors"
                          title="Download CSV"
                        >
                          <Download size={10} />
                          <span>CSV</span>
                        </button>
                        <button
                          onClick={() => handleDownloadJSON(selectedRun)}
                          className="px-2.5 py-1.5 bg-slate-950 border border-gray-850 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-colors"
                          title="Download JSON"
                        >
                          <Download size={10} />
                          <span>JSON</span>
                        </button>
                        <button
                          onClick={() => handlePrintReport(selectedRun)}
                          className="px-2.5 py-1.5 bg-indigo-600/20 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all"
                          title="Open Print/PDF Window"
                        >
                          <Code size={10} />
                          <span>Print/PDF Report</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedRun ? (
                    <>
                      {selectedRun.status !== 'COMPLETED' ? (
                        <div className="flex flex-col items-center justify-center p-8 space-y-2 text-center">
                          <AlertTriangle className="text-amber-500 w-8 h-8 animate-pulse" />
                          <div className="text-xs font-bold">Selected run has status: {selectedRun.status}</div>
                          <p className="text-[10px] text-gray-500 max-w-sm">Detailed summaries and recommendations are only generated for completed runs.</p>
                        </div>
                      ) : (() => {
                        const config = configs.find(c => c.id === selectedRun.configId);
                        if (!config) return null;
                        const report = mockBenchmarkAPI.getReport(selectedRun, config);

                        return (
                          <div className="space-y-6">
                            <p className="text-xs text-gray-300 leading-relaxed bg-slate-950/40 p-4 border border-gray-850 rounded-2xl font-serif italic">
                              "{report.summary}"
                            </p>

                            {/* Recommendations section */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-gray-200 border-b border-gray-850/60 pb-1 uppercase tracking-wide">Optimization Recommendations</h4>
                              <ul className="list-disc pl-5 text-xs text-gray-400 space-y-2 leading-relaxed">
                                {report.recommendations.map((rec, idx) => (
                                  <li key={idx} className="marker:text-indigo-500">{rec}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Detailed metrics breakdown */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-gray-200 border-b border-gray-850/60 pb-1 uppercase tracking-wide">Breakdown Log items ({selectedRun.results.length})</h4>
                              
                              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                                {selectedRun.results.map((res, idx) => (
                                  <div key={res.id} className="bg-slate-950/30 border border-gray-850/40 p-3 rounded-xl space-y-1 text-xs">
                                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 border-b border-gray-850/20 pb-1">
                                      <span>Item #{idx + 1} ({res.datasetItemId})</span>
                                      <span>Latency: {res.latencyMs} ms &bull; Tokens: {res.tokensUsed.totalTokens}</span>
                                    </div>
                                    <p className="text-gray-300 font-sans mt-1 leading-normal">Prompt: {res.input}</p>
                                    <p className="text-indigo-400 font-mono text-[11px] mt-1">Output: {res.actualOutput}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-xs text-gray-500 italic">Select an execution run from the history log sidebar.</div>
                  )}

                </div>
              </div>
            </>
          )}

          {/* TAB 5: DIAGNOSTIC UNIT TESTS */}
          {activeTab === 'tests' && (
            <div className="lg:col-span-12 space-y-6">
              <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-850 pb-4 gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <FileCheck className="w-5 h-5 text-indigo-400" />
                      <span>Benchmark Suite Diagnostic assertions</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Validate calculation models, safety audits, and comparative matrices in the browser.</p>
                  </div>

                  <button
                    onClick={handleRunTests}
                    disabled={isRunningTests}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors flex items-center space-x-1.5"
                  >
                    {isRunningTests ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} />
                        <span>Run Unit Tests</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Test results screen */}
                {testResults ? (
                  <div className="space-y-6">
                    {/* Metrics ribbon */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-950/40 border border-gray-850 p-4 rounded-xl text-center text-xs">
                      <div>
                        <div className="text-gray-400 uppercase text-[9px] font-bold">Total Run</div>
                        <div className="text-xl font-bold mt-0.5 text-white">{testResults.total} tests</div>
                      </div>
                      <div>
                        <div className="text-emerald-400 uppercase text-[9px] font-bold">Passed</div>
                        <div className="text-xl font-bold mt-0.5 text-emerald-400">{testResults.passed}</div>
                      </div>
                      <div>
                        <div className="text-red-400 uppercase text-[9px] font-bold">Failed</div>
                        <div className="text-xl font-bold mt-0.5 text-red-400">{testResults.failed}</div>
                      </div>
                    </div>

                    {/* Tests list */}
                    <div className="space-y-2">
                      {testResults.tests.map((test, idx) => (
                        <div
                          key={idx}
                          className={`p-3 border rounded-xl flex items-center justify-between text-xs ${
                            test.passed
                              ? 'bg-emerald-950/10 border-emerald-900/40 text-emerald-300'
                              : 'bg-red-950/20 border-red-900/40 text-red-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-bold flex items-center space-x-1.5">
                              <span className="text-[10px] font-mono uppercase bg-slate-900 border px-1.5 py-0.5 rounded text-gray-500">
                                {test.suite}
                              </span>
                              <span>{test.name}</span>
                            </div>
                            {test.error && (
                              <p className="text-[10px] text-red-400 font-mono mt-1 whitespace-pre-wrap">{test.error}</p>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-gray-500">{test.duration} ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-gray-500 italic bg-slate-950/20 border border-gray-850/40 rounded-2xl">
                    No diagnostic suite reports. Click "Run Unit Tests" to launch automated verification checks.
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </div>

      {/* CONFIGURATION SETUP MODAL */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-gray-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm">Add Benchmark Configuration</h3>
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto text-xs text-gray-300">
                <div className="space-y-1">
                  <label className="font-bold text-gray-400 uppercase text-[9px]">Configuration Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Gemini 3.5 Flash Sentiment Check"
                    value={newConfigName}
                    onChange={e => setNewConfigName(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-400 uppercase text-[9px]">Description</label>
                  <textarea
                    placeholder="Provide a brief summary of what this configuration tests..."
                    value={newConfigDesc}
                    onChange={e => setNewConfigDesc(e.target.value)}
                    className="w-full h-16 bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 uppercase text-[9px]">Subject Type</label>
                    <select
                      value={newConfigSubjectType}
                      onChange={e => setNewConfigSubjectType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                    >
                      <option value="model">Model</option>
                      <option value="agent">Agent</option>
                      <option value="workflow">Workflow</option>
                      <option value="prompt">Prompt Version</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 uppercase text-[9px]">Subject Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. gemini-3.5-flash"
                      value={newConfigSubjectId}
                      onChange={e => setNewConfigSubjectId(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-400 uppercase text-[9px]">Dataset Target</label>
                  <select
                    value={newConfigDatasetId}
                    onChange={e => setNewConfigDatasetId(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                  >
                    {datasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.items.length} items)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 uppercase text-[9px]">Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1.5"
                      value={newConfigTemp}
                      onChange={e => setNewConfigTemp(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 uppercase text-[9px]">Max Tokens</label>
                    <input
                      type="number"
                      step="10"
                      min="1"
                      value={newConfigMaxTokens}
                      onChange={e => setNewConfigMaxTokens(parseInt(e.target.value) || 50)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 uppercase text-[9px]">Batch Size</label>
                    <input
                      type="number"
                      min="1"
                      value={newConfigBatchSize}
                      onChange={e => setNewConfigBatchSize(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-400 uppercase text-[9px]">System Prompt Delimiter</label>
                  <textarea
                    placeholder="e.g. You are an expert classifier..."
                    value={newConfigSystemPrompt}
                    onChange={e => setNewConfigSystemPrompt(e.target.value)}
                    className="w-full h-16 bg-slate-950 border border-gray-850 rounded-lg p-2 focus:outline-none focus:border-indigo-700 text-white"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 flex justify-end space-x-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-gray-850 rounded-xl hover:bg-slate-950 text-gray-400 font-bold transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateConfig}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-all text-xs"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BenchmarkLabPage;
