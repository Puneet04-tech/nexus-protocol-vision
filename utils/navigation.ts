import { 
  SovereignPersonaIcon, 
  CognitiveGraphIcon, 
  MorphNetEngineIcon, 
  LatentSpaceIcon,
  FederatedLearningIcon,
  PrivacyNegotiatorIcon,
  AdversarialImmuneIcon,
  CarbonAwareIcon,
  MonitoringIcon
} from '../components/icons';
import { Brain, ShieldCheck, Scale, GitBranch, Plug, Play, Terminal } from 'lucide-react';
import { NavigationGroup } from '../types/dashboard';

/**
 * Categorized navigation groups containing existing active modules in the codebase.
 */
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: 'core-ai',
    name: 'Core AI',
    icon: '🧠',
    items: [
      {
        name: 'Sovereign Persona',
        path: '/sovereign-persona',
        icon: SovereignPersonaIcon,
        description: 'Your Personal AI Twin & Digital Identity'
      },
      {
        name: 'Cognitive Graph',
        path: '/cognitive-graph',
        icon: CognitiveGraphIcon,
        description: 'Dynamic Knowledge & Memory Mapping'
      },
      {
        name: 'Federated Learning',
        path: '/federated-learning',
        icon: FederatedLearningIcon,
        description: 'Privacy-Preserving Collaborative Training'
      },
      {
        name: 'MorphNet',
        path: '/morphnet',
        icon: MorphNetEngineIcon,
        description: 'Recursive Neural Architecture Optimization'
      },
      {
        name: 'Latent Space',
        path: '/latent-space',
        icon: LatentSpaceIcon,
        description: 'Universal Cross-Model Communication Protocol'
      }
    ]
  },
  {
    id: 'security',
    name: 'Security',
    icon: '🔒',
    items: [
      {
        name: 'Privacy Negotiator',
        path: '/privacy-negotiator',
        icon: PrivacyNegotiatorIcon,
        description: 'Cryptographic MPC & ZKP Autonomous Negotiator'
      },
      {
        name: 'Immune System',
        path: '/immune-system',
        icon: AdversarialImmuneIcon,
        description: 'Semantic Intent & Injection Defense Engine'
      },
      {
        name: 'Conflict Resolver',
        path: '/conflict-resolution',
        icon: GitBranch,
        description: 'Multi-Agent Consensus & Dispute Resolution'
      },
      {
        name: 'AI Governance',
        path: '/governance',
        icon: Scale,
        description: 'Compliance Auditing & Policy Enforcement'
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: '📊',
    items: [
      {
        name: 'Monitoring',
        path: '/monitoring',
        icon: MonitoringIcon,
        description: 'System Health, Resource & Network Tracking'
      },
      {
        name: 'Explainability',
        path: '/explainability',
        icon: Brain,
        description: 'Immutable Decision Tracing & Reasoning Maps'
      }
    ]
  },
  {
    id: 'ecosystem',
    name: 'Ecosystem',
    icon: '🌍',
    items: [
      {
        name: 'Plugins',
        path: '/plugins',
        icon: Plug,
        description: 'Extend System Capabilities via Modular Plugins'
      }
    ]
  },
  {
    id: 'system',
    name: 'System',
    icon: '⚙️',
    items: [
      {
        name: 'Carbon Aware',
        path: '/carbon-aware',
        icon: CarbonAwareIcon,
        description: 'Sustainable Computing & Green Energy Tuning'
      },
      {
        name: 'Orchestrator',
        path: '/orchestrator',
        icon: Play,
        description: 'Workflow Orchestration & Task Execution'
      },
      {
        name: 'Playground',
        path: '/playground',
        icon: Terminal,
        description: 'Interactive Code Execution Sandbox'
      }
    ]
  }
];
