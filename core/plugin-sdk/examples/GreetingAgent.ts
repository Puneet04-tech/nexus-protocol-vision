import { PluginManifest } from '../PluginTypes';

export const GreetingAgentManifest: PluginManifest = {
  id: 'org.nexus.greeter',
  name: 'Greeting Agent',
  version: '1.0.0',
  author: 'Nexus Core Team',
  description: 'Greets the user utilizing their Sovereign Persona details upon receiving messages.',
  permissions: ['persona.read', 'events.subscribe', 'events.publish'],
  supportedProtocolVersion: '1.0.0',
  entry: `
    context.onEnable = function() {
      context.logger.info("Greeting Agent initialized & enabled.");
      
      context.events.subscribe("user.message", function(event) {
        context.logger.info("Interpreting user message: " + JSON.stringify(event.payload));
        
        // Read persona profile
        context.persona.getProfile().then(function(profile) {
          var name = profile.userId || "User";
          var role = (profile.professionalContext && profile.professionalContext.role) || "Explorer";
          var welcomeMsg = "Hello " + name + " (" + role + ")! Welcome back to Nexus. How can I assist you with your AI infrastructure today?";
          
          context.logger.info("Emitting personalized welcome greeting.");
          context.events.publish("agent.greeting", { message: welcomeMsg });
        }).catch(function(err) {
          context.logger.error("Failed to read persona profile: " + err.message);
        });
      });
    };
    
    context.onDisable = function() {
      context.logger.info("Greeting Agent disabled.");
    };
  `
};
