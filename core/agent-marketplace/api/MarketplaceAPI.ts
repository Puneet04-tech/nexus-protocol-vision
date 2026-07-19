import { mockAgentRepository } from '../repository/AgentRepository';
import { AgentDiscovery } from '../discovery/AgentDiscovery';
import { SearchCriteria, SearchResult, MarketplaceAgent } from '../types';

export class MarketplaceAPI {
  private discovery: AgentDiscovery;

  constructor(discovery: AgentDiscovery) {
    this.discovery = discovery;
  }

  private simulateDelay(ms = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getAgents(criteria: SearchCriteria): Promise<SearchResult> {
    await this.simulateDelay(200);
    return this.discovery.search(criteria);
  }

  public async getAgentById(id: string): Promise<MarketplaceAgent | null> {
    await this.simulateDelay(150);
    return mockAgentRepository.get(id) || null;
  }

  public async submitReview(
    agentId: string,
    rating: number,
    comment: string,
    author: string
  ): Promise<boolean> {
    await this.simulateDelay(400);
    return mockAgentRepository.addReview(agentId, rating, comment, author);
  }

  public async downloadPackage(agentId: string, version: string): Promise<string> {
    await this.simulateDelay(500); // Simulate network latency
    const agent = mockAgentRepository.get(agentId);
    if (!agent) throw new Error(`Package download failed: agent '${agentId}' not found.`);
    const item = agent.versionsHistory.find(v => v.version === version);
    if (!item) throw new Error(`Package download failed: version '${version}' not found.`);
    return item.entry;
  }
}
