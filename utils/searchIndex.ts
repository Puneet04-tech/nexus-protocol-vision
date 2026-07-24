import { SearchItem } from '../types/search';
import { mockAgentRepository } from '../core/agent-marketplace/repository/AgentRepository';
import { PluginManager } from '../core/plugin-sdk/PluginManager';

// Import seed plugin manifests as fallback when PluginManager is uninitialized
import { GreetingAgentManifest } from '../core/plugin-sdk/examples/GreetingAgent';
import { KnowledgeAssistantManifest } from '../core/plugin-sdk/examples/KnowledgeAssistant';
import { MetricsCollectorManifest } from '../core/plugin-sdk/examples/MetricsCollector';
import { EventLoggerManifest } from '../core/plugin-sdk/examples/EventLogger';

// 1. Static Pages list matching routing definitions in App.tsx
const PAGES: SearchItem[] = [
  {
    id: 'page-home',
    type: 'page',
    title: 'Home Dashboard',
    description: 'Nexus Protocol Vision Main Dashboard showcasing the system paradigm shift to decentralized agentic AI operating layer.',
    url: '/',
    tags: ['home', 'dashboard', 'nexus', 'overview', 'main']
  },
  {
    id: 'page-sovereign-persona',
    type: 'page',
    title: 'Sovereign Persona Profile',
    description: 'Local-first high-fidelity digital twin that respects your ethical limits and coordinates your personal data safely.',
    url: '/sovereign-persona',
    tags: ['persona', 'sovereign', 'profile', 'local', 'identity', 'digital twin']
  },
  {
    id: 'page-cognitive-graph',
    type: 'page',
    title: 'Cognitive Graph Visualizer',
    description: 'Real-time knowledge mapping representing your concepts, professional context, learning paths, and gap scoring.',
    url: '/cognitive-graph',
    tags: ['cognitive', 'graph', 'knowledge', 'mapping', 'concepts', 'learning']
  },
  {
    id: 'page-privacy-negotiator',
    type: 'page',
    title: 'Privacy-Preserving Negotiator',
    description: 'Cryptographic interaction sandbox negotiating data access permissions using Zero-Knowledge Proofs and MPC.',
    url: '/privacy-negotiator',
    tags: ['privacy', 'negotiator', 'cryptographic', 'zkp', 'mpc', 'secure']
  },
  {
    id: 'page-carbon-aware',
    type: 'page',
    title: 'Carbon-Aware Optimizer',
    description: 'Tracks power grid telemetry in real-time, scheduling computations to green grids to minimize carbon footprints.',
    url: '/carbon-aware',
    tags: ['carbon', 'green', 'energy', 'telemetry', 'grid', 'sustainability']
  },
  {
    id: 'page-federated-learning',
    type: 'page',
    title: 'Federated Learning Console',
    description: 'Collaborative model training dashboard syncing local model updates through differential privacy guarantees.',
    url: '/federated-learning',
    tags: ['federated', 'learning', 'model', 'training', 'differential privacy']
  },
  {
    id: 'page-morphnet',
    type: 'page',
    title: 'MorphNet Engine Pruner',
    description: 'Recursive optimization system that dynamically scales neural network complexity to fit hardware capability.',
    url: '/morphnet',
    tags: ['morphnet', 'engine', 'pruning', 'neural network', 'recursive optimization']
  },
  {
    id: 'page-immune-system',
    type: 'page',
    title: 'Adversarial Immune System',
    description: 'Security shield analyzing semantic intent, blocking prompt injections and preventing agent hijacking.',
    url: '/immune-system',
    tags: ['immune', 'system', 'security', 'threat', 'injection', 'hijacking']
  },
  {
    id: 'page-latent-space',
    type: 'page',
    title: 'Latent Space Mapping Hub',
    description: 'Cross-model vector alignment protocol enabling heterogeneous AI models to understand each other internally.',
    url: '/latent-space',
    tags: ['latent', 'space', 'mapping', 'vector', 'interoperability', 'embeddings']
  },
  {
    id: 'page-monitoring',
    type: 'page',
    title: 'System Telemetry & Monitoring',
    description: 'Consolidated performance metrics, throughput loads, event queues, and sandbox CPU usage timelines.',
    url: '/monitoring',
    tags: ['monitoring', 'telemetry', 'performance', 'metrics', 'diagnostics']
  },
  {
    id: 'page-governance',
    type: 'page',
    title: 'AI Governance & Compliance',
    description: 'Audits ethical constraints, aligns agent behaviors, and produces compliance trace reports.',
    url: '/governance',
    tags: ['governance', 'compliance', 'ethical', 'audit', 'policy', 'alignment']
  },
  {
    id: 'page-conflict-resolution',
    type: 'page',
    title: 'Semantic Conflict Resolver',
    description: 'Manages conflicting directives between multiple autonomous agents, finding semantic compromises.',
    url: '/conflict-resolution',
    tags: ['conflict', 'resolver', 'negotiation', 'semantic', 'overlap', 'compromise']
  },
  {
    id: 'page-explainability',
    type: 'page',
    title: 'AI Decision Trace Explorer',
    description: 'Traces reasoning steps for AI actions using visual ASCII decision trees and transparency checks.',
    url: '/explainability',
    tags: ['explainability', 'trace', 'decision tree', 'reasoning', 'transparency']
  },
  {
    id: 'page-plugins',
    type: 'page',
    title: 'Agent SDK Plugin Hub',
    description: 'Developer workspace for sandbox testing, permissions scoping, and hot deploying custom JS agent scripts.',
    url: '/plugins',
    tags: ['plugins', 'sdk', 'sandbox', 'javascript', 'developer', 'deployment']
  },
  {
    id: 'page-playground',
    type: 'page',
    title: 'Interactive Playground',
    description: 'Experiment with raw scenarios, inject prompt payloads, and observe protocol system triggers.',
    url: '/playground',
    tags: ['playground', 'sandbox', 'scenarios', 'prompt', 'interactive']
  },
  {
    id: 'page-orchestrator',
    type: 'page',
    title: 'Workflow Orchestrator',
    description: 'DAG execution scheduler tracking concurrent task flows, status cycles, and dependency states.',
    url: '/orchestrator',
    tags: ['orchestrator', 'dag', 'scheduler', 'workflow', 'tasks']
  },
  {
    id: 'page-trust',
    type: 'page',
    title: 'Trust & Reputation Engine',
    description: 'Inspects verified publisher hashes, reputation indices, and security containment evaluations.',
    url: '/trust',
    tags: ['trust', 'reputation', 'score', 'publisher', 'security', 'compliance']
  },
  {
    id: 'page-marketplace',
    type: 'page',
    title: 'AI Agent Marketplace',
    description: 'Hub for exploring, verifying, sandboxing, and installing third-party autonomous utility agents.',
    url: '/marketplace',
    tags: ['marketplace', 'agents', 'store', 'install', 'download', 'reputation']
  },
  {
    id: 'page-collaboration-studio',
    type: 'page',
    title: 'Collaboration Studio',
    description: 'Shared multi-agent task boards and visual merge logic logs for resolving concurrent outputs.',
    url: '/collaboration-studio',
    tags: ['collaboration', 'studio', 'multi-agent', 'task board', 'merge']
  },
  {
    id: 'page-benchmark-lab',
    type: 'page',
    title: 'Agent Benchmark Lab',
    description: 'Audits prompt latency, token throughput speeds, energy metrics, and performance charts.',
    url: '/benchmark-lab',
    tags: ['benchmark', 'lab', 'performance', 'latency', 'token', 'throughput']
  },
  {
    id: 'page-memory-search',
    type: 'page',
    title: 'Episodic Memory Explorer',
    description: 'Graph-based database indexing semantic and episodic memory records for local persona recall.',
    url: '/memory-search',
    tags: ['memory', 'explorer', 'episodic', 'semantic', 'database', 'recall']
  },
  {
    id: 'page-incident-response',
    type: 'page',
    title: 'Incident Containment Center',
    description: 'Quarantine dashboard monitoring memory anomalies, sandbox isolation boundaries, and automated recovery actions.',
    url: '/incident-response',
    tags: ['incident', 'response', 'containment', 'quarantine', 'anomaly', 'recovery']
  },
  {
    id: 'page-cost-optimizer',
    type: 'page',
    title: 'Cost & Token Optimizer',
    description: 'Dynamic resource budget metrics calculating token consumption rates and model layer pruning suggestions.',
    url: '/cost-optimizer',
    tags: ['cost', 'optimizer', 'token', 'budget', 'resource', 'efficiency']
  },
  {
    id: 'page-model-registry',
    type: 'page',
    title: 'Cryptographic Model Registry',
    description: 'Tracks loaded model weights, checking signature tags, version compliance, and cryptographic parameters.',
    url: '/model-registry',
    tags: ['model', 'registry', 'weights', 'signature', 'version', 'cryptography']
  }
];

