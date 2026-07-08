import { SovereignPersona, PersonaProfile } from '../sovereign-persona/SovereignPersona';
import { BackupPayload, BackupSelection } from './BackupTypes';
import { GraphNode, GraphEdge } from '../sovereign-persona/types';

export class BackupSerializer {
  /**
   * Serializes selected components of the Persona into a standard payload object.
   */
  public static serialize(
    persona: SovereignPersona,
    selection: BackupSelection
  ): BackupPayload {
    const activeProfile = persona.getProfile();
    const payload: BackupPayload = {
      personaId: activeProfile.id,
      exportedAt: Date.now(),
    };

    // Serialize Profile elements
    const profileData: Partial<PersonaProfile> = {
      id: activeProfile.id,
      userId: activeProfile.userId,
      knowledgeDomains: [...activeProfile.knowledgeDomains],
    };

    if (selection.ethicalBoundaries) {
      profileData.ethicalBoundaries = activeProfile.ethicalBoundaries.map((eb) => ({
        domain: eb.domain,
        constraints: [...eb.constraints],
        severity: eb.severity,
      }));
    }

    if (selection.privacyPreferences) {
      profileData.privacyPreferences = { ...activeProfile.privacyPreferences };
    }

    if (selection.carbonPreferences) {
      profileData.carbonFootprintTarget = activeProfile.carbonFootprintTarget;
    }

    // Professional context and goals
    if (selection.professionalContext || selection.goals) {
      const pc = activeProfile.professionalContext;
      profileData.professionalContext = {
        role: selection.professionalContext ? pc.role : '',
        industry: selection.professionalContext ? pc.industry : '',
        skills: selection.professionalContext ? [...pc.skills] : [],
        experience: selection.professionalContext ? pc.experience : '',
        goals: selection.goals ? [...pc.goals] : [],
      };
    }

    payload.profile = profileData;

    // Serialize Knowledge Graph
    if (selection.knowledgeGraph) {
      const graph = persona.getCognitiveGraph().exportGraph();
      
      // Filter out interactions history if learningHistory is not selected
      const nodes: GraphNode[] = graph.nodes.map((node) => {
        if (!selection.learningHistory) {
          const { interactions, ...cleanMetadata } = node.metadata;
          return {
            ...node,
            metadata: cleanMetadata,
          };
        }
        return {
          ...node,
          metadata: {
            ...node.metadata,
            interactions: node.metadata.interactions
              ? node.metadata.interactions.map((i) => ({ ...i }))
              : undefined,
          },
        };
      });

      const edges: GraphEdge[] = graph.edges.map((edge) => ({ ...edge }));

      payload.cognitiveGraph = { nodes, edges };
    }

    // Serialize Interaction Memory (localStore)
    if (selection.interactionMemory) {
      payload.localStore = Array.from(persona.getLocalStore().entries());
    }

    return payload;
  }

