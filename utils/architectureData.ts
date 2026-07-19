import { ArchitectureNode, ArchitectureEdge } from '../types/architecture';

export const INITIAL_NODES: ArchitectureNode[] = [
  {
    id: 'sovereign-persona',
    name: 'Sovereign Persona',
    iconName: 'Brain',
    x: 500,
    y: 300,
    description: 'The core layer of the Nexus Protocol: a local-first, high-fidelity digital twin that acts as a secure container for personal identity, values, and contextual preferences.',
    responsibility: 'Manages user identity state, coordinates all sub-layers, and enforces local privacy constraints.',
    relatedModules: ['cognitive-graph', 'privacy-negotiator', 'morphnet-engine', 'adversarial-immune', 'monitoring'],
    route: '/sovereign-persona',
    status: 'active',
    metrics: {
      'Mastery Score': '84%',
      'Active Contexts': 4,
      'Carbon Limit': '100 kg/mo',
      'Sync Status': 'Encrypted'
    }
  },
  {
    id: 'cognitive-graph',
    name: 'Cognitive Graph',
    iconName: 'Network',
    x: 500,
    y: 90,
    description: 'A rich semantic knowledge representation system mapping user understanding, masteries, memories, and custom learning paths.',
    responsibility: 'Constructs custom learning pathways, updates mastery structures, and queries localized memories semantic indexes.',
    relatedModules: ['sovereign-persona', 'federated-learning'],
    route: '/cognitive-graph',
    status: 'active',
    metrics: {
      'Mapped Concepts': 342,
      'Semantic Density': '8.6/10',
      'Active Path': 'AI Safety',
      'Memory Nodes': 1204
    }
  },
  {
    id: 'privacy-negotiator',
    name: 'Privacy Negotiator',
    iconName: 'Shield',
    x: 320,
    y: 210,
    description: 'Autonomous communications coordinator executing cryptographic agreements using Zero-Knowledge Proofs (ZKPs) and Multi-Party Computations (MPC).',
    responsibility: 'Translates data-sharing requests, verifies third-party compliance, and manages privacy budgets (epsilon/delta bounds).',
    relatedModules: ['sovereign-persona', 'federated-learning', 'marketplace'],
    route: '/privacy-negotiator',
    status: 'active',
    metrics: {
      'ZKP Verifications': '28/min',
      'Epsilon Budget': '1.45 / 2.0',
      'Active Contracts': 5,
      'Security Level': 'Maximum'
    }
  },
  {
    id: 'adversarial-immune',
    name: 'Immune System',
    iconName: 'Activity',
    x: 680,
    y: 210,
    description: 'Real-time defense scanner analyzing input and output streams to neutralize prompt injection, hijack vectors, and behavioral anomalies.',
    responsibility: 'Performs semantic intent validation, quarantines suspicious payloads, and protects local models from unauthorized manipulation.',
    relatedModules: ['sovereign-persona', 'monitoring'],
    route: '/immune-system',
    status: 'active',
    metrics: {
      'Threat Scan Rate': '145/sec',
      'Quarantine Queue': 0,
      'Immunity Rating': '99.9%',
      'Anomaly Index': '0.02'
    }
  },
  {
    id: 'federated-learning',
    name: 'Federated Learning',
    iconName: 'Users',
    x: 160,
    y: 130,
    description: 'Decentralized collaborative training coordinator updating shared models using mathematical gradient weight aggregations without raw data exposure.',
    responsibility: 'Secures local model training gradients, executes differential privacy calculations, and synchronizes with global network aggregators.',
    relatedModules: ['sovereign-persona', 'privacy-negotiator', 'cognitive-graph', 'latent-mapping'],
    route: '/federated-learning',
    status: 'active',
    metrics: {
      'Participation Rate': '80%',
      'DP Noise Delta': '1e-5',
      'Aggregation Rounds': 142,
      'Weight Integrity': '99.8%'
    }
  },
  {
    id: 'morphnet-engine',
    name: 'MorphNet Engine',
    iconName: 'Cpu',
    x: 320,
    y: 390,
    description: 'Dynamic compute and architecture optimization system that recursively prunes and scales active neural networks based on load constraints.',
    responsibility: 'Adapts active parameters to latency budgets, balances quality against power states, and executes local quantization adjustments.',
    relatedModules: ['sovereign-persona', 'latent-mapping', 'carbon-aware'],
    route: '/morphnet',
    status: 'active',
    metrics: {
      'Pruning Level': '32%',
      'Active Params': '1.2B / 3.8B',
      'Target Latency': '85ms',
      'Memory Freed': '412MB'
    }
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    iconName: 'BarChart3',
    x: 680,
    y: 390,
    description: 'Universal telemetry engine aggregating real-time performance indices, latency budgets, operational metrics, and error rates across all sub-systems.',
    responsibility: 'Maintains system-wide telemetry streams, renders local activity charts, and acts as the central diagnostics logger.',
    relatedModules: ['sovereign-persona', 'adversarial-immune', 'carbon-aware'],
    route: '/monitoring',
    status: 'active',
    metrics: {
      'CPU Usage': '18%',
      'System Load': '0.45',
      'Active Routines': 38,
      'Errors (24h)': 0
    }
  },
  {
    id: 'latent-mapping',
    name: 'Latent Space',
    iconName: 'Layers',
    x: 160,
    y: 470,
    description: 'Semantic translator enabling cross-model interoperability by mapping matching conceptual embeddings across disparate vector spaces.',
    responsibility: 'Executes high-fidelity translations between models (e.g. Gemini, Llama, Claude), maps universal concept embeddings, and aligns dimensions.',
    relatedModules: ['federated-learning', 'morphnet-engine', 'marketplace'],
    route: '/latent-space',
    status: 'active',
    metrics: {
      'Alignment Acc': '94.2%',
      'Mapped Models': '3 Active',
      'Translation Latency': '12ms',
      'Vectors Indexed': '120k'
    }
  },
  {
    id: 'carbon-aware',
    name: 'Carbon Aware',
    iconName: 'Leaf',
    x: 500,
    y: 510,
    description: 'Environmental impact regulator tracking real-time energy usage and grid carbon intensity levels to schedule and run heavy computing sustainably.',
    responsibility: 'Monitors grid energy mix, delays intensive model training to high-renewable windows, and calculates overall CO₂ offsets.',
    relatedModules: ['morphnet-engine', 'monitoring'],
    route: '/carbon-aware',
    status: 'active',
    metrics: {
      'Grid Intensity': '240g/kWh',
      'Renewable Share': '62%',
      'Carbon Saved': '4.2kg',
      'Power Savings': '34%'
    }
  },
  {
    id: 'marketplace',
    name: 'Agent Marketplace',
    iconName: 'ShoppingBag',
    x: 840,
    y: 130,
    description: 'Decentralized services registry hosting verified external autonomous agents, third-party skills, and pluggable utility routines.',
    responsibility: 'Authenticates external capabilities, verifies compliance profiles, and manages secure token-exchange terms.',
    relatedModules: ['privacy-negotiator', 'latent-mapping'],
    route: '/marketplace',
    status: 'active',
    metrics: {
      'Verified Agents': 82,
      'Active Sessions': 2,
      'Safety Audits': 'Passed',
      'Gas Cost Index': '0.04'
    }
  }
];

