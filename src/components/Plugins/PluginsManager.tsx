import React, { useState, useEffect } from 'react';
import { pluginManager } from '../../services/pluginManager';
import { StoredPlugin } from '../../types/plugin';
import { FiPlus, FiEdit, FiTrash, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import PluginEditor from '../PluginEditor';
import { applyPluginsToWebview } from '../../plugins';

const PluginsManager: React.FC = () => {
  const [plugins, setPlugins] = useState<StoredPlugin[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<StoredPlugin | undefined>(undefined);

  // Load plugins on component mount
  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = () => {
    const storedPlugins = pluginManager.getPlugins();
    setPlugins(storedPlugins);
  };

  const handleCreateNew = () => {
    setEditingPlugin(undefined);
    setShowEditor(true);
  };

  const handleEdit = (plugin: StoredPlugin) => {
    setEditingPlugin(plugin);
    setShowEditor(true);
  };

  const handleTogglePlugin = async (plugin: StoredPlugin) => {
    const updatedPlugin = {
      ...plugin,
      enabled: !plugin.enabled
    };
    pluginManager.updatePlugin(updatedPlugin);
    
    // Update local state
    setPlugins(plugins.map(p => p.id === plugin.id ? updatedPlugin : p));
    
    // If the plugin was toggled on, apply it to all active webviews
    if (updatedPlugin.enabled) {
      // Use window.electron to send a message to apply plugins to all active tabs
      try {
        const event = new CustomEvent('apply-plugins-to-active-tabs');
        window.dispatchEvent(event);
        console.log('Requested plugin application to all active tabs');
      } catch (error) {
        console.error('Error requesting plugin application:', error);
      }
    }
  };

  const handleDeletePlugin = (plugin: StoredPlugin) => {
    if (confirm(`Are you sure you want to delete the plugin "${plugin.name}"?`)) {
      pluginManager.deletePlugin(plugin.id);
      loadPlugins();
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    loadPlugins(); // Refresh list after editing
  };

  const getPluginTypeIcon = (type: string) => {
    switch (type) {
      case 'js':
        return <span className="text-yellow-400 font-mono text-xs">JS</span>;
      case 'css':
        return <span className="text-blue-400 font-mono text-xs">CSS</span>;
      case 'html':
        return <span className="text-green-400 font-mono text-xs">HTML</span>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleCreateNew}
          className="btn-primary"
        >
          <FiPlus className="mr-2" />
          Create New Plugin
        </button>
      </div>

      {plugins.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="mb-4">No plugins have been created yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-auto">
          {plugins.map(plugin => (
            <div
              key={plugin.id}
              className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700 flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-white">{plugin.name}</h3>
                  <div className="flex items-center text-gray-400">
                    {getPluginTypeIcon(plugin.type)}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleTogglePlugin(plugin)}
                    className={`${plugin.enabled ? 'text-green-400' : 'text-gray-500'} hover:text-green-300`}
                    title={plugin.enabled ? 'Disable Plugin' : 'Enable Plugin'}
                  >
                    {plugin.enabled ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(plugin)}
                    className="text-blue-400 hover:text-blue-300"
                    title="Edit Plugin"
                  >
                    <FiEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeletePlugin(plugin)}
                    className="text-red-400 hover:text-red-300"
                    title="Delete Plugin"
                  >
                    <FiTrash size={16} />
                  </button>
                </div>
              </div>
              
              <div className="mt-2 flex-1">
                <div className="text-gray-400 text-sm">
                  <div className="flex items-center mt-1">
                    <span className="inline-block w-3 h-3 rounded-full mr-2 bg-gray-500"></span>
                    <span>Type: <span className="text-gray-300">{plugin.type.toUpperCase()}</span></span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="inline-block w-3 h-3 rounded-full mr-2 bg-gray-500"></span>
                    <span>Status: <span className={plugin.enabled ? "text-green-400" : "text-gray-500"}>{plugin.enabled ? "Enabled" : "Disabled"}</span></span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="inline-block w-3 h-3 rounded-full mr-2 bg-gray-500"></span>
                    <span>Code size: <span className="text-gray-300">{plugin.code.length} characters</span></span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-400">
                <button
                  onClick={() => handleEdit(plugin)}
                  className="w-full px-3 py-1.5 bg-gray-700 text-blue-300 rounded hover:bg-gray-600 mt-2"
                >
                  View & Edit Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <PluginEditor
          onClose={handleEditorClose}
          initialPlugin={editingPlugin}
        />
      )}
    </div>
  );
};

export default PluginsManager; 