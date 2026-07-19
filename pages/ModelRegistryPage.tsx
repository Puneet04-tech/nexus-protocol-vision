import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  Database,
  Plus,
  Play,
  TrendingUp,
  Download,
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
  Sliders,
  Shield,
  Layers,
  Settings,
  ShieldCheck,
  FileCheck,
  UserCheck,
  ArrowRightLeft,
  Activity,
  History,
  Trash2,
  X
} from 'lucide-react';
import { mockModelRegistryAPI } from '../core/model-registry/api/ModelRegistryAPI';
import { DeploymentScheduler } from '../core/model-registry/scheduler/DeploymentScheduler';
import {
  ModelMetadata,
  ModelVersion,
  DeploymentInfo,
  DeploymentHistoryEntry,
  ValidationRun,
  AuditLog,
  SearchCriteria,
  VersionDiff
} from '../core/model-registry/types';
import { UserRole } from '../core/model-registry/services/SecurityService';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import { useToast } from '../contexts/ToastContext';
import ModelRegistryTestSuite, { SuiteResults } from '../core/model-registry/__tests__/model-registry.test';

const ModelRegistryPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const { showToast } = useToast();

  // Active simulated user role for security simulation
  const [currentRole, setCurrentRole] = useState<UserRole>('Architect');

  // Tabs navigation
  const [activeTab, setActiveTab] = useState<'catalog' | 'versions' | 'deployments' | 'analytics' | 'security' | 'diagnostics'>('catalog');

  // Loaders
  const [loading, setLoading] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Catalog State
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFramework, setFilterFramework] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'requests' | 'latency'>('name');

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regId, setRegId] = useState('');
  const [regName, setRegName] = useState('');
  const [regDesc, setRegDesc] = useState('');
  const [regCategory, setRegCategory] = useState<'Natural Language Processing' | 'Computer Vision' | 'Speech & Audio' | 'Reinforcement Learning' | 'Multimodal'>('Natural Language Processing');
  const [regFramework, setRegFramework] = useState<'PyTorch' | 'TensorFlow' | 'ONNX' | 'JAX' | 'GGUF' | 'Hugging Face Transformers' | 'API Proxy'>('PyTorch');
  const [regLicense, setRegLicense] = useState('Apache-2.0');
  const [regDocUrl, setRegDocUrl] = useState('');
  const [regPubName, setRegPubName] = useState('');
  const [regPubEmail, setRegPubEmail] = useState('');
  const [regPubWebsite, setRegPubWebsite] = useState('');
  const [regTags, setRegTags] = useState('');

  // Version Control State
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [selectedVerCode, setSelectedVerCode] = useState<string>('');
  const [compareVerCodeA, setCompareVerCodeA] = useState<string>('');
  const [compareVerCodeB, setCompareVerCodeB] = useState<string>('');
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);

  // Publish Version Modal State
  const [showVerModal, setShowVerModal] = useState(false);
  const [verCode, setVerCode] = useState('');
  const [verNotes, setVerNotes] = useState('');
  const [verChecksum, setVerChecksum] = useState('sha256_');
  const [verSizeMb, setVerSizeMb] = useState<number>(0);
  const [verParams, setVerParams] = useState('');
  const [verDeps, setVerDeps] = useState('');

  // Deployments State
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistoryEntry[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<'development' | 'testing' | 'staging' | 'production'>('production');
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Deployment Launch Form State
  const [deployVer, setDeployVer] = useState('');
  const [deployStrategy, setDeployStrategy] = useState<'standard' | 'canary' | 'blue-green'>('standard');
  const [gpuType, setGpuType] = useState('Serverless API');
  const [minGpus, setMinGpus] = useState<number>(0);
  const [maxGpus, setMaxGpus] = useState<number>(0);
  const [memGb, setMemGb] = useState<number>(8);

  // Analytics State
  const [analyticsTrends, setAnalyticsTrends] = useState<{ timestamp: number; requests: number; errorRate: number; latency: number }[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [versionAdoption, setVersionAdoption] = useState<any[]>([]);

  // Security Audit State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Diagnostics State
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [runningTests, setRunningTests] = useState(false);

  // Validation Check State
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // 1. Initial Load and Catalog sync
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const criteria: SearchCriteria = {
          query: searchQuery || undefined,
          framework: filterFramework !== 'all' ? filterFramework as any : undefined,
          capability: filterCategory !== 'all' ? filterCategory : undefined,
          sortBy,
          sortOrder: 'asc'
        };
        const list = await mockModelRegistryAPI.searchModels(criteria);
        setModels(list);

        if (list.length > 0 && !selectedModel) {
          setSelectedModel(list[0]);
        }
      } catch (err: any) {
        showToast(`Failed to load model registry: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [searchQuery, filterCategory, filterFramework, sortBy, retryTrigger]);

  // 2. Fetch dependencies when a model is selected
  useEffect(() => {
    if (!selectedModel) return;
    const fetchModelDetails = async () => {
      try {
        const [vers, deps, hist, trends, summary, adoption] = await Promise.all([
          mockModelRegistryAPI.getVersions(selectedModel.id),
          mockModelRegistryAPI.getDeploymentsForModel(selectedModel.id),
          mockModelRegistryAPI.getDeploymentHistory(selectedModel.id),
          mockModelRegistryAPI.getHistoricalTrends(selectedModel.id),
          mockModelRegistryAPI.getPerformanceSummary(selectedModel.id),
          mockModelRegistryAPI.getVersionAdoption(selectedModel.id)
        ]);

        setVersions(vers);
        setDeployments(deps);
        setDeploymentHistory(hist);
        setAnalyticsTrends(trends);
        setPerformanceSummary(summary);
        setVersionAdoption(adoption);

        if (vers.length > 0) {
          setSelectedVerCode(vers[0].version);
          setDeployVer(vers[0].version);
          if (vers.length >= 2) {
            setCompareVerCodeA(vers[0].version);
            setCompareVerCodeB(vers[1].version);
          } else {
            setCompareVerCodeA(vers[0].version);
            setCompareVerCodeB(vers[0].version);
          }
        } else {
          setSelectedVerCode('');
          setDeployVer('');
        }
      } catch (err: any) {
        showToast(`Error fetching details: ${err.message}`);
      }
    };
    fetchModelDetails();
  }, [selectedModel, retryTrigger]);

  // 3. Fetch logs and validations
  useEffect(() => {
    if (!selectedModel || !selectedVerCode) {
      setValidationRuns([]);
      return;
    }
    const fetchValidations = async () => {
      try {
        const list = await mockModelRegistryAPI.getValidationRuns(selectedModel.id, selectedVerCode);
        setValidationRuns(list);
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchValidations();
  }, [selectedModel, selectedVerCode, retryTrigger]);

  // 4. Fetch security logs when security tab active
  useEffect(() => {
    if (activeTab !== 'security') return;
    const fetchAudits = async () => {
      try {
        const logs = await mockModelRegistryAPI.getAuditLogs(currentRole);
        setAuditLogs(logs);
      } catch (err: any) {
        showToast(err.message || 'Failed to fetch audits');
      }
    };
    fetchAudits();
  }, [activeTab, currentRole, retryTrigger]);

  // 5. Version comparisons logic
  useEffect(() => {
    if (!selectedModel || !compareVerCodeA || !compareVerCodeB) {
      setVersionDiff(null);
      return;
    }
    const fetchDiff = async () => {
      try {
        const diff = await mockModelRegistryAPI.compareVersions(selectedModel.id, compareVerCodeA, compareVerCodeB);
        setVersionDiff(diff);
      } catch (err: any) {
        setVersionDiff(null);
      }
    };
    fetchDiff();
  }, [selectedModel, compareVerCodeA, compareVerCodeB]);

  // 6. Subscribe to Deployment Scheduler Ticks
  useEffect(() => {
    const unsubscribe = DeploymentScheduler.getInstance().subscribe(() => {
      // Periodic update check for deployments and history
      if (selectedModel) {
        mockModelRegistryAPI.getDeploymentsForModel(selectedModel.id).then(setDeployments);
        mockModelRegistryAPI.getDeploymentHistory(selectedModel.id).then(setDeploymentHistory);
      }
      mockModelRegistryAPI.getDeployments().then(list => {
        // Sync deployments globally if needed
      });
    });
    return () => unsubscribe();
  }, [selectedModel]);

  // Handle Model Registration Form
  const handleRegisterModel = async () => {
    const tagArray = regTags.split(',').map(t => t.trim()).filter(Boolean);
    const metadata: ModelMetadata = {
      id: regId.trim(),
      name: regName.trim(),
      description: regDesc.trim(),
      publisher: {
        name: regPubName.trim(),
        verified: true,
        reputationScore: 90,
        supportEmail: regPubEmail.trim(),
        website: regPubWebsite.trim()
      },
      category: regCategory,
      tags: tagArray,
      framework: regFramework,
      license: regLicense.trim(),
      documentationUrl: regDocUrl.trim(),
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await mockModelRegistryAPI.registerModel(metadata, currentRole);
      showToast('Model registered successfully.');
      setRetryTrigger(prev => prev + 1);
      setShowRegModal(false);

      // Reset Form fields
      setRegId('');
      setRegName('');
      setRegDesc('');
      setRegPubName('');
      setRegPubEmail('');
      setRegPubWebsite('');
      setRegTags('');
    } catch (err: any) {
      showToast(err.message || 'Registration failed');
    }
  };

  // Handle Version Publish Form
  const handlePublishVersion = async () => {
    if (!selectedModel) return;

    let parsedDeps: Record<string, string> = {};
    try {
      if (verDeps.trim()) {
        parsedDeps = JSON.parse(verDeps);
      }
    } catch (e) {
      showToast('Invalid dependencies JSON format. Match e.g. {"onnxruntime": ">=1.15.0"}');
      return;
    }

    const version: ModelVersion = {
      version: verCode.trim(),
      modelId: selectedModel.id,
      releaseNotes: verNotes.trim(),
      releaseDate: Date.now(),
      checksum: verChecksum.trim(),
      sizeBytes: verSizeMb * 1024 * 1024,
      inputSchema: { fields: [{ name: 'prompt', type: 'string', description: 'Query prompt', required: true }] },
      outputSchema: { fields: [{ name: 'response', type: 'string', description: 'Generated text output', required: true }] },
      status: 'active',
      dependencies: parsedDeps,
      hyperparameterSchema: {
        temperature: { type: 'number', default: 0.2, description: 'Generation temperature limits' }
      },
      parametersCount: verParams.trim() || 'unknown'
    };

    try {
      await mockModelRegistryAPI.publishVersion(version, currentRole);
      showToast(`Version ${verCode} published successfully.`);
      setRetryTrigger(prev => prev + 1);
      setShowVerModal(false);

      // Reset inputs
      setVerCode('');
      setVerNotes('');
      setVerChecksum('sha256_');
      setVerSizeMb(0);
      setVerParams('');
      setVerDeps('');
    } catch (err: any) {
      showToast(err.message || 'Publish failed');
    }
  };

  // Handle Model Deployment Creation
  const handleDeployModel = async () => {
    if (!selectedModel || !deployVer) return;

    try {
      const dep = await mockModelRegistryAPI.triggerDeployment({
        modelId: selectedModel.id,
        version: deployVer,
        environment: selectedEnv,
        strategy: deployStrategy,
        gpuType,
        minGpus,
        maxGpus,
        memoryPerReplicaGb: memGb,
        role: currentRole
      });

      showToast(`Deployment initiated successfully (ID: ${dep.id})`);
      setRetryTrigger(prev => prev + 1);
      setShowDeployModal(false);
    } catch (err: any) {
      showToast(err.message || 'Deployment setup failed');
    }
  };

  // Handle Deployment rollback
  const handleRollback = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to rollback this deployment?')) return;
    try {
      const version = await mockModelRegistryAPI.rollbackDeployment(deploymentId, currentRole);
      showToast(`Deployment rolled back successfully to version v${version}.`);
      setRetryTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Rollback failed.');
    }
  };

  // Handle traffic shift slider
  const handleTrafficShift = async (deploymentId: string, weight: number) => {
    try {
      await mockModelRegistryAPI.shiftTraffic(deploymentId, weight, currentRole);
      showToast(`Traffic weight shifted successfully to ${weight}%.`);
      setRetryTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Traffic split update failed.');
    }
  };

  // Trigger Pre-deployment validation manual audit
  const handleRunValidation = async () => {
    if (!selectedModel || !selectedVerCode || isValidating) return;
    setIsValidating(true);
    try {
      await mockModelRegistryAPI.triggerPredeploymentValidation(selectedModel.id, selectedVerCode, currentRole);
      showToast('Validation suite executed. All runs logged.');
      setRetryTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Validation suite crashed');
    } finally {
      setIsValidating(false);
    }
  };

  // Trigger test runner diagnostics
  const handleRunTests = async () => {
    if (runningTests) return;
    setRunningTests(true);
    setTestResults(null);
    try {
      const results = await ModelRegistryTestSuite.runTests();
      setTestResults(results);
      showToast(`Diagnostic finished: ${results.passed}/${results.total} checks passed.`);
    } catch (e) {
      showToast('Diagnostic tests encountered system crash.');
    } finally {
      setRunningTests(false);
    }
  };

  // Handle model deprecation toggle
  const handleDeprecateModel = async (status: 'active' | 'deprecated' | 'retired') => {
    if (!selectedModel) return;
    try {
      await mockModelRegistryAPI.updateModelLifecycle(selectedModel.id, status, currentRole);
      showToast(`Model status updated to ${status}.`);
      setRetryTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Status transition failed.');
    }
  };

  // Export report categories
  const handleDownloadCSV = async (category: 'models' | 'deployments' | 'versions' | 'validations') => {
    if (!selectedModel) return;
    try {
      const csv = await mockModelRegistryAPI.exportCSV(selectedModel.id, category);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `model-${category}-report-${selectedModel.id}.csv`);
      link.click();
      showToast('CSV report generated and downloaded.');
    } catch (err: any) {
      showToast('Export failed.');
    }
  };

  const handlePrintHTML = async () => {
    if (!selectedModel) return;
    try {
      const html = await mockModelRegistryAPI.getPrintHTML(selectedModel.id);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
      showToast('Print dossier generated in secondary window.');
    } catch (err: any) {
      showToast('Dossier rendering failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 text-white font-sans selection:bg-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header section with simulated role selector */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800/80 pb-5 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
              <Archive className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                AI Model Registry & Version Management
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                Enterprise Model Cataloging, Dependency Graph Verification, and Canary Rollout Controls
              </p>
            </div>
          </div>

          {/* Role selector for authorization trials */}
          <div className="bg-slate-900/60 border border-gray-800/80 p-2.5 rounded-xl flex items-center space-x-3 shadow-inner self-start">
            <div className="flex items-center space-x-1 text-xs text-gray-400 font-bold">
              <UserCheck size={14} className="text-blue-400" />
              <span>Simulated Role:</span>
            </div>
            <select
              value={currentRole}
              onChange={e => setCurrentRole(e.target.value as UserRole)}
              className="bg-slate-950 border border-gray-850 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-600 text-white font-bold cursor-pointer"
            >
              <option value="Architect">Architect (Admin)</option>
              <option value="Operator">Operator (Deployer)</option>
              <option value="Auditor">Auditor (Read-Only)</option>
            </select>
          </div>
        </div>

        {/* Tab navigations */}
        <div className="bg-slate-900/40 border border-gray-850 rounded-xl p-1 flex flex-wrap gap-1 shadow-inner">
          {[
            { id: 'catalog', label: 'Model Catalog', icon: Database },
            { id: 'versions', label: 'Versions & Comparison', icon: ArrowRightLeft },
            { id: 'deployments', label: 'Deployment Hub', icon: Layers },
            { id: 'analytics', label: 'Analytics Studio', icon: BarChart2 },
            { id: 'security', label: 'Security & Audits', icon: Shield },
            { id: 'diagnostics', label: 'Diagnostics Diagnostics', icon: FileCheck }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

        {/* Layout details split grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: model catalog summary navigation (omitted only in security/diagnostics tabs to preserve full-width layout) */}
          {activeTab !== 'security' && activeTab !== 'diagnostics' && (
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-4 shadow-sm">
                
                {/* Registration trigger */}
                <div className="flex justify-between items-center border-b border-gray-850 pb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Models Catalog</span>
                  <button
                    onClick={() => {
                      if (currentRole !== 'Architect') {
                        showToast('Access Denied: Only users with the Architect role can register models.');
                        return;
                      }
                      setShowRegModal(true);
                    }}
                    className="p-1.5 rounded bg-blue-950 border border-blue-800 text-blue-400 hover:bg-blue-900 transition-colors flex items-center space-x-1 text-xs font-bold"
                  >
                    <Plus size={12} />
                    <span>Register</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  <div className="flex bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 items-center space-x-2">
                    <Search size={14} className="text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search model registry..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none text-xs focus:outline-none w-full text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                      className="bg-slate-950 border border-gray-850 rounded-xl px-2 py-1.5 text-[10px] text-gray-300 font-bold focus:outline-none"
                    >
                      <option value="all">All Capabilities</option>
                      <option value="Natural Language Processing">NLP</option>
                      <option value="Computer Vision">Vision</option>
                      <option value="Multimodal">Multimodal</option>
                    </select>

                    <select
                      value={filterFramework}
                      onChange={e => setFilterFramework(e.target.value)}
                      className="bg-slate-950 border border-gray-850 rounded-xl px-2 py-1.5 text-[10px] text-gray-300 font-bold focus:outline-none"
                    >
                      <option value="all">All Frameworks</option>
                      <option value="PyTorch">PyTorch</option>
                      <option value="ONNX">ONNX</option>
                      <option value="GGUF">GGUF</option>
                      <option value="API Proxy">API Proxy</option>
                    </select>
                  </div>
                </div>

                {/* Model Lists */}
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse bg-slate-800/40 h-16 rounded-xl border border-gray-850" />
                    ))}
                  </div>
                ) : models.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 italic">No models match criteria.</div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {models.map(m => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModel(m)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center group ${
                          selectedModel?.id === m.id
                            ? 'bg-blue-950/20 border-blue-700 text-white'
                            : 'bg-slate-900/20 border-gray-850 text-gray-400 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className={`font-bold text-xs ${selectedModel?.id === m.id ? 'text-white' : 'text-gray-200'}`}>{m.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {m.publisher.name} &bull; <span className="capitalize">{m.framework}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                            m.status === 'active' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' :
                            m.status === 'deprecated' ? 'bg-amber-950/40 border-amber-800 text-amber-400' :
                            'bg-red-950/40 border-red-900 text-red-400'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selection Summary details card */}
              {selectedModel && (
                <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl space-y-3 text-xs shadow-sm">
                  <h3 className="font-bold text-gray-200 uppercase tracking-wide text-[10px] border-b border-gray-850 pb-2 flex justify-between items-center">
                    <span>Active Metadata Card</span>
                    <button
                      onClick={handlePrintHTML}
                      className="p-1 rounded bg-slate-900 border border-gray-800 hover:bg-slate-800 text-gray-400 transition-colors"
                      title="Print Audit dossier"
                    >
                      <Download size={10} />
                    </button>
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-400">Model ID:</span> <span className="font-mono font-bold text-white">{selectedModel.id}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">License:</span> <span className="text-white font-mono">{selectedModel.license}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Publisher:</span> <span className="text-white font-bold">{selectedModel.publisher.name}</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Support:</span>
                      <a href={`mailto:${selectedModel.publisher.supportEmail}`} className="text-blue-400 font-medium hover:underline">{selectedModel.publisher.supportEmail}</a>
                    </div>
                    {selectedModel.documentationUrl && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Docs link:</span>
                        <a href={selectedModel.documentationUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Explore Reference</a>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-gray-850 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Capability Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedModel.tags.map(t => (
                          <span key={t} className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-blue-400 border border-blue-950 font-mono">#{t}</span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-850 space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Audits & Lifecycle Status</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDeprecateModel('active')}
                          disabled={selectedModel.status === 'active' || currentRole !== 'Architect'}
                          className="flex-1 py-1 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-400 font-bold text-[8px] hover:bg-emerald-900/60 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Active
                        </button>
                        <button
                          onClick={() => handleDeprecateModel('deprecated')}
                          disabled={selectedModel.status === 'deprecated' || currentRole !== 'Architect'}
                          className="flex-1 py-1 rounded bg-amber-950/40 border border-amber-900 text-amber-400 font-bold text-[8px] hover:bg-amber-950/60 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Deprecate
                        </button>
                        <button
                          onClick={() => handleDeprecateModel('retired')}
                          disabled={selectedModel.status === 'retired' || currentRole !== 'Architect'}
                          className="flex-1 py-1 rounded bg-red-950/40 border border-red-900 text-red-400 font-bold text-[8px] hover:bg-red-900/60 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Retire
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right panel: Active Tab Content */}
          <div className={`${activeTab === 'security' || activeTab === 'diagnostics' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
            
            {/* Catalog details view */}
            {activeTab === 'catalog' && selectedModel && (
              <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-850 pb-4 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedModel.name}</h2>
                    <p className="text-xs text-gray-400 mt-1">{selectedModel.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-[10px] bg-slate-950 border border-gray-850 text-gray-300 font-bold px-2 py-1.5 rounded-xl font-mono capitalize">
                      Framework: {selectedModel.framework}
                    </span>
                    <span className="text-[10px] bg-slate-950 border border-gray-850 text-gray-300 font-bold px-2 py-1.5 rounded-xl font-mono capitalize">
                      Category: {selectedModel.category}
                    </span>
                  </div>
                </div>

                {/* Subsections: versions summary and validation runs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Versions listed */}
                  <div className="space-y-3 bg-slate-950/40 border border-gray-850 p-4 rounded-2xl">
                    <h4 className="text-xs font-bold text-gray-300 flex items-center space-x-1.5 border-b border-gray-850 pb-2">
                      <Code size={14} className="text-blue-400" />
                      <span>Version List</span>
                    </h4>

                    {versions.length === 0 ? (
                      <div className="text-xs text-gray-500 italic">No versions published.</div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {versions.map(v => (
                          <div
                            key={v.version}
                            onClick={() => setSelectedVerCode(v.version)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer flex justify-between items-center transition-colors ${
                              selectedVerCode === v.version
                                ? 'bg-blue-950/20 border-blue-700'
                                : 'bg-slate-900/20 border-gray-850 hover:bg-slate-900/40'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-gray-200">v{v.version}</div>
                              <div className="text-[9px] text-gray-500 font-mono mt-0.5">{v.parametersCount} &bull; {(v.sizeBytes / (1024*1024)).toFixed(0)}MB</div>
                            </div>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                              v.status === 'active' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-amber-950 border-amber-800 text-amber-400'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Validations check overview */}
                  <div className="space-y-3 bg-slate-950/40 border border-gray-850 p-4 rounded-2xl">
                    <div className="flex justify-between items-center border-b border-gray-850 pb-2">
                      <h4 className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                        <ShieldCheck size={14} className="text-indigo-400" />
                        <span>Pre-deployment Verification</span>
                      </h4>
                      {selectedVerCode && (
                        <button
                          onClick={handleRunValidation}
                          disabled={isValidating}
                          className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[9px] font-bold text-white rounded-lg transition-colors cursor-pointer"
                        >
                          {isValidating ? 'Validating...' : 'Trigger Run'}
                        </button>
                      )}
                    </div>

                    {validationRuns.length === 0 ? (
                      <div className="text-xs text-gray-500 italic p-3">No validation runs logged for v{selectedVerCode}. Press "Trigger Run" to test version.</div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {validationRuns.map(run => (
                          <div key={run.id} className="p-2.5 rounded-xl bg-slate-900/40 border border-gray-850 text-[10px] space-y-1">
                            <div className="flex justify-between items-center font-bold">
                              <span className="capitalize font-mono text-gray-200">{run.type} check</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] border capitalize ${
                                run.status === 'passed' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' :
                                run.status === 'warning' ? 'bg-amber-950 border-amber-800 text-amber-400' :
                                'bg-red-950 border-red-800 text-red-400'
                              }`}>
                                {run.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-500 text-[8px]">
                              <span>Latency: {run.durationMs}ms</span>
                              <span>{new Date(run.checkedAt).toLocaleDateString()}</span>
                            </div>
                            {run.results.issues.length > 0 && (
                              <div className="pt-1 border-t border-gray-850 mt-1 space-y-1">
                                {run.results.issues.map((iss, i) => (
                                  <div key={i} className="text-[8px] text-amber-400 leading-normal flex items-start space-x-1">
                                    <span className="font-bold flex-shrink-0">[{iss.rule}]:</span>
                                    <span>{iss.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Release notes block */}
                {selectedVerCode && versions.find(v => v.version === selectedVerCode) && (
                  <div className="p-4 bg-slate-950/60 border border-gray-850 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-gray-850 pb-1.5 font-bold text-gray-300">
                      <span>Release Dossier v{selectedVerCode}</span>
                      <span className="font-mono text-[9px] text-gray-500">Checksum: {versions.find(v => v.version === selectedVerCode)?.checksum}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed font-medium">{versions.find(v => v.version === selectedVerCode)?.releaseNotes}</p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-850/60 mt-3 text-[10px]">
                      <div>
                        <span className="text-gray-500 block uppercase font-bold text-[8px] mb-1">Input interface</span>
                        <div className="font-mono bg-slate-900 p-2 rounded-xl border border-gray-850 space-y-1 max-h-32 overflow-y-auto">
                          {versions.find(v => v.version === selectedVerCode)?.inputSchema.fields.map(f => (
                            <div key={f.name} className="flex justify-between">
                              <span className="text-blue-400">{f.name}{f.required ? '*' : ''}</span>
                              <span className="text-gray-500">{f.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block uppercase font-bold text-[8px] mb-1">Output Interface</span>
                        <div className="font-mono bg-slate-900 p-2 rounded-xl border border-gray-850 space-y-1 max-h-32 overflow-y-auto">
                          {versions.find(v => v.version === selectedVerCode)?.outputSchema.fields.map(f => (
                            <div key={f.name} className="flex justify-between">
                              <span className="text-emerald-400">{f.name}</span>
                              <span className="text-gray-500">{f.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Version control compare tab */}
            {activeTab === 'versions' && selectedModel && (
              <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                  <h3 className="text-lg font-bold text-white">Semantic Versions Comparison</h3>
                  <button
                    onClick={() => {
                      if (currentRole !== 'Architect') {
                        showToast('Access Denied: Only users with the Architect role can publish versions.');
                        return;
                      }
                      setShowVerModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Plus size={14} />
                    <span>Publish Version</span>
                  </button>
                </div>

                {/* Dropdowns side-by-side select */}
                <div className="bg-slate-950/60 border border-gray-850 p-4 rounded-2xl flex flex-wrap gap-4 items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Baseline (Version A):</span>
                    <select
                      value={compareVerCodeA}
                      onChange={e => setCompareVerCodeA(e.target.value)}
                      className="bg-slate-950 border border-gray-850 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-600 text-white font-bold cursor-pointer"
                    >
                      {versions.map(v => (
                        <option key={v.version} value={v.version}>v{v.version} - {v.status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Candidate (Version B):</span>
                    <select
                      value={compareVerCodeB}
                      onChange={e => setCompareVerCodeB(e.target.value)}
                      className="bg-slate-950 border border-gray-850 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-600 text-white font-bold cursor-pointer"
                    >
                      {versions.map(v => (
                        <option key={v.version} value={v.version}>v{v.version} - {v.status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Diff comparative panel */}
                {versionDiff ? (
                  <div className="space-y-4">
                    
                    {/* Attributes compared grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Parameter diff */}
                      <div className="p-4 bg-slate-950/40 border border-gray-850 rounded-2xl text-xs space-y-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold block border-b border-gray-850 pb-1">Parameter Weight Change</span>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Baseline Size:</span>
                          <span className="font-mono text-white font-bold">{versionDiff.parameterDiff.sizeA}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Candidate Size:</span>
                          <span className="font-mono text-white font-bold">{versionDiff.parameterDiff.sizeB}</span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-gray-850/60">
                          <span>Mutation Status:</span>
                          <span className={`font-bold ${versionDiff.parameterDiff.changed ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {versionDiff.parameterDiff.changed ? 'Weights Changed' : 'Weights Identical'}
                          </span>
                        </div>
                      </div>

                      {/* Schema diff status */}
                      <div className="p-4 bg-slate-950/40 border border-gray-850 rounded-2xl text-xs space-y-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold block border-b border-gray-850 pb-1">Schema Signature Audit</span>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Input Changed:</span>
                          <span className={`font-bold ${versionDiff.schemaDiff.inputChanged ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {versionDiff.schemaDiff.inputChanged ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Output Changed:</span>
                          <span className={`font-bold ${versionDiff.schemaDiff.outputChanged ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {versionDiff.schemaDiff.outputChanged ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-300 italic pt-1 leading-normal">{versionDiff.schemaDiff.message}</p>
                      </div>
                    </div>

                    {/* Dependency diff comparison lists */}
                    <div className="p-4 bg-slate-950/40 border border-gray-850 rounded-2xl text-xs space-y-3">
                      <span className="text-[10px] text-gray-500 uppercase font-bold block border-b border-gray-850 pb-1">Dependency Requirements Compare</span>
                      
                      {versionDiff.dependenciesDiff.length === 0 ? (
                        <div className="text-xs text-gray-500 italic text-center p-2">Both versions have identical and empty software dependencies requirements.</div>
                      ) : (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                          {versionDiff.dependenciesDiff.map((dep, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-slate-900/60 rounded-lg border border-gray-850/60">
                              <span className="font-mono font-bold text-gray-200">{dep.name}</span>
                              <div className="flex items-center space-x-2 text-[10px]">
                                <span className="font-mono text-gray-400">{dep.verA || 'none'}</span>
                                <span>&rarr;</span>
                                <span className="font-mono text-white font-bold">{dep.verB || 'none'}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] border font-bold capitalize ${
                                  dep.changeType === 'added' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' :
                                  dep.changeType === 'removed' ? 'bg-red-950 border-red-800 text-red-400' :
                                  dep.changeType === 'changed' ? 'bg-amber-950 border-amber-800 text-amber-400' :
                                  'bg-slate-950 border-gray-800 text-gray-500'
                                }`}>
                                  {dep.changeType}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-500 italic">Select distinct versions to calculate comparisons.</div>
                )}
              </div>
            )}

            {/* Deployments tab view */}
            {activeTab === 'deployments' && selectedModel && (
              <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6 shadow-sm">
                
                {/* Selector header bar */}
                <div className="flex justify-between items-center border-b border-gray-850 pb-3 flex-wrap gap-4">
                  <div className="flex bg-slate-950/60 p-1 border border-gray-850 rounded-xl space-x-1">
                    {(['development', 'testing', 'staging', 'production'] as const).map(env => (
                      <button
                        key={env}
                        onClick={() => setSelectedEnv(env)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          selectedEnv === env ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (currentRole !== 'Architect' && currentRole !== 'Operator') {
                        showToast('Access Denied: Only user roles with Operator or Architect can schedule deployments.');
                        return;
                      }
                      setShowDeployModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Play size={14} className="fill-white" />
                    <span>Deploy Version</span>
                  </button>
                </div>

                {/* Active deployments in active environment */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Active Deployments ({selectedEnv})</h4>
                  
                  {deployments.filter(d => d.environment === selectedEnv).length === 0 ? (
                    <div className="p-8 bg-slate-950/20 border border-gray-850 border-dashed rounded-2xl text-center text-xs text-gray-500 italic">
                      No active version deployments mapped to the {selectedEnv} environment.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deployments.filter(d => d.environment === selectedEnv).map(dep => (
                        <div key={dep.id} className="p-4 bg-slate-950/60 border border-gray-850 rounded-2xl space-y-4 shadow-inner">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-white">v{dep.version}</span>
                                <span className="text-[10px] text-gray-500 font-mono">({dep.id})</span>
                              </div>
                              <div className="text-[9px] text-gray-400 mt-0.5">
                                GPU Type: {dep.clusterConfig.gpuType} &bull; Memory: {dep.clusterConfig.memoryPerReplicaGb}GB &bull; Strategy: <span className="capitalize">{dep.strategy}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded border capitalize ${
                                dep.status === 'active' ? 'bg-emerald-950 border-emerald-800 text-emerald-400' :
                                dep.status === 'deploying' ? 'bg-blue-950 border-blue-800 text-blue-400 animate-pulse' :
                                'bg-red-950 border-red-900 text-red-400'
                              }`}>
                                {dep.status === 'deploying' ? `Booting (${dep.activeReplicas}/${dep.targetReplicas})` : dep.status}
                              </span>
                              <button
                                onClick={() => handleRollback(dep.id)}
                                className="py-1 px-2.5 bg-red-950 border border-red-800 text-red-400 hover:bg-red-900/60 text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Rollback
                              </button>
                            </div>
                          </div>

                          {/* Traffic shift slider for Canary */}
                          {dep.strategy === 'canary' && dep.status === 'active' && (
                            <div className="space-y-1.5 p-3 bg-slate-900/60 border border-gray-850 rounded-xl">
                              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                                <span>Canary Traffic: {dep.currentTrafficWeight}%</span>
                                <span>Baseline Stable: {100 - dep.currentTrafficWeight}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={dep.currentTrafficWeight}
                                onChange={e => handleTrafficShift(dep.id, Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Deployment history logs */}
                <div className="space-y-2 border-t border-gray-850 pt-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <History size={14} className="text-gray-400" />
                    <span>Deployment Topology Log history</span>
                  </h4>
                  <div className="w-full h-44 bg-slate-950 border border-gray-850 rounded-2xl p-4 font-mono text-[10px] text-gray-300 overflow-y-auto space-y-1.5 shadow-inner">
                    {deploymentHistory.length === 0 ? (
                      <div className="text-gray-500 italic">No history records logged.</div>
                    ) : (
                      deploymentHistory.map(log => (
                        <div key={log.id} className="flex justify-between border-b border-gray-850/40 pb-1 flex-wrap gap-2 text-gray-400">
                          <div>
                            <span className="text-blue-400 font-bold">[{log.eventType.toUpperCase()}]</span>{' '}
                            <span className="text-gray-200">v{log.version} ({log.environment})</span>{' '}
                            &bull; {log.message}
                          </div>
                          <div className="text-gray-500 text-[8px]">
                            {log.user} &bull; {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && selectedModel && (
              <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6 shadow-sm">
                <h3 className="text-lg font-bold text-white border-b border-gray-850 pb-3">Operational Analytics Studio</h3>

                {performanceSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                      <span className="text-gray-500 block uppercase font-bold text-[8px]">Accumulated Requests</span>
                      <div className="text-xl font-black mt-1 text-white">{performanceSummary.accumulatedRequests}</div>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                      <span className="text-gray-500 block uppercase font-bold text-[8px]">P50 Average Latency</span>
                      <div className="text-xl font-black mt-1 text-emerald-400">{performanceSummary.avgLatencyP50} ms</div>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                      <span className="text-gray-500 block uppercase font-bold text-[8px]">P99 Latency</span>
                      <div className="text-xl font-black mt-1 text-orange-400">{performanceSummary.avgLatencyP99} ms</div>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                      <span className="text-gray-500 block uppercase font-bold text-[8px]">Total Accrued Cost</span>
                      <div className="text-xl font-black mt-1 text-amber-400">${performanceSummary.avgThroughput} tok/s</div>
                    </div>
                  </div>
                )}

                {/* 7-day request history graph */}
                {analyticsTrends.length > 0 && (
                  <div className="bg-slate-950/40 border border-gray-850 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                      <TrendingUp size={12} className="text-blue-400" />
                      <span>Traffic & Latency trends (Last 7 Days)</span>
                    </h4>

                    <div className="h-32 flex items-end justify-between gap-1 pt-6 px-4 border-b border-l border-gray-850 relative">
                      {analyticsTrends.map((t, idx) => {
                        const heightPercent = Math.min(100, Math.max(15, (t.requests / 10000) * 100));
                        return (
                          <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                            <div className="absolute bottom-full mb-2 bg-slate-900 text-[8px] border border-gray-850 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 w-24">
                              <div className="text-gray-500 font-mono">{new Date(t.timestamp).toLocaleDateString()}</div>
                              <div className="text-blue-400">Requests: {t.requests}</div>
                              <div className="text-emerald-400">Avg Lat: {t.latency}ms</div>
                            </div>
                            <div className="w-4 bg-blue-600 rounded-t-sm" style={{ height: `${heightPercent}%` }} />
                            <div className="text-[6px] text-gray-500 font-mono mt-1">Day {idx + 1}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Version Adoption Breakdown */}
                {versionAdoption.length > 0 && (
                  <div className="p-4 bg-slate-950/40 border border-gray-850 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-gray-300">Version Adoption split</h4>
                    <div className="space-y-3">
                      {versionAdoption.map(entry => (
                        <div key={entry.version} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono text-gray-300">
                            <span>Version v{entry.version}</span>
                            <span>{entry.percentage}% ({entry.requestCount} requests)</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-gray-850/80">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${entry.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exporters buttons row */}
                <div className="flex gap-2 justify-end border-t border-gray-850 pt-4">
                  <button
                    onClick={() => handleDownloadCSV('models')}
                    className="p-2.5 rounded bg-slate-950 border border-gray-850 hover:bg-slate-900 text-xs font-bold text-gray-300 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Download Models CSV</span>
                  </button>
                  <button
                    onClick={() => handleDownloadCSV('deployments')}
                    className="p-2.5 rounded bg-slate-950 border border-gray-850 hover:bg-slate-900 text-xs font-bold text-gray-300 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Download Deployments CSV</span>
                  </button>
                </div>
              </div>
            )}

            {/* Security Audit log tab */}
            {activeTab === 'security' && (
              <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6 shadow-sm">
                <h3 className="text-lg font-bold text-white border-b border-gray-850 pb-3 flex justify-between items-center">
                  <span>Security & Audit Trails Log</span>
                  <button
                    onClick={() => setRetryTrigger(prev => prev + 1)}
                    className="p-2 rounded bg-slate-950 border border-gray-850 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} />
                  </button>
                </h3>

                <div className="w-full h-96 bg-slate-950 border border-gray-850 rounded-2xl p-4 font-mono text-[10px] text-gray-300 overflow-y-auto space-y-2 shadow-inner">
                  {auditLogs.length === 0 ? (
                    <div className="text-gray-500 italic p-4 text-center">No security logs recorded.</div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className="flex justify-between border-b border-gray-850/40 pb-2 flex-wrap gap-2 leading-relaxed">
                        <div>
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] mr-1.5 border ${
                            log.action.includes('UNAUTHORIZED') ? 'bg-red-950 border-red-800 text-red-400' : 'bg-blue-950 border-blue-800 text-blue-400'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-gray-200">{log.details}</span>
                        </div>
                        <div className="text-gray-500 text-[8px]">
                          Role: <span className="text-gray-300 font-bold">{log.userRole}</span> &bull; {log.userId} &bull; {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Diagnostics Tab */}
            {activeTab === 'diagnostics' && (
              <div className="bg-slate-900/40 border border-gray-850 p-6 rounded-3xl space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Diagnostic Assertion Lab</h3>
                    <p className="text-xs text-gray-400 mt-1">Execute custom unit and integration test assertions directly on the browser runtime.</p>
                  </div>
                  <button
                    onClick={handleRunTests}
                    disabled={runningTests}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition shadow cursor-pointer flex items-center space-x-1.5"
                  >
                    {runningTests ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} className="fill-white" />
                        <span>Run Test Suite</span>
                      </>
                    )}
                  </button>
                </div>

                {testResults && (
                  <div className="space-y-4">
                    
                    {/* test metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                        <span className="text-gray-400 block text-[8px] uppercase">Total Tests</span>
                        <div className="text-xl font-black mt-1 text-white">{testResults.total}</div>
                      </div>
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                        <span className="text-gray-400 block text-[8px] uppercase">Passed</span>
                        <div className="text-xl font-black mt-1 text-emerald-400">{testResults.passed}</div>
                      </div>
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                        <span className="text-gray-400 block text-[8px] uppercase">Failed</span>
                        <div className="text-xl font-black mt-1 text-red-500">{testResults.failed}</div>
                      </div>
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-850">
                        <span className="text-gray-400 block text-[8px] uppercase">Duration</span>
                        <div className="text-xl font-black mt-1 text-blue-400">{testResults.duration} ms</div>
                      </div>
                    </div>

                    {/* detailed lists */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {testResults.tests.map((test, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                            test.passed ? 'bg-emerald-950/10 border-emerald-900/60 text-emerald-400' : 'bg-red-950/10 border-red-900/60 text-red-400'
                          }`}
                        >
                          <div>
                            <span className="font-bold opacity-60">[{test.suite}]</span>{' '}
                            <span className="font-medium text-gray-200">{test.name}</span>
                            {test.error && (
                              <div className="text-[10px] text-red-500 font-mono mt-1 bg-red-950/30 p-2 rounded-lg leading-relaxed">
                                Error: {test.error}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-mono opacity-80">{test.duration}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODAL 1: REGISTER MODEL */}
        <AnimatePresence>
          {showRegModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-gray-850 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setShowRegModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
                <h3 className="text-lg font-bold text-white">Register AI Model</h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Model ID</label>
                    <input
                      type="text"
                      placeholder="gemini-3.5-flash"
                      value={regId}
                      onChange={e => setRegId(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Model Name</label>
                    <input
                      type="text"
                      placeholder="Gemini 3.5 Flash"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-gray-400 font-bold block">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide a detailed description of the model weights functionality..."
                    value={regDesc}
                    onChange={e => setRegDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Category</label>
                    <select
                      value={regCategory}
                      onChange={e => setRegCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="Natural Language Processing">NLP</option>
                      <option value="Computer Vision">Vision</option>
                      <option value="Multimodal">Multimodal</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Framework</label>
                    <select
                      value={regFramework}
                      onChange={e => setRegFramework(e.target.value as any)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="PyTorch">PyTorch</option>
                      <option value="ONNX">ONNX</option>
                      <option value="GGUF">GGUF</option>
                      <option value="API Proxy">API Proxy</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">License</label>
                    <input
                      type="text"
                      placeholder="Apache-2.0"
                      value={regLicense}
                      onChange={e => setRegLicense(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Docs URL</label>
                    <input
                      type="text"
                      placeholder="https://ai.google/docs"
                      value={regDocUrl}
                      onChange={e => setRegDocUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-850 pt-3 space-y-3">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Publisher Profile</span>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold block">Publisher Name</label>
                      <input
                        type="text"
                        placeholder="Google AI"
                        value={regPubName}
                        onChange={e => setRegPubName(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold block">Support Email</label>
                      <input
                        type="email"
                        placeholder="support@google.com"
                        value={regPubEmail}
                        onChange={e => setRegPubEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold block">Website</label>
                      <input
                        type="text"
                        placeholder="https://google.com"
                        value={regPubWebsite}
                        onChange={e => setRegPubWebsite(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold block">Tags (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="llm, low-latency"
                        value={regTags}
                        onChange={e => setRegTags(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-850">
                  <button
                    onClick={() => setShowRegModal(false)}
                    className="px-4 py-2 border border-gray-850 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegisterModel}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Register Model
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: PUBLISH VERSION */}
        <AnimatePresence>
          {showVerModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-gray-850 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative"
              >
                <button
                  onClick={() => setShowVerModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
                <h3 className="text-lg font-bold text-white">Publish Model Version</h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Version code (SemVer)</label>
                    <input
                      type="text"
                      placeholder="1.3.0"
                      value={verCode}
                      onChange={e => setVerCode(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Parameters scale</label>
                    <input
                      type="text"
                      placeholder="7B"
                      value={verParams}
                      onChange={e => setVerParams(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">File Size (MB)</label>
                    <input
                      type="number"
                      placeholder="230"
                      value={verSizeMb || ''}
                      onChange={e => setVerSizeMb(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Checksum (SHA256)</label>
                    <input
                      type="text"
                      value={verChecksum}
                      onChange={e => setVerChecksum(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-gray-400 font-bold block">Release Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Enter change logs and notes..."
                    value={verNotes}
                    onChange={e => setVerNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-gray-400 font-bold block">Software Dependencies (JSON map)</label>
                  <input
                    type="text"
                    placeholder='{"onnxruntime": ">=1.15.0"}'
                    value={verDeps}
                    onChange={e => setVerDeps(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-850">
                  <button
                    onClick={() => setShowVerModal(false)}
                    className="px-4 py-2 border border-gray-850 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublishVersion}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Publish Release
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: INITIATE DEPLOYMENT */}
        <AnimatePresence>
          {showDeployModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-gray-850 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative"
              >
                <button
                  onClick={() => setShowDeployModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
                <h3 className="text-lg font-bold text-white">Initiate Model Deployment</h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Version code</label>
                    <select
                      value={deployVer}
                      onChange={e => setDeployVer(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      {versions.map(v => (
                        <option key={v.version} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Environment</label>
                    <select
                      value={selectedEnv}
                      onChange={e => setSelectedEnv(e.target.value as any)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="development">Development</option>
                      <option value="testing">Testing</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Orchestrator Strategy</label>
                    <select
                      value={deployStrategy}
                      onChange={e => setDeployStrategy(e.target.value as any)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="standard">Standard</option>
                      <option value="canary">Canary</option>
                      <option value="blue-green">Blue/Green</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Hardware GPU Class</label>
                    <select
                      value={gpuType}
                      onChange={e => setGpuType(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="Serverless API">Serverless API</option>
                      <option value="NVIDIA T4">NVIDIA T4</option>
                      <option value="NVIDIA A10G">NVIDIA A10G</option>
                      <option value="NVIDIA H100">NVIDIA H100</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Min GPUs</label>
                    <input
                      type="number"
                      value={minGpus}
                      onChange={e => setMinGpus(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-2 py-1.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">Max GPUs</label>
                    <input
                      type="number"
                      value={maxGpus}
                      onChange={e => setMaxGpus(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-2 py-1.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold block">RAM (GB)</label>
                    <input
                      type="number"
                      value={memGb}
                      onChange={e => setMemGb(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-gray-850 rounded-xl px-2 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-850">
                  <button
                    onClick={() => setShowDeployModal(false)}
                    className="px-4 py-2 border border-gray-850 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeployModel}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Deploy
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default ModelRegistryPage;
