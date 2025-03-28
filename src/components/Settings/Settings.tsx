import React, { useState, useEffect } from 'react';
import CodeEditor from '../CodeEditor/index';
import { StoredPlugin } from '../../types/plugin';
import { pluginManager } from '../../services/pluginManager';
import { FiKey, FiPackage, FiActivity, FiClock } from 'react-icons/fi';

// Settings pages
enum SettingsPage {
  API_KEYS = 'api_keys',
  PLUGINS = 'plugins',
  WORKFLOWS = 'workflows',
  AUTOMATIONS = 'automations',
}

interface ApiKeys {
  openai?: string;
}

const Settings: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<SettingsPage>(SettingsPage.API_KEYS);
  const [plugins, setPlugins] = useState<StoredPlugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<StoredPlugin | null>(null);
  const [editorLanguage, setEditorLanguage] = useState<'javascript' | 'css' | 'jsx'>('javascript');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});

  useEffect(() => {
    setPlugins(pluginManager.getPlugins());
    
    // Load API keys
    const storedKeys = localStorage.getItem('api_keys');
    if (storedKeys) {
      try {
        setApiKeys(JSON.parse(storedKeys));
      } catch (error) {
        console.error('Failed to parse API keys:', error);
      }
    }
  }, []);

  const saveApiKeys = (keys: ApiKeys) => {
    setApiKeys(keys);
    localStorage.setItem('api_keys', JSON.stringify(keys));
  };

  const createNewPlugin = () => {
    const newPlugin = pluginManager.addPlugin({
      name: 'New Plugin',
      code: '',
      type: 'js',
      enabled: false
    });
    setPlugins(pluginManager.getPlugins());
    setSelectedPlugin(newPlugin);
  };

  const updatePlugin = (updatedPlugin: StoredPlugin) => {
    pluginManager.updatePlugin(updatedPlugin);
    setPlugins(pluginManager.getPlugins());
    setSelectedPlugin(updatedPlugin);
  };

  const deletePlugin = (pluginId: string) => {
    pluginManager.deletePlugin(pluginId);
    setPlugins(pluginManager.getPlugins());
    setSelectedPlugin(null);
  };

  const handleTypeChange = (type: 'css' | 'js' | 'html') => {
    if (!selectedPlugin) return;
    
    const language = type === 'js' ? 'javascript' : type === 'html' ? 'jsx' : 'css';
    setEditorLanguage(language);
    
    updatePlugin({
      ...selectedPlugin,
      type
    });
  };

  const renderNavigation = () => (
    <div className="w-64 bg-gray-900 h-full border-r border-gray-700 p-4">
      <h2 className="text-xl font-bold mb-6 text-white">Settings</h2>
      <div className="space-y-2">
        <button 
          onClick={() => setCurrentPage(SettingsPage.API_KEYS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.API_KEYS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiKey className="mr-2" />
          <span>API Keys</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.PLUGINS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.PLUGINS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiPackage className="mr-2" />
          <span>Plugins</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.WORKFLOWS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.WORKFLOWS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiActivity className="mr-2" />
          <span>Workflows</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.AUTOMATIONS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.AUTOMATIONS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiClock className="mr-2" />
          <span>Scheduled Automations</span>
        </button>
      </div>
    </div>
  );

  const renderApiKeysPage = () => (
    <div className="flex-1 p-6 bg-gray-900">
      <h3 className="text-xl font-bold mb-6 text-white">API Keys Configuration</h3>
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">OpenAI API Key</label>
        <input 
          type="password"
          value={apiKeys.openai || ''}
          onChange={(e) => saveApiKeys({ ...apiKeys, openai: e.target.value })}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="sk-..."
        />
        <p className="text-gray-400 mt-2 text-sm">Your API key is stored locally and never sent to our servers.</p>
      </div>
      <div className="border-t border-gray-700 pt-6">
        <h4 className="text-white font-medium mb-2">API Usage</h4>
        <p className="text-gray-400">Configure your API keys to enable AI-powered features in the browser.</p>
      </div>
    </div>
  );

  const renderPluginsPage = () => (
    <div className="flex-1 flex">
      <div className="w-64 border-r border-gray-700 p-4 bg-gray-800">
        <h3 className="text-lg font-bold mb-4 text-white">Installed Plugins</h3>
        <button
          onClick={createNewPlugin}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Plugin
        </button>
        <div className="space-y-2">
          {plugins.map(plugin => (
            <div
              key={plugin.id}
              className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                selectedPlugin?.id === plugin.id ? 'bg-gray-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setSelectedPlugin(plugin)}
            >
              <span className="text-white">{plugin.name}</span>
              <input
                type="checkbox"
                checked={plugin.enabled}
                onChange={(e) => updatePlugin({ ...plugin, enabled: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex-1 p-4 bg-gray-900">
        {selectedPlugin ? (
          <div className="h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <input
                type="text"
                value={selectedPlugin.name}
                onChange={(e) => updatePlugin({ ...selectedPlugin, name: e.target.value })}
                className="bg-gray-800 text-white px-2 py-1 rounded"
              />
              <div className="space-x-2">
                <select
                  value={selectedPlugin.type}
                  onChange={(e) => handleTypeChange(e.target.value as 'css' | 'js' | 'html')}
                  className="bg-gray-800 text-white px-2 py-1 rounded"
                >
                  <option value="js">JavaScript</option>
                  <option value="css">CSS</option>
                  <option value="html">HTML</option>
                </select>
                <button
                  onClick={() => deletePlugin(selectedPlugin.id)}
                  className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex-1">
              <CodeEditor
                value={selectedPlugin.code}
                onChange={(code: string) => updatePlugin({ ...selectedPlugin, code })}
                language={editorLanguage}
                placeholder={`Enter ${selectedPlugin.type.toUpperCase()} code here...`}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a plugin or create a new one
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkflowsPage = () => (
    <div className="flex-1 p-6 bg-gray-900 text-white">
      <h3 className="text-xl font-bold mb-6">Workflows</h3>
      <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
        <FiActivity className="w-12 h-12 mb-4 text-gray-500" />
        <h4 className="text-lg font-medium mb-2">Create Custom Workflows</h4>
        <p className="text-gray-400 mb-4">
          Automate your browsing experience by creating custom workflows that chain together multiple actions.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create Workflow
        </button>
      </div>
    </div>
  );

  const renderAutomationsPage = () => (
    <div className="flex-1 p-6 bg-gray-900 text-white">
      <h3 className="text-xl font-bold mb-6">Scheduled Automations</h3>
      <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
        <FiClock className="w-12 h-12 mb-4 text-gray-500" />
        <h4 className="text-lg font-medium mb-2">Set Up Scheduled Tasks</h4>
        <p className="text-gray-400 mb-4">
          Schedule browser tasks to run automatically at specific times or intervals.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create Schedule
        </button>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case SettingsPage.API_KEYS:
        return renderApiKeysPage();
      case SettingsPage.PLUGINS:
        return renderPluginsPage();
      case SettingsPage.WORKFLOWS:
        return renderWorkflowsPage();
      case SettingsPage.AUTOMATIONS:
        return renderAutomationsPage();
      default:
        return renderApiKeysPage();
    }
  };

  return (
    <div className="flex h-full">
      {renderNavigation()}
      {renderCurrentPage()}
    </div>
  );
};

export default Settings;
