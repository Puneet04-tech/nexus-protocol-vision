import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Database, Tag, Filter, Calendar, Sliders, Bookmark, Star, Pin, 
  Trash2, Download, RefreshCw, Play, CheckCircle2, AlertCircle, X, 
  FileJson, FileSpreadsheet, Printer, Brain, Clock, Sparkles, Plus, 
  ChevronRight, Info, Lock
} from 'lucide-react';

// Core imports
import { mockMemorySearchAPI } from '../core/memory-search/api/MemorySearchAPI';
import { Memory, SearchQuery, SearchResult, MemoryCollection, Recommendation, TimelineInterval } from '../core/memory-search/types';
import { MemorySearchTestSuite, SuiteResults } from '../core/memory-search/__tests__/memory-search.test';
import { CumulativeStatsPoint } from '../core/memory-search/timeline/TimelineManager';

const MemorySearchPage: React.FC = () => {
  // Database states
  const [memories, setMemories] = useState<Memory[]>([]);
  const [collections, setCollections] = useState<MemoryCollection[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [timelineIntervals, setTimelineIntervals] = useState<TimelineInterval[]>([]);
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStatsPoint[]>([]);

  // Search parameters states
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState<'semantic' | 'keyword' | 'hybrid'>('hybrid');
  const [sortBy, setSortBy] = useState<'relevance' | 'recency' | 'importance' | 'alphabetical'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minImportance, setMinImportance] = useState<number>(0.0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  
  // Toggles
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // Active item detail
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  
  // Recommendations
  const [relatedRecs, setRelatedRecs] = useState<Recommendation[]>([]);
  const [learningRecs, setLearningRecs] = useState<Recommendation[]>([]);
  const [trendRecs, setTrendRecs] = useState<Recommendation[]>([]);

  // New Memory Ingestion form state
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'conversation' | 'knowledge' | 'interaction' | 'system'>('conversation');
  const [newSource, setNewSource] = useState<'Sovereign Persona' | 'Cognitive Graph' | 'Workflow Orchestrator' | 'AI Marketplace' | 'Collaboration Studio' | 'System'>('Sovereign Persona');
  const [newImportance, setNewImportance] = useState(0.5);
  const [newTags, setNewTags] = useState('');
  const [newAgentId, setNewAgentId] = useState('');
  const [newPrivacy, setNewPrivacy] = useState<'private' | 'selective' | 'public'>('selective');
  const [ingestStatus, setIngestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // New Collection folder creation state
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);

  // Search Engine audit values
  const [queryExpandedLog, setQueryExpandedLog] = useState('');
  const [searchTimeMs, setSearchTimeMs] = useState(0);
  const [activeTab, setActiveTab] = useState<'results' | 'timeline' | 'analytics'>('results');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);

  // Test Runner states
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<SuiteResults | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Loading, retry, error boundary simulator flags
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingestion defaults
  const categoriesList = ['conversation', 'knowledge', 'interaction', 'system'];
  const sourcesList = [
    'Sovereign Persona',
    'Cognitive Graph',
    'Workflow Orchestrator',
    'AI Marketplace',
    'Collaboration Studio',
    'System'
  ];

  // Load baseline on mount
  useEffect(() => {
    refreshDatabase();
  }, []);

  // Re-run queries whenever search text, filters, or sorting changes
  useEffect(() => {
    executeSearch();
  }, [
    searchText, searchType, sortBy, sortOrder, minImportance, 
    selectedCategories, selectedSources, selectedCollectionId,
    showFavoritesOnly, showBookmarksOnly, showPinnedOnly, memories
  ]);

  // Fetch contextual recommendations when active search results or selected item changes
  useEffect(() => {
    loadRecommendations();
  }, [searchResults, selectedResult]);

  const refreshDatabase = () => {
    try {
      const allM = mockMemorySearchAPI.listAllMemories();
      const allC = mockMemorySearchAPI.getCollections();
      setMemories(allM);
      setCollections(allC);
      
      const stats = mockMemorySearchAPI.getCumulativeStats(14);
      setCumulativeStats(stats);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to Local Storage Repository.');
    }
  };

  const executeSearch = async () => {
    setIsLoading(true);
    try {
      const query: SearchQuery = {
        text: searchText,
        searchType,
        minImportance,
        isFavorite: showFavoritesOnly ? true : undefined,
        isBookmarked: showBookmarksOnly ? true : undefined,
        isPinned: showPinnedOnly ? true : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories as any[] : undefined,
        sources: selectedSources.length > 0 ? selectedSources as any[] : undefined,
        collectionId: selectedCollectionId || undefined,
        sortBy,
        sortOrder
      };

      const response = await mockMemorySearchAPI.query(query);
      
      setSearchResults(response.results);
      setQueryExpandedLog(response.queryExpanded || `[Exact Text Query] "${searchText || '*'}"`);
      setSearchTimeMs(response.timeTakenMs);

      // Re-map timeline intervals based on the active search result list
      const filteredMemories = response.results.map(r => r.memory);
      const timeline = mockMemorySearchAPI.getChronologicalTimeline(filteredMemories);
      setTimelineIntervals(timeline);

      // Simple autocomplete suggestion generator (finds tags that start with text prefix)
      if (searchText.trim().length > 1) {
        const prefix = searchText.toLowerCase();
        const tagsSet = new Set<string>();
        memories.forEach(m => m.tags.forEach(t => {
          if (t.toLowerCase().startsWith(prefix)) {
            tagsSet.add(t);
          }
        }));
        setAutocompleteSuggestions(Array.from(tagsSet).slice(0, 5));
      } else {
        setAutocompleteSuggestions([]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      // 1. Related recommendations
      if (selectedResult) {
        const recs = await mockMemorySearchAPI.getRelatedMemories(selectedResult.memory.id, 3);
        setRelatedRecs(recs);
      } else if (searchResults.length > 0) {
        const recs = await mockMemorySearchAPI.getRelatedMemories(searchResults[0].memory.id, 3);
        setRelatedRecs(recs);
      } else {
        setRelatedRecs([]);
      }

      // 2. Learning gaps recommendations
      const learnings = mockMemorySearchAPI.getLearningRecommendations(3);
      setLearningRecs(learnings);

      // 3. High priority trends
      const trends = mockMemorySearchAPI.getActionableTrends(2);
      setTrendRecs(trends);
    } catch (err) {
      console.warn('Failed loading recommendations', err);
    }
  };

  // --- Forms Operations ---
  const handleIngestMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngestStatus(null);
    if (!newContent.trim()) {
      setIngestStatus({ success: false, message: 'Memory content cannot be empty.' });
      return;
    }

    try {
      const parsedTags = newTags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      const payload: Partial<Memory> = {
        content: newContent,
        category: newCategory,
        source: newSource,
        importance: newImportance,
        tags: parsedTags,
        agentId: newAgentId.trim() || undefined,
        metadata: {
          privacyLevel: newPrivacy
        }
      };

      const result = await mockMemorySearchAPI.ingest(payload);
      setIngestStatus({ success: true, message: `Successfully ingested Memory: ${result.id}` });
      
      // Reset form
      setNewContent('');
      setNewTags('');
      setNewAgentId('');
      setNewImportance(0.5);

      refreshDatabase();
    } catch (err: any) {
      setIngestStatus({ success: false, message: err.message || 'Ingestion failed.' });
    }
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      mockMemorySearchAPI.createCollection(
        newColName.trim(),
        newColDesc.trim(),
        []
      );
      setNewColName('');
      setNewColDesc('');
      setShowAddCollection(false);
      refreshDatabase();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = (memoryId: string) => {
    mockMemorySearchAPI.toggleFavorite(memoryId);
    refreshDatabase();
  };

  const handleToggleBookmark = (memoryId: string) => {
    mockMemorySearchAPI.toggleBookmark(memoryId);
    refreshDatabase();
  };

  const handleTogglePin = (memoryId: string) => {
    mockMemorySearchAPI.togglePin(memoryId);
    refreshDatabase();
  };

  const handleDeleteMemory = (memoryId: string) => {
    if (confirm('Are you sure you want to permanently erase this memory file?')) {
      mockMemorySearchAPI.deleteMemory(memoryId);
      if (selectedResult?.memory.id === memoryId) {
        setSelectedResult(null);
      }
      refreshDatabase();
    }
  };

  const handleResetSeeds = () => {
    if (confirm('This will wipe localStorage changes and restore baseline system memories. Continue?')) {
      mockMemorySearchAPI.resetToSeeds();
      setSelectedResult(null);
      refreshDatabase();
    }
  };

  const handleClearData = () => {
    if (confirm('Warning: This erases all memories. You will have an empty database. Continue?')) {
      mockMemorySearchAPI.clearAllData();
      setSelectedResult(null);
      refreshDatabase();
    }
  };

  // --- Exports ---
  const triggerJSONDownload = () => {
    const list = searchResults.map(r => r.memory);
    const content = mockMemorySearchAPI.exportJSON(list);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_memories_export_${Date.now()}.json`;
    a.click();
  };

  const triggerCSVDownload = () => {
    const list = searchResults.map(r => r.memory);
    const content = mockMemorySearchAPI.exportCSV(list);
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_memories_export_${Date.now()}.csv`;
    a.click();
  };

  const triggerPrintWindow = () => {
    const title = selectedCollectionId 
      ? `Collection: ${collections.find(c => c.id === selectedCollectionId)?.name}` 
      : 'All Search Results';
    const html = mockMemorySearchAPI.exportPrintHTML(title, searchResults);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  // --- Test Runner ---
  const runSelfCheckTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      // Small artificial delay to show state transitions
      await new Promise(r => setTimeout(r, 600));
      const res = await MemorySearchTestSuite.runTests();
      setTestResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningTests(false);
    }
  };

  // --- Filter helpers ---
  const handleCategoryCheckboxChange = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSourceCheckboxChange = (src: string) => {
    setSelectedSources(prev => 
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Panel */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Universal Memory Search Engine
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-700 text-indigo-300">
                  Subsystem Beta
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Context-aware retrieval, incremental indexing & semantic similarity matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleResetSeeds}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restore Seeds
            </button>
            <button 
              onClick={handleClearData}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 text-rose-300 font-medium transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wipe Database
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Error State Banner */}
        {errorMessage && (
          <div className="col-span-full bg-rose-950/60 border border-rose-800 rounded-xl p-4 flex items-start space-x-3 text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold">Subsystem Connection Error</h3>
              <p className="text-sm text-rose-300">{errorMessage}</p>
              <button 
                onClick={refreshDatabase}
                className="mt-2 text-xs font-semibold px-3 py-1 bg-rose-850 hover:bg-rose-800 rounded-md border border-rose-700 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Column 1: Filters & Folders sidebar */}
        <section className="space-y-6 lg:col-span-1">
          {/* Query Settings Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
              Query Options
              <Sliders className="w-4 h-4 text-indigo-400" />
            </h2>
            
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Search Match Algorithm</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['hybrid', 'semantic', 'keyword'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSearchType(type)}
                    className={`text-[10px] font-mono py-1 rounded capitalize transition-all ${
                      searchType === type 
                        ? 'bg-indigo-600 text-white font-bold' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Min Importance Threshold</span>
                <span className="font-mono text-indigo-400 font-bold">{Math.round(minImportance * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={minImportance}
                onChange={e => setMinImportance(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Sort Order</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-200"
                >
                  <option value="relevance">Match Score</option>
                  <option value="recency">Recency Date</option>
                  <option value="importance">Importance Rating</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-mono font-bold"
                >
                  {sortOrder.toUpperCase()}
                </button>
              </div>
            </div>
          </div>

          {/* Logic Criteria Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
              Filter Matrices
              <Filter className="w-4 h-4 text-emerald-400" />
            </h2>

            {/* State Toggles */}
            <div className="space-y-2 pb-3 border-b border-slate-800/60">
              <button 
                onClick={() => setShowFavoritesOnly(p => !p)}
                className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  showFavoritesOnly 
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-300' 
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
                  Favorites Only
                </span>
                {showFavoritesOnly && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>

              <button 
                onClick={() => setShowBookmarksOnly(p => !p)}
                className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  showBookmarksOnly 
                    ? 'bg-blue-950/40 border-blue-800/80 text-blue-300' 
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bookmark className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-blue-400 text-blue-400' : ''}`} />
                  Bookmarked Only
                </span>
                {showBookmarksOnly && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </button>

              <button 
                onClick={() => setShowPinnedOnly(p => !p)}
                className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  showPinnedOnly 
                    ? 'bg-pink-950/40 border-pink-850 text-pink-300' 
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Pin className={`w-3.5 h-3.5 ${showPinnedOnly ? 'fill-pink-400 text-pink-400' : ''}`} />
                  Pinned Only
                </span>
                {showPinnedOnly && <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-2 pb-3 border-b border-slate-800/60">
              <span className="text-xs text-slate-400 font-medium">Categories</span>
              <div className="space-y-1.5">
                {categoriesList.map(cat => (
                  <label key={cat} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryCheckboxChange(cat)}
                      className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-850 accent-indigo-500 focus:ring-0"
                    />
                    <span className="capitalize">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Source Module Filter */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-medium">Sources</span>
              <div className="space-y-1.5">
                {sourcesList.map(src => (
                  <label key={src} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(src)}
                      onChange={() => handleSourceCheckboxChange(src)}
                      className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-850 accent-indigo-500 focus:ring-0"
                    />
                    <span>{src}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Smart & Static Folders Collections */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Collections
                <Database className="w-4 h-4 text-purple-400" />
              </h2>
              <button
                onClick={() => setShowAddCollection(!showAddCollection)}
                className="text-xs p-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddCollection && (
              <form onSubmit={handleCreateCollection} className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-3">
                <input
                  type="text"
                  placeholder="Collection Name..."
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Short description..."
                  value={newColDesc}
                  onChange={e => setNewColDesc(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full text-[10px] font-bold py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                >
                  Create Folder
                </button>
              </form>
            )}

            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedCollectionId('')}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex justify-between items-center ${
                  selectedCollectionId === '' 
                    ? 'bg-slate-800 text-white font-semibold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📁 All Memories</span>
                <span className="text-[10px] font-mono font-bold bg-slate-950/80 text-slate-400 px-1.5 py-0.5 rounded">
                  {memories.length}
                </span>
              </button>

              {collections.map(col => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex justify-between items-center ${
                    selectedCollectionId === col.id 
                      ? 'bg-slate-800 text-white font-semibold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">
                    {col.isSmart ? '⚡' : '📁'} {col.name}
                  </span>
                  <span className="text-[10px] font-mono bg-slate-950/80 text-indigo-400 px-1.5 py-0.5 rounded">
                    {col.isSmart ? 'Smart' : col.memoryIds.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Column 2 & 3: Main query and content area */}
        <section className="space-y-6 lg:col-span-2">
          {/* Search query box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search index memories (e.g. zero knowledge proofs, Sweden nodes, GPU carbon)..."
                value={searchText}
                onChange={e => {
                  setSearchText(e.target.value);
                  setShowSuggestionsDropdown(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestionsDropdown(false), 200)}
                className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-sm"
              />
              <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
              {searchText && (
                <button 
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Autocomplete suggestions dropdown */}
              {showSuggestionsDropdown && autocompleteSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-55 overflow-hidden">
                  {autocompleteSuggestions.map(s => (
                    <button
                      key={s}
                      onMouseDown={() => setSearchText(s)}
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-indigo-950/30 hover:text-indigo-300 border-b border-slate-850/40 last:border-0 transition-colors flex items-center gap-2"
                    >
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      #{s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Suggestions pill tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold mr-1">Suggestions:</span>
              {[
                { label: 'Privacy audits', query: 'privacy' },
                { label: 'Sweden grid solar', query: 'sweden solar' },
                { label: 'React 18 vs 19', query: 'react differences' },
                { label: 'Immune block attempts', query: 'blocked attempt' }
              ].map(pill => (
                <button
                  key={pill.label}
                  onClick={() => setSearchText(pill.query)}
                  className="text-[10px] bg-slate-950/80 text-slate-400 hover:text-white px-2 py-1 rounded-md border border-slate-850 transition-colors hover:border-slate-700"
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Query expansion audit trace */}
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-850 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Query Compiler Trace:</span>
                <span className="text-indigo-400 font-bold">{searchTimeMs}ms</span>
              </div>
              <p className="text-slate-300 font-medium select-all">{queryExpandedLog}</p>
            </div>
          </div>

          {/* Navigation view tabs */}
          <div className="flex border-b border-slate-800 text-sm font-semibold gap-6">
            <button
              onClick={() => setActiveTab('results')}
              className={`pb-3 relative transition-all ${
                activeTab === 'results' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Explore Results ({searchResults.length})
              {activeTab === 'results' && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 relative transition-all ${
                activeTab === 'timeline' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Timeline Streams ({timelineIntervals.length})
              {activeTab === 'timeline' && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 relative transition-all ${
                activeTab === 'analytics' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interactive Insights
              {activeTab === 'analytics' && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          </div>

          {/* View Panels */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {isLoading ? (
                // Skeletons
                [1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="w-24 h-4 bg-slate-800 rounded" />
                      <div className="w-16 h-4 bg-slate-800 rounded" />
                    </div>
                    <div className="w-full h-8 bg-slate-850 rounded" />
                    <div className="flex gap-2">
                      <div className="w-12 h-4 bg-slate-800 rounded" />
                      <div className="w-12 h-4 bg-slate-800 rounded" />
                    </div>
                  </div>
                ))
              ) : searchResults.length === 0 ? (
                // Empty State
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No Ingestion Records Found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No memories matched the active filter matrices. Try weakening the importance slider or query constraints.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchText('');
                      setMinImportance(0);
                      setSelectedCategories([]);
                      setSelectedSources([]);
                      setSelectedCollectionId('');
                      setShowFavoritesOnly(false);
                      setShowBookmarksOnly(false);
                      setShowPinnedOnly(false);
                    }}
                    className="text-xs px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-semibold text-white rounded-lg transition-colors shadow-lg"
                  >
                    Clear Search Filters
                  </button>
                </div>
              ) : (
                // Results List
                searchResults.map(res => {
                  const m = res.memory;
                  const dateStr = new Date(m.recency).toLocaleDateString(undefined, { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  });

                  return (
                    <motion.div
                      key={m.id}
                      onClick={() => setSelectedResult(res)}
                      className={`bg-slate-900 hover:bg-slate-900/80 border rounded-xl p-5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        selectedResult?.memory.id === m.id
                          ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top bar info */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md font-bold text-slate-400">
                            {m.source}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 capitalize">
                            {m.category}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1.5">
                          {/* Pin Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(m.id); }}
                            className={`p-1 hover:bg-slate-850 rounded transition-colors ${m.isPinned ? 'text-pink-500' : 'text-slate-500'}`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Bookmark Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleBookmark(m.id); }}
                            className={`p-1 hover:bg-slate-850 rounded transition-colors ${m.isBookmarked ? 'text-blue-500' : 'text-slate-500'}`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Favorite Toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(m.id); }}
                            className={`p-1 hover:bg-slate-850 rounded transition-colors ${m.isFavorite ? 'text-amber-500' : 'text-slate-500'}`}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Delete Memory */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMemory(m.id); }}
                            className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-slate-200 text-sm mb-3.5 font-medium leading-relaxed">
                        {m.content}
                      </p>

                      {/* Bottom row metrics */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 border-t border-slate-850/50 pt-3">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {dateStr}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            Importance: 
                            <strong className="text-indigo-400 font-bold">{Math.round(m.importance * 100)}%</strong>
                          </span>
                          
                          {searchText && (
                            <span className="flex items-center gap-1">
                              Match Score: 
                              <strong className="text-emerald-400 font-bold">{Math.round(res.score * 100)}%</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Render auto-extracted tags */}
                      {m.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {m.tags.map(t => (
                            <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-950/60 rounded text-slate-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {timelineIntervals.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                  No chronological data. Search results must match filter values.
                </div>
              ) : (
                <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-8">
                  {timelineIntervals.map(interval => (
                    <div key={interval.id} className="relative">
                      {/* Timeline dot marker */}
                      <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-4 border-slate-950" />
                      
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-wide">{interval.title}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{interval.description}</p>
                        </div>

                        {/* Concept assimilation alerts */}
                        {interval.learningGained.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-indigo-300 font-mono">
                            <span className="text-slate-500 uppercase font-bold">Assimilated:</span>
                            {interval.learningGained.map(l => (
                              <span key={l} className="px-2 py-0.5 bg-indigo-950/40 border border-indigo-900 rounded-full font-medium">
                                🎓 {l}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Chronological list of sub-memories */}
                        <div className="space-y-2">
                          {interval.memories.map(m => (
                            <div key={m.id} className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-xs flex justify-between items-start">
                              <div className="space-y-1.5">
                                <p className="text-slate-300 font-medium leading-relaxed">{m.content}</p>
                                <div className="flex gap-2 text-[10px] text-slate-500">
                                  <span className="font-mono bg-slate-950 px-1 py-0.5 rounded">{m.source}</span>
                                  <span>&bull;</span>
                                  <span>{new Date(m.recency).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-950/50 rounded text-slate-400 ml-3">
                                {Math.round(m.importance * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Dynamic stats overview card grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Total Memories</div>
                  <div className="text-2xl font-black text-white mt-1">{memories.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Carbon Offset Saved</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {cumulativeStats.length > 0 ? cumulativeStats[cumulativeStats.length - 1].carbonSavedGrams : 0}g
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Threats Blocked</div>
                  <div className="text-2xl font-black text-rose-400 mt-1">
                    {cumulativeStats.length > 0 ? cumulativeStats[cumulativeStats.length - 1].securityThreatsBlocked : 0}
                  </div>
                </div>
              </div>

              {/* Custom SVG Cumulative Knowledge Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Subsystem Growth: Cumulative Nodes & Performance (14-Day Timeline)
                </h3>

                {cumulativeStats.length === 0 ? (
                  <div className="h-40 bg-slate-950 rounded-lg flex items-center justify-center text-xs text-slate-500">
                    No stats history available.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <svg viewBox="0 0 600 200" className="w-full bg-slate-950 rounded-lg border border-slate-850 p-2 overflow-visible">
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="560" y2="20" stroke="#1E293B" strokeDasharray="3" />
                      <line x1="40" y1="90" x2="560" y2="90" stroke="#1E293B" strokeDasharray="3" />
                      <line x1="40" y1="160" x2="560" y2="160" stroke="#1E293B" strokeDasharray="3" />
                      
                      {/* Left Y-Axis indicators */}
                      <text x="35" y="25" fill="#64748B" fontSize="9" textAnchor="end">Max</text>
                      <text x="35" y="95" fill="#64748B" fontSize="9" textAnchor="end">Mid</text>
                      <text x="35" y="165" fill="#64748B" fontSize="9" textAnchor="end">0</text>

                      {/* Render Line Chart points (Memories Count) */}
                      {(() => {
                        const maxVal = Math.max(...cumulativeStats.map(s => s.totalMemories), 1);
                        const coords = cumulativeStats.map((stat, idx) => {
                          const x = 40 + (idx * (520 / (cumulativeStats.length - 1)));
                          const y = 160 - ((stat.totalMemories / maxVal) * 140);
                          return { x, y };
                        });

                        const pathStr = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

                        return (
                          <>
                            {/* Area fill */}
                            <path
                              d={`${pathStr} L ${coords[coords.length-1].x} 160 L ${coords[0].x} 160 Z`}
                              fill="url(#indigoGrad)"
                              opacity="0.15"
                            />
                            
                            {/* Linear path */}
                            <path
                              d={pathStr}
                              fill="none"
                              stroke="#6366F1"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            
                            {/* Circles */}
                            {coords.map((c, i) => (
                              <circle
                                key={i}
                                cx={c.x}
                                cy={c.y}
                                r="3.5"
                                fill="#818CF8"
                                stroke="#1E1B4B"
                                strokeWidth="1"
                              />
                            ))}
                          </>
                        );
                      })()}

                      {/* X-axis dates labels */}
                      {cumulativeStats.map((stat, idx) => {
                        if (idx % 2 !== 0) return null; // skip labels to avoid text collisions
                        const x = 40 + (idx * (520 / (cumulativeStats.length - 1)));
                        return (
                          <text key={idx} x={x} y="185" fill="#64748B" fontSize="8" textAnchor="middle">
                            {stat.dateStr}
                          </text>
                        );
                      })}

                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Chart metric: Cumulative indexed memory records</span>
                      <span>Security sandbox audits blocked: <strong className="text-rose-400 font-bold">{
                        cumulativeStats.length > 0 ? cumulativeStats[cumulativeStats.length - 1].securityThreatsBlocked : 0
                      } threats</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ingestion Sandbox Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Ingest New Memory Sandbox
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>

            <form onSubmit={handleIngestMemory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Memory Content Description</label>
                <textarea
                  placeholder="Describe the interaction, system alert, or assimilated concept log..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-200"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Source Layer</label>
                  <select
                    value={newSource}
                    onChange={e => setNewSource(e.target.value as any)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-200"
                  >
                    {sourcesList.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Importance rating (0.0 to 1.0)</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={newImportance}
                    onChange={e => setNewImportance(parseFloat(e.target.value))}
                    className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Linked Agent (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. LoanBroker-2"
                    value={newAgentId}
                    onChange={e => setNewAgentId(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Comma Separated Tags</label>
                  <input
                    type="text"
                    placeholder="react, security, zkp"
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Privacy Permission</label>
                  <select
                    value={newPrivacy}
                    onChange={e => setNewPrivacy(e.target.value as any)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-200"
                  >
                    <option value="private">Private (Owners only)</option>
                    <option value="selective">Selective (Sandboxed components)</option>
                    <option value="public">Public (Any external system)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                Ingest Memory Log
              </button>

              {ingestStatus && (
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  ingestStatus.success 
                    ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' 
                    : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                }`}>
                  {ingestStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {ingestStatus.message}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Column 4: Recommendations & Test Runner */}
        <section className="space-y-6 lg:col-span-1">
          {/* Related and Learning Recommendations Drawer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
              Memory Suggestions
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </h2>

            {/* Related recommendations */}
            <div className="space-y-3 pb-3 border-b border-slate-800/60">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                Related Concepts
              </span>
              
              {relatedRecs.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic">No related memories compiled. Select an ingestion record above to correlate.</div>
              ) : (
                <div className="space-y-2">
                  {relatedRecs.map(rec => (
                    <div 
                      key={rec.id}
                      onClick={() => {
                        if (rec.targetId) {
                          const found = mockMemorySearchAPI.getMemory(rec.targetId);
                          if (found) {
                            setSelectedResult({
                              memory: found,
                              score: rec.score,
                              relevanceScore: rec.score,
                              importanceScore: found.importance,
                              recencyScore: 1.0,
                              matchReasons: ['Recommended correlation']
                            });
                          }
                        }
                      }}
                      className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 hover:border-indigo-800 transition-all text-[11px] space-y-1 cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-300 tracking-wide block truncate">{rec.title}</strong>
                        <span className="text-[9px] font-bold text-emerald-400 font-mono">{Math.round(rec.score * 100)}%</span>
                      </div>
                      <p className="text-slate-400 font-medium leading-relaxed truncate">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Learning paths recommendations */}
            <div className="space-y-3 pb-3 border-b border-slate-800/60">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                🎓 Learning Gaps Suggestions
              </span>

              {learningRecs.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic">No gaps calculated. Ingest more conversation transcripts.</div>
              ) : (
                <div className="space-y-2">
                  {learningRecs.map(rec => (
                    <div key={rec.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[11px] space-y-1">
                      <strong className="text-indigo-300 tracking-wide block">{rec.title}</strong>
                      <p className="text-slate-400 font-medium leading-normal">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Critical security items recommendations */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 text-rose-300">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                Actionable System Safeguards
              </span>

              {trendRecs.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic">No threats or pipeline alerts logged. System is healthy.</div>
              ) : (
                <div className="space-y-2">
                  {trendRecs.map(rec => (
                    <div key={rec.id} className="bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg text-[11px] space-y-1">
                      <strong className="text-rose-300 font-bold block">{rec.title}</strong>
                      <p className="text-slate-400 font-medium leading-relaxed">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Export Utilities Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
              Data Exporters
              <Download className="w-4 h-4 text-amber-500" />
            </h2>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={triggerJSONDownload}
                disabled={searchResults.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800/80 disabled:opacity-40 text-slate-300 hover:text-white transition-all gap-1 text-[10px]"
              >
                <FileJson className="w-4 h-4 text-indigo-400" />
                JSON
              </button>
              
              <button
                onClick={triggerCSVDownload}
                disabled={searchResults.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800/80 disabled:opacity-40 text-slate-300 hover:text-white transition-all gap-1 text-[10px]"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                CSV
              </button>

              <button
                onClick={triggerPrintWindow}
                disabled={searchResults.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800/80 disabled:opacity-40 text-slate-300 hover:text-white transition-all gap-1 text-[10px]"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                PDF/Print
              </button>
            </div>
          </div>

          {/* In-Browser Test Suite Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Core Engine Tests
                <Play className="w-4 h-4 text-emerald-400" />
              </h2>
              <button
                onClick={() => setShowTestPanel(!showTestPanel)}
                className="text-xs text-slate-400 hover:text-white bg-slate-850 px-2 py-0.5 rounded border border-slate-800"
              >
                {showTestPanel ? 'Hide' : 'Expand'}
              </button>
            </div>

            {showTestPanel && (
              <div className="space-y-3">
                <button
                  onClick={runSelfCheckTests}
                  disabled={isRunningTests}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isRunningTests ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Test assertions
                    </>
                  )}
                </button>

                {testResults && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-2">
                    <div className="flex justify-between text-xs font-bold border-b border-slate-850 pb-1.5">
                      <span className="text-emerald-400">PASSED: {testResults.passed}</span>
                      <span className={testResults.failed > 0 ? 'text-rose-400' : 'text-slate-400'}>
                        FAILED: {testResults.failed}
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px]">
                      {testResults.tests.map((test, index) => (
                        <div key={index} className="flex justify-between items-start gap-3">
                          <span className="text-slate-300">
                            {test.suite} &bull; {test.name}
                          </span>
                          <span className={test.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {test.passed ? 'PASS' : 'FAIL'} ({test.duration}ms)
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[9px] text-slate-500 text-right font-mono border-t border-slate-850 pt-1.5">
                      Elapsed: {testResults.duration}ms
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MemorySearchPage;
