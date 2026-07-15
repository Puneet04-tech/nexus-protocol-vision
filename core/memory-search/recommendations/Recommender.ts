import { Memory, Recommendation } from '../types';
import { MemoryRepository } from '../repository/MemoryRepository';
import { SimilarityEngine } from '../semantic-search/SimilarityEngine';

export class Recommender {
  private static instance: Recommender | null = null;
  
  private repository = MemoryRepository.getInstance();
  private similarityEngine = SimilarityEngine.getInstance();

  private constructor() {}

  public static getInstance(): Recommender {
    if (!this.instance) {
      this.instance = new Recommender();
    }
    return this.instance;
  }

  /**
   * Suggests related memories for a specific memory ID using tag overlap and content similarity.
   */
  public async getRelatedMemories(memoryId: string, limit = 3): Promise<Recommendation[]> {
    const memories = this.repository.listMemories();
    const target = this.repository.getMemory(memoryId);
    if (!target) return [];

    const otherMemories = memories.filter(m => m.id !== memoryId);
    if (otherMemories.length === 0) return [];

    // Calculate content cosine scores locally
    const scores = this.similarityEngine.calculateLocalSimilarity(target.content, otherMemories.map(m => m.content));

    const recommendations: Recommendation[] = otherMemories.map((m, idx) => {
      // Add a bonus for overlapping tags
      const overlappingTags = m.tags.filter(t => target.tags.includes(t));
      const tagBonus = (overlappingTags.length * 0.15);
      
      const similarityScore = Math.min(1.0, scores[idx] + tagBonus);

      return {
        id: `rec_rel_${m.id}`,
        type: 'related_memory',
        title: `Related Memory in ${m.source}`,
        description: m.content.length > 80 ? m.content.substring(0, 80) + '...' : m.content,
        score: parseFloat(similarityScore.toFixed(4)),
        targetId: m.id
      };
    });

    // Sort by similarity score descending
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Generates next-step learning recommendations based on the user's conversation themes.
   */
  public getLearningRecommendations(limit = 3): Recommendation[] {
    const memories = this.repository.listMemories();
    
    // Count tags across recent conversations to determine user interests
    const conversations = memories.filter(m => m.category === 'conversation');
    const tagWeights: Record<string, number> = {};

    conversations.forEach(c => {
      c.tags.forEach(tag => {
        tagWeights[tag] = (tagWeights[tag] || 0) + c.importance;
      });
    });

    // Check what knowledge items we already possess
    const knowledgeTags = new Set<string>();
    memories.filter(m => m.category === 'knowledge').forEach(k => {
      k.tags.forEach(t => knowledgeTags.add(t));
    });

    // Identify tags with high conversation weight but missing/underrepresented in knowledge nodes
    const learningCandidates: Array<{ tag: string; priority: number }> = [];
    Object.entries(tagWeights).forEach(([tag, weight]) => {
      // If we don't have this tag in knowledge, it is a knowledge gap!
      let priority = weight;
      if (!knowledgeTags.has(tag)) {
        priority *= 1.5; // gaps get higher priority
      }
      learningCandidates.push({ tag, priority });
    });

    // Sort candidates
    learningCandidates.sort((a, b) => b.priority - a.priority);

    // Build recommendations
    const recommendations: Recommendation[] = learningCandidates.slice(0, limit).map((cand, index) => {
      const topic = cand.tag.replace(/-/g, ' ');
      const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
      
      return {
        id: `rec_learn_${cand.tag}`,
        type: 'learning_path',
        title: `Deepen Knowledge: ${capitalizedTopic}`,
        description: `Based on your recent interest in #${cand.tag}, assimilate concept nodes to establish Cognitive Graph linkages.`,
        score: parseFloat(Math.min(0.99, 0.5 + (cand.priority / 10)).toFixed(2))
      };
    });

    return recommendations;
  }

  /**
   * Suggests high-importance interactions that occurred recently.
   */
  public getActionableTrends(limit = 2): Recommendation[] {
    const memories = this.repository.listMemories();
    
    // Filter to security, budget alarms, or pipeline failures
    const criticalItems = memories.filter(m => 
      m.importance >= 0.75 && 
      (m.tags.includes('security') || m.tags.includes('alerts') || m.tags.includes('failover'))
    );

    // Sort by recency
    criticalItems.sort((a, b) => b.recency - a.recency);

    return criticalItems.slice(0, limit).map(m => ({
      id: `rec_trend_${m.id}`,
      type: 'trend',
      title: `Critical Alert: ${m.source}`,
      description: m.content.length > 90 ? m.content.substring(0, 90) + '...' : m.content,
      score: m.importance,
      targetId: m.id
    }));
  }
}