export const INITIAL_EDGES: ArchitectureEdge[] = [
  { id: 'e1', source: 'sovereign-persona', target: 'cognitive-graph', animated: true, flowDirection: 'bidirectional' },
  { id: 'e2', source: 'sovereign-persona', target: 'privacy-negotiator', animated: true, flowDirection: 'bidirectional' },
  { id: 'e3', source: 'sovereign-persona', target: 'adversarial-immune', animated: true, flowDirection: 'forward' },
  { id: 'e4', source: 'sovereign-persona', target: 'morphnet-engine', animated: true, flowDirection: 'bidirectional' },
  { id: 'e5', source: 'sovereign-persona', target: 'monitoring', animated: true, flowDirection: 'forward' },
  { id: 'e6', source: 'privacy-negotiator', target: 'federated-learning', animated: true, flowDirection: 'bidirectional' },
  { id: 'e7', source: 'privacy-negotiator', target: 'marketplace', animated: true, flowDirection: 'bidirectional' },
  { id: 'e8', source: 'federated-learning', target: 'latent-mapping', animated: true, flowDirection: 'forward' },
  { id: 'e9', source: 'federated-learning', target: 'cognitive-graph', animated: true, flowDirection: 'reverse' },
  { id: 'e10', source: 'morphnet-engine', target: 'latent-mapping', animated: true, flowDirection: 'bidirectional' },
  { id: 'e11', source: 'morphnet-engine', target: 'carbon-aware', animated: true, flowDirection: 'bidirectional' },
  { id: 'e12', source: 'carbon-aware', target: 'monitoring', animated: true, flowDirection: 'forward' },
  { id: 'e13', source: 'adversarial-immune', target: 'monitoring', animated: true, flowDirection: 'forward' },
  { id: 'e14', source: 'marketplace', target: 'latent-mapping', animated: true, flowDirection: 'bidirectional' }
];

export const SIMULATION_COMMANDS = [
  {
    id: 'diagnostics',
    label: 'Run Core Diagnostics',
    description: 'Triggers a diagnostic ping sweep and resource sweep across all systems.',
    successMessage: 'Full system diagnostics completed. All 10 systems report nominal operation.',
    targetModules: ['sovereign-persona', 'monitoring']
  },
  {
    id: 'security-scan',
    label: 'Trigger Security Scan',
    description: 'Instructs the Adversarial Immune System to scan input queues and clean memory caches.',
    successMessage: 'Adversarial Immune scan completed. 0 threats detected, 12 injection filters optimized.',
    targetModules: ['adversarial-immune', 'sovereign-persona', 'monitoring']
  },
  {
    id: 'carbon-opt',
    label: 'Optimize Power Profile',
    description: 'Triggers Carbon-Aware Optimizer to schedule low-priority background workloads.',
    successMessage: 'Optimized compute scheduler. Shifted 4 training threads to low-intensity window.',
    targetModules: ['carbon-aware', 'morphnet-engine', 'monitoring']
  },
  {
    id: 'federated-sync',
    label: 'Request Federated Sync',
    description: 'Initiates private gradient aggregation with local network peers.',
    successMessage: 'Federated sync completed. Assimilated knowledge from 8 peers with privacy budget remaining.',
    targetModules: ['federated-learning', 'privacy-negotiator', 'cognitive-graph']
  }
];
