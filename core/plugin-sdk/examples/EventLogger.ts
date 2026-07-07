import { PluginManifest } from '../PluginTypes';

export const EventLoggerManifest: PluginManifest = {
  id: 'org.nexus.event_logger',
  name: 'Event Logger',
  version: '1.0.0',
  author: 'Nexus Core Team',
  description: 'Audits and tracks all system signals flowing through the event bus.',
  permissions: ['events.subscribe'],
  supportedProtocolVersion: '1.0.0',
  entry: `
    context.onEnable = function() {
      context.logger.info("Event Audit Logger enabled.");
      
      context.events.subscribe("*", function(event) {
        context.logger.info("[AUDIT] Event '" + event.type + "' emitted by '" + event.emitterId + "' at " + new Date(event.timestamp).toISOString());
      });
    };
    
    context.onDisable = function() {
      context.logger.info("Event Audit Logger disabled.");
    };
  `
};
