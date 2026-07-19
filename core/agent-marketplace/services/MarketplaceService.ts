import { CapabilityRegistry } from '../registry/CapabilityRegistry';
import { PermissionManager } from '../permissions/PermissionManager';
import { AgentInstaller } from '../installer/AgentInstaller';
import { DiscoveryCache } from '../cache/DiscoveryCache';
import { AgentDiscovery } from '../discovery/AgentDiscovery';
import { AgentRepository, mockAgentRepository } from '../repository/AgentRepository';
import { AgentUpdater } from '../updater/AgentUpdater';
import { MarketplaceAPI } from '../api/MarketplaceAPI';

export class MarketplaceService {
  private static instance: MarketplaceService;

  public registry: CapabilityRegistry;
  public permissions: PermissionManager;
  public installer: AgentInstaller;
  public cache: DiscoveryCache;
  public discovery: AgentDiscovery;
  public repository: AgentRepository;
  public updater: AgentUpdater;
  public api: MarketplaceAPI;

  private constructor() {
    this.registry = new CapabilityRegistry();
    this.permissions = new PermissionManager();
    this.installer = new AgentInstaller(this.registry, this.permissions);
    
    this.cache = new DiscoveryCache();
    this.repository = mockAgentRepository;
    this.discovery = new AgentDiscovery(this.repository, this.cache);
    
    this.updater = new AgentUpdater(this.registry, this.installer);
    this.api = new MarketplaceAPI(this.discovery);
  }

  public static getInstance(): MarketplaceService {
    if (!MarketplaceService.instance) {
      MarketplaceService.instance = new MarketplaceService();
    }
    return MarketplaceService.instance;
  }
}
