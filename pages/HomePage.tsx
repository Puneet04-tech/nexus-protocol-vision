import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';
import OverviewCards from '../components/dashboard/OverviewCards';
import QuickActions from '../components/dashboard/QuickActions';
import RecentActivity from '../components/dashboard/RecentActivity';

/**
 * HomePage Component.
 * Acts as the main Dashboard Overview landing page of the Nexus Protocol.
 * Displays interactive stats, quick execution actions, live logs, and feature navigation.
 */
const HomePage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  const features = [
    {
      icon: '🧠',
      title: 'Sovereign Persona',
      desc: 'Your Personal AI Twin & local digital identity.',
      path: '/sovereign-persona',
    },
    {
      icon: '📊',
      title: 'Cognitive Graph',
      desc: 'Dynamic knowledge and memory mapping.',
      path: '/cognitive-graph',
    },
    {
      icon: '🔒',
      title: 'Privacy Negotiator',
      desc: 'Secure multi-agent blind negotiations.',
      path: '/privacy-negotiator',
    },
    {
      icon: '🌱',
      title: 'Carbon-Aware Engine',
      desc: 'Computational power efficiency tuning.',
      path: '/carbon-aware',
    },
    {
      icon: '⚖️',
      title: 'AI Governance',
      desc: 'Policy enforcement and compliance reports.',
      path: '/governance',
    },
    {
      icon: '🧩',
      title: 'Plugins Center',
      desc: 'Extend modular platform capabilities.',
      path: '/plugins',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* 1. Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Welcome to the <span className={`bg-gradient-to-r ${themeClasses.gradientFrom} ${themeClasses.gradientTo} bg-clip-text text-transparent`}>Nexus Control Center</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-3xl">
            Decentralized AI Infrastructure for Personal Autonomy. Your local-first, privacy-preserving operating layer is active and synchronizing.
          </p>
        </motion.div>

        {/* 2. Overview Statistics Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <OverviewCards />
        </motion.div>

        {/* 3. Main Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Area: Feature Shortcuts & Concepts */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Feature Grid Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-mono uppercase tracking-widest text-gray-500 flex items-center">
                <span className={`w-2 h-2 rounded-full ${themeClasses.bg} mr-2`}></span>
                Core Modules & Demos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature) => (
                  <Link
                    key={feature.path}
                    to={feature.path}
                    className="group focus:outline-none"
                  >
                    <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-5 hover:border-gray-700/80 hover:bg-gray-900/60 transition-all h-full flex flex-col justify-between group-focus-visible:ring-1 group-focus-visible:ring-gray-600">
                      <div>
                        <div className="text-3xl mb-3 filter drop-shadow-md select-none">{feature.icon}</div>
                        <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-white transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {feature.desc}
                        </p>
                      </div>
                      <div className={`text-[10px] font-mono font-semibold tracking-wider text-gray-500 group-hover:${themeClasses.text} transition-colors mt-4`}>
                        OPEN DEMO &rarr;
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* What Makes Nexus Different (Concepts) */}
            <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">What Makes Nexus Different</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-950/30 rounded-lg border border-gray-850">
                  <h3 className="text-xs font-bold text-blue-400 flex items-center space-x-1.5">
                    <span>🏘️</span> <span>Local-First</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Your AI lives entirely on your device. Your training data, context weights, and preferences stay yours.
                  </p>
                </div>
                <div className="p-3 bg-gray-950/30 rounded-lg border border-gray-850">
                  <h3 className="text-xs font-bold text-green-400 flex items-center space-x-1.5">
                    <span>🔐</span> <span>Privacy by Default</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Uses zero-knowledge proofs and multi-party computation to negotiate securely without exposing raw context.
                  </p>
                </div>
                <div className="p-3 bg-gray-950/30 rounded-lg border border-gray-850">
                  <h3 className="text-xs font-bold text-purple-400 flex items-center space-x-1.5">
                    <span>🧠</span> <span>Personally Intelligent</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Continuously indexes your local files and learning habits into a structured Cognitive Graph map.
                  </p>
                </div>
                <div className="p-3 bg-gray-950/30 rounded-lg border border-gray-850">
                  <h3 className="text-xs font-bold text-yellow-400 flex items-center space-x-1.5">
                    <span>⚡</span> <span>Carbon-Conscious</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Dynamically prunes parameters based on complexity limits to run with minimum compute overhead.
                  </p>
                </div>
              </div>
            </div>

            {/* The 9-Layer System Reference */}
            <div className="bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-950 rounded-xl p-6 space-y-3">
              <h2 className="text-sm font-mono uppercase tracking-widest text-blue-400 font-bold">The 9-Layer Architecture System</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs text-gray-400">
                <div>1. <strong className="text-gray-300">Sovereign Persona</strong> - Personal twin</div>
                <div>2. <strong className="text-gray-300">Cognitive Graph</strong> - Knowledge maps</div>
                <div>3. <strong className="text-gray-300">Federated Learning</strong> - Secure tuning</div>
                <div>4. <strong className="text-gray-300">Privacy Negotiator</strong> - Secure MPC/ZKP</div>
                <div>5. <strong className="text-gray-300">MorphNet Engine</strong> - Dynamic pruning</div>
                <div>6. <strong className="text-gray-300">Immune System</strong> - Prompt protections</div>
                <div>7. <strong className="text-gray-300">Carbon-Aware</strong> - Green energy schedule</div>
                <div>8. <strong className="text-gray-300">Latent Space Mapping</strong> - P2P interop</div>
                <div>9. <strong className="text-gray-300">Analytics & Monitoring</strong> - Live logs</div>
              </div>
            </div>

          </motion.div>

          {/* Right Area: Actions & Activity logs */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Quick Actions Panel */}
            <QuickActions />

            {/* Live Log Monitor feed */}
            <RecentActivity />
          </motion.div>
          
        </div>

      </div>
    </div>
  );
};

export default HomePage;
