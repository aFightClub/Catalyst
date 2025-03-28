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
            // Create a script element with the plugin ID
            const script = document.createElement('script');
            script.id = 'plugin-js-${pluginId}';
            script.textContent = ${JSON.stringify(code)};
            document.head.appendChild(script);
          })();
        `);
        break;
      case "css":
        await webview.executeJavaScript(`
          (function() {
            // Create a style element with the plugin ID
            const style = document.createElement('style');
            style.id = 'plugin-css-${pluginId}';
            style.textContent = ${JSON.stringify(code)};
            document.head.appendChild(style);
          })();
        `);
        break;
      case "html":
        await webview.executeJavaScript(`
          (function() {
            // Create a div with the plugin ID
            const div = document.createElement('div');
            div.id = 'plugin-html-${pluginId}';
            div.innerHTML = ${JSON.stringify(code)};
            document.body.appendChild(div);
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
  if (!webview.isLoading()) {
    const plugins = getActivePlugins();
    for (const plugin of plugins) {
      try {
        // First remove any existing instances
        await plugin.remove(webview);

        // Then inject if enabled
        const pluginData = pluginManager
          .getPlugins()
          .find((p) => p.id === plugin.id);
        if (pluginData?.enabled) {
          await plugin.inject(webview);
        }
      } catch (error) {
        console.error(`Failed to apply plugin ${plugin.name}:`, error);
      }
    }
  }
};
