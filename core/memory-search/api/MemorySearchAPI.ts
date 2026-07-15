import { Memory, MemoryCollection, SearchQuery, SearchResponse, SearchResult, Recommendation, TimelineInterval } from '../types';
import { MemorySearchService } from '../services/MemorySearchService';
import { MemoryRepository } from '../repository/MemoryRepository';
import { CollectionManager } from '../collections/CollectionManager';
import { Recommender } from '../recommendations/Recommender';
import { TimelineManager, CumulativeStatsPoint } from '../timeline/TimelineManager';
import { DataExporter } from '../exporters/DataExporter';

export class MemorySearchAPI {
  private static instance: MemorySearchAPI | null = null;

  private service = MemorySearchService.getInstance();
  private repository = MemoryRepository.getInstance();
  private collectionManager = CollectionManager.getInstance();
  private recommender = Recommender.getInstance();
  private timelineManager = TimelineManager.getInstance();
  private exporter = DataExporter.getInstance();

  private constructor() {}

  public static getInstance(): MemorySearchAPI {
    if (!this.instance) {
      this.instance = new MemorySearchAPI();
    }
    return this.instance;
  }

  // Ingestion and Core Search
  public async query(searchQuery: SearchQuery): Promise<SearchResponse> {
    return this.service.query(searchQuery);
  }

  public async ingest(memory: Partial<Memory>): Promise<Memory> {
    return this.service.ingestMemory(memory);
  }

  public getMemory(id: string): Memory | null {
    return this.repository.getMemory(id);
  }

  public deleteMemory(id: string): boolean {
    return this.service.deleteMemory(id);
  }

  public listAllMemories(): Memory[] {
    return this.repository.listMemories();
  }

  // Collections Folder Management
  public getCollections(): MemoryCollection[] {
    return this.repository.listCollections();
  }

  public getCollection(id: string): MemoryCollection | null {
    return this.repository.getCollection(id);
  }

  public createCollection(name: string, description: string, memoryIds: string[] = [], isSmart = false, filterCriteria?: SearchQuery): MemoryCollection {
    return this.collectionManager.createCollection(name, description, memoryIds, isSmart, filterCriteria);
  }

  public addMemoriesToCollection(collectionId: string, memoryIds: string[]): boolean {
    return this.collectionManager.addMemoriesToCollection(collectionId, memoryIds);
  }

  public removeMemoriesFromCollection(collectionId: string, memoryIds: string[]): boolean {
    return this.collectionManager.removeMemoriesFromCollection(collectionId, memoryIds);
  }

  public deleteCollection(id: string): boolean {
    return this.repository.deleteCollection(id);
  }

  // Memory Status Toggles
  public toggleFavorite(id: string): boolean {
    return this.collectionManager.toggleFavorite(id);
  }

  public toggleBookmark(id: string): boolean {
    return this.collectionManager.toggleBookmark(id);
  }

  public togglePin(id: string): boolean {
    return this.collectionManager.togglePin(id);
  }

  // Recommendations
  public async getRelatedMemories(memoryId: string, limit?: number): Promise<Recommendation[]> {
    return this.recommender.getRelatedMemories(memoryId, limit);
  }

  public getLearningRecommendations(limit?: number): Recommendation[] {
    return this.recommender.getLearningRecommendations(limit);
  }

  public getActionableTrends(limit?: number): Recommendation[] {
    return this.recommender.getActionableTrends(limit);
  }

  // Timeline
  public getChronologicalTimeline(memories: Memory[]): TimelineInterval[] {
    return this.timelineManager.getChronologicalTimeline(memories);
  }

  public getCumulativeStats(days?: number): CumulativeStatsPoint[] {
    return this.timelineManager.getCumulativeStats(days);
  }

  // Exporters
  public exportJSON(memories: Memory[]): string {
    return this.exporter.exportToJSON(memories);
  }

  public exportCSV(memories: Memory[]): string {
    return this.exporter.exportToCSV(memories);
  }

  public exportPrintHTML(title: string, results: SearchResult[]): string {
    return this.exporter.generatePrintableHTML(title, results);
  }

  // Lifecycle
  public resetToSeeds(): void {
    this.repository.resetToSeeds();
  }

  public clearAllData(): void {
    this.repository.clearAll();
  }
}

export const mockMemorySearchAPI = MemorySearchAPI.getInstance();
export default mockMemorySearchAPI;