// 2. Core Modules list matching directories under core/
const MODULES: SearchItem[] = [
  {
    id: 'module-adversarial-immune',
    type: 'module',
    title: 'adversarial-immune',
    description: 'Core security engine analyzing the semantic intent of input queries to block prompt injections and agent hijacks.',
    url: '/immune-system',
    tags: ['core', 'module', 'security', 'adversarial', 'immune', 'protection']
  },
  {
    id: 'module-agent-marketplace',
    type: 'module',
    title: 'agent-marketplace',
    description: 'Manages agent installer pipelines, verified checks, security ratings, and developer downloads.',
    url: '/marketplace',
    tags: ['core', 'module', 'marketplace', 'agent', 'downloads', 'verification']
  },
  {
    id: 'module-backup',
    type: 'module',
    title: 'backup',
    description: 'Provides encrypted, decentralized backups for the sovereign persona profiles and cognitive graphs.',
    url: '/sovereign-persona',
    tags: ['core', 'module', 'backup', 'encrypted', 'decentralized', 'restore']
  },
  {
    id: 'module-benchmark-lab',
    type: 'module',
    title: 'benchmark-lab',
    description: 'Measures agent response accuracy, token per second performance, and simulated query latency.',
    url: '/benchmark-lab',
    tags: ['core', 'module', 'benchmark', 'lab', 'latency', 'token-speed']
  },
  {
    id: 'module-carbon-aware',
    type: 'module',
    title: 'carbon-aware',
    description: 'Engine querying grid telemetry APIs and rescheduling latency-tolerant computational tasks to low-carbon windows.',
    url: '/carbon-aware',
    tags: ['core', 'module', 'carbon', 'scheduler', 'telemetry', 'grid']
  },
  {
    id: 'module-collaboration-studio',
    type: 'module',
    title: 'collaboration-studio',
    description: 'Enables cross-agent communication protocols, task-list assignments, and merge resolution channels.',
    url: '/collaboration-studio',
    tags: ['core', 'module', 'collaboration', 'studio', 'communication', 'multi-agent']
  },
  {
    id: 'module-conflict-resolution',
    type: 'module',
    title: 'conflict-resolution',
    description: 'Aligns divergent intents or conflicting tasks using utility theory and semantic boundary adjustments.',
    url: '/conflict-resolution',
    tags: ['core', 'module', 'conflict', 'resolution', 'negotiation', 'compromise']
  },
  {
    id: 'module-cost-optimizer',
    type: 'module',
    title: 'cost-optimizer',
    description: 'Tracks prompt and completions billing rates, enforcing budget scopes and proposing model pruning constraints.',
    url: '/cost-optimizer',
    tags: ['core', 'module', 'cost', 'optimizer', 'budget', 'tokens']
  },
  {
    id: 'module-explainability',
    type: 'module',
    title: 'explainability',
    description: 'Generates decision paths, confidence metrics, and immutable trace logs for external audit validation.',
    url: '/explainability',
    tags: ['core', 'module', 'explainability', 'trace', 'decision tree', 'logs']
  },
  {
    id: 'module-federated-learning',
    type: 'module',
    title: 'federated-learning',
    description: 'Coordinates secure model weight exchanges locally, applying differential privacy noise vectors.',
    url: '/federated-learning',
    tags: ['core', 'module', 'federated', 'learning', 'weights', 'privacy-budget']
  },
  {
    id: 'module-governance',
    type: 'module',
    title: 'governance',
    description: 'Maintains cryptographic lists of ethical rules, constraints, and verified compliance parameters.',
    url: '/governance',
    tags: ['core', 'module', 'governance', 'policy', 'ethical', 'rules']
  },
  {
    id: 'module-incident-response',
    type: 'module',
    title: 'incident-response',
    description: 'System-wide isolation monitor. Mitigates containment failures and rolls back corrupted memory states.',
    url: '/incident-response',
    tags: ['core', 'module', 'incident', 'quarantine', 'containment', 'recovery']
  },
  {
    id: 'module-latent-mapping',
    type: 'module',
    title: 'latent-mapping',
    description: 'Enables mathematical alignment between different embedding vectors using alignment matrices (Procrustes).',
    url: '/latent-space',
    tags: ['core', 'module', 'latent', 'mapping', 'embeddings', 'interoperability']
  },
  {
    id: 'module-memory-search',
    type: 'module',
    title: 'memory-search',
    description: 'Performs semantic similarity scans and graph traversals on localized memory logs.',
    url: '/memory-search',
    tags: ['core', 'module', 'memory', 'search', 'vector', 'retrieval']
  },
  {
    id: 'module-model-registry',
    type: 'module',
    title: 'model-registry',
    description: 'Handles model weights signature checks, parameter listings, compatibility logs, and updates.',
    url: '/model-registry',
    tags: ['core', 'module', 'model', 'registry', 'weights', 'signature']
  },
  {
    id: 'module-monitoring',
    type: 'module',
    title: 'monitoring',
    description: 'Aggregates diagnostic records, system load states, event bus messages, and performance queues.',
    url: '/monitoring',
    tags: ['core', 'module', 'monitoring', 'telemetry', 'diagnostics', 'health']
  },
  {
    id: 'module-morphnet-engine',
    type: 'module',
    title: 'morphnet-engine',
    description: 'Implements recursive structural pruning of neural model architectures based on computation intensity.',
    url: '/morphnet',
    tags: ['core', 'module', 'morphnet', 'engine', 'pruning', 'architecture']
  },
  {
    id: 'module-plugin-sdk',
    type: 'module',
    title: 'plugin-sdk',
    description: 'Exposes Javascript sandbox runtime environments and loads developer modules via fine-grained ACL permissions.',
    url: '/plugins',
    tags: ['core', 'module', 'plugin', 'sdk', 'sandbox', 'javascript']
  },
  {
    id: 'module-privacy-negotiator',
    type: 'module',
    title: 'privacy-negotiator',
    description: 'Orchestrates Zero-Knowledge proofs and MPC transactions between localized personas and external utilities.',
    url: '/privacy-negotiator',
    tags: ['core', 'module', 'privacy', 'negotiator', 'zkp', 'mpc']
  },
  {
    id: 'module-sovereign-persona',
    type: 'module',
    title: 'sovereign-persona',
    description: 'Local-first state container storing user profile, knowledge domains, confidence, and carbon foot targets.',
    url: '/sovereign-persona',
    tags: ['core', 'module', 'sovereign', 'persona', 'profile', 'local-first']
  },
  {
    id: 'module-trust',
    type: 'module',
    title: 'trust',
    description: 'Audits security rating configurations, verified signatures, and publisher reputation logs.',
    url: '/trust',
    tags: ['core', 'module', 'trust', 'reputation', 'rating', 'audit']
  },
  {
    id: 'module-workflow-orchestrator',
    type: 'module',
    title: 'workflow-orchestrator',
    description: 'DAG pipeline execution scheduler managing state dependencies, event triggers, and active processes.',
    url: '/orchestrator',
    tags: ['core', 'module', 'workflow', 'orchestrator', 'dag', 'scheduler']
  }
];

