import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, Shield, TrendingUp, BookOpen, Users } from 'lucide-react';
import RealTimeSovereignPersona from '../components/RealTimeSovereignPersona';
import AskNexus from '../components/AskNexus';
import { SovereignPersonaBackupDashboard } from '../components/SovereignPersonaBackupDashboard';
import { SovereignPersona } from '../core/sovereign-persona/SovereignPersona';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

const MOCK_PROFILE = {
  id: 'persona-active-user',
  userId: 'user-007',
  knowledgeDomains: ['programming', 'security', 'cryptography', 'ai'],
  ethicalBoundaries: [
    { domain: 'data-privacy', constraints: ['Do not leak raw user interactions'], severity: 'critical' as const },
    { domain: 'carbon-budget', constraints: ['Keep daily emissions below target'], severity: 'medium' as const }
  ],
  professionalContext: {
    role: 'Lead Cryptographer',
    industry: 'Cybersecurity',
    skills: ['Rust', 'TypeScript', 'AES-GCM', 'ZK-Proofs'],
    experience: '8 years',
    goals: ['Verify local decentralization integrity', 'Minimize carbon impact']
  },
  privacyPreferences: {
    dataRetention: 90,
    sharingLevel: 'private' as const,
    encryptionLevel: 'military' as const,
    federatedParticipation: true
  },
  carbonFootprintTarget: 80
};

