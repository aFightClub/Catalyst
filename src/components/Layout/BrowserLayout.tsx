import React from 'react';
import { FiLoader } from 'react-icons/fi';
import { Tab, LayoutType } from '../../types';

interface BrowserLayoutProps {
  currentLayout: LayoutType;
  currentWorkspaceTabs: Tab[];
  activeTabId: string;
  loadingTabs: Set<string>;
  handleWebviewRef: (webview: Electron.WebviewTag | null, tabId: string) => void;
}

const BrowserLayout: React.FC<BrowserLayoutProps> = ({
  currentLayout,
  currentWorkspaceTabs,
  activeTabId,
  loadingTabs,
  handleWebviewRef
}) => {
  // Render a webview with loading state
  const renderWebviewWithLoader = (tabId: string, url: string) => {
    const isLoading = loadingTabs.has(tabId);
    
    return (
      <div className="relative h-full w-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
            <div className="text-center">
              <FiLoader className="animate-spin text-blue-500 w-10 h-10 mx-auto mb-4" />
              <p className="text-white">Loading page...</p>
            </div>
          </div>
        )}
        <webview
          ref={(ref) => handleWebviewRef(ref as Electron.WebviewTag, tabId)}
          src={url}
          style={{ width: '100%', height: '100%' }}
          webpreferences="contextIsolation=true,nodeIntegration=false,allowRunningInsecureContent=true"
          allowpopups="true"
          partition="persist:webcontent"
        />
      </div>
    );
  };

  // Render the appropriate layout based on currentLayout value
  switch (currentLayout) {
    case LayoutType.SINGLE:
      // Find the active tab
      const activeTab = currentWorkspaceTabs.find(tab => tab.id === activeTabId);
      return (
        <main className="flex-1 p-2.5 pt-0">
          {activeTab && (
            <div
              key={activeTab.id}
              style={{ height: '100%' }}
              className="rounded-md overflow-hidden shadow-lg"
            >
              {renderWebviewWithLoader(activeTab.id, activeTab.url)}
            </div>
          )}
        </main>
      );
    
    case LayoutType.DOUBLE:
      // Show two tabs side by side
      return (
        <main className="flex-1 p-2.5 pt-0 flex">
          <div className="w-1/2 pr-1 h-full">
            {currentWorkspaceTabs.length > 0 && (
              <div className="h-full rounded-md overflow-hidden shadow-lg">
                {renderWebviewWithLoader(currentWorkspaceTabs[0].id, currentWorkspaceTabs[0].url)}
              </div>
            )}
          </div>
          <div className="w-1/2 pl-1 h-full">
            {currentWorkspaceTabs.length > 1 ? (
              <div className="h-full rounded-md overflow-hidden shadow-lg">
                {renderWebviewWithLoader(currentWorkspaceTabs[1].id, currentWorkspaceTabs[1].url)}
              </div>
            ) : (
              <div className="h-full rounded-md overflow-hidden shadow-lg flex items-center justify-center bg-gray-800 text-gray-400">
                Add another tab to view here
              </div>
            )}
          </div>
        </main>
      );
    
    case LayoutType.TRIPLE:
      // Show two tabs on top and one on bottom
      return (
        <main className="flex-1 p-2.5 pt-0 flex flex-col">
          <div className="h-1/2 pb-1 flex">
            <div className="w-1/2 pr-1 h-full">
              {currentWorkspaceTabs.length > 0 && (
                <div className="h-full rounded-md overflow-hidden shadow-lg">
                  {renderWebviewWithLoader(currentWorkspaceTabs[0].id, currentWorkspaceTabs[0].url)}
                </div>
              )}
            </div>
            <div className="w-1/2 pl-1 h-full">
              {currentWorkspaceTabs.length > 1 ? (
                <div className="h-full rounded-md overflow-hidden shadow-lg">
                  {renderWebviewWithLoader(currentWorkspaceTabs[1].id, currentWorkspaceTabs[1].url)}
                </div>
              ) : (
                <div className="h-full rounded-md overflow-hidden shadow-lg flex items-center justify-center bg-gray-800 text-gray-400">
                  Add another tab to view here
                </div>
              )}
            </div>
          </div>
          <div className="h-1/2 pt-1">
            {currentWorkspaceTabs.length > 2 ? (
              <div className="h-full rounded-md overflow-hidden shadow-lg">
                {renderWebviewWithLoader(currentWorkspaceTabs[2].id, currentWorkspaceTabs[2].url)}
              </div>
            ) : (
              <div className="h-full rounded-md overflow-hidden shadow-lg flex items-center justify-center bg-gray-800 text-gray-400">
                Add a third tab to view here
              </div>
            )}
          </div>
        </main>
      );
    
    default:
      return null;
  }
};

export default BrowserLayout; 