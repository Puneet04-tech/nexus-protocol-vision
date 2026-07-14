import assert from 'node:assert';
import { MemoryItem, MemoryRetentionPolicy } from './types.ts';
import { MemoryImportanceScorer } from './MemoryImportanceScorer.ts';
import { MemoryAgingEngine } from './MemoryAgingEngine.ts';
import { DuplicateDetector } from './DuplicateDetector.ts';
import { MemoryArchiveService } from './MemoryArchiveService.ts';
import { MemoryCompressionService } from './MemoryCompressionService.ts';
import { BackgroundOptimizer } from './BackgroundOptimizer.ts';
import { MemoryLifecycleManager } from './MemoryLifecycleManager.ts';

async function testImportanceScorer() {
  console.log('Running Importance Scorer Tests...');
  const scorer = new MemoryImportanceScorer({
    recencyWeight: 0.5,
    frequencyWeight: 0.5,
    graphConnectionWeight: 0.0,
  });

  const now = Date.now();
  const mockMemory: MemoryItem = {
    id: 'test_1',
    content: 'This is a test memory content.',
    importance: 0.5,
    age: 0.0,
    accessCount: 1,
    lastAccessed: now,
    createdAt: now,
    status: 'active',
    isPinned: false,
  };

  // Test basic score
  const score1 = scorer.calculateScore(mockMemory, now);
  assert.ok(score1 > 0.0 && score1 <= 1.0, 'Score should be between 0.0 and 1.0');

  // Test frequency increase increases score
  const higherFreqMemory = { ...mockMemory, accessCount: 10 };
  const score2 = scorer.calculateScore(higherFreqMemory, now);
  assert.ok(score2 > score1, 'Higher frequency should increase score');

  // Test pinned memory is always 1.0
  const pinnedMemory = { ...mockMemory, isPinned: true };
  const score3 = scorer.calculateScore(pinnedMemory, now);
  assert.strictEqual(score3, 1.0, 'Pinned memory score must be 1.0');

  // Test override metadata
  const overrideMemory = {
    ...mockMemory,
    metadata: { importanceScoreOverride: 0.85 }
  };
  const score4 = scorer.calculateScore(overrideMemory, now);
  assert.strictEqual(score4, 0.85, 'Override score should be respected');
  console.log('Importance Scorer Tests Passed!');
}

async function testAgingEngine() {
  console.log('Running Aging Engine Tests...');
  const engine = new MemoryAgingEngine({
    baseDecayRate: 0.1,
    decayFunction: 'exponential',
  });

  const now = Date.now();
  const oldMemory: MemoryItem = {
    id: 'test_old',
    content: 'Old memory content.',
    importance: 0.8,
    age: 0.0,
    accessCount: 1,
    lastAccessed: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
    createdAt: now - 10 * 24 * 60 * 60 * 1000,
    status: 'active',
    isPinned: false,
  };

  const age = engine.calculateAge(oldMemory, now);
  assert.ok(age > 0.0, 'Decayed memory age should be greater than 0.0');

  // Test decay score
  const decayedScore = engine.decayScore(0.8, age);
  assert.ok(decayedScore < 0.8, 'Decayed score should be lower than initial');

  // Test pinned memory does not age
  const pinnedMemory: MemoryItem = { ...oldMemory, isPinned: true };
  const pinnedAge = engine.calculateAge(pinnedMemory, now);
  assert.strictEqual(pinnedAge, 0.0, 'Pinned memory age should be 0.0');
  console.log('Aging Engine Tests Passed!');
}

async function testDuplicateDetector() {
  console.log('Running Duplicate Detector Tests...');
  const detector = new DuplicateDetector(0.75);

  const text1 = 'The quick brown fox jumps over the lazy dog.';
  const text2 = 'The quick brown fox jumps over the lazy dog!';
  const text3 = 'A completely unrelated text about cognitive architectures.';

  // Near-duplicates
  const sim1 = await detector.calculateSimilarity(text1, text2);
  assert.ok(sim1 > 0.8, 'Near duplicate similarity should be high');

  const result1 = await detector.findDuplicate(text1, [
    { id: '1', content: text2, importance: 0.5, age: 0, accessCount: 1, lastAccessed: Date.now(), createdAt: Date.now(), status: 'active', isPinned: false }
  ]);
  assert.strictEqual(result1.isDuplicate, true, 'Should mark as duplicate');

  // Unrelated texts
  const sim2 = await detector.calculateSimilarity(text1, text3);
  assert.ok(sim2 < 0.3, 'Unrelated similarity should be low');

  const result2 = await detector.findDuplicate(text1, [
    { id: '1', content: text3, importance: 0.5, age: 0, accessCount: 1, lastAccessed: Date.now(), createdAt: Date.now(), status: 'active', isPinned: false }
  ]);
  assert.strictEqual(result2.isDuplicate, false, 'Should not mark as duplicate');
  console.log('Duplicate Detector Tests Passed!');
}