const SovereignPersonaPage: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);
  const [activeTab, setActiveTab] = useState<'profile' | 'backup'>('profile');
  
  // Real SovereignPersona instance for tests & dashboard actions
  const [personaInstance] = useState(() => new SovereignPersona(MOCK_PROFILE));

  // Seed some Cognitive Graph nodes on mount to make graph stats active
  useEffect(() => {
    const seedGraph = async () => {
      try {
        const graph = personaInstance.getCognitiveGraph();
        if (graph.exportGraph().nodes.length <= 4) {
          await personaInstance.processInteraction({
            type: 'learning',
            content: 'Studying zero knowledge proofs and cryptographic commitments',
            context: 'research',
            timestamp: Date.now() - 3600000
          });
          await personaInstance.processInteraction({
            type: 'query',
            content: 'Reviewing AES-GCM authentication tags in local storage encryption',
            context: 'security',
            timestamp: Date.now() - 1800000
          });
        }
      } catch (err) {
        // Silent fallback
      }
    };
    seedGraph();
  }, [personaInstance]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Brain className={`w-12 h-12 ${themeClasses.text}`} />
          </div>
          <h1 className="text-5xl font-bold text-white">Sovereign Persona</h1>
          <p className="text-2xl text-gray-300">Your Personal AI Twin</p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            A highly intelligent digital version of you that lives on your device, understands your goals, 
            knows your strengths and weaknesses, and respects your ethical boundaries.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center border-b border-gray-700/60 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Persona Twin Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center space-x-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'backup'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Secure Backup Vault</span>
          </button>
        </div>

        {activeTab === 'profile' ? (
          <>
            {/* What It Is */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 space-y-6"
            >
              <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                <span className={`${themeClasses.bg} p-3 rounded-lg`}>
                  <Brain className="w-6 h-6 text-white" />
                </span>
                <span>What Is Sovereign Persona?</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-blue-400">Core Concept</h3>
                  <p className="text-gray-300">
                    The Sovereign Persona is NOT a cloud-based AI chatbot. It's an intelligent digital twin 
                    that runs on YOUR device. It's specifically designed for YOU—understanding your unique goals, 
                    professional context, ethical boundaries, and learning patterns.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-blue-400">Key Properties</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start space-x-3">
                      <span className="text-blue-400 mt-1">✓</span>
                      <span>Personalized to your knowledge & skills</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-blue-400 mt-1">✓</span>
                      <span>Privacy-first: runs locally on your device</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-blue-400 mt-1">✓</span>
                      <span>Learns from your behavior patterns</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-blue-400 mt-1">✓</span>
                      <span>Respects your ethical boundaries</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* How It Works */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 space-y-6"
            >
              <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                <span className={`${themeClasses.bg} p-3 rounded-lg`}>
                  <Target className="w-6 h-6 text-white" />
                </span>
                <span>How It Works (4-Step Process)</span>
              </h2>

              <div className="space-y-4">
                <div className="bg-gray-700/50 p-5 rounded-lg border-l-4 border-blue-500">
                  <h3 className="text-lg font-bold text-white mb-2">1. Profile Creation</h3>
                  <p className="text-gray-300">
                    The system creates a detailed profile combining: your career context (role, industry, experience), 
                    your knowledge domains (areas of expertise), your ethical boundaries (what you won't do), and your privacy preferences.
                  </p>
                </div>

                <div className="bg-gray-700/50 p-5 rounded-lg border-l-4 border-green-500">
                  <h3 className="text-lg font-bold text-white mb-2">2. Cognitive Graph Building</h3>
                  <p className="text-gray-300">
                    As you interact with the system, it builds a "Cognitive Graph"—essentially a map of your knowledge, 
                    showing what you know, what you're learning, and where your gaps are. This is stored locally.
                  </p>
                </div>

                <div className="bg-gray-700/50 p-5 rounded-lg border-l-4 border-purple-500">
                  <h3 className="text-lg font-bold text-white mb-2">3. Real-Time Learning</h3>
                  <p className="text-gray-300">
                    The Sovereign Persona learns from every interaction without uploading raw data to any server. 
                    It uses Federated Learning to share only algorithmic updates with the broader network.
                  </p>
                </div>

                <div className="bg-gray-700/50 p-5 rounded-lg border-l-4 border-yellow-500">
                  <h3 className="text-lg font-bold text-white mb-2">4. Autonomous Decision-Making</h3>
                  <p className="text-gray-300">
                    When you request something, the Persona evaluates it against your ethical boundaries, 
                    your carbon budget, and your privacy preferences BEFORE taking action. It can negotiate 
                    with external systems on your behalf.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Key Features */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-8 h-8 text-green-400" />
                  <h3 className="text-xl font-bold text-white">Skill Tracking</h3>
                </div>
                <p className="text-gray-300">
                  Tracks your knowledge and skills across all domains. Understands what you're good at, 
                  what you're learning, and what skills you need for your career goals.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-8 h-8 text-red-400" />
                  <h3 className="text-xl font-bold text-white">Ethical Boundaries</h3>
                </div>
                <p className="text-gray-300">
                  Define your ethical limits. The Persona respects these and refuses requests that violate your values, 
                  even if technically possible.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Context Awareness</h3>
                </div>
                <p className="text-gray-300">
                  Understands your professional context and adapts recommendations accordingly. Different advice 
                  for a doctor vs. a software engineer.
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">Growth Tracking</h3>
                </div>
                <p className="text-gray-300">
                  Continuously monitors your growth, identifies learning opportunities, and suggests personalized 
                  development paths.
                </p>
              </div>
            </motion.div>

            {/* Real-Time Demo */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold text-white">Live Demo</h2>
              <RealTimeSovereignPersona className="bg-gray-800/50" />
            </motion.div>

            {/* Use Cases */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 space-y-6"
            >
              <h2 className="text-3xl font-bold text-white">Real-World Use Cases</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700/50 p-5 rounded-lg">
                  <h3 className="text-lg font-bold text-blue-400 mb-3">Professional Development</h3>
                  <p className="text-gray-300 text-sm">
                    Your Persona suggests training courses, projects, and skills aligned with your career goals, 
                    keeping track of your progress.
                  </p>
                </div>

                <div className="bg-gray-700/50 p-5 rounded-lg">
                  <h3 className="text-lg font-bold text-green-400 mb-3">Decision Making</h3>
                  <p className="text-gray-300 text-sm">
                    When facing a choice, your Persona provides context-aware advice based on your values, 
                    financial situation, and goals.
                  </p>
                </div>

                <div className="bg-gray-700/50 p-5 rounded-lg">
                  <h3 className="text-lg font-bold text-purple-400 mb-3">Privacy Protection</h3>
                  <p className="text-gray-300 text-sm">
                    Your Persona negotiates with external systems to achieve your goals while minimizing 
                    data exposure and protecting your privacy.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Ask Nexus - Conversational Interface */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold text-white">Ask Your Persona</h2>
              <p className="text-gray-300 text-lg">
                Chat with your Sovereign Persona directly. Ask questions, get advice, and leverage its understanding of your goals and values.
              </p>
              <AskNexus />
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SovereignPersonaBackupDashboard
              themeClasses={themeClasses}
              personaInstance={personaInstance}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SovereignPersonaPage;
