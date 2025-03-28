import { StoredPlugin, PluginManager } from "../types/plugin";

const STORAGE_KEY = "browser-plugins";

class LocalPluginManager implements PluginManager {
  private getStoredPlugins(): StoredPlugin[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to parse stored plugins:", error);
      return [];
    }
  }

  private savePlugins(plugins: StoredPlugin[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
    } catch (error) {
      console.error("Failed to save plugins:", error);
    }
  }

  getPlugins(): StoredPlugin[] {
    return this.getStoredPlugins();
  }

  addPlugin(plugin: Omit<StoredPlugin, "id">): StoredPlugin {
    const plugins = this.getStoredPlugins();
    const newPlugin: StoredPlugin = {
      ...plugin,
      id: Date.now().toString(),
    };

    this.savePlugins([...plugins, newPlugin]);
    return newPlugin;
  }

  updatePlugin(plugin: StoredPlugin): void {
    const plugins = this.getStoredPlugins();
    const updatedPlugins = plugins.map((p) =>
      p.id === plugin.id ? plugin : p
    );
    this.savePlugins(updatedPlugins);
  }

  deletePlugin(id: string): void {
    const plugins = this.getStoredPlugins();
    const filteredPlugins = plugins.filter((p) => p.id !== id);
    this.savePlugins(filteredPlugins);
  }

  getEnabledPlugins(): StoredPlugin[] {
    return this.getStoredPlugins().filter((p) => p.enabled);
  }
}

export const pluginManager = new LocalPluginManager();
