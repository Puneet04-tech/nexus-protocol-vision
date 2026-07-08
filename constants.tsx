
import React from 'react';
import { FeatureData } from './types';
import {
  SovereignPersonaIcon,
  PrivacyIcon,
  NegotiatorIcon,
  OptimizationIcon,
  SecurityIcon,
  InteroperableIcon,
  CognitiveGraphIcon,
  FederatedLearningIcon,
  PrivacyNegotiatorIcon,
  MorphNetEngineIcon,
  AdversarialImmuneIcon,
  CarbonAwareIcon,
  LatentSpaceIcon,
  MonitoringIcon,
} from './components/icons';
import { Brain } from 'lucide-react';

const ExplainabilityIcon = (props: any) => <Brain className="w-5 h-5 text-cyan-400" {...props} />;

export const NEXUS_PROTOCOL_CONTEXT = `
The Nexus Protocol: The Detailed Vision The Nexus Protocol is a paradigm shift from "AI as a tool" to "AI as an Infrastructure." At its core, it is a decentralized, agentic operating layer designed to sit between the user and the digital/physical world. Unlike current AI models that reside in centralized clouds and treat every interaction as a generic transaction, Nexus creates a Sovereign Persona—a local-first, high-fidelity digital twin that possesses your "Cognitive Graph." This persona understands your knowledge gaps, your professional context, and your ethical boundaries. It uses Federated Learning to stay smart without ever uploading your raw data to a server. When you interact with the world—whether you’re learning a new skill, managing a project, or navigating a smart city—the Protocol acts as a "Privacy-Preserving Negotiator." It uses Multi-Party Computation (MPC) and Zero-Knowledge Proofs to communicate with other agents (like a City’s Energy Grid or a Company’s Project Manager) to achieve complex goals autonomously. The brilliance of the Nexus Protocol lies in its Recursive Optimization. It doesn't just execute tasks; it manages the cost and impact of those tasks. Through the MorphNet Engine, the software dynamically prunes its own neural architecture, scaling its complexity down for simple tasks to save energy and scaling up only when high-level reasoning is required. This makes the entire system Carbon-Aware and hyper-efficient. On the security front, it operates an Adversarial Immune System that monitors the semantic intent of all incoming data, neutralizing "prompt injections" and "agent hijacking" in real-time. By merging these nine themes, Nexus becomes a "System of Systems" that provides the security of a private vault, the intelligence of a personal tutor, and the efficiency of a global utility, all while remaining entirely open-source and interoperable through a universal Latent Space Mapping protocol.

What Is The Nexus Protocol (In Simple Terms)? The Nexus Protocol is an idea where AI is not just an app you use, but becomes a personal operating system that runs your digital life. Instead of AI living in big company servers and treating you like just another user, Nexus creates a private AI that belongs only to you.

1. Sovereign Persona (Your Personal AI Twin): A highly intelligent digital version of you that lives on your device. It understands your goals, knows your strengths and weaknesses, understands your work context, and respects your ethical limits. It builds something called a Cognitive Graph, which is a map of how you think, what you know, and what you need to learn. Your raw data never leaves your device.

2. Privacy-Preserving Learning (Federated Learning): In Nexus, your AI learns locally and only shares tiny mathematical updates (not your actual data), so privacy is protected. This is called Federated Learning.

3. AI as a Negotiator: When interacting with other systems (a smart city, a company system), your AI negotiates for you securely. It uses Multi-Party Computation (MPC) for systems to compute together without revealing private data, and Zero-Knowledge Proofs to prove something is true without revealing the actual information.

4. Recursive Optimization (Self-Adjusting Brain): Your AI does not always run at full power. It uses a small brain mode for simple tasks and a big brain mode for complex reasoning, turning parts of itself off to save energy. This is done by the MorphNet Engine, which dynamically adjusts its own neural network size, saving energy and reducing carbon impact.

5. AI Immune System (Security Layer): This is like an antivirus + firewall + reasoning guard combined. It monitors incoming instructions, detects malicious prompts, stops prompt injection attacks, and prevents other agents from hijacking it. It checks the “intent” behind inputs before acting.

6. Open and Interoperable: It’s open source, not controlled by one company, and compatible with other AI systems. The “Latent Space Mapping” idea means different AI systems can understand each other’s internal representations, allowing them to communicate.

In One Simple Sentence: The Nexus Protocol is a private, intelligent, self-optimizing AI operating system that lives with you, protects your data, negotiates on your behalf, and interacts securely with the world.
`;

export const FEATURES: FeatureData[] = [
  {
    icon: <SovereignPersonaIcon />,
    title: "🧠 Sovereign Persona",
    description: "A highly intelligent digital version of you that lives on your device, not in the cloud.",
    details: ["Understands your goals & context", "Knows your strengths & weaknesses", "Respects your ethical limits", "Builds a 'Cognitive Graph' of how you think"]
  },
  {
    icon: <CognitiveGraphIcon />,
    title: "📊 Cognitive Graph",
    description: "Dynamic knowledge mapping that tracks your learning patterns and identifies knowledge gaps.",
    details: ["Real-time knowledge updates", "Learning path optimization", "Knowledge gap identification", "Confidence scoring across domains"]
  },
  {
    icon: <FederatedLearningIcon />,
    title: "🤝 Federated Learning",
    description: "Privacy-preserving collaborative learning without sharing raw data.",
    details: ["Secure aggregation of insights", "Differential privacy guarantees", "Model personalization", "Contribution tracking"]
  },
  {
    icon: <PrivacyNegotiatorIcon />,
    title: "🔒 Privacy Negotiator",
    description: "Autonomous agent communication using advanced cryptographic techniques.",
    details: ["Multi-Party Computation (MPC)", "Zero-Knowledge Proofs (ZKP)", "Smart contract integration", "Privacy budget management"]
  },
  {
    icon: <MorphNetEngineIcon />,
    title: "⚡ MorphNet Engine",
    description: "Recursive optimization for hyper-efficient AI operations.",
    details: ["Dynamic architecture pruning", "Carbon-aware optimization", "Real-time adaptation", "Resource allocation"]
  },
  {
    icon: <AdversarialImmuneIcon />,
    title: "🛡️ Adversarial Immune System",
    description: "Real-time protection against malicious inputs and attacks.",
    details: ["Semantic intent analysis", "Prompt injection detection", "Agent hijacking prevention", "Behavioral anomaly detection"]
  },
  {
    icon: <CarbonAwareIcon />,
    title: "🌱 Carbon-Aware Optimizer",
    description: "Environmental impact monitoring and optimization.",
    details: ["Real-time carbon tracking", "Carbon budget management", "Optimization opportunities", "Sustainability reporting"]
  },
  {
    icon: <LatentSpaceIcon />,
    title: "🗺️ Latent Space Mapping",
    description: "Universal interoperability protocol for AI systems.",
    details: ["Cross-model communication", "Semantic translation", "Universal embeddings", "Interoperability standards"]
  },
  {
    icon: <MonitoringIcon />,
    title: "📈 Monitoring & Analytics",
    description: "Comprehensive system monitoring and insights.",
    details: ["Performance metrics tracking", "Usage analytics", "Health monitoring", "Predictive analytics"]
  },
  {
    icon: <ExplainabilityIcon />,
    title: "🔍 AI Decision Trace",
    description: "Inspect how AI reached every important decision with full reasoning traces.",
    details: ["Immutable trace recording", "ASCII reasoning tree visualization", "Dynamic confidence score assessment", "Ethical & privacy compliance reports"]
  }
];
