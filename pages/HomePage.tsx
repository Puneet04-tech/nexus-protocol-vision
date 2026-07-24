import React, { useState, useEffect } from 'react';
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
          
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Shield, Brain, Cpu, Database, Network, Key, Layers, 
  Terminal, Settings, Play, Flame, Search, ArrowUpRight, CheckCircle2, 
  AlertCircle, Sparkles, Zap, Leaf, HelpCircle, HardDrive, Compass,
  BookOpen, PlusCircle, ArrowRight, Clock, RefreshCw, X, Eye, 
  TrendingDown, DollarSign, GitPullRequest, ShieldAlert, Lock
} from 'lucide-react';
import { useRealTimeMetrics } from '../contexts/RealTimeContext';
import { useDiagnosticLogs } from '../contexts/DiagnosticLogContext';

// Define layout metadata for all 24 page modules
const MODULES = [
  {
    name: 'System Architecture',
    path: '/architecture',
    icon: Compass,
    desc: 'Interactive 9-Layer Map',
    cat: 'Collaboration',
    color: 'border-blue-500/20 text-blue-400 hover:border-blue-500'
  },
  {
    name: 'Sovereign Persona',
    path: '/sovereign-persona',
    icon: Brain,
    desc: 'Your Personal AI Twin',
    cat: 'Core',
    color: 'border-purple-500/20 text-purple-400 hover:border-purple-500'
  },
  {
    name: 'Cognitive Graph',
    path: '/cognitive-graph',
    icon: Network,
    desc: 'Dynamic Knowledge Mapping',
    cat: 'Core',
    color: 'border-indigo-500/20 text-indigo-400 hover:border-indigo-500'
  },
  {
    name: 'Privacy Negotiator',
    path: '/privacy-negotiator',
    icon: Lock,
    desc: 'Cryptographic Communication',
    cat: 'Privacy',
    color: 'border-emerald-500/20 text-emerald-400 hover:border-emerald-500'
  },
  {
    name: 'Carbon Aware',
    path: '/carbon-aware',
    icon: Leaf,
    desc: 'Sustainable Computing',
    cat: 'Compute',
    color: 'border-teal-500/20 text-teal-400 hover:border-teal-500'
  },
  {
    name: 'Federated Learning',
    path: '/federated-learning',
    icon: Database,
    desc: 'Private Collaborative Learning',
    cat: 'Privacy',
    color: 'border-cyan-500/20 text-cyan-400 hover:border-cyan-500'
  },
  {
    name: 'MorphNet Engine',
    path: '/morphnet',
    icon: RefreshCw,
    desc: 'Self-Optimizing Neural Nets',
    cat: 'Compute',
    color: 'border-amber-500/20 text-amber-400 hover:border-amber-500'
  },
  {
    name: 'Immune System',
    path: '/immune-system',
    icon: ShieldAlert,
    desc: 'Adversarial Threat Detection',
    cat: 'Privacy',
    color: 'border-rose-500/20 text-rose-400 hover:border-rose-500'
  },
  {
    name: 'Latent Space',
    path: '/latent-space',
    icon: Layers,
    desc: 'Universal Interoperability Engine',
    cat: 'Compute',
    color: 'border-violet-500/20 text-violet-400 hover:border-violet-500'
  },
  {
    name: 'Monitoring & Insights',
    path: '/monitoring',
    icon: Activity,
    desc: 'Real-Time Insights & Analytics',
    cat: 'Collaboration',
    color: 'border-sky-500/20 text-sky-400 hover:border-sky-500'
  },
  {
    name: 'AI Governance',
    path: '/governance',
    icon: Key,
    desc: 'Policy & Compliance Center',
    cat: 'Privacy',
    color: 'border-yellow-500/20 text-yellow-400 hover:border-yellow-500'
  },
  {
    name: 'Conflict Resolver',
    path: '/conflict-resolution',
    icon: GitPullRequest,
    desc: 'Decentralized Conflict Manager',
    cat: 'Privacy',
    color: 'border-orange-500/20 text-orange-400 hover:border-orange-500'
  },
  {
    name: 'Explainability',
    path: '/explainability',
    icon: Eye,
    desc: 'Neural Path Visualization',
    cat: 'Core',
    color: 'border-pink-500/20 text-pink-400 hover:border-pink-500'
  },
  {
    name: 'Plugins Hub',
    path: '/plugins',
    icon: Settings,
    desc: 'Decentralized Extension SDK Layer',
    cat: 'Collaboration',
    color: 'border-slate-500/20 text-slate-300 hover:border-slate-500'
  },
  {
    name: 'Playground',
    path: '/playground',
    icon: Play,
    desc: 'Interactive Testing Sandbox',
    cat: 'Collaboration',
    color: 'border-lime-500/20 text-lime-400 hover:border-lime-500'
  },
  {
    name: 'Workflow Orchestrator',
    path: '/orchestrator',
    icon: Zap,
    desc: 'Agentic Workflow Manager',
    cat: 'Collaboration',
    color: 'border-yellow-600/20 text-yellow-500 hover:border-yellow-500'
  },
  {
    name: 'Trust Engine',
    path: '/trust',
    icon: CheckCircle2,
    desc: 'Decentralized Reputation Protocol',
    cat: 'Privacy',
    color: 'border-teal-600/20 text-teal-500 hover:border-teal-500'
  },
  {
    name: 'Agent Marketplace',
    path: '/marketplace',
    icon: HardDrive,
    desc: 'Download Verified Agents',
    cat: 'Collaboration',
    color: 'border-fuchsia-500/20 text-fuchsia-400 hover:border-fuchsia-500'
  },
  {
    name: 'Collaboration Studio',
    path: '/collaboration-studio',
    icon: Sparkles,
    desc: 'Multi-Agent Mesh Builder',
    cat: 'Collaboration',
    color: 'border-indigo-600/20 text-indigo-400 hover:border-indigo-500'
  },
  {
    name: 'Benchmark Lab',
    path: '/benchmark-lab',
    icon: Terminal,
    desc: 'Evaluation & Audit Lab',
    cat: 'Collaboration',
    color: 'border-cyan-600/20 text-cyan-400 hover:border-cyan-500'
  },
  {
    name: 'Memory Search',
    path: '/memory-search',
    icon: Search,
    desc: 'Universal Semantic Searcher',
    cat: 'Core',
    color: 'border-emerald-600/20 text-emerald-500 hover:border-emerald-500'
  },
  {
    name: 'Incident Center',
    path: '/incident-response',
    icon: AlertCircle,
    desc: 'Automated Threat Mitigation',
    cat: 'Privacy',
    color: 'border-red-500/20 text-red-400 hover:border-red-500'
  },
  {
    name: 'Cost Optimizer',
    path: '/cost-optimizer',
    icon: DollarSign,
    desc: 'Compute Expense Rationalizer',
    cat: 'Compute',
    color: 'border-green-500/20 text-green-400 hover:border-green-500'
  },
  {
    name: 'Model Registry',
    path: '/model-registry',
    icon: BookOpen,
    desc: 'Vetted Local Model Registry',
    cat: 'Compute',
    color: 'border-blue-600/20 text-blue-500 hover:border-blue-500'
  }
];

