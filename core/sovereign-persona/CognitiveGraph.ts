/**
 * Cognitive Graph - High-fidelity knowledge representation
 * Maintains user's knowledge state, gaps, and learning trajectory
 */

import { GraphNode, GraphEdge, KnowledgeState, LearningPath } from './types';

export class CognitiveGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private personaId: string;
  private lastUpdate: number = Date.now();

  constructor(personaId: string) {
    this.personaId = personaId;
    this.initializeBaseGraph();
  }

  /**
   * Assimilate new interaction into the cognitive graph
   */
  async assimilate(interaction: any): Promise<{ newConcepts: string[]; updatedConnections: string[] }> {
    const concepts = this.extractConcepts(interaction);
    const newConcepts: string[] = [];
    const updatedConnections: string[] = [];

    for (const concept of concepts) {
      if (!this.nodes.has(concept.id)) {
        const node = this.createNode(concept, interaction);
        this.nodes.set(concept.id, node);
        newConcepts.push(concept.id);
      } else {
        const existingNode = this.nodes.get(concept.id)!;
        this.updateNode(existingNode, interaction);
      }

      // Create/update connections
      const connections = this.findConnections(concept.id);
      for (const conn of connections) {
        if (!this.edges.has(conn.id)) {
          this.edges.set(conn.id, conn);
          updatedConnections.push(conn.id);
        }
      }
    }

    this.lastUpdate = Date.now();
    this.optimizeGraph();
    
    return { newConcepts, updatedConnections };
  }

  /**
   * Identify knowledge gaps for a given context
   */
  async identifyGaps(context: any): Promise<any[]> {
    const requiredConcepts = this.getRequiredConcepts(context);
    const gaps: any[] = [];

    for (const concept of requiredConcepts) {
      const node = this.nodes.get(concept);
      if (!node || node.confidence < 0.7) {
        gaps.push({
          concept,
          domain: this.getDomain(concept),
          complexity: this.calculateComplexity(concept),
          prerequisites: this.getPrerequisites(concept),
          currentMastery: node?.confidence || 0
        });
      }
    }

    return gaps.sort((a, b) => b.complexity - a.complexity);
  }

  /**
   * Get current state of the cognitive graph
   */
  getCurrentState(): KnowledgeState {
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      averageConfidence: this.calculateAverageConfidence(),
      domainDistribution: this.getDomainDistribution(),
      learningVelocity: this.calculateLearningVelocity(),
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * Generate personalized learning path
   */
  async generateLearningPath(goal: string, constraints: any): Promise<LearningPath> {
    const targetNode = this.findNode(goal);
    if (!targetNode) {
      throw new Error(`Goal concept '${goal}' not found in cognitive graph`);
    }

    const path = this.calculateOptimalPath(targetNode, constraints);
    return {
      goal,
      steps: path,
      estimatedDuration: this.estimatePathDuration(path),
      difficulty: this.calculatePathDifficulty(path),
      prerequisites: this.getPathPrerequisites(path)
    };
  }

  /**
   * Export the entire cognitive graph as a plain JSON-serialisable object.
   *
   * Useful for:
   *  - Saving/restoring the graph to localStorage or a backend.
   *  - Feeding the graph into a visualisation library (e.g. D3, Cytoscape).
   *  - Debugging — paste the output into the browser console to inspect it.
   *
   * @returns A snapshot containing all nodes, edges, and the current state.
   *
   * @example
   * ```ts
   * const graph = new CognitiveGraph('user-123');
   * const snapshot = graph.exportGraph();
   * console.log(JSON.stringify(snapshot, null, 2));
   * ```
   */
  exportGraph(): {
    personaId: string;
    exportedAt: number;
    state: KnowledgeState;
    nodes: GraphNode[];
    edges: GraphEdge[];
  } {
    return {
      // Who this graph belongs to
      personaId: this.personaId,
      // Unix timestamp so you know when the snapshot was taken
      exportedAt: Date.now(),
      // High-level summary metrics
      state: this.getCurrentState(),
      // All knowledge nodes (concepts the persona knows about)
      nodes: Array.from(this.nodes.values()),
      // All connections between those concepts
      edges: Array.from(this.edges.values()),
    };
  }

  /**
   * Import graph data from backup, clearing current nodes/edges and rebuilding.
   */
  importGraph(data: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    this.nodes.clear();
    this.edges.clear();
    for (const node of data.nodes) {
      this.nodes.set(node.id, { ...node });
    }
    for (const edge of data.edges) {
      this.edges.set(edge.id, { ...edge });
    }
    this.lastUpdate = Date.now();
  }

  /**
   * Return the top N nodes by confidence score.
   *
   * Handy for building dashboards that highlight the user's strongest topics.
   *
   * @param n - How many top nodes to return (default: 5)
   * @returns Nodes sorted from highest to lowest confidence, up to n items.
   *
   * @example
   * ```ts
   * const topTopics = graph.getTopNodes(3);
   * topTopics.forEach(node => console.log(node.id, node.confidence));
   * ```
   */
  getTopNodes(n: number = 5): GraphNode[] {
    // Convert the Map to an array, sort descending by confidence, then slice
    return [...this.nodes.values()]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, n);
  }

  /**
   * Predict learning outcomes
   */
  async predictLearningOutcome(concept: string, timeInvestment: number): Promise<any> {
    const node = this.nodes.get(concept);
    if (!node) {
      return {
        predictedMastery: Math.min(timeInvestment / 100, 0.9),
        confidence: 0.5,
        prerequisites: this.getPrerequisites(concept)
      };
    }

    const currentMastery = node.confidence;
    const learningRate = this.calculateLearningRate(concept);
    const predictedMastery = Math.min(currentMastery + (timeInvestment * learningRate), 0.95);

    return {
      currentMastery,
      predictedMastery,
      improvement: predictedMastery - currentMastery,
      confidence: this.calculatePredictionConfidence(concept),
      optimalStudyTime: this.calculateOptimalStudyTime(concept)
    };
  }

  private initializeBaseGraph(): void {
    // Initialize with fundamental concepts
    const baseConcepts = [
      { id: 'mathematics', domain: 'foundational', complexity: 0.3 },
      { id: 'programming', domain: 'technical', complexity: 0.5 },
      { id: 'ethics', domain: 'philosophical', complexity: 0.4 },
      { id: 'communication', domain: 'social', complexity: 0.3 }
    ];

    for (const concept of baseConcepts) {
      this.nodes.set(concept.id, {
        id: concept.id,
        domain: concept.domain,
        complexity: concept.complexity,
        confidence: 0.5,
        lastAccessed: Date.now(),
        accessCount: 0,
        relatedConcepts: [],
        metadata: {}
      });
    }
  }

  private extractConcepts(interaction: any): any[] {
    // Advanced NLP concept extraction
    const concepts = [];
    const content = interaction.content || '';
    
    // Simple keyword extraction (would be replaced with sophisticated NLP)
    const keywords = this.extractKeywords(content);
    
    for (const keyword of keywords) {
      concepts.push({
        id: keyword.toLowerCase().replace(/\s+/g, '_'),
        name: keyword,
        domain: this.inferDomain(keyword),
        confidence: 0.5
      });
    }

    return concepts;
  }

  private createNode(concept: any, interaction: any): GraphNode {
    return {
      id: concept.id,
      domain: concept.domain,
      complexity: concept.complexity || 0.5,
      confidence: concept.confidence || 0.5,
      lastAccessed: Date.now(),
      accessCount: 1,
      relatedConcepts: [],
      metadata: {
        source: interaction.type,
        context: interaction.context,
        createdAt: Date.now()
      }
    };
  }

  private updateNode(node: GraphNode, interaction: any): void {
    node.confidence = Math.min(node.confidence + 0.1, 1.0);
    node.lastAccessed = Date.now();
    node.accessCount++;
    
    // Update metadata
    if (!node.metadata.interactions) {
      node.metadata.interactions = [];
    }
    node.metadata.interactions.push({
      timestamp: Date.now(),
      type: interaction.type,
      context: interaction.context
    });
  }

  private findConnections(conceptId: string): GraphEdge[] {
    const connections: GraphEdge[] = [];
    const node = this.nodes.get(conceptId);
    
    if (!node) return connections;

    // Find related concepts based on domain and similarity
    for (const [otherId, otherNode] of this.nodes) {
      if (otherId !== conceptId) {
        const similarity = this.calculateSimilarity(node, otherNode);
        if (similarity > 0.3) {
          connections.push({
            id: `${conceptId}-${otherId}`,
            source: conceptId,
            target: otherId,
            weight: similarity,
            type: this.inferRelationshipType(node, otherNode),
            strength: similarity
          });
        }
      }
    }

    return connections;
  }

  private calculateSimilarity(node1: GraphNode, node2: GraphNode): number {
    let similarity = 0;
    
    // Domain similarity
    if (node1.domain === node2.domain) {
      similarity += 0.4;
    }
    
    // Complexity similarity
    similarity += 0.3 * (1 - Math.abs(node1.complexity - node2.complexity));
    
    // Confidence similarity
    similarity += 0.3 * (1 - Math.abs(node1.confidence - node2.confidence));
    
    return similarity;
  }

  private inferRelationshipType(node1: GraphNode, node2: GraphNode): string {
    if (node1.domain === node2.domain) {
      return 'domain-related';
    }
    if (Math.abs(node1.complexity - node2.complexity) < 0.2) {
      return 'complexity-related';
    }
    return 'semantic-related';
  }

  private optimizeGraph(): void {
    // Remove weak connections
    for (const [edgeId, edge] of this.edges) {
      if (edge.strength < 0.1) {
        this.edges.delete(edgeId);
      }
    }

    // Update node confidences based on connections
    for (const [nodeId, node] of this.nodes) {
      const connectedEdges = Array.from(this.edges.values())
        .filter(edge => edge.source === nodeId || edge.target === nodeId);
      
      if (connectedEdges.length > 0) {
        const avgStrength = connectedEdges.reduce((sum, edge) => sum + edge.strength, 0) / connectedEdges.length;
        node.confidence = Math.min(node.confidence + avgStrength * 0.1, 1.0);
      }
    }
  }

  private getRequiredConcepts(context: any): string[] {
    // Extract required concepts based on context
    // This would use sophisticated context analysis
    return ['programming', 'mathematics', 'ethics']; // Placeholder
  }

  private getDomain(concept: string): string {
    const node = this.nodes.get(concept);
    return node?.domain || 'unknown';
  }

  private calculateComplexity(concept: string): number {
    const node = this.nodes.get(concept);
    return node?.complexity || 0.5;
  }

  private getPrerequisites(concept: string): string[] {
    // Calculate prerequisites based on graph structure
    const prerequisites: string[] = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.target === concept && edge.type === 'prerequisite') {
        prerequisites.push(edge.source);
      }
    }
    return prerequisites;
  }

  private calculateAverageConfidence(): number {
    const confidences = Array.from(this.nodes.values()).map(node => node.confidence);
    return confidences.length > 0 ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length : 0;
  }

  private getDomainDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      distribution[node.domain] = (distribution[node.domain] || 0) + 1;
    }
    return distribution;
  }

  private calculateLearningVelocity(): number {
    // Calculate how quickly the user is learning
    const recentUpdates = Array.from(this.nodes.values())
      .filter(node => Date.now() - node.lastAccessed < 7 * 24 * 60 * 60 * 1000) // Last week
      .length;
    
    return recentUpdates / 7; // Updates per day
  }

  private findNode(goal: string): GraphNode | undefined {
    return this.nodes.get(goal);
  }

  private calculateOptimalPath(targetNode: GraphNode, constraints: any): GraphNode[] {
    // Implement shortest path algorithm with constraints
    // This would use Dijkstra's algorithm with custom weights
    return [targetNode]; // Placeholder
  }

  private estimatePathDuration(path: GraphNode[]): number {
    return path.reduce((total, node) => total + this.estimateLearningTime(node.id), 0);
  }

  private calculatePathDifficulty(path: GraphNode[]): number {
    return path.reduce((total, node) => total + node.complexity, 0) / path.length;
  }

  private getPathPrerequisites(path: GraphNode[]): string[] {
    const prerequisites: string[] = [];
    for (const node of path) {
      prerequisites.push(...this.getPrerequisites(node.id));
    }
    return [...new Set(prerequisites)];
  }

  private calculateLearningRate(concept: string): number {
    const node = this.nodes.get(concept);
    if (!node) return 0.01;
    
    // Learning rate based on domain familiarity and complexity
    const domainFamiliarity = this.getDomainDistribution()[node.domain] || 0;
    return 0.01 * (1 + domainFamiliarity * 0.1) * (1 - node.complexity * 0.2);
  }

  private calculatePredictionConfidence(concept: string): number {
    const node = this.nodes.get(concept);
    return node ? node.confidence * 0.8 : 0.3;
  }

  private calculateOptimalStudyTime(concept: string): number {
    const node = this.nodes.get(concept);
    if (!node) return 60; // Default 1 hour
    
    // Optimal study time based on complexity and current mastery
    return Math.max(30, node.complexity * 120 * (1 - node.confidence));
  }

  private estimateLearningTime(concept: string): number {
    const node = this.nodes.get(concept);
    return node ? node.complexity * 100 : 60; // Placeholder
  }

  private inferDomain(keyword: string): string {
    const domainKeywords = {
      technical: ['code', 'algorithm', 'data', 'system', 'network'],
      philosophical: ['ethics', 'morality', 'philosophy', 'logic', 'reasoning'],
      social: ['communication', 'team', 'collaboration', 'leadership', 'management'],
      foundational: ['mathematics', 'physics', 'chemistry', 'biology', 'statistics']
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(kw => keyword.toLowerCase().includes(kw))) {
        return domain;
      }
    }

    return 'general';
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction (would be replaced with sophisticated NLP)
    const words = content.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => word.length > 3 && !this.isStopWord(word));
    return [...new Set(keywords)];
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    return stopWords.includes(word);
  }
}
