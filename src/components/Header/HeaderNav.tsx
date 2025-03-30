import React from 'react';
import { 
  FiArrowLeft, FiArrowRight, FiRefreshCw, FiPackage, 
  FiLayout, FiTrash2, FiCode, FiPlus, FiList 
} from 'react-icons/fi';
import { Workspace, LayoutType } from '../../types';

interface HeaderNavProps {
  urlInput: string;
  showPluginPanel: boolean;
  eraserMode: boolean;
  showWorkflowDropdown: boolean;
  activeWorkspace: Workspace | undefined;
  currentLayout: LayoutType;
  handleUrlKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setUrlInput: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  refresh: () => void;
  activatePlugins: () => void;
  toggleEraserMode: () => void;
  setShowWorkflowDropdown: (show: boolean) => void;
  setShowWorkflowModal: (show: boolean) => void;
  setWorkflowModalMode: (mode: 'create' | 'list') => void;
  setShowLayoutDropdown: (show: boolean) => void;
  showLayoutDropdown: boolean;
}

const HeaderNav: React.FC<HeaderNavProps> = ({
  urlInput,
  showPluginPanel,
  eraserMode,
  showWorkflowDropdown,
  activeWorkspace,
  currentLayout,
  handleUrlKeyDown,
  setUrlInput,
  goBack,
  goForward,
  refresh,
  activatePlugins,
  toggleEraserMode,
  setShowWorkflowDropdown,
  setShowWorkflowModal,
  setWorkflowModalMode,
  setShowLayoutDropdown,
  showLayoutDropdown
}) => {
  return (
    <div className="h-14 bg-gray-900 flex items-center px-4 space-x-2">
      <div className="flex space-x-1">
        <button 
          onClick={goBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={refresh}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FiRefreshCw className="w-5 h-5" />
        </button>
        <button 
          onClick={goForward}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FiArrowRight className="w-5 h-5" />
        </button>
      </div>
      
      <div className="mr-2 px-2 py-2 text-gray-300 bg-gray-800 rounded text-sm">
        {activeWorkspace?.name || 'Default Workspace'}
      </div>

      <div className="flex-1">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter URL"
        />
      </div>

      <button 
        onClick={activatePlugins}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${showPluginPanel ? 'bg-blue-600' : ''}`}
        title="Plugins"
      >
        <FiPackage className="w-5 h-5" />
      </button>
      
      {/* Workflow Actions Button with Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setShowWorkflowDropdown(!showWorkflowDropdown)}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${showWorkflowDropdown ? 'bg-blue-600' : ''}`}
          title="Workflow Actions"
        >
          <FiCode className="w-5 h-5" />
        </button>
        
        {showWorkflowDropdown && (
          <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 z-10 w-40">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowWorkflowDropdown(false);
                setShowWorkflowModal(true);
                setWorkflowModalMode('create');
              }}
              className="w-full text-left p-2 rounded-lg mb-1 hover:bg-gray-700 flex items-center"
            >
              <FiPlus className="mr-2" />
              Create New
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowWorkflowDropdown(false);
                setShowWorkflowModal(true);
                setWorkflowModalMode('list');
              }}
              className="w-full text-left p-2 rounded-lg hover:bg-gray-700 flex items-center"
            >
              <FiList className="mr-2" />
              Workflows
            </button>
          </div>
        )}
      </div>
      
      {/* Layout Button with Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${showLayoutDropdown ? 'bg-blue-600' : ''}`}
          title="Change Layout"
        >
          <FiLayout className="w-5 h-5" />
        </button>
        
        {showLayoutDropdown && (
          <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 z-10 w-40">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLayoutDropdown(false);
                window.dispatchEvent(new CustomEvent('set-layout', { detail: 'single' }));
              }}
              className={`w-full text-left p-2 rounded-lg mb-1 hover:bg-gray-700 ${currentLayout === LayoutType.SINGLE ? 'bg-blue-600' : ''}`}
            >
              Single View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLayoutDropdown(false);
                window.dispatchEvent(new CustomEvent('set-layout', { detail: 'double' }));
              }}
              className={`w-full text-left p-2 rounded-lg mb-1 hover:bg-gray-700 ${currentLayout === LayoutType.DOUBLE ? 'bg-blue-600' : ''}`}
            >
              Double View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLayoutDropdown(false);
                window.dispatchEvent(new CustomEvent('set-layout', { detail: 'triple' }));
              }}
              className={`w-full text-left p-2 rounded-lg hover:bg-gray-700 ${currentLayout === LayoutType.TRIPLE ? 'bg-blue-600' : ''}`}
            >
              Triple View
            </button>
          </div>
        )}
      </div>
      
      {/* Eraser Tool Button */}
      <button 
        onClick={toggleEraserMode}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${eraserMode ? 'bg-red-600' : ''}`}
        title={eraserMode ? "Exit Eraser Mode" : "Enter Eraser Mode"}
      >
        <FiTrash2 className="w-5 h-5" />
      </button>
    </div>
  );
};

export default HeaderNav; 