// 3. Static Documentation sections indexed from docs/
const DOCUMENTATION: SearchItem[] = [
  // API Docs
  {
    id: 'doc-api-overview',
    type: 'doc',
    title: 'API: Programmatic Core Overview',
    description: 'RESTful API developer endpoints targeting all nine core modules. Supports secure, sandboxed access.',
    url: '/plugins',
    tags: ['docs', 'api', 'endpoints', 'development', 'oauth', 'jwt']
  },
  {
    id: 'doc-api-sovereign-persona',
    type: 'doc',
    title: 'API: Sovereign Persona Endpoints',
    description: 'Endpoints for creating sovereign profiles, updating domain knowledge vectors, and auditing boundaries.',
    url: '/plugins',
    tags: ['docs', 'api', 'endpoints', 'persona', 'create', 'interact']
  },
  {
    id: 'doc-api-privacy-negotiator',
    type: 'doc',
    title: 'API: Cryptographic Preserving Negotiator',
    description: 'Details Multi-Party Computation parameters and Zero-Knowledge Proof schema negotiations.',
    url: '/plugins',
    tags: ['docs', 'api', 'endpoints', 'negotiator', 'zkp', 'mpc']
  },
  {
    id: 'doc-api-morphnet-engine',
    type: 'doc',
    title: 'API: MorphNet Recursive Optimizer',
    description: 'Specifies denseness thresholds, layers structures, and resource optimization parameters.',
    url: '/plugins',
    tags: ['docs', 'api', 'endpoints', 'morphnet', 'pruning', 'optimize']
  },
  // Getting Started Tutorial
  {
    id: 'doc-tutorial-installation',
    type: 'doc',
    title: 'Tutorial: Quick Installation',
    description: 'Guide for cloning the repository, injecting local development variables, and compiling Vite bundles.',
    url: '/playground',
    tags: ['docs', 'tutorial', 'getting started', 'install', 'setup', 'npm']
  },
  {
    id: 'doc-tutorial-persona-setup',
    type: 'doc',
    title: 'Tutorial: Initializing Your Local Persona',
    description: 'Step-by-step documentation for generating cognitive parameters, configuring ethical scopes, and local testing.',
    url: '/playground',
    tags: ['docs', 'tutorial', 'getting started', 'persona', 'setup']
  },
  {
    id: 'doc-tutorial-crypto-negotiation',
    type: 'doc',
    title: 'Tutorial: Your First Cryptographic Negotiation',
    description: 'Simulates connecting to external grids and negotiating electricity usage rates without uploading persona data.',
    url: '/playground',
    tags: ['docs', 'tutorial', 'getting started', 'negotiation', 'zkp', 'simulation']
  },
  // Whitepaper Docs
  {
    id: 'doc-whitepaper-concept',
    type: 'doc',
    title: 'Whitepaper: Decoupling AI as an Infrastructure',
    description: 'Explores the fundamental paradigm shift from cloud-centralized API structures to local-first secure operating layers.',
    url: '/',
    tags: ['docs', 'whitepaper', 'architecture', 'vision', 'paradigm shift']
  },
  {
    id: 'doc-whitepaper-federated-learning',
    type: 'doc',
    title: 'Whitepaper: Privacy-Preserving Global Synchronization',
    description: 'Examines mathematical formulations for localized learning, differential noise injection, and secure average aggregation.',
    url: '/',
    tags: ['docs', 'whitepaper', 'federated', 'math', 'differential privacy']
  },
  {
    id: 'doc-whitepaper-morphnet-optimizations',
    type: 'doc',
    title: 'Whitepaper: Self-Adjusting Compute Architectures',
    description: 'Theoretical background detailing dynamic architecture pruning models to preserve global server carbon parameters.',
    url: '/',
    tags: ['docs', 'whitepaper', 'morphnet', 'pruning', 'neural network', 'sustainability']
  }
];

