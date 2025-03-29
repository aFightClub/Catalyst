import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import { FiLoader } from 'react-icons/fi'
import { applyPluginsToWebview } from './plugins'
import { pluginManager } from './services/pluginManager'
import { storeService } from './services/storeService'
import { migrateErasedElements } from './utils/erasedElements'
import { LayoutType, ActionType, Workspace, Tab, ErasedElement, Workflow, WorkflowAction } from './types'
import {
  Settings,
  AIChat,
  Writer,
  Tasks,
  Images,
  Dashboard,
  Subscriptions,
  Websites,
  Automations,
  Sidebar,
  HeaderNav,
  LayoutDropdown,
  BrowserLayout,
  WorkflowModal,
  ToastContainer
} from './components'

// Temporary type extension to handle isCustomNamed until types.ts changes are applied
type ExtendedTab = Tab & { isCustomNamed?: boolean };

// Add toast interface right after the imports
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // Initialize store and migrate data from localStorage on first render
  const isInitialized = useRef(false);
  
  useEffect(() => {
    const initializeStore = async () => {
      await storeService.migrateFromLocalStorage();
      isInitialized.current = true;
    };
    initializeStore();
    
    // Expose the workflow runner function to the window object for Settings component
    (window as any).runWorkflowInAppTab = (workflowId: string, variables: {[key: string]: string} = {}) => {
      runWorkflowInNewTab(workflowId, variables);
    };
  }, []);

  // Check for workflow to run on startup
  useEffect(() => {
    const checkForWorkflowToRun = async () => {
      try {
        // Get the workflow ID from the URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const workflowId = urlParams.get('runWorkflow');
        
        if (workflowId) {
          // Load workflows from store
          const storedWorkflows = await storeService.getWorkflows();
          if (storedWorkflows && Array.isArray(storedWorkflows)) {
            // Find the workflow with the matching ID
            const workflowToRun = storedWorkflows.find(w => w.id === workflowId);
            
            if (workflowToRun) {
              console.log(`Auto-running workflow: ${workflowToRun.name}`);
              
              // Small delay to ensure the app is fully loaded
              setTimeout(() => {
                // Run the workflow
                playWorkflow(workflowToRun, {});
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error('Failed to auto-run workflow:', error);
      }
    };
    
    checkForWorkflowToRun();
  }, []); // Run once on component mount

  // Workspace and tab state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { 
      id: 'default', 
      name: 'Default Workspace',
      tabs: [{ id: '1', title: 'Google', url: 'https://google.com', isReady: false } as ExtendedTab],
      createdAt: new Date().toISOString()
    }
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('default');
  const [activeTabId, setActiveTabId] = useState('1');
  const [urlInput, setUrlInput] = useState('');
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Helper function to get current workspace
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  
  // Helper function to get active tabs from current workspace
  const tabs = activeWorkspace?.tabs || [];
  
  const webviewRefs = useRef<{ [key: string]: Electron.WebviewTag }>({})
  const initialLoadCompleted = useRef<Set<string>>(new Set())
  const [showPluginPanel, setShowPluginPanel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false)
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(LayoutType.SINGLE)
  const [eraserMode, setEraserMode] = useState(false)
  const [erasedElements, setErasedElements] = useState<ErasedElement[]>([])
  
  // Workflow state
  const [showWorkflowDropdown, setShowWorkflowDropdown] = useState(false)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [currentRecording, setCurrentRecording] = useState<WorkflowAction[]>([])
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [workflowModalMode, setWorkflowModalMode] = useState<'create' | 'list'>('create')
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [workflowVariables, setWorkflowVariables] = useState<{[key: string]: string}>({})
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)

  // UI State for sidebar features
  const [showAIChat, setShowAIChat] = useState(false)
  const [showWriter, setShowWriter] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showImages, setShowImages] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true) // Dashboard shown by default
  const [showSubscriptions, setShowSubscriptions] = useState(false)
  const [showWebsites, setShowWebsites] = useState(false)
  const [showAutomations, setShowAutomations] = useState(false)
  
  // Add state for tracking loading status
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set());
  
  // Track pending workflow runs
  const [pendingWorkflowRun, setPendingWorkflowRun] = useState<{tabId: string, workflow: Workflow, variables: {[key: string]: string}} | null>(null);
  
  // Add toast state near the other state declarations
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Load workspaces from store
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const storedWorkspaces = await storeService.getWorkspaces();
        if (storedWorkspaces && Array.isArray(storedWorkspaces) && storedWorkspaces.length > 0) {
          setWorkspaces(storedWorkspaces);
          // Set active workspace and tab if available
          const lastActiveWorkspace = localStorage.getItem('lastActiveWorkspace');
          const lastActiveTab = localStorage.getItem('lastActiveTab');
          
          if (lastActiveWorkspace) {
            const workspace = storedWorkspaces.find(w => w.id === lastActiveWorkspace);
            if (workspace) {
              setActiveWorkspaceId(workspace.id);
              
              if (lastActiveTab) {
                const tab = workspace.tabs.find((t: Tab) => t.id === lastActiveTab);
                if (tab) {
                  setActiveTabId(tab.id);
                } else if (workspace.tabs.length > 0) {
                  setActiveTabId(workspace.tabs[0].id);
                }
              } else if (workspace.tabs.length > 0) {
                setActiveTabId(workspace.tabs[0].id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      }
    };
    loadWorkspaces();
  }, []);

  // Save workspaces to storage with debounce
  const saveWorkspaces = useCallback(async (workspacesToSave = workspaces) => {
    // Clear any pending save operation
    if (saveWorkspacesTimerRef.current) {
      clearTimeout(saveWorkspacesTimerRef.current);
    }
    
    // Schedule a new save operation with debounce
    saveWorkspacesTimerRef.current = setTimeout(async () => {
      try {
        console.log(`Saving ${workspacesToSave.length} workspaces...`);
        await storeService.saveWorkspaces(workspacesToSave);
        
        // Save active workspace and tab to localStorage for quicker retrieval
        localStorage.setItem('lastActiveWorkspace', activeWorkspaceId);
        localStorage.setItem('lastActiveTab', activeTabId);
        
        console.log(`Workspaces saved successfully. Active workspace: ${activeWorkspaceId}`);
      } catch (error) {
        console.error('Failed to save workspaces:', error);
      }
    }, 500); // Debounce for 500ms
  }, [workspaces, activeWorkspaceId, activeTabId]);

  // Save workspaces debounce timer
  const saveWorkspacesTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save workspaces to store whenever they change
  useEffect(() => {
    // Don't save if we're just initializing
    if (isInitialized.current) {
      saveWorkspaces(workspaces);
    }
  }, [saveWorkspaces, workspaces]);

  // Load erased elements from store
  useEffect(() => {
    const loadErasedElements = async () => {
      try {
        const storedElements = await storeService.getErasedElements();
        if (storedElements && Array.isArray(storedElements) && storedElements.length > 0) {
          setErasedElements(migrateErasedElements(storedElements));
        }
      } catch (error) {
        console.error('Failed to load erased elements:', error);
      }
    };
    loadErasedElements();
  }, []);

  // Load workflows from store
  useEffect(() => {
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
    loadWorkflows();
  }, []);

  // Event handlers and utility functions (implementation in original file)
  // ... (skipping for brevity, would be included in full implementation)
  
  // Function implementations - these would be fully implemented
  const handleWebviewRef = (webview: Electron.WebviewTag | null, tabId: string) => {
    if (!webview) return;
    
    // Store reference to webview element
    webviewRefs.current[tabId] = webview;
    
    // Check if we've already set up event listeners for this tab
    if (initialLoadCompleted.current.has(tabId)) return;
    
    // Mark initialization to prevent duplicate setup
    initialLoadCompleted.current.add(tabId);
    
    // Set loading state when webview is attached
    setLoadingTabs(prev => new Set([...prev, tabId]));
    
    // Use a setTimeout to break the React render cycle
    setTimeout(() => {
      // Track if the page is loading to avoid duplicate processing
      let isLoading = true;
      
      // Set up event listeners for this webview
      webview.addEventListener('dom-ready', async () => {
        // This event fires before page content is fully loaded
        console.log(`Webview DOM ready for tab ${tabId}`);
        // Apply plugins as soon as DOM is ready to ensure they work properly
        try {
          // We'll still apply erased elements and plugins in did-stop-loading
          // but this ensures that plugins that need to run early in page load will work
          const plugins = pluginManager.getPlugins().filter(p => p.enabled);
          if (plugins.length > 0) {
            console.log(`Applying ${plugins.length} plugins on DOM ready for tab ${tabId}`);
            await applyPluginsToWebview(webview);
          }
        } catch (error) {
          console.error(`Error applying plugins on DOM ready for tab ${tabId}:`, error);
        }
      });
      
      webview.addEventListener('did-start-loading', () => {
        // Set loading flag
        isLoading = true;
        
        // Set tab to loading state
        setLoadingTabs(prev => new Set([...prev, tabId]));
        
        // Update tab title to show loading, unless it's custom named
        setWorkspaces(prevWorkspaces => 
          prevWorkspaces.map(workspace => {
            const tabExists = workspace.tabs.some(tab => tab.id === tabId);
            if (tabExists) {
              return {
                ...workspace,
                tabs: workspace.tabs.map(tab => 
                  tab.id === tabId 
                    ? { 
                        ...tab, 
                        // Keep custom name, otherwise show loading
                        title: (tab as ExtendedTab).isCustomNamed 
                          ? tab.title 
                          : 'Loading...', 
                        isReady: false 
                      } 
                    : tab
                )
              };
            }
            return workspace;
          })
        );
      });
      
      webview.addEventListener('did-stop-loading', async () => {
        try {
          console.log(`Tab ${tabId} finished loading`);
          
          // Clear loading state immediately - moved to top of function to ensure it happens
          setLoadingTabs(prev => {
            const newSet = new Set(prev);
            newSet.delete(tabId);
            return newSet;
          });
          
          // Get the current page title and URL
          const title = await webview.executeJavaScript('document.title || window.location.hostname');
          const url = await webview.executeJavaScript('window.location.href');
          
          // More reliable way to get favicon
          const favicon = await webview.executeJavaScript(`
            (function() {
              // Try different favicon options
              const selectors = [
                'link[rel="shortcut icon"]',
                'link[rel="icon"]',
                'link[rel="apple-touch-icon"]',
                'link[sizes="32x32"]',
                'link[sizes="192x192"]'
              ];
              
              for (const selector of selectors) {
                const link = document.querySelector(selector);
                if (link && link.href) {
                  return link.href;
                }
              }
              
              // Default to favicon.ico at root if no icon is found
              const domain = window.location.origin;
              return domain + '/favicon.ico';
            })()
          `);
          
          console.log(`Page loaded: "${title}" at ${url} with favicon: ${favicon}`);
          
          // Update tab information - ensure title fallback to URL if empty
          setWorkspaces(prevWorkspaces => 
            prevWorkspaces.map(workspace => {
              const tabExists = workspace.tabs.some(tab => tab.id === tabId);
              if (tabExists) {
                return {
                  ...workspace,
                  tabs: workspace.tabs.map(tab => 
                    tab.id === tabId 
                      ? { 
                          ...tab, 
                          // Only update title if not custom named
                          title: (tab as ExtendedTab).isCustomNamed ? tab.title : (title || url.replace(/^https?:\/\//, '').split('/')[0]),
                          url, 
                          favicon, 
                          isReady: true 
                        } 
                      : tab
                  )
                };
              }
              return workspace;
            })
          );
          
          // Update URL input if this is the active tab
          if (tabId === activeTabId) {
            setUrlInput(url);
          }
          
          // Only process once per page load
          if (isLoading) {
            isLoading = false;
            
            // Apply erased elements CSS first, then plugins
            try {
              console.log(`Tab ${tabId} loaded URL: ${url}`);
              await applyErasedElementsCSS(webview, url);
              await applyPluginsToTab(tabId);
            } catch (error) {
              console.error(`Error applying addons to tab ${tabId}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error updating tab ${tabId} after loading:`, error);
          
          // Make sure we clear loading state on error too - already moved to top of function
          
          // Still mark tab as ready even on error
          setWorkspaces(prevWorkspaces => 
            prevWorkspaces.map(workspace => {
              const tabExists = workspace.tabs.some(tab => tab.id === tabId);
              if (tabExists) {
                return {
                  ...workspace,
                  tabs: workspace.tabs.map(tab => 
                    tab.id === tabId 
                      ? { ...tab, isReady: true } 
                      : tab
                  )
                };
              }
              return workspace;
            })
          );
        }
      });
      
      // Also handle page title updates
      webview.addEventListener('page-title-updated', (event: any) => {
        const newTitle = event.title;
        if (newTitle) {
          // Update title in workspace state
          setWorkspaces(prevWorkspaces => 
            prevWorkspaces.map(workspace => {
              const tabExists = workspace.tabs.some(tab => tab.id === tabId);
              if (tabExists) {
                return {
                  ...workspace,
                  tabs: workspace.tabs.map(tab => 
                    tab.id === tabId 
                      ? { 
                          ...tab, 
                          // Only update title if not custom named
                          title: (tab as ExtendedTab).isCustomNamed ? tab.title : newTitle 
                        } 
                      : tab
                  )
                };
              }
              return workspace;
            })
          );
        }
      });
      
      // Handle URL changes when navigating within the webview
      webview.addEventListener('did-navigate', (event: any) => {
        const newUrl = event.url;
        if (newUrl) {
          // Update URL in workspace state
          setWorkspaces(prevWorkspaces => 
            prevWorkspaces.map(workspace => {
              const tabExists = workspace.tabs.some(tab => tab.id === tabId);
              if (tabExists) {
                return {
                  ...workspace,
                  tabs: workspace.tabs.map(tab => 
                    tab.id === tabId 
                      ? { ...tab, url: newUrl } 
                      : tab
                  )
                };
              }
              return workspace;
            })
          );
          
          // Update URL input box if this is the active tab
          if (tabId === activeTabId) {
            setUrlInput(newUrl);
          }
        }
      });
      
      // Also handle in-page navigation (e.g. hash changes)
      webview.addEventListener('did-navigate-in-page', (event: any) => {
        const newUrl = event.url;
        if (newUrl) {
          // Update URL in workspace state
          setWorkspaces(prevWorkspaces => 
            prevWorkspaces.map(workspace => {
              const tabExists = workspace.tabs.some(tab => tab.id === tabId);
              if (tabExists) {
                return {
                  ...workspace,
                  tabs: workspace.tabs.map(tab => 
                    tab.id === tabId 
                      ? { ...tab, url: newUrl } 
                      : tab
                  )
                };
              }
              return workspace;
            })
          );
          
          // Update URL input box if this is the active tab
          if (tabId === activeTabId) {
            setUrlInput(newUrl);
          }
        }
      });
      
      // Handle favicon updates
      webview.addEventListener('page-favicon-updated', (event: any) => {
        const favicons = event.favicons;
        if (favicons && favicons.length > 0) {
          const newFavicon = favicons[0];
          // Update favicon in workspace state
          setWorkspaces(prevWorkspaces => 
            prevWorkspaces.map(workspace => {
              const tabExists = workspace.tabs.some(tab => tab.id === tabId);
              if (tabExists) {
                return {
                  ...workspace,
                  tabs: workspace.tabs.map(tab => 
                    tab.id === tabId 
                      ? { ...tab, favicon: newFavicon } 
                      : tab
                  )
                };
              }
              return workspace;
            })
          );
        }
      });
      
      // Handle errors in the webview
      webview.addEventListener('did-fail-load', (event) => {
        console.error(`Failed to load content in tab ${tabId}:`, event);
        
        // Clear loading state on error
        setLoadingTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete(tabId);
          return newSet;
        });
        
        // Update tab title to show error
        setWorkspaces(prevWorkspaces => 
          prevWorkspaces.map(workspace => {
            const tabExists = workspace.tabs.some(tab => tab.id === tabId);
            if (tabExists) {
              return {
                ...workspace,
                tabs: workspace.tabs.map(tab => 
                  tab.id === tabId 
                    ? { ...tab, title: 'Error Loading Page', isReady: true } 
                    : tab
                )
              };
            }
            return workspace;
          })
        );
      });
    }, 0);
  };
  
  const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigateToUrl(urlInput)
    }
  }

  const goBack = () => {
    const webview = webviewRefs.current[activeTabId]
    const tab = tabs.find(tab => tab.id === activeTabId)
    
    if (webview && tab && tab.isReady && webview.canGoBack()) {
      webview.goBack()
    }
  }

  const goForward = () => {
    const webview = webviewRefs.current[activeTabId]
    const tab = tabs.find(tab => tab.id === activeTabId)
    
    if (webview && tab && tab.isReady && webview.canGoForward()) {
      webview.goForward()
    }
  }

  const refresh = () => {
    const webview = webviewRefs.current[activeTabId]
    const tab = tabs.find(tab => tab.id === activeTabId)
    
    if (webview && tab && tab.isReady) {
      webview.reload()
    }
  }

  const activatePlugins = async () => {
    setShowPluginPanel(!showPluginPanel)
    
    if (showPluginPanel) {
      const tab = tabs.find(tab => tab.id === activeTabId)
      if (tab && tab.isReady) {
        try {
          await applyPluginsToTab(activeTabId)
        } catch (error) {
          console.error('Failed to apply plugins:', error)
        }
      }
    }
  }
  
  const applyPluginsToTab = async (tabId: string) => {
    const webview = webviewRefs.current[tabId];
    if (!webview) {
      console.warn(`No webview found for tab ${tabId}, can't apply plugins`);
      return;
    }
    
    // Ensure webview is ready
    if (webview.isLoading()) {
      console.log(`Tab ${tabId} is still loading, delaying plugin application`);
      return;
    }
    
    try {
      console.log(`Applying plugins to tab ${tabId}`);
      
      // Get the current URL from the webview
      const currentUrl = await webview.getURL();
      console.log(`Tab ${tabId} URL: ${currentUrl}`);
      
      // Apply plugins using applyPluginsToWebview
      await applyPluginsToWebview(webview);
      
      console.log(`Successfully applied plugins to tab ${tabId}`);
    } catch (error) {
      console.error(`Error applying plugins to tab ${tabId}:`, error);
    }
  };
  
  // Toggle eraser mode and inject eraser script when activated
  const toggleEraserMode = async () => {
    const newEraserMode = !eraserMode;
    setEraserMode(newEraserMode);
    
    const webview = webviewRefs.current[activeTabId];
    if (!webview || !tabs.find(tab => tab.id === activeTabId)?.isReady) return;
    
    if (newEraserMode) {
      // Inject eraser script
      await webview.executeJavaScript(`
        (function() {
          // Remove any existing eraser scripts
          const existingEraser = document.getElementById('eraser-script');
          if (existingEraser) existingEraser.remove();
          
          // Create style for hover highlight
          const style = document.createElement('style');
          style.id = 'eraser-style';
          style.textContent = '.eraser-highlight { outline: 2px solid red !important; background-color: rgba(255, 0, 0, 0.2) !important; }';
          document.head.appendChild(style);
          
          // Current highlighted element
          let currentElement = null;
          
          // Mouseover handler
          function handleMouseOver(e) {
            if (currentElement) {
              currentElement.classList.remove('eraser-highlight');
            }
            currentElement = e.target;
            currentElement.classList.add('eraser-highlight');
            e.stopPropagation();
          }
          
          // Generate a more specific CSS selector
          function generateSelector(element) {
            if (!element) return '';
            
            if (element.id) {
              return '#' + element.id;
            }
            
            let selector = element.tagName.toLowerCase();
            
            // Add classes (limited to first 2 to avoid overly specific selectors)
            // Exclude our eraser-highlight class
            if (element.classList && element.classList.length) {
              const classNames = Array.from(element.classList)
                .filter(c => c !== 'eraser-highlight')
                .slice(0, 2);
              selector += classNames.map(c => '.' + c).join('');
            }
            
            // Add position among siblings for more specificity
            let sameTagSiblings = Array.from(element.parentNode.children)
              .filter(child => child.tagName === element.tagName);
              
            if (sameTagSiblings.length > 1) {
              let index = sameTagSiblings.indexOf(element) + 1;
              selector += ':nth-of-type(' + index + ')';
            }
            
            return selector;
          }
          
          // Click handler
          function handleClick(e) {
            if (currentElement) {
              // Generate a specific but not too complex selector for the element
              const selector = generateSelector(currentElement);
              
              // Hide the element
              currentElement.style.display = 'none';
              
              // Use the Electron IPC system to communicate back to the main process
              if (window.electron) {
                window.electron.send('eraser-element-selected', selector);
              } else {
                // Fallback for when electron is not available - use a custom event
                const event = new CustomEvent('eraser-element-selected', {
                  detail: { selector }
                });
                document.dispatchEvent(event);
              }
              
              e.preventDefault();
              e.stopPropagation();
            }
          }
          
          // Add event listeners
          document.addEventListener('mouseover', handleMouseOver, true);
          document.addEventListener('click', handleClick, true);
          
          // Listen for the custom event and forward it via console.log with a special prefix
          // This allows us to capture it from the webview console output
          document.addEventListener('eraser-element-selected', (e) => {
            console.log('ERASER_ELEMENT_SELECTED:' + JSON.stringify(e.detail));
          });
          
          // Create a flag to indicate eraser is active
          window.eraserActive = true;
          
          // Create a hidden script element to mark that eraser is injected
          const script = document.createElement('script');
          script.id = 'eraser-script';
          script.style.display = 'none';
          document.body.appendChild(script);
        })();
      `);
      
      // Listen to console.log messages from the webview
      webview.addEventListener('console-message', handleConsoleMessage);
    } else {
      // Remove eraser script
      await webview.executeJavaScript(`
        (function() {
          const eraserStyle = document.getElementById('eraser-style');
          if (eraserStyle) eraserStyle.remove();
          
          const eraserScript = document.getElementById('eraser-script');
          if (eraserScript) eraserScript.remove();
          
          document.removeEventListener('mouseover', window.eraserMouseOver, true);
          document.removeEventListener('click', window.eraserClick, true);
          
          window.eraserActive = false;
          
          // Remove any highlights that might be left
          const highlighted = document.querySelector('.eraser-highlight');
          if (highlighted) highlighted.classList.remove('eraser-highlight');
        })();
      `);
      
      // Remove console message listener
      webview.removeEventListener('console-message', handleConsoleMessage);
    }
  };
  
  // Handle console messages from the webview
  const handleConsoleMessage = (event: any) => {
    const message = event.message;
    if (message.startsWith('ERASER_ELEMENT_SELECTED:')) {
      try {
        const data = JSON.parse(message.substring('ERASER_ELEMENT_SELECTED:'.length));
        const activeTab = tabs.find(tab => tab.id === activeTabId);
        
        if (activeTab && data.selector) {
          const newErasedElement: ErasedElement = {
            url: activeTab.url,
            domain: activeTab.url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0],
            selector: data.selector
          };
          
          // Add to erased elements
          setErasedElements(prev => {
            // Check for duplicates
            const exists = prev.some(el => 
              el.url === newErasedElement.url && 
              el.domain === newErasedElement.domain && 
              el.selector === newErasedElement.selector
            );
            
            if (!exists) {
              console.log('Adding new erased element:', newErasedElement);
              
              // Apply the erased element immediately to the current webview
              const webview = webviewRefs.current[activeTabId];
              if (webview) {
                webview.executeJavaScript(`
                  (function() {
                    try {
                      // Create or get eraser style element
                      let eraserStyle = document.getElementById('element-eraser-style');
                      if (!eraserStyle) {
                        eraserStyle = document.createElement('style');
                        eraserStyle.id = 'element-eraser-style';
                        document.head.appendChild(eraserStyle);
                      }
                      
                      // Add new rule to existing CSS
                      const newRule = "${data.selector} { display: none !important; visibility: hidden !important; opacity: 0 !important; }";
                      eraserStyle.textContent += "\\n" + newRule;
                      
                      // Also apply directly to ensure it takes effect immediately
                      const elements = document.querySelectorAll("${data.selector}");
                      elements.forEach(el => {
                        el.style.display = 'none';
                        el.style.visibility = 'hidden';
                        el.style.opacity = '0';
                      });
                      
                      return true;
                    } catch (error) {
                      console.error('Error applying immediate eraser CSS:', error);
                      return false;
                    }
                  })()
                `);
              }
              
              // Save to persistent storage
              setTimeout(() => storeService.saveErasedElements([...prev, newErasedElement]), 0);
              
              return [...prev, newErasedElement];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error parsing eraser message:', error);
      }
    }
  };
  
  const applyErasedElementsCSS = async (webview: Electron.WebviewTag, url: string) => {
    try {
      // Skip if webview is not valid
      if (!webview || !url) return;
      
      // Extract domain from URL for erased elements lookup
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Find applicable erased elements for this domain
      const erasedElementsForDomain = erasedElements.filter(
        element => element.domain === domain || element.domain === urlObj.hostname
      );
      
      console.log(`Applying ${erasedElementsForDomain.length} erased elements for ${urlObj.hostname}`);
      
      if (erasedElementsForDomain.length === 0) {
        return; // No elements to erase
      }

      // Generate CSS to hide erased elements
      const css = erasedElementsForDomain
        .map(element => `${element.selector} { display: none !important; visibility: hidden !important; opacity: 0 !important; }`)
        .join('\n');
      
      // Apply CSS to webview using executeJavaScript
      await webview.executeJavaScript(`
        (function() {
          try {
            // Check if our eraser style element already exists
            let eraserStyle = document.getElementById('element-eraser-style');
            
            // Create if it doesn't exist
            if (!eraserStyle) {
              eraserStyle = document.createElement('style');
              eraserStyle.id = 'element-eraser-style';
              document.head.appendChild(eraserStyle);
            }
            
            // Update the CSS content
            eraserStyle.textContent = \`${css}\`;
            
            // Add a MutationObserver to ensure elements stay hidden even after DOM changes
            if (window.eraserObserver) {
              // Disconnect any existing observer before creating a new one
              window.eraserObserver.disconnect();
              window.eraserObserver = null;
            }
            
            window.eraserObserver = new MutationObserver(function(mutations) {
              // Re-apply the CSS rules after DOM changes
              const elements = [];
              const selectors = [];
              
              // Extract selectors from CSS content
              for (const selector of eraserStyle.textContent.split('}')) {
                if (selector.trim()) {
                  const cssSelector = selector.split('{')[0].trim();
                  if (cssSelector) {
                    selectors.push(cssSelector);
                    try {
                      const matchedElements = document.querySelectorAll(cssSelector);
                      for (const el of matchedElements) {
                        elements.push(el);
                      }
                    } catch (e) {
                      // Ignore invalid selectors
                    }
                  }
                }
              }
              
              // Apply styles directly to found elements as a backup
              elements.forEach(el => {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('opacity', '0', 'important');
              });
              
              // Also apply to any newly added nodes directly
              mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                  mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                      // Check if the node matches any of our selectors
                      selectors.forEach(selector => {
                        try {
                          if ((node as Element).matches && (node as Element).matches(selector)) {
                            (node as HTMLElement).style.setProperty('display', 'none', 'important');
                            (node as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
                            (node as HTMLElement).style.setProperty('opacity', '0', 'important');
                          }
                          
                          // Also check children
                          const matchingChildren = (node as Element).querySelectorAll(selector);
                          matchingChildren.forEach(child => {
                            (child as HTMLElement).style.setProperty('display', 'none', 'important');
                            (child as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
                            (child as HTMLElement).style.setProperty('opacity', '0', 'important');
                          });
                        } catch (e) {
                          // Ignore selector errors
                        }
                      });
                    }
                  });
                }
              });
            });
            
            // Start observing the document with the configured parameters
            window.eraserObserver.observe(document.body, { 
              childList: true, 
              subtree: true,
              attributes: true
            });
            
            console.log('Successfully applied erased elements CSS');
            return true;
          } catch (error) {
            console.error('Error applying erased elements CSS:', error);
            return false;
          }
        })()
      `);

      console.log('Successfully applied eraser CSS');
    } catch (error) {
      console.error('Error applying erased elements CSS:', error);
    }
  };
  
  const addTab = () => {
    const newTab = {
      id: Date.now().toString(),
      title: 'New Tab',
      url: 'https://google.com',
      isReady: false,
      isCustomNamed: false
    } as ExtendedTab;
    
    setWorkspaces(prevWorkspaces => {
      const updatedWorkspaces = prevWorkspaces.map(workspace => 
        workspace.id === activeWorkspaceId
          ? { ...workspace, tabs: [...workspace.tabs, newTab] }
          : workspace
      );
      
      // Schedule saving after state update completes
      setTimeout(() => saveWorkspaces(updatedWorkspaces), 0);
      
      return updatedWorkspaces;
    });
    
    setActiveTabId(newTab.id);
    setShowDashboard(false);
    setShowSettings(false);
    setShowAIChat(false);
    setShowWriter(false);
    setShowTasks(false);
    setShowImages(false);
    setShowSubscriptions(false);
    setShowWebsites(false);
    setShowAutomations(false);
  };
  
  const navigateToUrl = (url: string) => {
    const processedUrl = url.startsWith('http') ? url : `https://${url}`;
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    
    if (activeTab) {
      // Update the tab URL in workspace state
      setWorkspaces(prevWorkspaces => 
        prevWorkspaces.map(workspace => 
          workspace.id === activeWorkspaceId
            ? { 
                ...workspace, 
                tabs: workspace.tabs.map(tab => 
                  tab.id === activeTabId 
                    ? { 
                        ...tab, 
                        url: processedUrl, 
                        // Keep custom name, otherwise show loading
                        title: (tab as ExtendedTab).isCustomNamed 
                          ? tab.title 
                          : 'Loading...' 
                      } 
                    : tab
                ) 
              }
            : workspace
        )
      );
      
      setUrlInput(processedUrl);
      
      const webview = webviewRefs.current[activeTabId];
      if (webview && activeTab.isReady) {
        try {
          webview.loadURL(processedUrl);
        } catch (error) {
          console.error('Error loading URL:', error);
        }
      }
    }
  };
  
  const runWorkflowInNewTab = (workflowId: string, variables: {[key: string]: string} = {}) => {
    // Implementation here
  };
  
  const startRecording = () => {
    console.log('Starting workflow recording');
    setIsRecording(true);
    setCurrentRecording([]);
    
    // Get the current active tab for recording
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) {
      console.warn('No active tab found for recording');
      return;
    }
    
    // Get the webview for the active tab
    const webview = webviewRefs.current[activeTabId];
    if (!webview || !activeTab.isReady) {
      console.warn('Active tab webview not ready for recording');
      return;
    }
    
    // Set up recording by injecting script into the webview
    webview.executeJavaScript(`
      (function() {
        console.log('Setting up workflow recording in page');
        
        // Store original URL for workflow context
        window._workflowStartUrl = window.location.href;
        
        // Track click events
        window._recordClick = function(event) {
          const target = event.target;
          let selector = '';
          let text = '';
          
          // Try to get a useful selector or text for the element
          if (target.id) {
            selector = '#' + target.id;
          } else if (target.className && typeof target.className === 'string') {
            selector = '.' + target.className.split(' ')[0];
          } else {
            selector = target.tagName.toLowerCase();
          }
          
          // Get text content if available
          text = target.textContent ? target.textContent.trim().substring(0, 50) : '';
          
          // Send the click event data back to the app
          console.log('WORKFLOW_ACTION:' + JSON.stringify({
            type: 'click',
            data: {
              selector,
              text,
              timestamp: new Date().toISOString()
            }
          }));
          
          // Let the click proceed normally
        };
        
        // Track input events
        window._recordInput = function(event) {
          const target = event.target;
          if (target.tagName.toLowerCase() === 'input' || 
              target.tagName.toLowerCase() === 'textarea') {
            
            // Send the input event data back to the app
            console.log('WORKFLOW_ACTION:' + JSON.stringify({
              type: 'input',
              data: {
                selector: target.id || target.name || target.tagName.toLowerCase(),
                value: target.value,
                placeholder: target.placeholder || 'Input field',
                timestamp: new Date().toISOString()
              }
            }));
          }
        };
        
        // Track contenteditable changes
        window._recordContentEditable = function(event) {
          const target = event.target;
          if (target.getAttribute && target.getAttribute('contenteditable') === 'true') {
            // Send the contenteditable data back to the app
            console.log('WORKFLOW_ACTION:' + JSON.stringify({
              type: 'input',
              data: {
                selector: target.id || 
                         (target.classList.length > 0 ? '.' + target.classList[0] : target.tagName.toLowerCase()),
                value: target.innerHTML,
                isContentEditable: true,
                timestamp: new Date().toISOString()
              }
            }));
          }
        };
        
        // Add event listeners
        document.addEventListener('click', window._recordClick, true);
        document.addEventListener('change', window._recordInput, true);
        document.addEventListener('input', window._recordContentEditable, true); // For contenteditable
        
        // Also record initial page navigation
        console.log('WORKFLOW_ACTION:' + JSON.stringify({
          type: 'navigate',
          data: {
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        }));
        
        return true;
      })();
    `)
    .then(() => {
      console.log('Recording script injected successfully');
      
      // Set up console message listener to capture recorded actions
      webview.addEventListener('console-message', handleWorkflowConsoleMessage);
    })
    .catch(error => {
      console.error('Failed to inject recording script:', error);
      setIsRecording(false);
    });
  };
  
  const stopRecording = () => {
    console.log('Stopping workflow recording');
    setIsRecording(false);
    
    // Get the webview for the active tab
    const webview = webviewRefs.current[activeTabId];
    if (webview) {
      // Remove recording script
      webview.executeJavaScript(`
        (function() {
          try {
            // Remove event listeners
            if (window._recordClick) {
              document.removeEventListener('click', window._recordClick, true);
              window._recordClick = null;
            }
            if (window._recordInput) {
              document.removeEventListener('change', window._recordInput, true);
              window._recordInput = null;
            }
            if (window._recordContentEditable) {
              document.removeEventListener('input', window._recordContentEditable, true);
              window._recordContentEditable = null;
            }
            console.log('Workflow recording stopped');
            return true;
          } catch (error) {
            console.error('Error removing recording scripts:', error);
            return false;
          }
        })();
      `);
      
      // Remove console message listener
      webview.removeEventListener('console-message', handleWorkflowConsoleMessage);
    }
    
    // Open workflow modal to save the recording
    setShowWorkflowModal(true);
    setWorkflowModalMode('create');
  };
  
  const handleWorkflowConsoleMessage = (event: any) => {
    const message = event.message;
    if (message.startsWith('WORKFLOW_ACTION:')) {
      try {
        const actionData = JSON.parse(message.substring('WORKFLOW_ACTION:'.length));
        console.log('Workflow action recorded:', actionData);
        
        // Create a workflow action from the data
        const newAction: WorkflowAction = {
          id: Date.now().toString(),
          type: actionData.type as ActionType,
          target: actionData.data.selector,
          value: actionData.data.value,
          timestamp: actionData.data.timestamp,
          data: actionData.data  // Store the raw data for display
        };
        
        // Add to the current recording
        setCurrentRecording(prev => [...prev, newAction]);
      } catch (error) {
        console.error('Error parsing workflow action:', error);
      }
    }
  };
  
  const saveWorkflow = () => {
    if (currentRecording.length === 0 || !newWorkflowName.trim()) {
      addToast('Please provide a name and record some actions for this workflow', 'error');
      return;
    }
    
    // Check if this is an edit of an existing workflow
    const existingWorkflowIndex = workflows.findIndex(w => w.id === editingWorkflowId);
    const isEditing = existingWorkflowIndex !== -1;
    
    // Analyze recording to extract any variables (inputs)
    const variables: string[] = [];
    currentRecording.forEach(action => {
      if (action.type === ActionType.INPUT && action.data?.value) {
        // Generate a variable name based on the field
        const varName = `input_${variables.length + 1}`;
        
        // Add variable name to the action
        action.variableName = varName;
        
        // Add to variables list
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      }
    });
    
    // Also look for JavaScript actions with variables
    currentRecording.forEach(action => {
      if (action.type === ActionType.JAVASCRIPT && action.data?.variableName) {
        // Add to variables list if not already included
        if (!variables.includes(action.data.variableName)) {
          variables.push(action.data.variableName);
        }
      }
    });
    
    // Create the new workflow or update existing one
    const workflowToSave: Workflow = {
      id: isEditing ? workflows[existingWorkflowIndex].id : Date.now().toString(),
      name: newWorkflowName.trim(),
      actions: currentRecording,
      variables: variables,
      createdAt: isEditing ? workflows[existingWorkflowIndex].createdAt : new Date().toISOString(),
      startUrl: currentRecording.find(a => a.type === ActionType.NAVIGATE)?.data?.url
    };
    
    // Update workflows state
    let updatedWorkflows: Workflow[];
    if (isEditing) {
      updatedWorkflows = [...workflows];
      updatedWorkflows[existingWorkflowIndex] = workflowToSave;
    } else {
      updatedWorkflows = [...workflows, workflowToSave];
    }
    
    setWorkflows(updatedWorkflows);
    
    // Save to storage
    storeService.saveWorkflows(updatedWorkflows)
      .then(() => {
        console.log(`Workflow ${isEditing ? 'updated' : 'saved'} successfully`);
        addToast(`Workflow "${newWorkflowName}" ${isEditing ? 'updated' : 'saved'} successfully`, 'success');
        
        // Reset recording state
        setCurrentRecording([]);
        setNewWorkflowName('');
        setEditingWorkflowId(null);
        
        // Show workflows list
        setWorkflowModalMode('list');
      })
      .catch(error => {
        console.error('Failed to save workflow:', error);
        addToast('Failed to save workflow. Please try again.', 'error');
      });
  };
  
  const playWorkflow = async (workflow: Workflow, variables: {[key: string]: string}) => {
    try {
      console.log(`Playing workflow: ${workflow.name} with ${Object.keys(variables).length} variables`);
      
      // Hide the workflow modal
      setShowWorkflowModal(false);
      
      // First navigate to the starting URL if available
      if (workflow.startUrl) {
        console.log(`Navigating to workflow start URL: ${workflow.startUrl}`);
        navigateToUrl(workflow.startUrl);
        
        // Wait for navigation to complete and page to load
        await new Promise<void>((resolve) => {
          const loadListener = () => {
            console.log('Page loaded, continuing workflow');
            webviewRefs.current[activeTabId]?.removeEventListener('did-stop-loading', loadListener);
            // Additional wait to ensure page is fully interactive
            setTimeout(resolve, 1000);
          };
          
          // Set a fallback timeout in case the event doesn't fire
          const timeout = setTimeout(() => {
            console.log('Navigation timeout, continuing workflow');
            webviewRefs.current[activeTabId]?.removeEventListener('did-stop-loading', loadListener);
            resolve();
          }, 5000);
          
          webviewRefs.current[activeTabId]?.addEventListener('did-stop-loading', loadListener);
        });
      }
      
      // Get the webview for the active tab
      const webview = webviewRefs.current[activeTabId];
      if (!webview) {
        throw new Error('No webview found for active tab, cannot run workflow');
      }
      
      // Process actions sequentially
      for (const action of workflow.actions) {
        try {
          console.log(`Executing action: ${action.type}`, action);
          
          // Skip the initial navigate action since we already navigated
          if (action.type === ActionType.NAVIGATE && action.data?.url === workflow.startUrl) {
            console.log('Skipping initial navigation action');
            continue;
          }
          
          // Process each action type
          switch (action.type) {
            case ActionType.CLICK:
              await webview.executeJavaScript(`
                (function() {
                  try {
                    console.log('Executing click action on: ${action.target}');
                    // Try different selector strategies
                    let element = document.querySelector('${action.target}');
                    
                    // If not found directly, try additional strategies
                    if (!element) {
                      // Try finding by text content
                      const textMatch = '${action.data?.text || ""}';
                      if (textMatch) {
                        // Find elements with matching text
                        const allElements = document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"]');
                        for (const el of allElements) {
                          if (el.textContent && el.textContent.trim().includes(textMatch)) {
                            element = el;
                            break;
                          }
                        }
                      }
                    }
                    
                    if (element) {
                      console.log('Found clickable element, clicking...');
                      element.click();
                      return true;
                    } else {
                      console.error('Clickable element not found: ${action.target}');
                      return false;
                    }
                  } catch (error) {
                    console.error('Error executing click action:', error);
                    return false;
                  }
                })()
              `);
              break;
              
            case ActionType.INPUT:
            case ActionType.TYPE:
              // Use variable value if available, otherwise use the original value
              const inputValue = action.variableName && variables[action.variableName] 
                ? variables[action.variableName]
                : action.value || '';
                
              console.log(`Setting input value (${action.target}): "${inputValue}"`);
                
              await webview.executeJavaScript(`
                (function() {
                  try {
                    // Try multiple ways to find the element
                    let element = document.querySelector('${action.target}');
                    
                    // If not found by direct selector, try by name, id, or placeholder
                    if (!element) {
                      element = document.querySelector('input[name="${action.target}"]') || 
                               document.querySelector('input[id="${action.target}"]') ||
                               document.querySelector('input[placeholder="${action.target}"]') ||
                               document.querySelector('textarea[name="${action.target}"]') ||
                               document.querySelector('textarea[id="${action.target}"]') ||
                               document.querySelector('textarea[placeholder="${action.target}"]') ||
                               document.querySelector('[contenteditable="true"][id="${action.target}"]') ||
                               document.querySelector('[contenteditable="true"]${action.target.startsWith('.') ? action.target : ''}');
                    }
                    
                    if (element) {
                      console.log('Found input element:', element.tagName, 
                        element.getAttribute('contenteditable') === 'true' ? '(contenteditable)' : '');
                      
                      const valueToSet = '${inputValue.replace(/'/g, "\\'")}';
                      console.log('Raw value to set:', valueToSet);
                      
                      // Check if this is a contenteditable element
                      if (${!!action.data?.isContentEditable} || element.getAttribute('contenteditable') === 'true') {
                        console.log('Handling as contenteditable');
                        // For contenteditable elements
                        // Focus the element first
                        element.focus();
                        
                        // Set content directly
                        element.innerHTML = valueToSet;
                        console.log('Set contenteditable innerHTML:', element.innerHTML);
                        
                        // Trigger input events for contenteditable
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Blur the element to trigger any blur handlers
                        setTimeout(() => {
                          element.blur();
                          console.log('Contenteditable element blurred');
                        }, 100);
                      } else {
                        console.log('Handling as standard input/textarea');
                        // For standard input elements
                        element.focus();
                        
                        try {
                          // First try direct assignment
                          element.value = valueToSet;
                          console.log('After direct value assignment:', element.value);
                          
                          // Skip native setter if direct assignment worked
                          if (element.value !== valueToSet) {
                            console.log('Direct assignment failed, trying native setter');
                            // Try native setter as backup
                            const prototype = element.tagName === 'TEXTAREA' 
                              ? HTMLTextAreaElement.prototype 
                              : HTMLInputElement.prototype;
                            
                            const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
                            if (descriptor && descriptor.set) {
                              descriptor.set.call(element, valueToSet);
                              console.log('After native setter:', element.value);
                            }
                          }
                        } catch(e) {
                          console.error('Error setting value:', e);
                          // Last resort - use execCommand
                          try {
                            element.select();
                            document.execCommand('insertText', false, valueToSet);
                            console.log('Used execCommand as fallback');
                          } catch(e2) {
                            console.error('execCommand fallback failed:', e2);
                          }
                        }
                        
                        // Trigger events
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process' }));
                        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Process' }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Blur with delay
                        setTimeout(() => {
                          element.blur();
                          console.log('Input element blurred');
                        }, 100);
                      }
                      
                      return true;
                    } else {
                      console.error('Input element not found:', '${action.target}');
                      return false;
                    }
                  } catch (error) {
                    console.error('Error setting input value:', error);
                    return false;
                  }
                })()
              `);
              
              // Wait a bit after input to ensure changes are processed
              await new Promise(resolve => setTimeout(resolve, 800));
              break;
              
            case ActionType.SUBMIT:
              await webview.executeJavaScript(`
                (function() {
                  try {
                    const form = document.querySelector('${action.target}');
                    if (form) {
                      form.submit();
                      return true;
                    } else {
                      console.error('Form not found: ${action.target}');
                      return false;
                    }
                  } catch (error) {
                    console.error('Error executing submit action:', error);
                    return false;
                  }
                })()
              `);
              break;
              
            case ActionType.WAIT:
              // Wait for specified milliseconds
              const waitTime = action.value ? parseInt(action.value) : 1000;
              await new Promise(resolve => setTimeout(resolve, waitTime));
              break;
              
            case ActionType.JAVASCRIPT:
              // Execute custom JavaScript with content replacement
              try {
                const jsCode = action.data?.code || '';
                // Get the content to inject (from variable or default)
                let contentValue = '';
                
                // Try to get content from variables first, then from defaultContent
                if (action.data?.variableName && variables[action.data.variableName]) {
                  contentValue = variables[action.data.variableName];
                } else if (action.data?.defaultContent) {
                  contentValue = action.data.defaultContent;
                }
                
                console.log(`Executing JavaScript with content: "${contentValue}"`);
                
                // Generate a unique ID for this script execution
                const scriptId = `workflow-js-${Date.now()}`;
                
                // Replace content placeholders in the code
                const processedCode = jsCode.replace(/{{content}}/g, JSON.stringify(contentValue));
                
                // Execute using the plugin approach (appending script element) which works with CSP
                await webview.executeJavaScript(`
                  (function() {
                    try {
                      // Check if a script with this ID already exists and remove it
                      const existingScript = document.getElementById('${scriptId}');
                      if (existingScript) existingScript.remove();
                      
                      // Create a script element
                      const script = document.createElement('script');
                      script.id = '${scriptId}';
                      
                      // Add code that includes proper JSON-stringified content
                      script.textContent = ${JSON.stringify(processedCode)};
                      
                      // Add script to page to execute it
                      document.head.appendChild(script);
                      
                      console.log('Successfully executed workflow JavaScript');
                      setTimeout(() => {
                        alert('JavaScript executed successfully');
                        
                        // Optional cleanup
                        const scriptElement = document.getElementById('${scriptId}');
                        if (scriptElement) scriptElement.remove();
                      }, 100);
                      
                      return true;
                    } catch (error) {
                      console.error('Error executing JavaScript:', error);
                      alert('JavaScript Error: ' + error.message);
                      return false;
                    }
                  })();
                `);
                
                addToast('JavaScript executed successfully', 'success');
              } catch (error) {
                console.error('Error executing JavaScript:', error);
                addToast('Failed to execute JavaScript: ' + (error instanceof Error ? error.message : String(error)), 'error');
              }
              break;
              
            default:
              console.log(`Unsupported action type: ${action.type}`);
          }
          
          // Default delay between actions
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error executing workflow action: ${action.type}`, error);
          // Continue with next action instead of failing the whole workflow
        }
      }
      
      console.log(`Workflow ${workflow.name} completed successfully`);
      addToast(`Workflow "${workflow.name}" completed successfully`, 'success');
    } catch (error) {
      console.error('Error executing workflow:', error);
      addToast(`Error executing workflow: ${error.message || 'Unknown error'}`, 'error');
    }
  };
  
  const addWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    
    // Generate unique ID for workspace and first tab
    const workspaceId = Date.now().toString();
    const tabId = `${workspaceId}-tab1`;
    
    console.log(`Creating new workspace: ${newWorkspaceName.trim()} with ID ${workspaceId} and tab ${tabId}`);
    
    const newWorkspace: Workspace = {
      id: workspaceId,
      name: newWorkspaceName.trim(),
      tabs: [{ id: tabId, title: 'New Tab', url: 'https://google.com', isReady: false } as ExtendedTab],
      createdAt: new Date().toISOString()
    };
    
    // Update workspaces state
    setWorkspaces(prevWorkspaces => {
      const updatedWorkspaces = [...prevWorkspaces, newWorkspace];
      
      // Schedule saving after state update completes
      setTimeout(() => saveWorkspaces(updatedWorkspaces), 0);
      
      return updatedWorkspaces;
    });
    
    // Set active workspace and tab
    setActiveWorkspaceId(workspaceId);
    setActiveTabId(tabId);
    
    // Clear input and close new workspace form
    setNewWorkspaceName('');
    setIsAddingWorkspace(false);
    
    // Hide all other panels
    setShowDashboard(false);
    setShowSettings(false);
    setShowAIChat(false);
    setShowWriter(false);
    setShowTasks(false);
    setShowImages(false);
    setShowSubscriptions(false);
    setShowWebsites(false);
    setShowAutomations(false);
  };
  
  const deleteWorkspace = (id: string) => {
    // Don't delete if it's the only workspace
    if (workspaces.length <= 1) return;
    
    const updatedWorkspaces = workspaces.filter(w => w.id !== id);
    setWorkspaces(updatedWorkspaces);
    
    // If the active workspace is deleted, activate another one
    if (id === activeWorkspaceId) {
      const newActiveWorkspace = updatedWorkspaces[0];
      setActiveWorkspaceId(newActiveWorkspace.id);
      if (newActiveWorkspace.tabs.length > 0) {
        setActiveTabId(newActiveWorkspace.tabs[0].id);
      }
    }
  };
  
  const startEditingWorkspace = (id: string) => {
    const workspace = workspaces.find(w => w.id === id);
    if (workspace) {
      setEditingWorkspaceId(id);
      setEditName(workspace.name);
    }
  };
  
  const saveWorkspaceEdit = () => {
    if (!editingWorkspaceId || !editName.trim()) return;
    
    setWorkspaces(prevWorkspaces => 
      prevWorkspaces.map(workspace => 
        workspace.id === editingWorkspaceId
          ? { ...workspace, name: editName.trim() }
          : workspace
      )
    );
    
    setEditingWorkspaceId(null);
    setEditName('');
  };
  
  const startEditingTab = (workspaceId: string, tabId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    const tab = workspace?.tabs.find(t => t.id === tabId);
    
    if (tab) {
      setEditingTabId(tabId);
      setEditName(tab.title);
    }
  };
  
  const saveTabEdit = (workspaceId: string) => {
    if (!editingTabId || !editName.trim()) return;
    
    setWorkspaces(prevWorkspaces => 
      prevWorkspaces.map(workspace => 
        workspace.id === workspaceId
          ? { 
              ...workspace, 
              tabs: workspace.tabs.map(tab => 
                tab.id === editingTabId
                  ? { ...tab, title: editName.trim(), isCustomNamed: true }
                  : tab
              ) 
            }
          : workspace
      )
    );
    
    setEditingTabId(null);
    setEditName('');
  };
  
  const cancelEdit = () => {
    setEditingWorkspaceId(null);
    setEditingTabId(null);
    setEditName('');
  };
  
  const closeTab = (workspaceId: string, tabId: string) => {
    // Don't close the last tab
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace || workspace.tabs.length <= 1) return; 
    
    // If closing the active tab, activate another tab first
    if (tabId === activeTabId) {
      const tabIndex = workspace.tabs.findIndex(t => t.id === tabId);
      const newActiveTab = workspace.tabs[tabIndex === 0 ? 1 : tabIndex - 1];
      setActiveTabId(newActiveTab.id);
    }
    
    // Remove the tab from webviewRefs
    const newWebviewRefs = { ...webviewRefs.current };
    delete newWebviewRefs[tabId];
    webviewRefs.current = newWebviewRefs;
    
    // Remove the tab from workspaces state
    setWorkspaces(prevWorkspaces => 
      prevWorkspaces.map(workspace => 
        workspace.id === workspaceId
          ? { ...workspace, tabs: workspace.tabs.filter(t => t.id !== tabId) }
          : workspace
      )
    );
  };

  // Update the renderLayout functions to include the loading spinner
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
          webpreferences="contextIsolation=false,nodeIntegration=true"
          allowpopups="true"
          key={`webview-${tabId}`}
        />
      </div>
    );
  };

  // Update URL input when active tab changes
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId)
    if (activeTab) {
      setUrlInput(activeTab.url)
      
      // Re-apply erased elements when switching to an existing tab
      const webview = webviewRefs.current[activeTabId];
      if (webview && activeTab.isReady) {
        console.log(`Reapplying erased elements for tab ${activeTabId} on tab switch`);
        applyErasedElementsCSS(webview, activeTab.url);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, tabs, erasedElements]);

  // Listen for layout change events from HeaderNav
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const layout = event.detail;
      console.log(`Changing layout to ${layout}`);
      
      switch (layout) {
        case 'single':
          setCurrentLayout(LayoutType.SINGLE);
          break;
        case 'double':
          setCurrentLayout(LayoutType.DOUBLE);
          break;
        case 'triple':
          setCurrentLayout(LayoutType.TRIPLE);
          break;
      }
    };

    window.addEventListener('set-layout', handleLayoutChange as EventListener);
    
    return () => {
      window.removeEventListener('set-layout', handleLayoutChange as EventListener);
    };
  }, []);

  // Listen for requests to apply plugins to all active tabs
  useEffect(() => {
    const handleApplyPluginsToActiveTabs = () => {
      console.log('Applying plugins to all active tabs');
      
      // Apply plugins to the current active tab first
      const activeWebview = webviewRefs.current[activeTabId];
      if (activeWebview && !activeWebview.isLoading()) {
        applyPluginsToWebview(activeWebview)
          .then(() => console.log(`Applied plugins to active tab: ${activeTabId}`))
          .catch(error => console.error(`Error applying plugins to active tab: ${activeTabId}`, error));
      }
      
      // Apply to all other tabs in the current workspace
      tabs.forEach(tab => {
        if (tab.id !== activeTabId) {
          const webview = webviewRefs.current[tab.id];
          if (webview && !webview.isLoading()) {
            applyPluginsToWebview(webview)
              .then(() => console.log(`Applied plugins to tab: ${tab.id}`))
              .catch(error => console.error(`Error applying plugins to tab: ${tab.id}`, error));
          }
        }
      });
    };

    window.addEventListener('apply-plugins-to-active-tabs', handleApplyPluginsToActiveTabs);
    
    return () => {
      window.removeEventListener('apply-plugins-to-active-tabs', handleApplyPluginsToActiveTabs);
    };
  }, [activeTabId, tabs]);

  // Apply plugins when switching workspaces
  useEffect(() => {
    const applyPluginsToWorkspace = async () => {
      console.log(`Switching to workspace: ${activeWorkspaceId}, applying plugins to all tabs`);
      
      // Get all tabs in the current workspace
      const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
      if (!currentWorkspace) return;
      
      // Apply plugins to each ready tab in the workspace
      for (const tab of currentWorkspace.tabs) {
        const webview = webviewRefs.current[tab.id];
        if (webview && tab.isReady && !webview.isLoading()) {
          try {
            console.log(`Applying plugins to tab ${tab.id} after workspace switch`);
            await applyPluginsToWebview(webview);
          } catch (error) {
            console.error(`Error applying plugins to tab ${tab.id}:`, error);
          }
        }
      }
    };
    
    // Call the function when activeWorkspaceId changes
    applyPluginsToWorkspace();
    
  }, [activeWorkspaceId, workspaces]);

  // Listen for requests to open URLs in new tabs
  useEffect(() => {
    if ((window as any).electron) {
      // Listen for open-url-in-new-tab events from webviews
      (window as any).electron.receive('open-url-in-new-tab', (url: string) => {
        console.log(`Opening URL in new tab: ${url}`);
        
        // Create new tab with the URL
        const newTab = {
          id: Date.now().toString(),
          title: 'Loading...',
          url: url,
          isReady: false,
          isCustomNamed: false
        } as ExtendedTab;
        
        // Add the tab to current workspace
        setWorkspaces(prevWorkspaces => {
          const updatedWorkspaces = prevWorkspaces.map(workspace => 
            workspace.id === activeWorkspaceId
              ? { ...workspace, tabs: [...workspace.tabs, newTab] }
              : workspace
          );
          
          return updatedWorkspaces;
        });
        
        // Activate the new tab
        setActiveTabId(newTab.id);
        
        // Make sure we show the browser UI
        setShowDashboard(false);
        setShowSettings(false);
        setShowAIChat(false);
        setShowWriter(false);
        setShowTasks(false);
        setShowImages(false);
        setShowSubscriptions(false);
        setShowWebsites(false);
        setShowAutomations(false);
      });
    }
  }, [activeWorkspaceId]);

  // Add a toast helper function
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const newToast = {
      id: Date.now().toString(),
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);
  };

  // Add a remove toast function
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Handle editing an existing workflow
  const handleEditWorkflow = (workflow: Workflow) => {
    console.log(`Editing workflow: ${workflow.name}`);
    // Set the editing workflow ID to know we're editing not creating new
    setEditingWorkflowId(workflow.id);
    // Load workflow data into the editor
    setNewWorkflowName(workflow.name);
    // Clone the actions to avoid modifying the original
    setCurrentRecording([...workflow.actions]);
    // Switch to create mode for editing UI
    setWorkflowModalMode('create');
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar Component */}
      <Sidebar 
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        activeTabId={activeTabId}
        isAddingWorkspace={isAddingWorkspace}
        newWorkspaceName={newWorkspaceName}
        editingWorkspaceId={editingWorkspaceId}
        editingTabId={editingTabId}
        editName={editName}
        showDashboard={showDashboard}
        showSettings={showSettings}
        showAIChat={showAIChat}
        showWriter={showWriter}
        showTasks={showTasks}
        showImages={showImages}
        showSubscriptions={showSubscriptions}
        showWebsites={showWebsites}
        showAutomations={showAutomations}
        setShowDashboard={setShowDashboard}
        setShowSettings={setShowSettings}
        setShowAIChat={setShowAIChat}
        setShowWriter={setShowWriter}
        setShowTasks={setShowTasks}
        setShowImages={setShowImages}
        setShowSubscriptions={setShowSubscriptions}
        setShowWebsites={setShowWebsites}
        setShowAutomations={setShowAutomations}
        setIsAddingWorkspace={setIsAddingWorkspace}
        setNewWorkspaceName={setNewWorkspaceName}
        addWorkspace={addWorkspace}
        addTab={addTab}
        setActiveWorkspaceId={setActiveWorkspaceId}
        setActiveTabId={setActiveTabId}
        startEditingWorkspace={startEditingWorkspace}
        saveWorkspaceEdit={saveWorkspaceEdit}
        startEditingTab={startEditingTab}
        saveTabEdit={saveTabEdit}
        cancelEdit={cancelEdit}
        deleteWorkspace={deleteWorkspace}
        closeTab={closeTab}
        setEditName={setEditName}
      />

      <div className="flex-1 flex flex-col">
        {showSettings ? (
          <Settings />
        ) : showAIChat ? (
          <AIChat />
        ) : showWriter ? (
          <Writer />
        ) : showTasks ? (
          <Tasks />
        ) : showImages ? (
          <Images />
        ) : showAutomations ? (
          <Automations />
        ) : showWebsites ? (
          <Websites />
        ) : showSubscriptions ? (
          <Subscriptions />
        ) : showDashboard ? (
          <Dashboard />
        ) : (
          <>
            {/* Header Nav Component */}
            <HeaderNav 
              urlInput={urlInput}
              showPluginPanel={showPluginPanel}
              eraserMode={eraserMode}
              showWorkflowDropdown={showWorkflowDropdown}
              activeWorkspace={activeWorkspace}
              currentLayout={currentLayout}
              handleUrlKeyDown={handleUrlKeyDown}
              setUrlInput={setUrlInput}
              goBack={goBack}
              goForward={goForward}
              refresh={refresh}
              activatePlugins={activatePlugins}
              toggleEraserMode={toggleEraserMode}
              setShowWorkflowDropdown={setShowWorkflowDropdown}
              setShowWorkflowModal={setShowWorkflowModal}
              setWorkflowModalMode={setWorkflowModalMode}
              setShowLayoutDropdown={setShowLayoutDropdown}
              showLayoutDropdown={showLayoutDropdown}
            />

            {showPluginPanel && (
              <div className="bg-gray-800 border-t border-gray-700 py-2 px-4">
                <h3 className="text-white text-sm font-medium mb-2">Available Plugins</h3>
                <div className="flex flex-wrap gap-2">
                  {pluginManager.getPlugins().map(plugin => (
                    <div 
                      key={plugin.id}
                      className={`px-3 py-1 rounded-full text-xs cursor-pointer ${
                        plugin.enabled
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={async () => {
                        // Update plugin state with toggled enabled state
                        const updatedPlugin = { 
                          ...plugin, 
                          enabled: !plugin.enabled 
                        };
                        
                        // Update in plugin manager
                        pluginManager.updatePlugin(updatedPlugin);
                        
                        // Force re-render of plugin panel
                        setShowPluginPanel(prev => !prev);
                        setShowPluginPanel(prev => !prev);
                        
                        // Apply the changes
                        await applyPluginsToTab(activeTabId);
                      }}
                    >
                      {plugin.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Browser Layout Component */}
            <BrowserLayout 
              currentLayout={currentLayout}
              currentWorkspaceTabs={activeWorkspace?.tabs || []}
              activeTabId={activeTabId}
              loadingTabs={loadingTabs}
              handleWebviewRef={handleWebviewRef}
            />
          </>
        )}
      </div>
      
      {/* Workflow Modal Component */}
      <WorkflowModal 
        showWorkflowModal={showWorkflowModal}
        workflowModalMode={workflowModalMode}
        newWorkflowName={newWorkflowName}
        isRecording={isRecording}
        currentRecording={currentRecording}
        workflows={workflows}
        selectedWorkflow={selectedWorkflow}
        workflowVariables={workflowVariables}
        setNewWorkflowName={setNewWorkflowName}
        startRecording={startRecording}
        stopRecording={stopRecording}
        saveWorkflow={saveWorkflow}
        setSelectedWorkflow={setSelectedWorkflow}
        setWorkflowVariables={setWorkflowVariables}
        playWorkflow={playWorkflow}
        setWorkflows={setWorkflows}
        setWorkflowModalMode={setWorkflowModalMode}
        setShowWorkflowModal={setShowWorkflowModal}
        setCurrentRecording={setCurrentRecording}
        handleEditWorkflow={handleEditWorkflow}
      />

      {/* Floating Recording Controls */}
      {isRecording && (
        <div className="fixed bottom-4 right-4 flex items-center space-x-2 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <span className="inline-block w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></span>
            Recording Workflow
          </div>
          <button
            onClick={() => {
              stopRecording();
              setShowWorkflowModal(true); // Show modal after stopping
              setWorkflowModalMode('create');
            }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* Toast Notification Component */}
      <ToastContainer 
        toasts={toasts}
        removeToast={removeToast}
      />
    </div>
  );
} 