import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  FileCheck,
  History,
  AlertTriangle,
  UploadCloud,
  CheckCircle,
  XCircle,
  FileText,
  Lock,
  Download,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Eye,
  ArrowRight,
  Database,
  Info,
  Play,
  RotateCcw
} from 'lucide-react';
import { SovereignPersona } from '../core/sovereign-persona/SovereignPersona';
import {
  BackupSelection,
  BackupHistoryEntry,
  BackupPackage,
  BackupPayload,
  ConflictReport,
  SuiteResults
} from '../core/backup/BackupTypes';
import { BackupUtils, PasswordStrengthReport } from '../core/backup/BackupUtils';
import { BackupHistoryManager } from '../core/backup/BackupHistory';
import { BackupStorage } from '../core/backup/BackupStorage';
import { PersonaBackupService } from '../core/backup/PersonaBackupService';
import { PersonaRestoreService } from '../core/backup/PersonaRestoreService';
import { BackupTestSuite } from '../core/backup/__tests__/backup.test';

interface SovereignPersonaBackupDashboardProps {
  themeClasses: {
    text: string;
    bg: string;
    hoverBg: string;
    disabledBg: string;
    border: string;
    hoverBorder: string;
    focusRing: string;
    shadow: string;
  };
  personaInstance: SovereignPersona;
}

