import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-20 space-y-12">
        
        {/* Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <h1 className="text-6xl font-bold text-white">
            Nexus Protocol
          </h1>
          <p className="text-2xl text-gray-300">
            Decentralized AI Infrastructure for Personal Autonomy
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            A paradigm shift from "AI as a tool" to "AI as an Infrastructure." 
            The Nexus Protocol is a local-first, privacy-preserving operating layer 
            that gives you a Sovereign Persona—your personal AI digital twin.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            {
              icon: '🧠',
              title: 'Sovereign Persona',
              desc: 'Your Personal AI Twin',
              path: '/sovereign-persona',
            },
            {
              icon: '📊',
              title: 'Cognitive Graph',
              desc: 'Dynamic Knowledge Mapping',
              path: '/cognitive-graph',
            },
            {
              icon: '🔒',
              title: 'Privacy Negotiator',
              desc: 'Cryptographic Communication',
              path: '/privacy-negotiator',
            },
            {
              icon: '🌱',
              title: 'Carbon-Aware',
              desc: 'Sustainable Computing',
              path: '/carbon-aware',
            },
            {
              icon: '⚖️',
              title: 'AI Governance',
              desc: 'Policy & Compliance Center',
              path: '/governance',
            },
            {
              icon: '🛡️',
              title: 'Trust & Reputation',
              desc: 'AI Agent Trust Engine',
              path: '/trust',
            },
            {
              icon: '⚡',
              title: 'Workflow Orchestrator',
              desc: 'Agentic Workflow Manager',
              path: '/orchestrator',
            },
            {
              icon: '🔗',
              title: 'Collaboration Studio',
              desc: 'Multi-Agent Mesh Builder',
              path: '/collaboration-studio',
            },
            {
              icon: '🔬',
              title: 'Benchmark Lab',
              desc: 'AI Evaluation & Audit Lab',
              path: '/benchmark-lab',
            },
            {
              icon: '🔍',
              title: 'Memory Search',
              desc: 'Universal Semantic Explorer',
              path: '/memory-search',
            },
            {
              icon: '📚',
              title: 'Documentation',
              desc: 'Learn More',
              path: '/',
            },
          ].map((feature) => (
            <Link
              key={feature.path}
              to={feature.path}
              className="group"
            >
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-blue-500 hover:bg-gray-800 transition-all h-full">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                  {feature.desc}
                </p>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Key Concepts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 space-y-6"
        >
          <h2 className="text-3xl font-bold text-white">What Makes Nexus Different</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-blue-400">🏘️ Local-First</h3>
              <p className="text-gray-300">
                Your AI lives on your device, not in someone else's cloud. Your data stays yours.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-green-400">🔐 Privacy by Default</h3>
              <p className="text-gray-300">
                Uses cryptography (MPC, ZKP) to negotiate with external systems without exposing your data.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-purple-400">🧠 Personally Intelligent</h3>
              <p className="text-gray-300">
                Understands your unique goals, context, and ethical boundaries through Cognitive Graphs.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-yellow-400">⚡ Carbon-Conscious</h3>
              <p className="text-gray-300">
                Dynamically optimizes itself to minimize energy use and environmental impact.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Core Concepts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg p-8 space-y-6"
        >
          <h2 className="text-3xl font-bold text-white">The 9-Layer System</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div>1. <strong>Sovereign Persona</strong> - Your AI twin</div>
            <div>2. <strong>Cognitive Graph</strong> - Knowledge mapping</div>
            <div>3. <strong>Federated Learning</strong> - Private learning</div>
            <div>4. <strong>Privacy Negotiator</strong> - Secure communication</div>
            <div>5. <strong>MorphNet Engine</strong> - Self-optimization</div>
            <div>6. <strong>Immune System</strong> - Security layer</div>
            <div>7. <strong>Carbon-Aware</strong> - Environmental tracking</div>
            <div>8. <strong>Latent Space Mapping</strong> - Universal interop</div>
            <div>9. <strong>Analytics & Monitoring</strong> - System insights</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
