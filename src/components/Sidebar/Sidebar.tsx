import React, { useEffect, useState } from 'react';
import { 
  FiHome, FiMessageSquare, FiEdit, FiCheckSquare, FiImage, 
  FiGlobe, FiDollarSign, FiClock, FiSettings, FiPlus, 
  FiPackage, FiTrash2, FiChrome 
} from 'react-icons/fi';
import { Workspace, Tab } from '../../types';

// Hardcoded version as a last resort
const appVersion = '1.0.3'; // Update this manually when you change package.json

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeTabId: string;
  isAddingWorkspace: boolean;
  newWorkspaceName: string;
  editingWorkspaceId: string | null;
  editingTabId: string | null;
  editName: string;
  showDashboard: boolean;
  showSettings: boolean;
  showAIChat: boolean;
  showWriter: boolean;
  showTasks: boolean;
  showImages: boolean;
  showSubscriptions: boolean;
  showWebsites: boolean;
  showAutomations: boolean;
  setShowDashboard: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowAIChat: (show: boolean) => void;
  setShowWriter: (show: boolean) => void;
  setShowTasks: (show: boolean) => void;
  setShowImages: (show: boolean) => void;
  setShowSubscriptions: (show: boolean) => void;
  setShowWebsites: (show: boolean) => void;
  setShowAutomations: (show: boolean) => void;
  setIsAddingWorkspace: (isAdding: boolean) => void;
  setNewWorkspaceName: (name: string) => void;
  addWorkspace: () => void;
  addTab?: () => void;
  setActiveWorkspaceId: (id: string) => void;
  setActiveTabId: (id: string) => void;
  startEditingWorkspace: (id: string) => void;
  saveWorkspaceEdit: () => void;
  startEditingTab: (workspaceId: string, tabId: string) => void;
  saveTabEdit: (workspaceId: string) => void;
  cancelEdit: () => void;
  deleteWorkspace: (id: string) => void;
  closeTab: (workspaceId: string, tabId: string) => void;
  setEditName: (name: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  activeTabId,
  isAddingWorkspace,
  newWorkspaceName,
  editingWorkspaceId,
  editingTabId,
  editName,
  showDashboard,
  showSettings,
  showAIChat,
  showWriter,
  showTasks,
  showImages,
  showSubscriptions,
  showWebsites,
  showAutomations,
  setShowDashboard,
  setShowSettings,
  setShowAIChat,
  setShowWriter,
  setShowTasks,
  setShowImages,
  setShowSubscriptions,
  setShowWebsites,
  setShowAutomations,
  setIsAddingWorkspace,
  setNewWorkspaceName,
  addWorkspace,
  addTab,
  setActiveWorkspaceId,
  setActiveTabId,
  startEditingWorkspace,
  saveWorkspaceEdit,
  startEditingTab,
  saveTabEdit,
  cancelEdit,
  deleteWorkspace,
  closeTab,
  setEditName
}) => {
  const [version, setVersion] = useState('1.0.0');
  
  useEffect(() => {
    // Try to get version from electron on component mount
    const electronVersion = (window as any).electron?.appInfo?.version;
    if (electronVersion) {
      setVersion(electronVersion);
      console.log('Updated version from electron:', electronVersion);
    } else {
      // If running in dev mode, try to fetch package.json directly
      fetch('/package.json')
        .then(response => response.json())
        .then(data => {
          console.log('Fetched package.json:', data);
          if (data.version) {
            setVersion(data.version);
            console.log('Updated version from package.json:', data.version);
          }
        })
        .catch(err => console.error('Failed to fetch package.json:', err));
    }
  }, []);

  return (
    <aside 
      className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col pt-8"
      style={{ '-webkit-app-region': 'drag' } as React.CSSProperties}
    >
      <div className="flex flex-col px-3">
        <button 
          onClick={() => {
            setShowDashboard(true)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
          }}
          className={`w-full border border-gray-700 p-3 my-3 rounded-lg text-white font-medium shadow-lg transition-all duration-200 hover:shadow-xl 
            ${showDashboard 
              ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
              : 'hover:bg-gradient-to-r hover:from-blue-500/70 hover:to-purple-600/70'
            } flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiHome className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span>Catalyst</span>
            <span className="text-xs opacity-70">v{version}</span>
          </div>
        </button>
      </div>

      <div 
        className="text-sm font-medium text-gray-400 px-4 py-2 flex justify-between items-center bg-gray-800 border-t border-gray-700"
        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
      >
        <span>Workspaces</span>
        <button 
          onClick={() => setIsAddingWorkspace(true)}
          className="p-1 hover:bg-gray-700 rounded"
          title="Add New Workspace"
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiPlus className="w-4 h-4" />
        </button>
      </div>
      
      {isAddingWorkspace && (
        <div className="px-4 py-2 mb-2 ">
          <div className="bg-gray-700 p-2 rounded">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="w-full bg-gray-600 text-white border border-gray-500 rounded px-2 py-1 mb-2"
              autoFocus
            />
            <div className="flex space-x-1">
              <button 
                onClick={addWorkspace}
                disabled={!newWorkspaceName.trim()}
                className={`flex-1 px-2 py-1 rounded text-white ${newWorkspaceName.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'}`}
              >
                Add
              </button>
              <button 
                onClick={() => {
                  setIsAddingWorkspace(false);
                  setNewWorkspaceName('');
                }}
                className="flex-1 px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div 
        className="flex-1 overflow-y-auto bg-gray-800 "
        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
      >
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`mb-2 ${activeWorkspaceId === workspace.id ? 'bg-gray-800' : ''}`}
            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
          >
            <div 
              className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-700 group"
              onClick={() => {
                setActiveWorkspaceId(workspace.id);
                if (workspace.tabs.length > 0) {
                  setActiveTabId(workspace.tabs[0].id);
                }
                setShowDashboard(false);
                setShowSettings(false);
                setShowAIChat(false);
                setShowWriter(false);
                setShowTasks(false);
                setShowImages(false);
                setShowSubscriptions(false);
                setShowWebsites(false);
                setShowAutomations(false);
              }}
              style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
            >
              {editingWorkspaceId === workspace.id ? (
                <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()} style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 bg-gray-600 text-white border border-gray-500 rounded"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveWorkspaceEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                  />
                  <div className="flex ml-2">
                    <button 
                      onClick={saveWorkspaceEdit}
                      className="p-1 text-green-400 hover:text-green-300 rounded"
                      title="Save"
                      style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button 
                      onClick={cancelEdit}
                      className="p-1 text-red-400 hover:text-red-300 rounded"
                      title="Cancel"
                      style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center">
                    <FiPackage className="w-4 h-4 mr-2" />
                    <span className="font-medium">{workspace.name}</span>
                  </div>
                  
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingWorkspace(workspace.id);
                      }}
                      className="text-gray-400 hover:text-blue-400"
                      title="Edit Workspace Name"
                      style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    {workspaces.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this workspace?')) {
                            deleteWorkspace(workspace.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-400"
                        title="Delete Workspace"
                        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Show tabs for active workspace */}
            {activeWorkspaceId === workspace.id && !showDashboard && 
             !showSettings && !showAIChat && !showWriter && !showTasks && 
             !showImages && !showSubscriptions && !showWebsites && !showAutomations && (
              <div className="ml-4 border-l border-gray-700 pl-2">
                {workspace.tabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`px-2 py-1 cursor-pointer flex items-center justify-between group ${
                      activeTabId === tab.id ? 'bg-gray-600' : 'hover:bg-gray-600'
                    }`}
                    style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                  >
                    {editingTabId === tab.id ? (
                      <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()} style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-gray-700 text-white text-sm border border-gray-500 rounded"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTabEdit(workspace.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                        />
                        <div className="flex ml-2">
                          <button 
                            onClick={() => saveTabEdit(workspace.id)}
                            className="p-1 text-green-400 hover:text-green-300 rounded"
                            title="Save"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button 
                            onClick={cancelEdit}
                            className="p-1 text-red-400 hover:text-red-300 rounded"
                            title="Cancel"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div 
                          className="flex items-center space-x-2 overflow-hidden flex-1"
                          onClick={() => {
                            setActiveTabId(tab.id);
                          }}
                        >
                          {tab.favicon ? (
                            <img src={tab.favicon} className="w-4 h-4 flex-shrink-0" alt="favicon" />
                          ) : (
                            <FiChrome className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="truncate">{tab.title}</span>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                          <button
                            className="text-gray-400 hover:text-blue-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingTab(workspace.id, tab.id);
                            }}
                            title="Edit Tab Name"
                            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(workspace.id, tab.id);
                            }}
                            title="Close Tab"
                            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {/* Add New Tab button */}
                <button
                  onClick={() => addTab && addTab()}
                  className="w-full mt-1 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-600 rounded flex items-center"
                  style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                  disabled={!addTab}
                >
                  <FiPlus className="mr-1 w-3 h-3" />
                  <span>New Tab</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div 
        className="px-2 pb-2 space-y-2 border-t border-gray-700 pt-2"
        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
      >
        <button 
          onClick={() => {
            setShowAIChat(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
          }}
          className={`w-full p-2 rounded-lg ${showAIChat ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiMessageSquare className="w-5 h-5" />
          <span>Chat</span>
        </button>
        
        <button 
          onClick={() => {
            setShowWriter(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowTasks(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
          }}
          className={`w-full p-2 rounded-lg ${showWriter ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiEdit className="w-5 h-5" />
          <span>Write</span>
        </button>
        
        <button 
          onClick={() => {
            setShowTasks(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
          }}
          className={`w-full p-2 rounded-lg ${showTasks ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiCheckSquare className="w-5 h-5" />
          <span>Plan</span>
        </button>
        
        
        <button 
          onClick={() => {
            setShowWebsites(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowAutomations(false)
          }}
          className={`w-full p-2 rounded-lg ${showWebsites ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiGlobe className="w-5 h-5" />
          <span>Websites</span>
        </button>
        
        <button 
          onClick={() => {
            setShowSubscriptions(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowImages(false)
            setShowWebsites(false)
            setShowAutomations(false)
          }}
          className={`w-full p-2 rounded-lg ${showSubscriptions ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiDollarSign className="w-5 h-5" />
          <span>Subscriptions</span>
        </button>
        
        <button 
          onClick={() => {
            setShowAutomations(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowImages(false)
            setShowWebsites(false)
            setShowSubscriptions(false)
          }}
          className={`w-full p-2 rounded-lg ${showAutomations ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiClock className="w-5 h-5" />
          <span>Automations</span>
        </button>
        
        <button 
          onClick={() => {
            setShowSettings(true)
            setShowDashboard(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
          }}
          className={`w-full p-2 rounded-lg ${showSettings ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-start pl-4 space-x-3`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiSettings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;