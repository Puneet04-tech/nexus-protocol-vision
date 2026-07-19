import { Memory, TimelineInterval } from '../types';
import { MemoryRepository } from '../repository/MemoryRepository';

export interface CumulativeStatsPoint {
  timestamp: number;
  dateStr: string;
  totalMemories: number;
  carbonSavedGrams: number;
  knowledgeNodesAssimilated: number;
  securityThreatsBlocked: number;
}

export class TimelineManager {
  private static instance: TimelineManager | null = null;
  private repository = MemoryRepository.getInstance();

  private constructor() {}

  public static getInstance(): TimelineManager {
    if (!this.instance) {
      this.instance = new TimelineManager();
    }
    return this.instance;
  }

  /**
   * Groups filtered memories into chronological daily intervals.
   */
  public getChronologicalTimeline(memories: Memory[]): TimelineInterval[] {
    if (memories.length === 0) return [];

    // Sort memories: newest first
    const sorted = [...memories].sort((a, b) => b.recency - a.recency);

    // Group by Day (using local date strings)
    const groups: Record<string, Memory[]> = {};
    sorted.forEach(m => {
      const date = new Date(m.recency);
      const dayKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(m);
    });

    // Compile intervals
    return Object.entries(groups).map(([dayKey, dayMemories]) => {
      // Find midpoint timestamp
      const timestamps = dayMemories.map(m => m.recency);
      const avgTimestamp = timestamps.reduce((sum, t) => sum + t, 0) / timestamps.length;

      // Extract unique learnings & agents
      const learnings = new Set<string>();
      const agents = new Set<string>();

      dayMemories.forEach(m => {
        m.associations.forEach(a => learnings.add(a.concept));
        if (m.agentId) agents.add(m.agentId);
      });

      // Simple description summarizing sources
      const sources = Array.from(new Set(dayMemories.map(m => m.source)));
      let desc = `Ingested ${dayMemories.length} memories from ${sources.join(', ')}.`;
      if (learnings.size > 0) {
        desc += ` Assimilated concept: ${Array.from(learnings).slice(0, 2).join(', ')}.`;
      }

      return {
        id: `interval_${dayKey.replace(/[\s,]+/g, '_')}`,
        title: dayKey,
        description: desc,
        timestamp: avgTimestamp,
        memories: dayMemories,
        learningGained: Array.from(learnings),
        agentsInvolved: Array.from(agents)
      };
    });
  }

  /**
   * Generates cumulative statistics over time for charting.
   */
  public getCumulativeStats(days = 14): CumulativeStatsPoint[] {
    const memories = [...this.repository.listMemories()].sort((a, b) => a.recency - b.recency);
    if (memories.length === 0) return [];

    const now = Date.now();
    const stats: CumulativeStatsPoint[] = [];

    let totalMemories = 0;
    let carbonSavedGrams = 0;
    let knowledgeNodesAssimilated = 0;
    let securityThreatsBlocked = 0;

    // We step through the last N days
    for (let i = days - 1; i >= 0; i--) {
      const targetDayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const targetDayEnd = now - i * 24 * 60 * 60 * 1000;
      const dateStr = new Date(targetDayEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      // Find memories that fell in this day's range
      const dayMemories = memories.filter(m => m.recency >= targetDayStart && m.recency < targetDayEnd);

      dayMemories.forEach(m => {
        totalMemories++;
        
        // Accumulate carbon savings from metadata
        if (m.metadata.carbonSavedGrams !== undefined) {
          carbonSavedGrams += m.metadata.carbonSavedGrams;
        }

        // Knowledge nodes counts
        if (m.category === 'knowledge') {
          knowledgeNodesAssimilated += m.associations.length || 1;
        }

        // Security blocks
        if (m.tags.includes('security') && (m.content.includes('Blocked') || m.content.includes('unauthorized'))) {
          securityThreatsBlocked++;
        }
      });

      stats.push({
        timestamp: targetDayEnd,
        dateStr,
        totalMemories,
        carbonSavedGrams,
        knowledgeNodesAssimilated,
        securityThreatsBlocked
      });
    }

    return stats;
  }
}
