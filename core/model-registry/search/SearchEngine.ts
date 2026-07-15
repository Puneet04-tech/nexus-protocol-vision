import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { ModelMetadata, SearchCriteria } from '../types';

export class SearchEngine {
  private static instance: SearchEngine | null = null;
  private repository = ModelRegistryRepository.getInstance();

  private constructor() {}

  public static getInstance(): SearchEngine {
    if (!this.instance) {
      this.instance = new SearchEngine();
    }
    return this.instance;
  }

  /**
   * Filters and sorts the model catalog list based on search criteria.
   */
  public search(criteria: SearchCriteria): ModelMetadata[] {
    let models = this.repository.listModels();

    // Query text match (ID, Name, Description, Publisher name)
    if (criteria.query) {
      const q = criteria.query.toLowerCase().trim();
      models = models.filter(
        m =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.publisher.name.toLowerCase().includes(q)
      );
    }

    // Category / Capability match (category serves as high level capability here)
    if (criteria.capability) {
      const cap = criteria.capability.toLowerCase().trim();
      models = models.filter(m => m.category.toLowerCase().includes(cap));
    }

    // Publisher match
    if (criteria.publisher) {
      const pub = criteria.publisher.toLowerCase().trim();
      models = models.filter(m => m.publisher.name.toLowerCase().includes(pub));
    }

    // Framework match
    if (criteria.framework) {
      models = models.filter(m => m.framework === criteria.framework);
    }

    // Tags subset check
    if (criteria.tags && criteria.tags.length > 0) {
      models = models.filter(m =>
        criteria.tags!.every(t => m.tags.map(x => x.toLowerCase()).includes(t.toLowerCase()))
      );
    }

    // Deployment Status check
    if (criteria.deploymentStatus) {
      const deployments = this.repository.listDeployments();
      const deployedModelIds = new Set(
        deployments.filter(d => d.status === criteria.deploymentStatus).map(d => d.modelId)
      );
      models = models.filter(m => deployedModelIds.has(m.id));
    }

    // Sorting
    const sortField = criteria.sortBy || 'name';
    const order = criteria.sortOrder || 'asc';

    models.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'newest') {
        comparison = b.createdAt - a.createdAt;
      } else if (sortField === 'requests') {
        // Sort by total request volume in analytics
        const requestsA = this.getModelRequestCount(a.id);
        const requestsB = this.getModelRequestCount(b.id);
        comparison = requestsB - requestsA;
      } else if (sortField === 'latency') {
        // Sort by average latency (p50) in analytics
        const latA = this.getModelAverageLatency(a.id);
        const latB = this.getModelAverageLatency(b.id);
        comparison = latA - latB;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return models;
  }

  private getModelRequestCount(modelId: string): number {
    const records = this.repository.getAnalyticsForModel(modelId);
    if (records.length === 0) return 0;
    return records.reduce((sum, r) => sum + r.requestCount, 0);
  }

  private getModelAverageLatency(modelId: string): number {
    const records = this.repository.getAnalyticsForModel(modelId);
    if (records.length === 0) return 99999; // penalize if no records
    const sum = records.reduce((s, r) => s + r.latencyP50, 0);
    return sum / records.length;
  }
}
