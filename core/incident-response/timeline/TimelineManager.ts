import { Incident, TimelineEvent } from '../types';
import { IncidentRepository } from '../repository/IncidentRepository';

export class TimelineManager {
  private static instance: TimelineManager | null = null;
  private repo = IncidentRepository.getInstance();

  private constructor() {}

  public static getInstance(): TimelineManager {
    if (!this.instance) {
      this.instance = new TimelineManager();
    }
    return this.instance;
  }

  public appendEvent(
    incident: Incident,
    message: string,
    type: TimelineEvent['type'],
    operator = 'SYSTEM'
  ): void {
    const event: TimelineEvent = {
      id: `time_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      message,
      type,
      operator
    };

    incident.timeline.push(event);
    incident.logs.push(`[${type.toUpperCase()}] [${operator}] ${message}`);
    this.repo.saveIncident(incident);
  }
}
