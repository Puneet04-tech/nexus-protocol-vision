import { PluginManifest } from '../PluginTypes';

export const MetricsCollectorManifest: PluginManifest = {
  id: 'org.nexus.metrics_collector',
  name: 'Metrics Collector',
  version: '1.0.0',
  author: 'Nexus Core Team',
  description: 'Tracks event frequencies and registers performance logs in sandboxed storage.',
  permissions: ['events.subscribe', 'storage.read', 'storage.write'],
  supportedProtocolVersion: '1.0.0',
  entry: `
    context.onEnable = function() {
      context.logger.info("Metrics Collector enabled.");
      
      context.events.subscribe("*", function(event) {
        context.logger.info("Metrics intercepting event: " + event.type);
        
        context.storage.load("event_count").then(function(count) {
          var currentCount = count || 0;
          var nextCount = currentCount + 1;
          
          return context.storage.save("event_count", nextCount).then(function() {
            return nextCount;
          });
        }).then(function(nextCount) {
          context.metrics.recordCustomMetric("total_events_processed", nextCount);
          context.logger.info("Incremented events count to: " + nextCount);
        }).catch(function(err) {
          context.logger.error("Error in storage update: " + err.message);
        });
      });
    };
    
    context.onDisable = function() {
      context.logger.info("Metrics Collector disabled.");
    };
  `
};
