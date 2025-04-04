import React, { useEffect, useState } from 'react';
import { 
  FiHome, FiMessageSquare, FiEdit, FiCheckSquare, FiImage, 
  FiGlobe, FiDollarSign, FiClock, FiSettings, FiPlus, 
  FiPackage, FiTrash2, FiChrome, FiCalendar, FiChevronLeft, FiChevronRight,
  FiTarget, FiLayers, FiEdit2, FiCheck, FiX, FiEdit3, FiZap
} from 'react-icons/fi';
import { Workspace, Tab } from '../../types';
import { useAccountability } from '../../contexts/AccountabilityContext';

// Hardcoded version as a last resort
const defaultVersion = '0.0.3';

// Remove problematic type definition

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
  showPlan: boolean;
  showImages: boolean;
  showSubscriptions: boolean;
  showWebsites: boolean;
  showAutomations: boolean;
  showAccountability: boolean;
  setShowDashboard: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowAIChat: (show: boolean) => void;
  setShowWriter: (show: boolean) => void;
  setShowTasks: (show: boolean) => void;
  setShowPlan: (show: boolean) => void;
  setShowImages: (show: boolean) => void;
  setShowSubscriptions: (show: boolean) => void;
  setShowWebsites: (show: boolean) => void;
  setShowAutomations: (show: boolean) => void;
  setShowAccountability: (show: boolean) => void;
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

