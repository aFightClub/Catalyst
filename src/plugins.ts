import { StoredPlugin } from "./types/plugin";
import { pluginManager } from "./services/pluginManager";

export interface Plugin {
  id: string;
  name: string;
  inject: (webview: Electron.WebviewTag) => Promise<void>;
  remove: (webview: Electron.WebviewTag) => Promise<void>;
}

// Helper function to inject code into webview
const injectCode = async (
  webview: Electron.WebviewTag,
  code: string,
  type: "js" | "css" | "html",
  pluginId: string
) => {
  try {
    switch (type) {
      case "js":
        await webview.executeJavaScript(`
          (function() {
            try {
              // Check if plugin already exists and remove it
              const existingPlugin = document.getElementById('plugin-js-${pluginId}');
              if (existingPlugin) existingPlugin.remove();
              
              // Create a script element with the plugin ID
              const script = document.createElement('script');
              script.id = 'plugin-js-${pluginId}';
              script.textContent = ${JSON.stringify(code)};
              document.head.appendChild(script);
              
              console.log('Successfully injected JS plugin: ${pluginId}');
              return true;
            } catch (error) {
              console.error('Error injecting JS plugin:', error);
              return false;
            }
          })();
        `);
        break;
      case "css":
        await webview.executeJavaScript(`
          (function() {
            try {
              // Check if plugin already exists and remove it
              const existingPlugin = document.getElementById('plugin-css-${pluginId}');
              if (existingPlugin) existingPlugin.remove();
              
              // Create a style element with the plugin ID
              const style = document.createElement('style');
              style.id = 'plugin-css-${pluginId}';
              style.textContent = ${JSON.stringify(code)};
              document.head.appendChild(style);
              
              console.log('Successfully injected CSS plugin: ${pluginId}');
              return true;
            } catch (error) {
              console.error('Error injecting CSS plugin:', error);
              return false;
            }
          })();
        `);
        break;
      case "html":
        await webview.executeJavaScript(`
          (function() {
            try {
              // Check if plugin already exists and remove it
              const existingPlugin = document.getElementById('plugin-html-${pluginId}');
              if (existingPlugin) existingPlugin.remove();
              
              // Create a div with the plugin ID
              const div = document.createElement('div');
              div.id = 'plugin-html-${pluginId}';
              div.innerHTML = ${JSON.stringify(code)};
              
              // Make sure the div is positioned absolutely and won't interfere with page content
              div.style.position = 'fixed';
              div.style.zIndex = '9999';
              div.style.top = '10px';
              div.style.right = '10px';
              
              document.body.appendChild(div);
              
              console.log('Successfully injected HTML plugin: ${pluginId}');
              return true;
            } catch (error) {
              console.error('Error injecting HTML plugin:', error);
              return false;
            }
          })();
        `);
        break;
    }
  } catch (error) {
    console.error(`Failed to inject ${type} code:`, error);
    throw error;
  }
};

// Helper function to remove plugin code
const removeCode = async (
  webview: Electron.WebviewTag,
  type: "js" | "css" | "html",
  pluginId: string
) => {
  try {
    // Remove the element that was injected
    await webview.executeJavaScript(`
      (function() {
        const element = document.getElementById('plugin-${type}-${pluginId}');
        if (element) {
          element.remove();
          return true;
        }
        return false;
      })();
    `);
  } catch (error) {
    console.error(`Failed to remove ${type} code:`, error);
    throw error;
  }
};

// Convert stored plugins to runtime plugins
export const getActivePlugins = (): Plugin[] => {
  const allPlugins = pluginManager.getPlugins();

  return allPlugins.map((plugin) => ({
    id: plugin.id,
    name: plugin.name,
    inject: async (webview: Electron.WebviewTag) => {
      if (plugin.enabled) {
        try {
          await injectCode(webview, plugin.code, plugin.type, plugin.id);
        } catch (error) {
          console.error(`Failed to inject plugin ${plugin.name}:`, error);
          throw error;
        }
      }
    },
    remove: async (webview: Electron.WebviewTag) => {
      try {
        await removeCode(webview, plugin.type, plugin.id);
      } catch (error) {
        console.error(`Failed to remove plugin ${plugin.name}:`, error);
        throw error;
      }
    },
  }));
};

// Export a function to apply plugins to a webview
export const applyPluginsToWebview = async (webview: Electron.WebviewTag) => {
  if (!webview || webview.isLoading()) {
    console.log(
      "Webview is not ready or still loading, skipping plugin application"
    );
    return;
  }

  try {
    console.log("Applying plugins to webview");

    // Get all stored plugins from plugin manager
    const storedPlugins = pluginManager.getPlugins();

    // First remove all existing plugins to ensure clean state
    // This prevents duplicate injections and ensures disabled plugins are removed
    for (const plugin of storedPlugins) {
      try {
        await removeCode(webview, plugin.type, plugin.id);
      } catch (error) {
        console.error(`Failed to remove plugin ${plugin.name}:`, error);
      }
    }

    // Then inject only enabled plugins
    const enabledPlugins = storedPlugins.filter((p) => p.enabled);
    console.log(`Applying ${enabledPlugins.length} enabled plugins`);

    for (const plugin of enabledPlugins) {
      try {
        await injectCode(webview, plugin.code, plugin.type, plugin.id);
        console.log(`Successfully applied plugin: ${plugin.name}`);
      } catch (error) {
        console.error(`Failed to apply plugin ${plugin.name}:`, error);
      }
    }

    console.log("Finished applying all plugins");
    return true;
  } catch (error) {
    console.error("Error applying plugins:", error);
    return false;
  }
};