/**
 * Compiles a consolidated search index of pages, modules, docs, agents, and plugins.
 * Dynamic resources (Marketplace agents, Plugins) are fetched in real-time.
 */
export function buildSearchIndex(): SearchItem[] {
  const index: SearchItem[] = [...PAGES, ...MODULES, ...DOCUMENTATION];

  // 4. Fetch Marketplace Agents dynamically
  try {
    const agents = mockAgentRepository.list();
    const agentSearchItems: SearchItem[] = agents.map(agent => ({
      id: `marketplace-${agent.id}`,
      type: 'marketplace',
      title: agent.name,
      description: agent.description,
      url: '/marketplace',
      tags: [...agent.categories, ...agent.tags, agent.publisher.name, agent.id],
      metadata: {
        downloads: agent.downloadCount,
        rating: agent.rating,
        publisher: agent.publisher.name,
        verified: agent.publisher.verified
      }
    }));
    index.push(...agentSearchItems);
  } catch (e) {
    // Graceful fallback if repository fails
  }

  // 5. Fetch Plugins dynamically from PluginManager
  let pluginsLoaded = false;
  try {
    const pm = PluginManager.getInstance();
    const plugins = pm.listPlugins();
    if (plugins && plugins.length > 0) {
      const pluginSearchItems: SearchItem[] = plugins.map(p => ({
        id: `plugin-${p.manifest.id}`,
        type: 'plugin',
        title: p.manifest.name,
        description: p.manifest.description,
        url: '/plugins',
        tags: [p.manifest.id, p.manifest.author, ...p.manifest.permissions],
        metadata: {
          state: p.status.state,
          author: p.manifest.author,
          version: p.manifest.version
        }
      }));
      index.push(...pluginSearchItems);
      pluginsLoaded = true;
    }
  } catch (e) {
    // If PluginManager is uninitialized, fall back to seed plugins list
  }

  if (!pluginsLoaded) {
    // Pre-loaded/fallback seed plugins
    const seedManifests = [
      GreetingAgentManifest,
      KnowledgeAssistantManifest,
      MetricsCollectorManifest,
      EventLoggerManifest
    ];

    const fallbackItems: SearchItem[] = seedManifests.map(manifest => ({
      id: `plugin-${manifest.id}`,
      type: 'plugin',
      title: manifest.name,
      description: manifest.description,
      url: '/plugins',
      tags: [manifest.id, manifest.author, ...manifest.permissions],
      metadata: {
        state: 'DISABLED',
        author: manifest.author,
        version: manifest.version
      }
    }));
    index.push(...fallbackItems);
  }

  return index;
}