// Helper function to check if a goal needs check-in
const isGoalDueForCheckin = (goal: any) => {
  if (goal.isCompleted) return false;
  
  const now = new Date();
  const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : new Date(0);
  
  let timeThreshold = 0;
  
  switch (goal.frequency) {
    case 'minute':
      timeThreshold = 1 * 60 * 1000; // 1 minute
      break;
    case 'hourly':
      timeThreshold = 60 * 60 * 1000; // 1 hour
      break;
    case 'daily':
      timeThreshold = 24 * 60 * 60 * 1000; // 24 hours
      break;
    case 'weekly':
      timeThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
      break;
    case 'monthly':
      // For monthly, check if we're in a new month
      return (lastChecked.getMonth() !== now.getMonth()) || 
             (lastChecked.getFullYear() !== now.getFullYear());
  }
  
  return (now.getTime() - lastChecked.getTime()) >= timeThreshold;
};

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
  showPlan,
  showImages,
  showSubscriptions,
  showWebsites,
  showAutomations,
  showAccountability,
  setShowDashboard,
  setShowSettings,
  setShowAIChat,
  setShowWriter,
  setShowTasks,
  setShowPlan,
  setShowImages,
  setShowSubscriptions,
  setShowWebsites,
  setShowAutomations,
  setShowAccountability,
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
  const [isMinimized, setIsMinimized] = useState(false);
  const { goals } = useAccountability();
  
  // Calculate how many goals need check-ins
  const goalsNeedingCheckin = goals.filter(goal => !goal.isCompleted && isGoalDueForCheckin(goal)).length;

  return (
    <aside 
      className={`${isMinimized ? 'w-[77px]' : 'w-64'} bg-gray-900 border-r border-gray-700 flex flex-col pt-8 transition-all duration-300`}
      style={{ '-webkit-app-region': 'drag' } as React.CSSProperties}
    >
      <div className="flex flex-col px-3">
        {isMinimized ? (
          // Minimized dashboard button
          <button 
            onClick={() => {
              setShowDashboard(true)
              setShowSettings(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowPlan(false)
              setShowImages(false)
              setShowSubscriptions(false)
              setShowWebsites(false)
              setShowAutomations(false)
              setShowAccountability(false)
            }}
            className={`w-full border border-gray-700 p-1 my-3 rounded-lg text-white font-medium shadow-lg transition-all duration-200 hover:shadow-xl flex items-center justify-center
              ${showDashboard 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                : 'hover:bg-gradient-to-r hover:from-indigo-500/70 hover:to-purple-600/70'
              }`}
            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
            title="Dashboard"
          >
            <FiHome className="w-5 h-5 my-2" />
          </button>
        ) : (
          // Expanded dashboard button
          <button 
            onClick={() => {
              setShowDashboard(true)
              setShowSettings(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowPlan(false)
              setShowImages(false)
              setShowSubscriptions(false)
              setShowWebsites(false)
              setShowAutomations(false)
              setShowAccountability(false)
            }}
            className={`w-full border border-gray-700 p-3 my-3 rounded-lg text-white font-medium shadow-lg transition-all duration-200 hover:shadow-xl 
              ${showDashboard 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                : 'hover:bg-gradient-to-r hover:from-indigo-500/70 hover:to-purple-600/70'
              } flex items-center justify-start pl-4 space-x-3`}
            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
          >
            <FiHome className="w-6 h-6" />
            <div className="flex flex-col items-start">
              <span>Catalyst</span>
            </div>
          </button>
        )}
      </div>

      <div 
        className={`text-sm font-medium text-gray-400 ${isMinimized ? 'px-2' : 'px-4'} py-2 flex ${isMinimized ? 'justify-center' : 'justify-between'} items-center bg-gray-800 border-t border-gray-700`}
        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
      >
        {!isMinimized && <span>Workspaces</span>}
        <button 
          onClick={() => {
            if (isMinimized) {
              setIsMinimized(false);
            }
            setIsAddingWorkspace(true);
          }}
          className={`p-1 hover:bg-gray-700 rounded ${isMinimized ? 'mx-auto px-2' : ''}`}
          title="Add New Workspace"
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiPlus className="w-4 h-4" />
        </button>
      </div>
      
      {isAddingWorkspace && (
        <div className={`${isMinimized ? 'px-1' : 'px-4'} py-2 mb-2`} style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}>
          <div className="bg-gray-700 p-2 rounded" style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="w-full bg-gray-600 text-white border border-gray-500 rounded px-2 py-1 mb-2"
              autoFocus
              style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
            />
            <div className="flex space-x-1" style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}>
              <button 
                onClick={addWorkspace}
                disabled={!newWorkspaceName.trim()}
                className={`flex-1 px-2 py-1 rounded text-white ${newWorkspaceName.trim() ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-600'}`}
                style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
              >
                Add
              </button>
              <button 
                onClick={() => {
                  setIsAddingWorkspace(false);
                  setNewWorkspaceName('');
                }}
                className="flex-1 px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
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
              className={`${isMinimized ? 'px-2 justify-center' : 'px-4 justify-between'} py-2 flex items-center cursor-pointer hover:bg-gray-700 group`}
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
                setShowPlan(false);
                setShowImages(false);
                setShowSubscriptions(false);
                setShowWebsites(false);
                setShowAutomations(false);
                setShowAccountability(false);
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
                  <div className={`flex items-center ${isMinimized ? 'px-2' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${isMinimized ? '' : 'mr-2'}`} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12m0-3h19M7 6h.009M11 6h.009" color="currentColor"/></svg>
                    {!isMinimized && (
                      <span className="font-medium">{workspace.name}</span>
                    )}
                  </div>
                  
                  {!isMinimized && (
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingWorkspace(workspace.id);
                        }}
                        className="text-gray-400 hover:text-indigo-400"
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
                  )}
                </>
              )}
            </div>
            
            {/* Show tabs for active workspace */}
            {activeWorkspaceId === workspace.id && !showDashboard && 
             !showSettings && !showAIChat && !showWriter && !showTasks && 
             !showPlan && !showImages && !showSubscriptions && !showWebsites && !showAutomations && !showAccountability && (
              <div className={`${isMinimized ? '' : 'ml-4 pl-2'} border-l border-gray-700`}>
                {workspace.tabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`${isMinimized ? 'px-1' : 'px-2'} py-1 cursor-pointer flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} group ${
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
                            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                            title="Save"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button 
                            onClick={cancelEdit}
                            className="p-1 text-red-400 hover:text-red-300 rounded"
                            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
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
                          className={`flex items-center ${isMinimized ? 'justify-center' : 'space-x-2'} overflow-hidden ${isMinimized ? 'w-full' : 'flex-1'}`}
                          onClick={() => {
                            setActiveTabId(tab.id);
                          }}
                        >
                          {tab.favicon ? (
                            <img src={tab.favicon} className="w-5 h-5 flex-shrink-0" alt="favicon" />
                          ) : (
                            <FiChrome className="w-4 h-4 flex-shrink-0" />
                          )}
                          {!isMinimized && (
                            <span className="truncate">{tab.title}</span>
                          )}
                        </div>
                        {!isMinimized && (
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                            <button
                              className="text-gray-400 hover:text-indigo-400"
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
                        )}
                      </>
                    )}
                  </div>
                ))}
                
                {/* Add New Tab button */}
                <button
                  onClick={() => addTab && addTab()}
                  className={`w-full mt-1 ${isMinimized ? 'px-1' : 'px-2'} py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-600 rounded flex ${isMinimized ? 'justify-center' : 'items-center'}`}
                  style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
                  disabled={!addTab}
                >
                  <FiPlus className={`${isMinimized ? '' : 'mr-1'} w-3 h-3`} />
                  {!isMinimized && <span>New Tab</span>}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div 
        className={`${isMinimized ? 'px-1' : 'px-2'} pb-2 space-y-2 border-t border-gray-700 pt-2`}
        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
      >
        <button 
          onClick={() => {
            setShowAIChat(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowPlan(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showAIChat ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiMessageSquare className="w-6 h-6" />
          {!isMinimized && <span>Chat</span>}
        </button>
        
        <button 
          onClick={() => {
            setShowWriter(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowTasks(false)
            setShowPlan(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showWriter ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiEdit className="w-6 h-6" />
          {!isMinimized && <span>Write</span>}
        </button>
        
        <button 
          onClick={() => {
            setShowTasks(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowPlan(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showTasks ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiCheckSquare className="w-6 h-6" />
          {!isMinimized && <span>Tasks</span>}
        </button>

        <button 
          onClick={() => {
            setShowAccountability(true)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowTasks(false)
            setShowPlan(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
          }}
          className={`w-full p-2 rounded-lg ${showAccountability ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <div className="relative">
            <FiTarget className="w-6 h-6" />
            {goalsNeedingCheckin > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                {goalsNeedingCheckin}
              </div>
            )}
          </div>
          {!isMinimized && (
            <div className="flex-1 flex items-center justify-between">
              <span>Accountability</span>
              {goalsNeedingCheckin > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2 animate-pulse">
                  {goalsNeedingCheckin}
                </span>
              )}
            </div>
          )}
        </button>

        <button 
          onClick={() => {
            setShowPlan(true)
            setShowTasks(false)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowImages(false)
            setShowSubscriptions(false)
            setShowWebsites(false)
            setShowAutomations(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showPlan ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiCalendar className="w-6 h-6" />
          {!isMinimized && <span>Plan</span>}
        </button>


        <button 
          onClick={() => {
            setShowSubscriptions(true)
            setShowImages(false)
            setShowPlan(false)
            setShowTasks(false)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowWebsites(false)
            setShowAutomations(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showSubscriptions ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiDollarSign className="w-6 h-6" />
          {!isMinimized && <span>Subscriptions</span>}
        </button>

        <button 
          onClick={() => {
            setShowWebsites(true)
            setShowSubscriptions(false)
            setShowImages(false)
            setShowPlan(false)
            setShowTasks(false)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowAutomations(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showWebsites ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiGlobe className="w-6 h-6" />
          {!isMinimized && <span>Websites</span>}
        </button>

        <button 
          onClick={() => {
            setShowAutomations(true)
            setShowWebsites(false)
            setShowSubscriptions(false)
            setShowImages(false)
            setShowPlan(false)
            setShowTasks(false)
            setShowDashboard(false)
            setShowSettings(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showAutomations ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiClock className="w-6 h-6" />
          {!isMinimized && <span>Automations</span>}
        </button>

        <button 
          onClick={() => {
            setShowSettings(true)
            setShowAutomations(false)
            setShowWebsites(false)
            setShowSubscriptions(false)
            setShowImages(false)
            setShowPlan(false)
            setShowTasks(false)
            setShowDashboard(false)
            setShowAIChat(false)
            setShowWriter(false)
            setShowAccountability(false)
          }}
          className={`w-full p-2 rounded-lg ${showSettings ? 'bg-gray-800' : ''} hover:bg-gray-300 dark:hover:bg-gray-800 flex items-center ${isMinimized ? 'justify-center' : 'justify-start pl-4 space-x-3'}`}
          style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        >
          <FiSettings className="w-6 h-6" />
          {!isMinimized && <span>Settings</span>}
        </button>
        
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`text-gray-400 hover:text-white bg-gray-800 ${isMinimized ? 'p-2 rounded-full' : 'py-2 px-4 rounded-lg w-full flex items-center justify-center space-x-2'}`}
            title={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
            style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
          >
            {isMinimized ? (
              <FiChevronRight className="w-4 h-4" />
            ) : (
              <>
                <FiChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Minimize</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;