const CATEGORIES = ['All', 'Core', 'Privacy', 'Compute', 'Collaboration'];

/**
 * Redesigned Enterprise Control Center / Home Page Dashboard for the Nexus Protocol.
 *
 * @component
 * @purpose
 * Visualizes system metrics, platform component statuses, quick action items, recent
 * activity logs, and provides a categorized, searchable index of the 24 protocol sub-modules.
 *
 * @responsibilities
 * - Listens to `useRealTimeMetrics` to display live CPU, Memory, and energy savings data.
 * - Displays real-time logging packets from `useDiagnosticLogs` inside a mock terminal console.
 * - Manages active states for module search queries and category filters.
 * - Manages state for the visual documentation specification overlay modal.
 * - Records recently clicked modules in `localStorage` and presents a "Recently Opened" sidebar navigation.
 *
 * @returns {React.ReactElement} The dashboard landing page.
 */
const HomePage: React.FC = () => {
  const { metrics } = useRealTimeMetrics();
  const { logs } = useDiagnosticLogs();

  // Internal states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<{name: string, path: string, iconName: string, time: string}[]>([]);
  const [timeStr, setTimeStr] = useState('');

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load recently visited pages on mount
  useEffect(() => {
    const loaded = localStorage.getItem('nexus_recently_visited');
    if (loaded) {
      try {
        setRecentPages(JSON.parse(loaded));
      } catch (e) {}
    }
  }, []);

  // Record a visited page
  const handleVisit = (name: string, path: string, iconName: string) => {
    const newVisit = {
      name,
      path,
      iconName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setRecentPages(prev => {
      const filtered = prev.filter(p => p.path !== path);
      const updated = [newVisit, ...filtered].slice(0, 5);
      localStorage.setItem('nexus_recently_visited', JSON.stringify(updated));
      return updated;
    });
  };

  // Filter modules based on category and search query
  const filteredModules = MODULES.filter(m => {
    const matchesCategory = selectedCategory === 'All' || m.cat === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Default simulated logs when diagnostic log context is empty
  const defaultLogs = [
    { id: 'l1', timestamp: '12:00:00', type: 'CORE' as const, message: 'Nexus Core Engine initialized successfully', status: 'success' as const },
    { id: 'l2', timestamp: '12:00:02', type: 'SHIELD' as const, message: 'Immune System threat mitigation shield activated', status: 'success' as const },
    { id: 'l3', timestamp: '12:00:05', type: 'ZKP' as const, message: 'Zero Knowledge Proof channels negotiated', status: 'success' as const },
    { id: 'l4', timestamp: '12:00:10', type: 'MPC' as const, message: 'Multi-Party Computation network consensus: Optimal', status: 'success' as const },
    { id: 'l5', timestamp: '12:00:15', type: 'CORE' as const, message: 'Sovereign Persona sync completed (8.4 MB)', status: 'success' as const }
  ];
  const activeLogs = logs && logs.length > 0 ? logs : defaultLogs;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase font-mono">Control Center Active</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Nexus Protocol</h1>
            <p className="text-slate-400 text-sm">Decentralized AI Infrastructure for Personal Autonomy</p>
          </div>
          <div className="flex items-center space-x-4 self-end md:self-auto bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-mono font-bold text-indigo-300 min-w-[75px]">{timeStr || '00:00:00'}</span>
            <span className="text-xs text-slate-500 border-l border-slate-800 pl-3">GMT+05:30</span>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1: System Health */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Health</span>
              <div className="p-1.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white font-mono">99.8%</h3>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <span>Optimal State</span>
              </p>
            </div>
          </div>

          {/* Card 2: Active Agents */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Agents</span>
              <div className="p-1.5 bg-purple-950/30 border border-purple-800/40 rounded-lg text-purple-400">
                <Brain className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white font-mono">8 / 12</h3>
              <p className="text-xs text-purple-400 mt-1">4 Sandboxed Sandbox</p>
            </div>
          </div>

          {/* Card 3: Network Latency */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</span>
              <div className="p-1.5 bg-blue-950/30 border border-blue-800/40 rounded-lg text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.latencyMs || 24} ms</h3>
              <p className="text-xs text-slate-400 mt-1">Real-time ping monitor</p>
            </div>
          </div>

          {/* Card 4: Load & Resources */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resource Load</span>
              <div className="p-1.5 bg-indigo-950/30 border border-indigo-800/40 rounded-lg text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.cpuLoadPercent || 18}% CPU</h3>
              <p className="text-xs text-indigo-400 mt-1 font-mono">{((metrics.memoryUsageMb || 3280) / 1024).toFixed(1)} GB RAM</p>
            </div>
          </div>

          {/* Card 5: Carbon Optimization */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-md">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Carbon Savings</span>
              <div className="p-1.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-emerald-400">
                <Leaf className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.energySavingsPercent || 72}%</h3>
              <p className="text-xs text-emerald-400 mt-1">Green compute optimization</p>
            </div>
          </div>

        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left/Center Panel (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Platform Status Section */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <span>Platform System Overview</span>
                </h2>
                <span className="text-xs bg-indigo-950/50 border border-indigo-900 text-indigo-400 px-2 py-0.5 rounded-full font-mono">Simulated Sandbox Environment</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* AI Services */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-purple-400" />
                      AI Services
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono">3 Online</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Cognitive Graph Sync</span>
                      <span className="text-emerald-400 font-medium">99% Accuracy</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Sovereign Persona</span>
                      <span className="text-emerald-400 font-medium">Fully Calibrated</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Explainability Engine</span>
                      <span className="text-emerald-400 font-medium">Dynamic Mapping</span>
                    </div>
                  </div>
                </div>

                {/* Privacy & Negotiator */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      Cryptographic Privacy
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900 font-mono">MPC + ZKP</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Multi-Party Computation</span>
                      <span className="text-emerald-400 font-medium">Consensus Established</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Zero-Knowledge Proofs</span>
                      <span className="text-blue-400 font-medium">Auto-Negotiating</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Encryption Level</span>
                      <span className="text-slate-200 font-mono">Military-Grade AES</span>
                    </div>
                  </div>
                </div>

                {/* Carbon Optimization */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Leaf className="w-4 h-4 text-teal-400" />
                      Compute Efficiency
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-400 border border-teal-900 font-mono">Optimal Grid</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Green Power Level</span>
                      <span className="text-teal-400 font-bold">{metrics.energySavingsPercent || 72}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${metrics.energySavingsPercent || 72}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Low Grid Load</span>
                      <span>1.2kg CO2 Offset</span>
                    </div>
                  </div>
                </div>

                {/* Security Health */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-rose-400" />
                      Active Security Shield
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono">No Threats</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Intrusion Mitigation</span>
                      <span className="text-emerald-400 font-bold">100% Protected</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `100%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Threats Blocked: 247</span>
                      <span>Last Probe: 3m ago</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Interactive Module Catalog */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6 shadow-xl">
              
              {/* Title & Search Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">System Infrastructure Layers</h2>
                  <p className="text-xs text-slate-400">Browse and interact with the 24 sub-systems of the Nexus Protocol</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 shadow-sm shadow-indigo-950/20' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredModules.length > 0 ? (
                  filteredModules.map(m => {
                    const IconComponent = m.icon;
                    return (
                      <Link
                        key={m.path}
                        to={m.path}
                        onClick={() => handleVisit(m.name, m.path, IconComponent.name || 'Compass')}
                        className="group"
                      >
                        <div className="bg-slate-950/30 hover:bg-slate-900/60 border border-slate-850 hover:border-slate-700/80 rounded-xl p-4 flex items-center justify-between transition-all duration-200 shadow-sm">
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <div className={`p-2.5 bg-slate-900/60 border rounded-xl group-hover:scale-105 transition-transform ${m.color}`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                                {m.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors truncate">
                                {m.desc}
                              </p>
                            </div>
                          </div>
                          <div className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-12 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
                    No infrastructure modules matched your query
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right Sidebar Panel (1/3 width) */}
          <div className="space-y-8">
            
            {/* Quick Actions Panel */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span>Quick Operations</span>
              </h2>

              <div className="flex flex-col gap-2.5">
                
                <Link
                  to="/playground"
                  className="flex items-center justify-between bg-slate-950/60 hover:bg-indigo-600/10 border border-slate-850 hover:border-indigo-500/30 p-3 rounded-xl transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <Play className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Launch Playground</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </Link>

                <Link
                  to="/marketplace"
                  className="flex items-center justify-between bg-slate-950/60 hover:bg-purple-600/10 border border-slate-850 hover:border-purple-500/30 p-3 rounded-xl transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <HardDrive className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Open Marketplace</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </Link>

                <Link
                  to="/plugins"
                  className="flex items-center justify-between bg-slate-950/60 hover:bg-blue-600/10 border border-slate-850 hover:border-blue-500/30 p-3 rounded-xl transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <PlusCircle className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Create Custom Agent</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </Link>

                <Link
                  to="/architecture"
                  className="flex items-center justify-between bg-slate-950/60 hover:bg-teal-600/10 border border-slate-850 hover:border-teal-500/30 p-3 rounded-xl transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <Compass className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">System Architecture</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </Link>

                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="flex items-center justify-between w-full bg-slate-950/60 hover:bg-slate-800 border border-slate-850 p-3 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-white" />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Read Documentation</span>
                  </div>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                </button>

              </div>
            </div>

            {/* Recently Visited Panel */}
            {recentPages.length > 0 && (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4 shadow-xl">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span>Recently Opened</span>
                </h2>
                <div className="space-y-2">
                  {recentPages.map((page, idx) => (
                    <Link
                      key={page.path + idx}
                      to={page.path}
                      className="flex justify-between items-center bg-slate-950/30 hover:bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl text-xs transition-colors"
                    >
                      <span className="text-slate-300 font-semibold truncate pr-2">{page.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{page.time}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Live Activity Terminal */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4 shadow-xl flex flex-col">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-3">
                <Terminal className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span>Live Activity Stream</span>
              </h2>
              
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 h-52 overflow-y-auto space-y-2.5 font-mono text-[10px] text-slate-400 flex flex-col justify-start">
                {activeLogs.slice(-6).reverse().map((log) => (
                  <div key={log.id} className="flex gap-2 leading-relaxed border-b border-slate-900 pb-1.5 last:border-b-0">
                    <span className="text-slate-600 font-bold select-none">[{log.timestamp}]</span>
                    <span className={`font-extrabold select-none uppercase tracking-wider ${
                      log.status === 'success' ? 'text-emerald-500' :
                      log.status === 'warning' ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-slate-300 break-all select-all flex-1" title={log.message}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Footer Details */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950 text-slate-500 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Nexus Protocol. Decentralized sovereign execution layer.</p>
        </div>
      </footer>

      {/* Documentation Modal */}
      <AnimatePresence>
        {isDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDocModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative max-w-2xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-6 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10 text-slate-200"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>Nexus Protocol Specification</span>
                </h3>
                <button
                  onClick={() => setIsDocModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto space-y-6 text-sm pr-1 text-slate-300 leading-relaxed font-sans">
                
                <section className="space-y-2">
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Overview
                  </h4>
                  <p>
                    The Nexus Protocol is a local-first, privacy-preserving operating layer that facilitates the execution of autonomous AI agents on local user devices. It bridges the gap between "AI as a cloud service" and "AI as a secure personal utility."
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    The 9-Layer Architecture
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">1. Sovereign Persona</span> - Core identity and privacy controls
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">2. Cognitive Graph</span> - Unified semantic memory indexing
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">3. Federated Learning</span> - Private, local weight fine-tuning
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">4. Privacy Negotiator</span> - Cryptographic MPC & ZKP tunnels
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">5. MorphNet Engine</span> - Dynamic local model optimization
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">6. Immune System</span> - Adversarial probe countermeasures
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">7. Carbon-Aware Sync</span> - Renewable energy-aligned compute scheduling
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">8. Latent Mapping</span> - Inter-model token embedding translation
                    </div>
                    <div className="p-2 bg-slate-950/60 border border-slate-850 rounded-lg">
                      <span className="text-indigo-400 font-bold">9. Analytics Monitor</span> - Real-time load and telemetry auditing
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Key Computing Principles
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <strong className="text-slate-100 block">🏘️ Local-First Data Ownership</strong>
                      Your personal AI twin lives on-device. Personal profiles and vectors are stored locally rather than aggregated on central corporate cloud platforms.
                    </div>
                    <div>
                      <strong className="text-slate-100 block">🔐 Privacy by Default</strong>
                      Multi-party computation (MPC) and zero-knowledge proofs (ZKP) allow agents to negotiate capabilities with third-party service providers without revealing private data.
                    </div>
                    <div>
                      <strong className="text-slate-100 block">🌱 Green Energy Computations</strong>
                      The carbon-aware scheduler automatically scales model inferences and training runs based on local green power grid availability, matching computing times to periods of high renewable generation.
                    </div>
                  </div>
                </section>

              </div>

              {/* Footer */}
              <div className="border-t border-slate-800 pt-4 mt-6 flex justify-end">
                <button
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Dismiss Docs
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
