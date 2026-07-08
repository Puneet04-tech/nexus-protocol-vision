import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { ProtocolPlaygroundEngine } from '../ProtocolPlaygroundEngine';
import { ScenarioSelector } from './ScenarioSelector';
import { ParameterEditor } from './ParameterEditor';
import { ExecutionConsole } from './ExecutionConsole';
import { FlowTimeline } from './FlowTimeline';
import { FlowDiagram } from './FlowDiagram';
import { MetricsPanel } from './MetricsPanel';
import { EventViewer } from './EventViewer';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import { ThreatMonitor } from './ThreatMonitor';
import { CarbonDashboard } from './CarbonDashboard';
import { PlaygroundParams, SimulationState, RealTimeMetrics, SimulationLog } from '../PlaygroundTypes';
import { runPlaygroundDiagnostics } from '../__tests__/PlaygroundTests';

export const SimulationCanvas: React.FC = () => {
  const engine = ProtocolPlaygroundEngine.getInstance();
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Layout transform settings (dashboard zoom/pan support)
  const [dashboardZoom, setDashboardZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reactive React State
  const [params, setParams] = useState<PlaygroundParams>(() => engine.getParams());
  const [simState, setSimState] = useState<SimulationState>(() => engine.getState());
  const [metrics, setMetrics] = useState<RealTimeMetrics>(() => engine.getMetrics());
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsPassed, setDiagnosticsPassed] = useState<boolean | null>(null);

  // Sync state variables
  const syncState = () => {
    setParams({ ...engine.getParams() });
    setSimState({ ...engine.getState() });
    setMetrics({ ...engine.getMetrics() });
    setLogs([...engine.getLogger().getLogs()]);
  };

  useEffect(() => {
    // Initial sync
    syncState();

    // Subscribe to simulation updates
    const unsubscribe = engine.getSimManager().subscribe(
      (stepIdx, success) => {
        syncState();
      },
      (state) => {
        syncState();
      }
    );

    // Set up a short polling interval to keep system metrics alive
    const interval = setInterval(() => {
      setMetrics({ ...engine.getMetrics() });
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Controls Handlers
  const handleParamChange = <K extends keyof PlaygroundParams>(key: K, value: PlaygroundParams[K]) => {
    engine.getParamManager().updateParam(key, value);
    syncState();
  };

  const handleSelectScenario = (id: string, customSteps?: any) => {
    engine.getSimManager().loadScenario(id, engine.getParams(), customSteps);
    syncState();
  };

  const handlePlay = () => {
    engine.getSimManager().play(engine.getParams());
    syncState();
  };

  const handlePause = () => {
    engine.getSimManager().pause();
    syncState();
  };

  const handleStepForward = () => {
    engine.getSimManager().stepForward(engine.getParams());
    syncState();
  };

  const handleStepBackward = () => {
    engine.getSimManager().stepBackward();
    syncState();
  };

  const handleReset = () => {
    engine.getSimManager().reset();
    syncState();
  };

  const handleSpeedChange = (speed: number) => {
    engine.getSimManager().setSpeed(speed);
    syncState();
  };

  const handleModeChange = (mode: 'auto' | 'manual') => {
    engine.getSimManager().setMode(mode);
    syncState();
  };

  const handleClearLogs = () => {
    engine.getLogger().clear();
    setLogs([]);
  };

  const handleExportJSON = () => {
    const data = engine.getLogger().exportJSON();
    downloadFile(data, 'nexus_simulation_logs.json', 'application/json');
  };

  const handleExportCSV = () => {
    const data = engine.getLogger().exportCSV();
    downloadFile(data, 'nexus_simulation_logs.csv', 'text/csv');
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRunDiagnostics = async () => {
    setDiagnosticsRunning(true);
    setDiagnosticsPassed(null);
    engine.getLogger().log('System', 'RunDiagnostics', 'info', 0, 'Starting browser diagnostics validation tests...');
    
    try {
      const results = await runPlaygroundDiagnostics(engine);
      setDiagnosticsPassed(results.failed === 0);
      
      const statusLabel = results.failed === 0 ? 'success' : 'error';
      engine.getLogger().log(
        'System',
        'DiagnosticsComplete',
        statusLabel,
        results.duration,
        `Diagnostics completed: ${results.passed}/${results.total} tests passed. Failed: ${results.failed}. (Duration: ${results.duration}ms)`
      );
    } catch (e: any) {
      setDiagnosticsPassed(false);
      engine.getLogger().log('System', 'DiagnosticsError', 'error', 0, `Diagnostics crashed: ${e.message}`);
    } finally {
      setDiagnosticsRunning(false);
      syncState();
    }
  };

  // Fullscreen support
  const toggleFullscreen = () => {
    if (!canvasWrapperRef.current) return;

    if (!document.fullscreenElement) {
      canvasWrapperRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleZoom = (factor: number) => {
    setDashboardZoom(prev => Math.min(1.5, Math.max(0.6, prev * factor)));
  };

  // Get active step's component to highlight in FlowDiagram
  const activeScenario = engine.getScenarioRunner().getCurrentScenario();
  const currentStep = activeScenario && simState.currentStepIndex >= 0
    ? activeScenario.steps[simState.currentStepIndex]
    : null;
  const activeModule = currentStep && currentStep.status === 'running'
    ? currentStep.component
    : null;

  return (
    <div
      ref={canvasWrapperRef}
      className={`min-h-screen bg-slate-950 p-6 flex flex-col gap-6 overflow-y-auto ${
        isFullscreen ? 'w-screen h-screen' : ''
      }`}
    >
      {/* Visual Canvas Tools Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-lg shadow-lg">
            P
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Protocol Interactive Playground</h1>
            <p className="text-[10px] text-slate-500 font-mono">WORKSPACE CORE SUITE RUNTIME</p>
          </div>
        </div>

        {/* View adjustment tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg text-slate-400">
            <button
              onClick={() => handleZoom(1.1)}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Zoom In Page"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(0.9)}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Zoom Out Page"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDashboardZoom(1)}
              className="px-2 py-1 text-[10px] font-bold font-mono hover:bg-slate-800 rounded transition-colors"
            >
              {(dashboardZoom * 100).toFixed(0)}%
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main content grid wrapping components */}
      <div
        className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 transition-transform duration-200 origin-top"
        style={{ transform: `scale(${dashboardZoom})` }}
      >
        {/* Left column panels */}
        <div className="xl:col-span-1 space-y-6">
          <ScenarioSelector
            currentScenarioId={simState.currentScenarioId}
            onSelectScenario={handleSelectScenario}
          />
          <ParameterEditor
            params={params}
            onParamChange={handleParamChange}
          />
          <CarbonDashboard
            carbonOptimizer={engine.getExecutor().getCarbonOptimizer()}
          />
        </div>

        {/* Right column panels */}
        <div className="xl:col-span-2 space-y-6">
          {/* Main Console playback bar */}
          <ExecutionConsole
            status={simState.status}
            speed={simState.speed}
            mode={simState.mode}
            currentStepIndex={simState.currentStepIndex}
            totalSteps={activeScenario ? activeScenario.steps.length : 0}
            onPlay={handlePlay}
            onPause={handlePause}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
            onModeChange={handleModeChange}
            onRunDiagnostics={handleRunDiagnostics}
            diagnosticsRunning={diagnosticsRunning}
            diagnosticsPassed={diagnosticsPassed}
          />

          {/* Steps Horizontal timeline */}
          {activeScenario && (
            <FlowTimeline
              steps={activeScenario.steps}
              currentStepIndex={simState.currentStepIndex}
            />
          )}

          {/* Interactive chain connectors diagram */}
          <FlowDiagram
            activeModule={activeModule}
            activeModules={metrics.activeModules}
          />

          {/* Live force directed Canvas/D3 layout */}
          <KnowledgeGraphView
            persona={engine.getExecutor().getPersona()}
          />

          {/* Real-time system analytics indicators */}
          <MetricsPanel
            metrics={metrics}
          />

          {/* Side panels (Threat status, Event logger console) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThreatMonitor
              immuneSystem={engine.getExecutor().getImmuneSystem()}
            />
            <EventViewer
              logs={logs}
              onClear={handleClearLogs}
              onExportJSON={handleExportJSON}
              onExportCSV={handleExportCSV}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default SimulationCanvas;