async function testArchivingAndRestoration() {
  console.log('Running Archiving and Restoration Tests...');
  const archiveService = new MemoryArchiveService();

  const now = Date.now();
  const activeMemory: MemoryItem = {
    id: 'mem_arch',
    content: 'Archivable memory content.',
    importance: 0.4,
    age: 0.0,
    accessCount: 1,
    lastAccessed: now,
    createdAt: now,
    status: 'active',
    isPinned: false,
  };

  // Test archiving
  const archiveSuccess = archiveService.archive(activeMemory);
  assert.strictEqual(archiveSuccess, true);
  assert.strictEqual(activeMemory.status, 'archived');

  // Test pinned archive block
  const pinnedMemory: MemoryItem = {
    ...activeMemory,
    status: 'active',
    isPinned: true,
  };
  assert.throws(() => {
    archiveService.archive(pinnedMemory);
  }, /Cannot archive memory/);

  // Test restoration
  activeMemory.lastAccessed = now - 10000;
  const restoreSuccess = archiveService.restore(activeMemory);
  assert.strictEqual(restoreSuccess, true);
  assert.strictEqual(activeMemory.status, 'active');
  assert.ok(activeMemory.lastAccessed > now - 5000, 'Restored memory should update last accessed');
  console.log('Archiving and Restoration Tests Passed!');
}

async function testCompression() {
  console.log('Running Compression Tests...');
  const compressionService = new MemoryCompressionService();

  const longMemory: MemoryItem = {
    id: 'mem_comp',
    content: 'Vite is a build tool that aims to provide a faster and leaner development experience for modern web projects. It consists of two major parts: a dev server that serves your source files over native ES modules, and a build command that bundles your code with Rollup, pre-configured to output highly optimized static assets for production.',
    importance: 0.3,
    age: 0.0,
    accessCount: 1,
    lastAccessed: Date.now(),
    createdAt: Date.now(),
    status: 'active',
    isPinned: false,
  };

  const compSuccess = await compressionService.compress(longMemory);
  assert.strictEqual(compSuccess, true);
  assert.strictEqual(longMemory.isCompressed, true);
  assert.ok(longMemory.compressedContent!.length < longMemory.content.length, 'Compressed content should be shorter');

  const savings = compressionService.calculateSavings(longMemory);
  assert.ok(savings > 0, 'Savings should be greater than zero');
  console.log('Compression Tests Passed!');
}

async function testMemoryLifecycleManagerAndBackgroundOptimizer() {
  console.log('Running Lifecycle Manager and Optimizer Tests...');
  
  const manager = new MemoryLifecycleManager({
    archiveAfterDays: 1, // Short time to trigger archiving
    compressionThreshold: 0.5,
    minimumImportance: 0.3,
    optimizationInterval: 1,
  });

  // Test add memory
  const addRes1 = await manager.addMemory('Cognitive graphs mapped to vector spaces.');
  assert.strictEqual(addResRes(addRes1).success, true);
  const mem1 = addResRes(addRes1).item!;

  // Test duplicate add rejection
  const addRes2 = await manager.addMemory('Cognitive graphs mapped to vector spaces!');
  assert.strictEqual(addResRes(addRes2).success, false);
  assert.strictEqual(addResRes(addRes2).error, 'Duplicate memory detected');

  // Test pinning
  await manager.pinMemory(mem1.id);
  assert.strictEqual(mem1.isPinned, true);
  assert.strictEqual(mem1.importance, 1.0);

  // Test unpinning
  await manager.unpinMemory(mem1.id);
  assert.strictEqual(mem1.isPinned, false);

  // Test optimization
  const oldTime = Date.now() - 2 * 24 * 60 * 60 * 1000;
  // Modify item timestamps to simulate age/inactivity
  mem1.createdAt = oldTime;
  mem1.lastAccessed = oldTime;
  mem1.lastOptimizedTime = undefined; // Force optimization processing

  await manager.optimizeNow();

  const updatedMem = manager.getAllMemories().find(m => m.id === mem1.id)!;
  assert.strictEqual(updatedMem.status, 'archived', 'Inactive memory should be archived');

  const stats = manager.getStats();
  assert.strictEqual(stats.archivedCount, 1);
  assert.strictEqual(stats.activeCount, 0);
  assert.strictEqual(stats.duplicateCount, 1);

  console.log('Lifecycle Manager and Optimizer Tests Passed!');
}

// Helper to keep TS compiler happy with destructured return values
function addResRes(res: any) {
  return res as { success: boolean; item?: MemoryItem; duplicateOf?: string; error?: string };
}

async function runAll() {
  console.log('====================================');
  console.log('STARTING MEMORY LIFECYCLE UNIT TESTS');
  console.log('====================================');
  
  try {
    await testImportanceScorer();
    await testAgingEngine();
    await testDuplicateDetector();
    await testArchivingAndRestoration();
    await testCompression();
    await testMemoryLifecycleManagerAndBackgroundOptimizer();
    
    console.log('====================================');
    console.log('ALL MEMORY LIFECYCLE TESTS PASSED!');
    console.log('====================================');
    process.exit(0);
  } catch (error) {
    console.error('====================================');
    console.error('TEST SUITE FAILED:', error);
    console.error('====================================');
    process.exit(1);
  }
}

runAll();
