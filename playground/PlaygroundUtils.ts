import { PlaygroundParams, SimulationState, RealTimeMetrics } from './PlaygroundTypes';
import { WorkflowExecutor } from './WorkflowExecutor';

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const generateColorsForModule = (module: string): { bg: string; text: string; border: string; activeGlow: string } => {
  const colors: Record<string, { bg: string; text: string; border: string; activeGlow: string }> = {
    'sovereign-persona': {
      bg: 'bg-blue-900/40',
      text: 'text-blue-400',
      border: 'border-blue-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(59,130,246,0.6)] border-blue-500'
    },
    'cognitive-graph': {
      bg: 'bg-indigo-900/40',
      text: 'text-indigo-400',
      border: 'border-indigo-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(99,102,241,0.6)] border-indigo-500'
    },
    'privacy-negotiator': {
      bg: 'bg-purple-900/40',
      text: 'text-purple-400',
      border: 'border-purple-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(168,85,247,0.6)] border-purple-500'
    },
    'federated-learning': {
      bg: 'bg-pink-900/40',
      text: 'text-pink-400',
      border: 'border-pink-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(236,72,153,0.6)] border-pink-500'
    },
    'morphnet': {
      bg: 'bg-orange-900/40',
      text: 'text-orange-400',
      border: 'border-orange-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(249,115,22,0.6)] border-orange-500'
    },
    'adversarial-immune': {
      bg: 'bg-red-900/40',
      text: 'text-red-400',
      border: 'border-red-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(239,68,68,0.6)] border-red-500'
    },
    'carbon-optimizer': {
      bg: 'bg-green-900/40',
      text: 'text-green-400',
      border: 'border-green-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(34,197,94,0.6)] border-green-500'
    },
    'latent-mapping': {
      bg: 'bg-cyan-900/40',
      text: 'text-cyan-400',
      border: 'border-cyan-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(6,182,212,0.6)] border-cyan-500'
    },
    'monitoring': {
      bg: 'bg-teal-900/40',
      text: 'text-teal-400',
      border: 'border-teal-700/60',
      activeGlow: 'shadow-[0_0_15px_rgba(20,184,166,0.6)] border-teal-500'
    },
    'system': {
      bg: 'bg-gray-800/60',
      text: 'text-gray-300',
      border: 'border-gray-700',
      activeGlow: 'shadow-[0_0_15px_rgba(156,163,175,0.4)] border-gray-500'
    }
  };

  return colors[module.toLowerCase()] || colors['system'];
};

export const calculateRealTimeMetrics = (
  params: PlaygroundParams,
  simState: SimulationState,
  executor: WorkflowExecutor
): RealTimeMetrics => {
  const activeModules: string[] = [];
  if (simState.status === 'playing') {
    activeModules.push('monitoring');
    if (simState.currentStepIndex >= 0) {
      activeModules.push('sovereign-persona');
    }
  }

  // Calculate knowledge growth based on persona's Cognitive Graph
  let knowledgeGrowth = 0;
  let averageConfidence = 0.5;

  const persona = executor.getPersona();
  if (persona) {
    const graphState = persona.getCognitiveGraph().getCurrentState();
    knowledgeGrowth = graphState.totalNodes - params.knowledgeSize;
    averageConfidence = graphState.averageConfidence;
    activeModules.push('cognitive-graph');
  }

  // Latent Mapping active modules
  const latent = executor.getLatentMapping();
  if (latent && latent.listSpaces().length > 0) {
    activeModules.push('latent-mapping');
  }

  // Carbon Optimizer metrics
  let carbonImpact = 0.05;
  const carbon = executor.getCarbonOptimizer();
  if (carbon) {
    activeModules.push('carbon-optimizer');
    const report = carbon.getEfficiencyReport();
    carbonImpact = report.totalEmissions || 0.12;
  }

  // Federated learning active modules
  const fed = executor.getFederatedClient();
  if (fed) {
    activeModules.push('federated-learning');
  }

  // MorphNet active modules
  const morph = executor.getMorphNet();
  if (morph) {
    activeModules.push('morphnet');
  }

  // Immune system metrics
  let activeThreats = 0;
  const immune = executor.getImmuneSystem();
  if (immune) {
    activeModules.push('adversarial-immune');
    const state = immune.getSecurityState();
    activeThreats = state.activeThreats;
  }

  // Calculate execution time based on steps
  let executionTime = 0;
  if (simState.status === 'playing') {
    executionTime = Date.now() % 360000;
  }

  // Calculate memory usage (simulated based on params and active elements)
  const baseMemory = 120 + activeModules.length * 15;
  const scaleRatio = params.knowledgeSize * 0.5 + params.federatedParticipants * 0.2;
  const memory = Math.min(params.resourceLimit, Math.round(baseMemory + scaleRatio + Math.random() * 5));

  // Calculate CPU load (simulated)
  const baseCpu = simState.status === 'playing' ? 12 : 1;
  const loadRatio = activeModules.length * 4 + (params.learningRate * 8);
  const cpu = Math.min(99, Math.round(baseCpu + loadRatio + (Math.random() * 2)));

  // Calculate privacy score index
  let privacyScore = 75; // default selective
  if (params.privacyLevel === 'public') privacyScore = 40;
  else if (params.privacyLevel === 'selective') privacyScore = 75;
  else if (params.privacyLevel === 'private') privacyScore = 92;
  else if (params.privacyLevel === 'confidential') privacyScore = 98;

  // Confidence index mapping
  const confidence = averageConfidence;

  // Deduplicate active modules
  const uniqueActiveModules = [...new Set(activeModules)];

  return {
    executionTime,
    memory,
    cpu,
    confidence,
    privacyScore,
    carbonImpact,
    knowledgeGrowth,
    activeModules: uniqueActiveModules,
    eventsCount: activeThreats
  };
};
