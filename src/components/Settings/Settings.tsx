import React, { useState, useEffect } from 'react';
import CodeEditor from '../CodeEditor/index';
import { StoredPlugin } from '../../types/plugin';
import { pluginManager } from '../../services/pluginManager';
import { storeService } from '../../services/storeService';
import { FiKey, FiPackage, FiActivity, FiClock, FiPlay, FiEdit, FiTrash2, FiExternalLink } from 'react-icons/fi';

// Define Workflow and ActionType interfaces since we can't import from App
interface WorkflowAction {
  type: string;
  data: any;
  timestamp: number;
}

interface Workflow {
  id: string;
  name: string;
  actions: WorkflowAction[];
  variables: string[];
  startUrl?: string;
}

// Settings pages
enum SettingsPage {
  API_KEYS = 'api_keys',
  PLUGINS = 'plugins',
  WORKFLOWS = 'workflows',
  AUTOMATIONS = 'automations',
}

// Define ApiKeys interface with index signature
interface ApiKeys {
  [key: string]: string | undefined;
  openai?: string;
}

// Add type definition for window.electron
declare global {
  interface Window {
    electron?: {
      send: (channel: string, data: any) => void;
    };
  }
}

const Settings: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<SettingsPage>(SettingsPage.API_KEYS);
  const [plugins, setPlugins] = useState<StoredPlugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<StoredPlugin | null>(null);
  const [editorLanguage, setEditorLanguage] = useState<'javascript' | 'css' | 'jsx'>('javascript');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [workflowVariables, setWorkflowVariables] = useState<{[key: string]: string}>({});

  useEffect(() => {
    setPlugins(pluginManager.getPlugins());
    
    // Load API keys from store using async method
    const loadApiKeys = async () => {
      try {
        const keys = await storeService.getApiKeys();
        setApiKeys(keys as ApiKeys);
      } catch (error) {
        console.error("Failed to load API keys:", error);
      }
    };
    
    // Load workflows from store
    const loadWorkflows = async () => {
      try {
        const storedWorkflows = await storeService.getWorkflows();
        if (storedWorkflows && Array.isArray(storedWorkflows) && storedWorkflows.length > 0) {
          setWorkflows(storedWorkflows);
        }
      } catch (error) {
        console.error('Failed to load workflows:', error);
      }
    };
    
    loadApiKeys();
    loadWorkflows();
  }, []);

  // Function to run a workflow in a new tab
  const runWorkflowInNewTab = (workflow: Workflow) => {
    // Check if the window object has the runWorkflowFunction (set by App.tsx)
    if (typeof (window as any).runWorkflowInAppTab === 'function') {
      // Pass both the workflowId and the current variables
      (window as any).runWorkflowInAppTab(workflow.id, workflowVariables);
    } else {
      // Fallback to custom event dispatch with variables included
      const event = new CustomEvent('run-workflow', {
        detail: { 
          workflowId: workflow.id,
          variables: workflowVariables
        }
      });
      window.dispatchEvent(event);
    }
  };

  // Function to delete a workflow
  const deleteWorkflow = async (id: string) => {
    const updatedWorkflows = workflows.filter(workflow => workflow.id !== id);
    setWorkflows(updatedWorkflows);
    
    try {
      await storeService.saveWorkflows(updatedWorkflows);
    } catch (error) {
      console.error('Failed to save workflows after deletion:', error);
    }
    
    if (selectedWorkflow?.id === id) {
      setSelectedWorkflow(null);
    }
  };

  const saveApiKeys = (keys: ApiKeys) => {
    setApiKeys(keys);
    // Save API keys using async method
    const saveKeys = async () => {
      try {
        await storeService.saveApiKeys(keys as Record<string, string>);
      } catch (error) {
        console.error("Failed to save API keys:", error);
      }
    };
    
    saveKeys();
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
    <div className="flex-1 flex">
      <div className="w-64 border-r border-gray-700 p-4 bg-gray-800">
        <h3 className="text-lg font-bold mb-4 text-white">Saved Workflows</h3>
        <div className="space-y-2 max-h-[calc(100vh-160px)] overflow-y-auto">
          {workflows.length > 0 ? (
            workflows.map(workflow => (
              <div
                key={workflow.id}
                className={`p-2 rounded cursor-pointer ${
                  selectedWorkflow?.id === workflow.id ? 'bg-gray-600' : 'hover:bg-gray-700'
                }`}
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">{workflow.name}</span>
                </div>
                {workflow.startUrl && (
                  <div className="text-gray-400 text-xs mt-1 truncate">
                    {workflow.startUrl}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center py-4">
              No workflows found
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 p-4 bg-gray-900">
        {selectedWorkflow ? (
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <h3 className="text-white text-xl font-bold">{selectedWorkflow.name}</h3>
              
              {selectedWorkflow.startUrl && (
                <div className="text-gray-400 mt-1">
                  URL: <a href={selectedWorkflow.startUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{selectedWorkflow.startUrl}</a>
                </div>
              )}
              
              <div className="flex mt-4 space-x-2">
                <button
                  onClick={() => runWorkflowInNewTab(selectedWorkflow)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FiPlay className="mr-2" />
                  Run in New Tab
                </button>
                <button
                  onClick={() => deleteWorkflow(selectedWorkflow.id)}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <FiTrash2 className="mr-2" />
                  Delete
                </button>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded p-4 flex-1 overflow-y-auto">
              <h4 className="text-white font-medium mb-2">Workflow Steps</h4>
              <div className="space-y-2">
                {selectedWorkflow.actions.map((action: WorkflowAction, index: number) => (
                  <div key={index} className="bg-gray-700 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="text-blue-400 font-medium">
                        {action.type.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {action.type === 'click' && (
                      <div className="text-gray-300 text-sm">
                        Clicked: {action.data.text || action.data.selector}
                      </div>
                    )}
                    {action.type === 'type' && (
                      <div className="text-gray-300 text-sm flex items-center">
                        <span className="mr-2">Typed:</span>
                        <span className="bg-gray-600 px-2 py-1 rounded text-white flex-1">
                          {action.data.value}
                        </span>
                      </div>
                    )}
                    {action.type === 'navigate' && (
                      <div className="text-gray-300 text-sm">
                        Navigated to: <span className="text-blue-300">{action.data.url}</span>
                      </div>
                    )}
                    {action.type === 'keypress' && (
                      <div className="text-gray-300 text-sm">
                        Key pressed: <span className="bg-gray-600 px-2 py-0.5 rounded">{action.data.key}</span>
                      </div>
                    )}
                    {action.type === 'submit' && (
                      <div className="text-gray-300 text-sm">
                        Form submitted: {action.data.selector}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {selectedWorkflow.variables && selectedWorkflow.variables.length > 0 && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <h3 className="text-white font-medium mb-3">
                    Run Workflow: {selectedWorkflow.name}
                  </h3>
                  
                  <div className="space-y-3 mb-4">
                    {selectedWorkflow.variables.map((varName: string) => (
                      <div key={varName} className="flex items-center">
                        <span className="text-gray-400 mr-2">{varName}:</span>
                        <input
                          type="text"
                          className="bg-gray-700 px-2 py-1 rounded text-white flex-1"
                          defaultValue={
                            selectedWorkflow.actions
                              .find((a: WorkflowAction) => a.type === 'type' && a.data.variableName === varName)
                              ?.data.value || ''
                          }
                          onChange={(e) => {
                            setWorkflowVariables(prev => ({
                              ...prev,
                              [varName]: e.target.value
                            }));
                          }}
                        />
                      </div>
                    ))}
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          runWorkflowInNewTab(selectedWorkflow);
                          setSelectedWorkflow(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Run Workflow
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <FiActivity className="w-12 h-12 mb-4" />
            <h4 className="text-lg font-medium mb-2 text-white">Select a workflow</h4>
            <p className="text-gray-400 text-center mb-4 max-w-md">
              You can view details and run your saved workflows from here.
              To create new workflows, use the workflow button in the browser toolbar.
            </p>
          </div>
        )}
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
