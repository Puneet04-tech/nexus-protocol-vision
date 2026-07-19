import { CollaborationWorkflow, NodeState } from '../types';

export class TemplateRegistry {
  public static getSeededTemplates(): CollaborationWorkflow[] {
    return [
      {
        id: 'template-rag-sentiment-carbon',
        name: 'Sustainable Semantic RAG Query',
        description: 'Queries decentralized RAG indexes, evaluates NLP sentiment tone of retrieved content, and schedules gradient computation via carbon-aware routing.',
        version: 1,
        isDraft: false,
        isTemplate: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['RAG', 'Sentiment', 'Sustainability', 'Carbon Aware'],
        globalContext: {
          query: 'Decentralized identity protocols security analysis',
          computeLoadKwh: 2.5
        },
        nodes: [
          {
            id: 'node-start',
            name: 'Start Trigger',
            type: 'start',
            position: { x: 50, y: 150 },
            config: { inputMappings: {} },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-rag-searcher',
            name: 'RAG Semantic Searcher',
            type: 'agent',
            position: { x: 200, y: 150 },
            config: {
              agentId: 'marketplace.rag.searcher',
              taskName: 'semantic_search',
              inputMappings: {
                query: '$.global.query',
                limit: '3'
              },
              retryConfig: {
                policy: 'CONSTANT' as any,
                maxRetries: 2,
                baseDelayMs: 200,
                maxDelayMs: 1000,
                jitter: false
              }
            },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-sentiment-oracle',
            name: 'Sentiment Analysis Oracle',
            type: 'agent',
            position: { x: 400, y: 50 },
            config: {
              agentId: 'marketplace.sentiment.oracle',
              taskName: 'analyze_sentiment',
              inputMappings: {
                text: '$.node-rag-searcher.results'
              }
            },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-carbon-optimizer',
            name: 'Carbon-Aware Optimizer',
            type: 'agent',
            position: { x: 400, y: 250 },
            config: {
              agentId: 'marketplace.carbon.optimizer',
              taskName: 'optimize_routing',
              inputMappings: {
                computeLoadKwh: '$.global.computeLoadKwh'
              }
            },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-end',
            name: 'Workflow End',
            type: 'end',
            position: { x: 650, y: 150 },
            config: { inputMappings: {} },
            state: NodeState.PENDING,
            retriesAttempted: 0
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-start', target: 'node-rag-searcher' },
          { id: 'edge-2', source: 'node-rag-searcher', target: 'node-sentiment-oracle' },
          { id: 'edge-3', source: 'node-rag-searcher', target: 'node-carbon-optimizer' },
          { id: 'edge-4', source: 'node-sentiment-oracle', target: 'node-end' },
          { id: 'edge-5', source: 'node-carbon-optimizer', target: 'node-end' }
        ]
      },
      {
        id: 'template-private-federated-learning',
        name: 'Privacy-Preserving Federated Averaging',
        description: 'Performs digital twin identity verification, registers a containment shield signature check, and aggregates model gradients securely.',
        version: 1,
        isDraft: false,
        isTemplate: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['Federated Learning', 'Containment', 'Security', 'ZKP'],
        globalContext: {
          userPubKey: '0x8f2a938b812efd12301980bc235f',
          gradientBuffer: '[0.015, -0.045, 0.128, 0.992]'
        },
        nodes: [
          {
            id: 'node-start',
            name: 'Start Trigger',
            type: 'start',
            position: { x: 50, y: 150 },
            config: { inputMappings: {} },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-crypto-guard',
            name: 'Containment Shield',
            type: 'agent',
            position: { x: 220, y: 150 },
            config: {
              agentId: 'marketplace.crypto.guard',
              taskName: 'validate_key',
              inputMappings: {
                pubkey: '$.global.userPubKey'
              }
            },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-model-broker',
            name: 'Federated Model Broker',
            type: 'agent',
            position: { x: 420, y: 150 },
            config: {
              agentId: 'marketplace.model.broker',
              taskName: 'aggregate_gradients',
              inputMappings: {
                gradients: '$.global.gradientBuffer'
              }
            },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-end',
            name: 'End Trigger',
            type: 'end',
            position: { x: 620, y: 150 },
            config: { inputMappings: {} },
            state: NodeState.PENDING,
            retriesAttempted: 0
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-start', target: 'node-crypto-guard' },
          { id: 'edge-2', source: 'node-crypto-guard', target: 'node-model-broker' },
          { id: 'edge-3', source: 'node-model-broker', target: 'node-end' }
        ]
      },
      {
        id: 'template-secure-policy-compliance',
        name: 'Secure Policy Compliance Gate',
        description: 'Runs isolated cryptographic scans followed by a mandatory human approval sign-off gate before execution ends.',
        version: 1,
        isDraft: false,
        isTemplate: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: ['Security', 'Approval', 'Compliance', 'Ethics'],
        globalContext: {
          targetKey: '0xSecureKey'
        },
        nodes: [
          {
            id: 'node-start',
            name: 'Start',
            type: 'start',
            position: { x: 50, y: 150 },
            config: { inputMappings: {} },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-guard-scan',
            name: 'Crypto Key Audit',
            type: 'agent',
            position: { x: 200, y: 150 },
            config: {
              agentId: 'marketplace.crypto.guard',
              taskName: 'validate_key',
              inputMappings: {
                pubkey: '$.global.targetKey'
              }
            },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-approval-gate',
            name: 'Human Compliance Audit',
            type: 'approval',
            position: { x: 380, y: 150 },
            config: {
              approvalRequired: true,
              inputMappings: {
                auditResult: '$.node-guard-scan.isValid'
              }
            },
            state: NodeState.PENDING,
            retriesAttempted: 0
          },
          {
            id: 'node-end',
            name: 'End',
            type: 'end',
            position: { x: 560, y: 150 },
            config: { inputMappings: {} },
            state: NodeState.PENDING,
            retriesAttempted: 0
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-start', target: 'node-guard-scan' },
          { id: 'edge-2', source: 'node-guard-scan', target: 'node-approval-gate' },
          { id: 'edge-3', source: 'node-approval-gate', target: 'node-end' }
        ]
      }
    ];
  }
}
