import { AgentTrustProfile, ReputationHistoryEntry } from './TrustTypes';
import { ReputationHistory } from './ReputationHistory';

/**
 * Manages storage and retrieve access to agent trust profiles and history.
 */
export class ReputationManager {
  private profiles: Map<string, AgentTrustProfile> = new Map();
  private history: ReputationHistory = new ReputationHistory();
  
  private readonly storageKeyProfiles = 'nexus_trust_agent_profiles';
  private readonly storageKeyHistory = 'nexus_trust_reputation_history';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Safely loads profiles and history from localStorage, checking if execution occurs in a browser window.
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const profilesJson = localStorage.getItem(this.storageKeyProfiles);
      if (profilesJson) {
        const parsed = JSON.parse(profilesJson);
        if (Array.isArray(parsed)) {
          parsed.forEach((profile: AgentTrustProfile) => {
            this.profiles.set(profile.agentId, profile);
          });
        }
      }

      const historyJson = localStorage.getItem(this.storageKeyHistory);
      if (historyJson) {
        const parsed = JSON.parse(historyJson);
        if (Array.isArray(parsed)) {
          this.history = new ReputationHistory(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse trust data from localStorage:', e);
    }
  }

  /**
   * Persists the current state of profiles and history logs.
   */
  public saveToStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const profilesArray = Array.from(this.profiles.values());
      localStorage.setItem(this.storageKeyProfiles, JSON.stringify(profilesArray));
      localStorage.setItem(this.storageKeyHistory, JSON.stringify(this.history.getEntries()));
    } catch (e) {
      console.error('Failed to write trust data to localStorage:', e);
    }
  }

  /**
   * Returns list of all stored profiles.
   */
  public getProfiles(): AgentTrustProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Fetches profile by Agent ID.
   */
  public getProfile(agentId: string): AgentTrustProfile | undefined {
    return this.profiles.get(agentId);
  }

  /**
   * Sets or updates profile, persisting the new state.
   */
  public setProfile(profile: AgentTrustProfile): void {
    this.profiles.set(profile.agentId, profile);
    this.saveToStorage();
  }

  /**
   * Deletes a profile, persisting the new state.
   */
  public deleteProfile(agentId: string): void {
    this.profiles.delete(agentId);
    this.saveToStorage();
  }

  /**
   * Returns the tracking log of history entries.
   */
  public getHistory(): ReputationHistory {
    return this.history;
  }

  /**
   * Wipes all profiles and history from memory and storage.
   */
  public clearAllData(): void {
    this.profiles.clear();
    this.history = new ReputationHistory();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKeyProfiles);
      localStorage.removeItem(this.storageKeyHistory);
    }
  }
}