  /**
   * Applies the backup payload onto a SovereignPersona using the chosen strategies.
   */
  public static deserializeAndApply(
    persona: SovereignPersona,
    payload: BackupPayload,
    selection: BackupSelection,
    strategy: 'merge' | 'replace' | 'skip'
  ): void {
    const activeProfile = persona.getProfile();
    const backupProfile = payload.profile || {};

    // 1. Restore privacy preferences
    if (selection.privacyPreferences && backupProfile.privacyPreferences) {
      if (strategy === 'replace') {
        activeProfile.privacyPreferences = { ...backupProfile.privacyPreferences };
      } else if (strategy === 'merge') {
        activeProfile.privacyPreferences = {
          ...activeProfile.privacyPreferences,
          ...backupProfile.privacyPreferences,
        };
      } else if (strategy === 'skip') {
        // Skip: only set keys if missing, but it has defaults, so skip is essentially do nothing.
      }
    }

    // 2. Restore carbon preferences
    if (selection.carbonPreferences && backupProfile.carbonFootprintTarget !== undefined) {
      if (strategy === 'replace' || strategy === 'merge') {
        activeProfile.carbonFootprintTarget = backupProfile.carbonFootprintTarget;
      }
    }

    // 3. Restore professional context
    if (selection.professionalContext && backupProfile.professionalContext) {
      const activePC = activeProfile.professionalContext;
      const backupPC = backupProfile.professionalContext;

      if (strategy === 'replace') {
        activeProfile.professionalContext = {
          role: backupPC.role,
          industry: backupPC.industry,
          experience: backupPC.experience,
          skills: [...backupPC.skills],
          goals: activePC.goals, // keep goals separately managed unless goals is also restored
        };
      } else if (strategy === 'merge') {
        activeProfile.professionalContext = {
          role: backupPC.role || activePC.role,
          industry: backupPC.industry || activePC.industry,
          experience: backupPC.experience || activePC.experience,
          skills: Array.from(new Set([...activePC.skills, ...backupPC.skills])),
          goals: activePC.goals,
        };
      }
    }

    // 4. Restore goals
    if (selection.goals && backupProfile.professionalContext?.goals) {
      const activePC = activeProfile.professionalContext;
      const backupGoals = backupProfile.professionalContext.goals;

      if (strategy === 'replace') {
        activePC.goals = [...backupGoals];
      } else if (strategy === 'merge') {
        activePC.goals = Array.from(new Set([...activePC.goals, ...backupGoals]));
      } else if (strategy === 'skip') {
        for (const goal of backupGoals) {
          if (!activePC.goals.includes(goal)) {
            activePC.goals.push(goal);
          }
        }
      }
    }

    // 5. Restore ethical boundaries
    if (selection.ethicalBoundaries && backupProfile.ethicalBoundaries) {
      if (strategy === 'replace') {
        activeProfile.ethicalBoundaries = backupProfile.ethicalBoundaries.map((eb) => ({
          domain: eb.domain,
          constraints: [...eb.constraints],
          severity: eb.severity,
        }));
      } else if (strategy === 'merge') {
        // Merge domains: if domain exists, union constraints. Otherwise add domain.
        for (const backupEb of backupProfile.ethicalBoundaries) {
          const existing = activeProfile.ethicalBoundaries.find(
            (e) => e.domain === backupEb.domain
          );
          if (existing) {
            existing.constraints = Array.from(
              new Set([...existing.constraints, ...backupEb.constraints])
            );
            // Upgrade severity to highest level
            const severityRank = { low: 0, medium: 1, high: 2, critical: 3 };
            if (severityRank[backupEb.severity] > severityRank[existing.severity]) {
              existing.severity = backupEb.severity;
            }
          } else {
            activeProfile.ethicalBoundaries.push({
              domain: backupEb.domain,
              constraints: [...backupEb.constraints],
              severity: backupEb.severity,
            });
          }
        }
      } else if (strategy === 'skip') {
        for (const backupEb of backupProfile.ethicalBoundaries) {
          const exists = activeProfile.ethicalBoundaries.some(
            (e) => e.domain === backupEb.domain
          );
          if (!exists) {
            activeProfile.ethicalBoundaries.push({
              domain: backupEb.domain,
              constraints: [...backupEb.constraints],
              severity: backupEb.severity,
            });
          }
        }
      }
    }

    // 6. Restore Cognitive Graph
    if (selection.knowledgeGraph && payload.cognitiveGraph) {
      const graph = persona.getCognitiveGraph();
      const backupNodes = payload.cognitiveGraph.nodes;
      const backupEdges = payload.cognitiveGraph.edges;

      if (strategy === 'replace') {
        graph.importGraph({ nodes: backupNodes, edges: backupEdges });
      } else {
        // Merge or Skip
        const currentGraph = graph.exportGraph();
        const nodeMap = new Map<string, GraphNode>();
        const edgeMap = new Map<string, GraphEdge>();

        // Seed with current
        for (const node of currentGraph.nodes) {
          nodeMap.set(node.id, { ...node });
        }
        for (const edge of currentGraph.edges) {
          edgeMap.set(edge.id, { ...edge });
        }

        // Apply backup nodes
        for (const bNode of backupNodes) {
          const local = nodeMap.get(bNode.id);
          if (local) {
            if (strategy === 'merge') {
              // Merge stats: pick higher confidence, sum counts, combine related concepts
              local.confidence = Math.max(local.confidence, bNode.confidence);
              local.accessCount = local.accessCount + bNode.accessCount;
              local.lastAccessed = Math.max(local.lastAccessed, bNode.lastAccessed);
              local.relatedConcepts = Array.from(
                new Set([...local.relatedConcepts, ...bNode.relatedConcepts])
              );
              
              // Merge interactions metadata
              if (selection.learningHistory && bNode.metadata.interactions) {
                const localInteractions = local.metadata.interactions || [];
                const mergedInteractions = [...localInteractions, ...bNode.metadata.interactions];
                // Remove duplicates by timestamp
                const seenTimestamps = new Set<number>();
                local.metadata.interactions = mergedInteractions.filter((i) => {
                  if (seenTimestamps.has(i.timestamp)) return false;
                  seenTimestamps.add(i.timestamp);
                  return true;
                });
              }
            }
            // If strategy is 'skip', we leave local node untouched
          } else {
            // Node does not exist, add it
            nodeMap.set(bNode.id, { ...bNode });
          }
        }

        // Apply backup edges
        for (const bEdge of backupEdges) {
          const local = edgeMap.get(bEdge.id);
          if (local) {
            if (strategy === 'merge') {
              local.weight = Math.max(local.weight, bEdge.weight);
              local.strength = Math.max(local.strength, bEdge.strength);
            }
          } else {
            edgeMap.set(bEdge.id, { ...bEdge });
          }
        }

        graph.importGraph({
          nodes: Array.from(nodeMap.values()),
          edges: Array.from(edgeMap.values()),
        });
      }
    }

    // 7. Restore local interaction memory
    if (selection.interactionMemory && payload.localStore) {
      const localStore = persona.getLocalStore();
      if (strategy === 'replace') {
        localStore.clear();
        for (const [key, value] of payload.localStore) {
          localStore.set(key, value);
        }
      } else if (strategy === 'merge') {
        for (const [key, value] of payload.localStore) {
          localStore.set(key, value); // overwriting newer/colliding logs
        }
      } else if (strategy === 'skip') {
        for (const [key, value] of payload.localStore) {
          if (!localStore.has(key)) {
            localStore.set(key, value);
          }
        }
      }
    }
  }
}
