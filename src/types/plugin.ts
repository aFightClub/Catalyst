export interface StoredPlugin {
  id: string;
  name: string;
  code: string;
  type: 'css' | 'js' | 'html';
  enabled: boolean;
}

export interface PluginManager {
  getPlugins: () => StoredPlugin[];
  addPlugin: (plugin: Omit<StoredPlugin, 'id'>) => StoredPlugin;
  updatePlugin: (plugin: StoredPlugin) => void;
  deletePlugin: (id: string) => void;
  getEnabledPlugins: () => StoredPlugin[];
}