export const SovereignPersonaBackupDashboard: React.FC<SovereignPersonaBackupDashboardProps> = ({
  themeClasses,
  personaInstance
}) => {
  // State for active persona metrics
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [localStoreSize, setLocalStoreSize] = useState(0);

  // History & Filters
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  // Create Backup state
  const [selectedModules, setSelectedModules] = useState<BackupSelection>({
    knowledgeGraph: true,
    ethicalBoundaries: true,
    learningHistory: true,
    privacyPreferences: true,
    professionalContext: true,
    goals: true,
    settings: true,
    carbonPreferences: true,
    interactionMemory: true,
    customPreferences: true
  });
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthReport>({
    score: 0,
    label: 'Weak',
    color: 'bg-red-500',
    feedback: []
  });
  const [backupName, setBackupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);

  // Restore state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileStr, setUploadedFileStr] = useState<string | null>(null);
  const [restoreStep, setRestoreStep] = useState<'upload' | 'inspect' | 'password' | 'preview' | 'confirm' | 'progress'>('upload');
  
  // Decrypted contents for preview & strategy
  const [inspectPkg, setInspectPkg] = useState<BackupPackage | null>(null);
  const [inspectComp, setInspectComp] = useState<{ compatible: boolean; reason?: string } | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [decryptedPayload, setDecryptedPayload] = useState<BackupPayload | null>(null);
  const [conflictReport, setConflictReport] = useState<ConflictReport | null>(null);
  const [restoreStrategy, setRestoreStrategy] = useState<'merge' | 'replace' | 'skip'>('merge');
  const [restoreSelection, setRestoreSelection] = useState<BackupSelection>({
    knowledgeGraph: true,
    ethicalBoundaries: true,
    learningHistory: true,
    privacyPreferences: true,
    professionalContext: true,
    goals: true,
    settings: true,
    carbonPreferences: true,
    interactionMemory: true,
    customPreferences: true
  });
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Diagnostic Test Suite state
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Modals & Renaming
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewBackupId, setPreviewBackupId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh active persona counts
  const refreshPersonaStats = () => {
    const graphState = personaInstance.getCognitiveGraph().exportGraph();
    setNodeCount(graphState.nodes.length);
    setEdgeCount(graphState.edges.length);
    setLocalStoreSize(personaInstance.getLocalStore().size);
  };

  useEffect(() => {
    refreshPersonaStats();
    setHistory(BackupHistoryManager.loadHistory());
  }, [personaInstance]);

  // Handle password meter updates
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordStrength(BackupUtils.checkPasswordStrength(val));
  };

  // Show Toast
  const triggerNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Create Backup
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      triggerNotification('Please enter a password to secure the backup.', 'error');
      return;
    }
    if (passwordStrength.score < 2) {
      triggerNotification('Please choose a stronger password before backing up.', 'error');
      return;
    }

    setIsCreating(true);
    setCreateProgress(10);

    try {
      const interval = setInterval(() => {
        setCreateProgress((p) => Math.min(85, p + 15));
      }, 150);

      // Perform secure backup
      await PersonaBackupService.createBackup(
        personaInstance,
        selectedModules,
        password,
        backupName.trim() || undefined
      );

      clearInterval(interval);
      setCreateProgress(100);
      
      setTimeout(() => {
        setIsCreating(false);
        setPassword('');
        setBackupName('');
        setCreateProgress(0);
        setHistory(BackupHistoryManager.loadHistory());
        refreshPersonaStats();
        triggerNotification('Vault backup completed and stored securely.', 'success');
      }, 400);

    } catch (err: any) {
      setIsCreating(false);
      setCreateProgress(0);
      triggerNotification(err.message || 'Failed to construct backup.', 'error');
    }
  };

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileContentLoaded = (content: string) => {
    try {
      const { pkg, compatibility } = PersonaRestoreService.inspectBackup(content);
      setInspectPkg(pkg);
      setInspectComp(compatibility);
      setUploadedFileStr(content);
      
      // Mirror modules in metadata to restore selection checkboxes
      const preselect: BackupSelection = {
        knowledgeGraph: false,
        ethicalBoundaries: false,
        learningHistory: false,
        privacyPreferences: false,
        professionalContext: false,
        goals: false,
        settings: false,
        carbonPreferences: false,
        interactionMemory: false,
        customPreferences: false
      };
      for (const m of pkg.backup.metadata.selectedModules) {
        preselect[m] = true;
      }
      setRestoreSelection(preselect);

      setRestoreStep('inspect');
      setRestoreError(null);
    } catch (err: any) {
      setRestoreStep('upload');
      setUploadedFileStr(null);
      setRestoreError(err.message || 'File validation failed.');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setRestoreError(null);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      try {
        const text = await BackupStorage.readBackupFile(file);
        handleFileContentLoaded(text);
      } catch (err: any) {
        setRestoreError(err.message || 'Failed to read uploaded file.');
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await BackupStorage.readBackupFile(file);
        handleFileContentLoaded(text);
      } catch (err: any) {
        setRestoreError(err.message || 'Failed to read selected file.');
      }
    }
  };

  // Inspect to Password view transition
  const proceedToPassword = () => {
    setRestoreStep('password');
  };

  // Decrypt uploaded payload
  const handleDecryptPayload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectPkg) return;

    setRestoreError(null);
    try {
      const payload = await PersonaRestoreService.decryptPayload(inspectPkg, restorePassword);
      setDecryptedPayload(payload);

      // Perform conflict precheck
      const report = PersonaRestoreService.checkConflicts(personaInstance, payload);
      setConflictReport(report);

      setRestoreStep('preview');
      setRestorePassword('');
    } catch (err: any) {
      setRestoreError(err.message || 'Decryption failed.');
    }
  };

  // Confirm strategy & selective restore checkboxes
  const proceedToConfirmation = () => {
    setRestoreStep('confirm');
  };

  // Commit Restore with Rollback Support
  const handleCommitRestore = async () => {
    if (!decryptedPayload) return;

    setRestoreStep('progress');
    setRestoreProgress(15);
    setRestoreError(null);

    try {
      const interval = setInterval(() => {
        setRestoreProgress((p) => Math.min(90, p + 25));
      }, 200);

      // Commit selective restore
      const bid = inspectPkg ? `bk_${inspectPkg.backup.createdAt}` : undefined;
      await PersonaRestoreService.executeRestore(
        personaInstance,
        decryptedPayload,
        restoreSelection,
        restoreStrategy,
        bid
      );

      clearInterval(interval);
      setRestoreProgress(100);

      setTimeout(() => {
        // Reset restore flow
        setRestoreStep('upload');
        setUploadedFileStr(null);
        setInspectPkg(null);
        setInspectComp(null);
        setDecryptedPayload(null);
        setConflictReport(null);
        setRestoreProgress(0);
        
        // Refresh UI state
        refreshPersonaStats();
        setHistory(BackupHistoryManager.loadHistory());
        triggerNotification('Persona restored successfully.', 'success');
      }, 400);

    } catch (err: any) {
      setRestoreStep('preview');
      setRestoreProgress(0);
      setRestoreError(err.message || 'Restore processing failed.');
    }
  };

  // Restore a local history item
  const handleLocalHistoryRestore = (entry: BackupHistoryEntry) => {
    try {
      const pkgStr = BackupStorage.loadBackupPayload(entry.id);
      handleFileContentLoaded(pkgStr);
    } catch (err: any) {
      triggerNotification(`Failed to load local backup: ${err.message}`, 'error');
    }
  };

  // Download a local history item
  const handleLocalHistoryDownload = (entry: BackupHistoryEntry) => {
    try {
      const pkgStr = BackupStorage.loadBackupPayload(entry.id);
      BackupStorage.downloadBackupFile(pkgStr, `${entry.name}.json`);
      triggerNotification('Backup file downloaded successfully.', 'success');
    } catch (err: any) {
      triggerNotification(`Failed to download backup: ${err.message}`, 'error');
    }
  };

  // Rename backup entry
  const triggerRename = (entry: BackupHistoryEntry) => {
    setRenameId(entry.id);
    setRenameValue(entry.name);
  };

  const saveRename = () => {
    if (renameId && renameValue.trim()) {
      BackupHistoryManager.renameEntry(renameId, renameValue.trim());
      setHistory(BackupHistoryManager.loadHistory());
      setRenameId(null);
      setRenameValue('');
      triggerNotification('Backup name updated.', 'success');
    }
  };

  // Delete backup entry
  const confirmDelete = (entry: BackupHistoryEntry) => {
    setDeleteConfirmId(entry.id);
  };

  const executeDelete = () => {
    if (deleteConfirmId) {
      BackupHistoryManager.deleteEntry(deleteConfirmId);
      BackupStorage.deleteBackupPayload(deleteConfirmId);
      setHistory(BackupHistoryManager.loadHistory());
      setDeleteConfirmId(null);
      triggerNotification('Backup removed from storage.', 'success');
    }
  };

  // Run Test Suite Diagnostics
  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await BackupTestSuite.runTests(personaInstance);
      setTestResults(results);
    } catch (e) {
      triggerNotification('Diagnostic tests hit a fatal error.', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Reset/Reset uploaded file
  const cancelRestoreWizard = () => {
    setRestoreStep('upload');
    setUploadedFileStr(null);
    setInspectPkg(null);
    setInspectComp(null);
    setRestorePassword('');
    setDecryptedPayload(null);
    setConflictReport(null);
    setRestoreError(null);
  };

  // Filter history
  const filteredHistory = history.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.version.includes(searchQuery) ||
      entry.modulesIncluded.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus =
      statusFilter === 'all' || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 text-white relative">
      
      {/* Toast Alert */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-xl shadow-xl flex items-center space-x-3 border ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-400' 
              : 'bg-rose-950/90 border-rose-500 text-rose-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            <span className="font-semibold text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/40 border border-gray-700/80 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <h4 className="text-gray-400 font-medium text-xs tracking-wider uppercase">Knowledge Complexity</h4>
            <div className="text-3xl font-extrabold text-white">{nodeCount} <span className="text-xs text-gray-500 font-normal">nodes</span></div>
            <p className="text-xs text-gray-400">{edgeCount} semantic relationships mapped</p>
          </div>
          <Database className={`w-10 h-10 ${themeClasses.text}`} />
        </div>

        <div className="bg-gray-800/40 border border-gray-700/80 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <h4 className="text-gray-400 font-medium text-xs tracking-wider uppercase">Interaction Memory</h4>
            <div className="text-3xl font-extrabold text-white">{localStoreSize} <span className="text-xs text-gray-500 font-normal">logs</span></div>
            <p className="text-xs text-gray-400">Locally encrypted interactions</p>
          </div>
          <Shield className="w-10 h-10 text-cyan-400" />
        </div>

        <div className="bg-gray-800/40 border border-gray-700/80 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <h4 className="text-gray-400 font-medium text-xs tracking-wider uppercase">Vault Status</h4>
            <div className="text-3xl font-extrabold text-emerald-400">Protected</div>
            <p className="text-xs text-gray-400">Military AES-256-GCM encryption</p>
          </div>
          <Lock className="w-10 h-10 text-emerald-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Create Backup */}
        <div className="bg-gray-800/30 border border-gray-700/60 rounded-2xl p-6 space-y-6">
          <div className="flex items-center space-x-3 border-b border-gray-700/50 pb-4">
            <Shield className={`w-6 h-6 ${themeClasses.text}`} />
            <div>
              <h3 className="text-lg font-bold text-white">Create Encrypted Backup</h3>
              <p className="text-xs text-gray-400">Export a fully password-secured twin state</p>
            </div>
          </div>

          <form onSubmit={handleCreateBackup} className="space-y-5">
            {/* Custom Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Backup Name (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank for automatic timestamped name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                disabled={isCreating}
              />
            </div>

            {/* Select Modules */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-300 block">Select Modules to Export</label>
              <div className="grid grid-cols-2 gap-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700/40">
                {Object.keys(selectedModules).map((key) => {
                  const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());
                  return (
                    <label key={key} className="flex items-center space-x-2.5 text-xs text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedModules[key as keyof BackupSelection]}
                        onChange={(e) =>
                          setSelectedModules({
                            ...selectedModules,
                            [key]: e.target.checked
                          })
                        }
                        className="rounded border-gray-700 bg-gray-950 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                        disabled={isCreating}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Password Verification */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300 block">Encryption Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full bg-gray-900 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={isCreating}
                />
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              </div>
              
              {/* Strength indicator */}
              {password && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Password Strength:</span>
                    <span className={`font-semibold ${
                      passwordStrength.score >= 3 ? 'text-green-400' : passwordStrength.score >= 2 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden flex gap-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 transition-all ${
                          i < passwordStrength.score ? passwordStrength.color : 'bg-gray-800'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-[10px] text-gray-400 list-disc pl-4 space-y-0.5">
                      {passwordStrength.feedback.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Progress / Submit */}
            {isCreating ? (
              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${themeClasses.bg}`}
                    style={{ width: `${createProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-center text-gray-400">Securing payloads, executing AES-256-GCM...</p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!password || passwordStrength.score < 2}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
                  password && passwordStrength.score >= 2
                    ? `${themeClasses.bg} ${themeClasses.hoverBg} hover:shadow-xl active:scale-[0.99] text-white`
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/30'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Export & Lock Persona</span>
              </button>
            )}
          </form>
        </div>

        {/* Restore Backup Wizard */}
        <div className="bg-gray-800/30 border border-gray-700/60 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-700/50 pb-4">
              <div className="flex items-center space-x-3">
                <UploadCloud className={`w-6 h-6 ${themeClasses.text}`} />
                <div>
                  <h3 className="text-lg font-bold text-white">Restore Backup</h3>
                  <p className="text-xs text-gray-400">Restore, verify integrity, and resolve conflicts</p>
                </div>
              </div>
              {restoreStep !== 'upload' && (
                <button
                  onClick={cancelRestoreWizard}
                  className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              )}
            </div>

            {restoreError && (
              <div className="bg-rose-950/40 border border-rose-500/50 text-rose-300 p-3.5 rounded-xl text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            {/* STEP 1: Upload / Drop File */}
            {restoreStep === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center space-y-4 cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-gray-700/80 hover:border-gray-600 bg-gray-900/10 hover:bg-gray-900/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json"
                  className="hidden"
                />
                <UploadCloud className="w-12 h-12 text-gray-400" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-gray-200">Drag & drop your backup file here</p>
                  <p className="text-xs text-gray-500">or click to browse local files (must be a valid backup .json)</p>
                </div>
              </div>
            )}

            {/* STEP 2: Inspect Metadata */}
            {restoreStep === 'inspect' && inspectPkg && inspectComp && (
              <div className="space-y-4">
                <div className="bg-gray-900/40 border border-gray-700/40 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Creation Date:</span>
                    <span className="text-gray-200 font-semibold">
                      {new Date(inspectPkg.backup.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Backup Size:</span>
                    <span className="text-gray-200 font-semibold">
                      {BackupUtils.formatSize(inspectPkg.backup.metadata.size)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Modules Included:</span>
                    <span className="text-gray-200 font-semibold">
                      {inspectPkg.backup.metadata.selectedModules.length} modules
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Encryption Method:</span>
                    <span className="text-emerald-400 font-semibold">
                      {inspectPkg.backup.metadata.encryption.algorithm} (GCM verified)
                    </span>
                  </div>
                </div>

                {inspectComp.compatible ? (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Version v{inspectPkg.backup.version} is compatible with the current system.</span>
                  </div>
                ) : (
                  <div className="bg-rose-950/40 border border-rose-500/50 text-rose-300 p-3 rounded-xl text-xs flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Version mismatch: {inspectComp.reason}</span>
                  </div>
                )}

                <button
                  onClick={proceedToPassword}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 ${
                    themeClasses.bg
                  } ${themeClasses.hoverBg} text-white shadow-md transition-all active:scale-[0.99]`}
                >
                  <span>Authenticate to Unlock</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 3: Unlock Password */}
            {restoreStep === 'password' && (
              <form onSubmit={handleDecryptPayload} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300 block">Enter Backup Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Password chosen during export"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 ${
                    themeClasses.bg
                  } ${themeClasses.hoverBg} text-white shadow-md transition-all active:scale-[0.99]`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Verify Password & Decrypt</span>
                </button>
              </form>
            )}

            {/* STEP 4: Conflict resolution & preview */}
            {restoreStep === 'preview' && decryptedPayload && conflictReport && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
                  <h4 className="text-sm font-semibold text-gray-200">Conflict Check</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    conflictReport.hasConflicts ? 'bg-amber-950 border border-amber-600 text-amber-400' : 'bg-emerald-950 border border-emerald-600 text-emerald-400'
                  }`}>
                    {conflictReport.hasConflicts ? `${conflictReport.conflicts.length} Node Overlaps` : 'Zero Conflicts'}
                  </span>
                </div>

                {conflictReport.hasConflicts ? (
                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-2">
                    {conflictReport.conflicts.map((c) => (
                      <div key={c.nodeId} className="bg-gray-900/50 border border-gray-700/40 p-2 rounded-lg text-[10px] flex justify-between items-center">
                        <span className="font-semibold text-gray-300">{c.nodeId}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-red-400">Local: {Math.round(c.localConfidence * 100)}%</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-green-400">Backup: {Math.round(c.backupConfidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Backup has no overlapping nodes with your current graph. Restoring is clean.</p>
                )}

                {/* Strategy picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">Conflict Resolution Strategy</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['merge', 'replace', 'skip'].map((strat) => (
                      <button
                        key={strat}
                        onClick={() => setRestoreStrategy(strat as any)}
                        className={`py-1.5 rounded-lg font-semibold text-[10px] border capitalize transition-colors ${
                          restoreStrategy === strat
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {strat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selective modules check in restore */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">Selective Restore Checklist</label>
                  <div className="max-h-20 overflow-y-auto grid grid-cols-2 gap-2 bg-gray-900/40 p-2 rounded-xl border border-gray-700/40">
                    {Object.keys(restoreSelection).map((key) => {
                      const label = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase());
                      const availableInBackup = inspectPkg?.backup.metadata.selectedModules.includes(key as any);
                      return (
                        <label key={key} className={`flex items-center space-x-1.5 text-[10px] select-none ${
                          availableInBackup ? 'text-gray-300 cursor-pointer' : 'text-gray-600 cursor-not-allowed'
                        }`}>
                          <input
                            type="checkbox"
                            checked={restoreSelection[key as keyof BackupSelection] && !!availableInBackup}
                            onChange={(e) =>
                              setRestoreSelection({
                                ...restoreSelection,
                                [key]: e.target.checked
                              })
                            }
                            disabled={!availableInBackup}
                            className="rounded border-gray-700 bg-gray-950 text-blue-600 focus:ring-0 w-3 h-3 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={proceedToConfirmation}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 ${
                    themeClasses.bg
                  } ${themeClasses.hoverBg} text-white shadow-md transition-all active:scale-[0.99]`}
                >
                  <span>Review Strategy</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 5: Confirm Restore (Pre-Restore Snapshot Warning) */}
            {restoreStep === 'confirm' && (
              <div className="space-y-4 text-xs">
                <div className="bg-amber-950/20 border border-amber-500/40 text-amber-300 p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center space-x-2 font-bold">
                    <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>Transaction Safe Operations</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    A temporary snapshot of your active persona profile, graph nodes, and local logs is stored in memory. 
                    If any error occurs during restoration, the system will automatically roll back to the original state.
                  </p>
                </div>

                <div className="bg-gray-900/40 border border-gray-700/40 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Restore strategy:</span>
                    <span className="text-white font-bold capitalize">{restoreStrategy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Modules Selected:</span>
                    <span className="text-white font-bold">
                      {Object.values(restoreSelection).filter(Boolean).length} modules
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCommitRestore}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Restore & Commit</span>
                </button>
              </div>
            )}

            {/* STEP 6: Progress Bar */}
            {restoreStep === 'progress' && (
              <div className="space-y-3 py-6 text-center">
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden max-w-xs mx-auto">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${restoreProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">Restoring state components, unpacking Cognitive Graph...</p>
              </div>
            )}

          </div>

          {/* Diagnostic indicator */}
          <div className="border-t border-gray-700/40 pt-4 flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              <span>Integrity Scanner Online</span>
            </span>
            <span>Rollback Safe Snapshot active</span>
          </div>
        </div>

      </div>

      {/* Backup History */}
      <div className="bg-gray-800/30 border border-gray-700/60 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-700/50 pb-4">
          <div className="flex items-center space-x-3">
            <History className={`w-6 h-6 ${themeClasses.text}`} />
            <div>
              <h3 className="text-lg font-bold text-white">Local Vault History</h3>
              <p className="text-xs text-gray-400">Manage, rename, and download backups from local browser storage</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search backups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-900 border border-gray-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors w-44"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            </div>

            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Logs</option>
              <option value="success">Successful</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Backups List */}
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-700/50 text-gray-400 font-semibold">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Version</th>
                  <th className="pb-3">Modules Included</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {filteredHistory.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <tr className="hover:bg-gray-900/20 group transition-colors">
                      <td className="py-4 pl-2 font-medium">
                        {renameId === entry.id ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                            />
                            <button
                              onClick={saveRename}
                              className="text-emerald-400 hover:text-emerald-300 font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setRenameId(null)}
                              className="text-gray-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-200">{entry.name}</span>
                            <button
                              onClick={() => triggerRename(entry)}
                              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-gray-300">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 text-gray-300">
                        {BackupUtils.formatSize(entry.size)}
                      </td>
                      <td className="py-4 text-gray-400">
                        v{entry.version}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {entry.modulesIncluded.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-gray-900/60 text-gray-400 text-[8px] tracking-wide capitalize">
                              {m.replace(/([A-Z])/g, ' $1')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-right pr-2 space-x-2">
                        <button
                          onClick={() => setPreviewBackupId(previewBackupId === entry.id ? null : entry.id)}
                          className="text-gray-400 hover:text-white text-[10px] font-semibold border border-gray-700/60 rounded px-2 py-1 bg-gray-900/30 transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleLocalHistoryRestore(entry)}
                          className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold border border-blue-900/30 rounded px-2 py-1 bg-blue-950/20 transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleLocalHistoryDownload(entry)}
                          className="text-gray-400 hover:text-white text-[10px] font-semibold"
                        >
                          <Download className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => confirmDelete(entry)}
                          className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expand Details (Events list) */}
                    {previewBackupId === entry.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-900/20 px-4 py-3 rounded-lg border border-gray-700/30">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-[10px]">
                              <div>
                                <span className="text-gray-500 font-semibold block uppercase tracking-wider mb-1">Encryption Details</span>
                                <p className="text-gray-300">Algorithm: AES-256-GCM</p>
                                <p className="text-gray-300">PBKDF2 Key Derivation iterations: 100,000</p>
                                <p className="text-gray-300">Digital Checksum algorithm: SHA-256</p>
                              </div>
                              <div>
                                <span className="text-gray-500 font-semibold block uppercase tracking-wider mb-1">Status Report</span>
                                <p className={entry.status === 'success' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                  Integrity pass: {entry.status}
                                </p>
                              </div>
                            </div>
                            
                            {/* Restore event log */}
                            <div className="space-y-1.5">
                              <span className="text-gray-500 font-semibold block text-[10px] uppercase tracking-wider">Restore Logs</span>
                              {entry.restoreEvents && entry.restoreEvents.length > 0 ? (
                                <div className="space-y-1 max-h-20 overflow-y-auto pr-2">
                                  {entry.restoreEvents.map((evt, idx) => (
                                    <div key={idx} className="bg-gray-950/40 p-2 rounded text-[9px] flex justify-between items-center border border-gray-800">
                                      <div className="space-y-0.5">
                                        <span className="text-gray-400">{new Date(evt.timestamp).toLocaleString()}</span>
                                        <div className="flex gap-1.5 text-gray-500">
                                          <span>Strategy: {evt.strategy}</span>
                                          <span>•</span>
                                          <span>Modules: {evt.restoredModules.join(', ')}</span>
                                        </div>
                                      </div>
                                      <span className={evt.success ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                        {evt.success ? 'Success' : `Failed: ${evt.error}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-500">No restore operations have been performed using this backup payload.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-900/20 border border-gray-700/30 rounded-xl p-8 text-center text-gray-500 text-xs">
            No local backups found matching criteria. Create one using the side panel or upload a file.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h4 className="text-base font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Delete Local Backup?</span>
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              This action will permanently delete the encrypted backup payload and metadata history logs from this browser's localStorage. This cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-gray-900 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Auditor */}
      <div className="bg-gray-800/30 border border-gray-700/60 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-700/50 pb-4">
          <div className="flex items-center space-x-3">
            <FileCheck className="w-6 h-6 text-yellow-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Vault Security & Integrity Audit</h3>
              <p className="text-xs text-gray-400">Run diagnostics against PBKDF2/AES-GCM encryption, checksums, and rollbacks</p>
            </div>
          </div>
          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
              isRunningTests
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow hover:shadow-md active:scale-[0.98]'
            }`}
          >
            {isRunningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunningTests ? 'Auditing Vault...' : 'Run Vault Diagnostics'}</span>
          </button>
        </div>

        {testResults ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-900/40 p-3.5 rounded-xl border border-gray-700/30">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Total Tests</span>
                <span className="text-xl font-bold text-white">{testResults.total}</span>
              </div>
              <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Passed</span>
                <span className="text-xl font-bold text-emerald-400">{testResults.passed}</span>
              </div>
              <div className="bg-rose-950/20 p-3.5 rounded-xl border border-rose-500/20">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Failed</span>
                <span className="text-xl font-bold text-rose-400">{testResults.failed}</span>
              </div>
              <div className="bg-gray-900/40 p-3.5 rounded-xl border border-gray-700/30">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Audit Duration</span>
                <span className="text-xl font-bold text-gray-300">{testResults.duration}ms</span>
              </div>
            </div>

            <div className="bg-gray-900/40 border border-gray-700/40 rounded-xl p-4 max-h-56 overflow-y-auto divide-y divide-gray-700/30 pr-2">
              {testResults.tests.map((test, index) => (
                <div key={index} className="py-2.5 flex items-start justify-between text-xs">
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-500 font-semibold block uppercase tracking-wider">
                      {test.suite}
                    </span>
                    <span className="text-gray-200 font-medium">{test.name}</span>
                    {test.error && (
                      <p className="text-[10px] text-rose-400 bg-rose-950/20 p-1.5 rounded border border-rose-500/30 mt-1 leading-normal max-w-md">
                        {test.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className="text-[9px] text-gray-500 font-medium">{test.duration}ms</span>
                    {test.passed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900/20 border border-gray-700/30 rounded-xl p-6 text-center text-gray-500 text-xs">
            Security audit not run yet. Trigger audit to run verification checks.
          </div>
        )}
      </div>

    </div>
  );
};
