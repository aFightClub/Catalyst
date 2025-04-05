import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import { FiLoader, FiCode, FiClock } from 'react-icons/fi'
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
  Plan,
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
  ToastContainer,
  Media,
  Accountability
} from './components'
import ConsoleViewer from './components/ConsoleViewer'

// Temporary type extension to handle isCustomNamed until types.ts changes are applied
type ExtendedTab = Tab & { isCustomNamed?: boolean };

// Add toast interface right after the imports
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Add imports for the Accountability system
import { useAccountability } from './contexts/AccountabilityContext';
import GatekeeperChat from './components/Accountability/GatekeeperChat';
// Remove GlobalGatekeeperChat import since we're going to render directly
// import GlobalGatekeeperChat from './components/Accountability/GlobalGatekeeperChat';

export default function App() {
  // Get accountability context for direct rendering
  const { 
    showGatekeeperChat, 
    activeGoal, 
    closeGatekeeperChat, 
    updateGoal,
    apiKey,
    selectedModel,
    projects,
    userContext,
    goals,
    openGatekeeperForGoal,
    forceReloadGoals // Add this
  } = useAccountability();

  // Add effect for debug logging
  useEffect(() => {
    console.log("App: Mounted with GatekeeperChat rendering directly in App component");
    
    return () => {
      console.log("App: Unmounting");
    };
  }, []);
  
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
    
    // Expose navigation functions to the window object
    (window as any).setShowPlan = setShowPlan;
    (window as any).setShowDashboard = setShowDashboard;
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
  const domReadyWebviews = useRef<Set<string>>(new Set())
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
  const [showPlan, setShowPlan] = useState(false)
  const [showImages, setShowImages] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true) // Dashboard shown by default
  const [showSubscriptions, setShowSubscriptions] = useState(false)
  const [showWebsites, setShowWebsites] = useState(false)
  const [showAutomations, setShowAutomations] = useState(false)
  const [showAccountability, setShowAccountability] = useState(false)
  
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
    
    // Add console log capture
    captureWebviewConsoleLogs(webview, tabId);
    
    // Use a setTimeout to break the React render cycle
    setTimeout(() => {
      // Track if the page is loading to avoid duplicate processing
      let isLoading = true;
      // Keep track of processed URLs to avoid applying plugins multiple times
      let processedUrls = new Set();
      
      // Set up event listeners for this webview
      webview.addEventListener('dom-ready', async () => {
        // Mark webview as DOM-initialized in a ref
        domReadyWebviews.current.add(tabId);
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
          
          // Only process once per page load and avoid processing the same URL multiple times
          if (isLoading && !processedUrls.has(url)) {
            isLoading = false;
            processedUrls.add(url);
            
            // Apply erased elements CSS first, then plugins
            try {
              console.log(`Tab ${tabId} loaded URL: ${url}`);
              await applyErasedElementsCSS(webview, url, tabId);
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
    if (!domReadyWebviews.current.has(tabId)) {
      console.log(`Tab ${tabId} is not DOM-ready yet, delaying plugin application`);
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
  
  // Cache for erased elements to avoid reapplying the same CSS
  const appliedErasedElements = useRef(new Map<string, string>());
  
  const applyErasedElementsCSS = async (webview: Electron.WebviewTag, url: string, tabId: string) => {
    // Check if dom-ready has fired
    if (!domReadyWebviews.current.has(tabId)) {
      console.log(`Skipping apply for tab ${tabId} - DOM not ready`);
      return;
    }
    
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
      
      // Check if this exact CSS has already been applied to this URL
      const cacheKey = `${url}-${css}`;
      if (appliedErasedElements.current.get(cacheKey) === css) {
        console.log(`Erased elements already applied for ${url}, skipping`);
        return;
      }
      
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
      
      // Store in cache after successful application
      appliedErasedElements.current.set(cacheKey, css);
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
    setShowAccountability(false);
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
                               document.querySelector('[contenteditable="true"][id="${action.target || ''}"]') ||
                               document.querySelector('[contenteditable="true"]${action.target?.startsWith('.') ? action.target : ''}');
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
                
                // Replace content placeholders in the code with actual content
                // Use direct string value to avoid JSON stringification issues
                const processedCode = jsCode.replace(/{{content}}/g, `"${contentValue.replace(/"/g, '\\"')}"`);
                
                // Apply the JavaScript code using the same approach as plugins
                // First ensure the page is fully loaded
                await new Promise(resolve => setTimeout(resolve, 300));
                
                await webview.executeJavaScript(`
                  (function() {
                    try {
                      // Clean up any existing workflow scripts
                      const existingScripts = document.querySelectorAll('script[id^="workflow-js-"]');
                      existingScripts.forEach(script => script.remove());
                      
                      // Create a new script element
                      const script = document.createElement('script');
                      script.id = '${scriptId}';
                      script.textContent = ${JSON.stringify(processedCode)};
                      
                      // Add to document to execute
                      document.head.appendChild(script);
                      
                      console.log('Successfully injected workflow JavaScript');
                      return true;
                    } catch (error) {
                      console.error('Failed to execute JavaScript:', error);
                      return false;
                    }
                  })()
                `);
                
                // Wait a moment for the script to execute
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Show success notification
                addToast('JavaScript step executed', 'success');
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
    } catch (error: unknown) {
      console.error('Error executing workflow:', error);
      addToast(`Error executing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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
    setShowAccountability(false);
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
          webpreferences="contextIsolation=true,nodeIntegration=false,allowRunningInsecureContent=true"
          allowpopups="true"
          partition="persist:webcontent"
          key={`webview-${tabId}`}
        />
      </div>
    );
  };

  // Update URL input when active tab changes
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;
    
    // Set URL input
    setUrlInput(activeTab.url);
    
    // Add a small delay before applying erased elements to avoid race conditions
    const timeoutId = setTimeout(() => {
      // Re-apply erased elements when switching to an existing tab
      const webview = webviewRefs.current[activeTabId];
      if (webview && domReadyWebviews.current.has(activeTabId)) {
        console.log(`Reapplying erased elements for tab ${activeTabId}`);
        applyErasedElementsCSS(webview, activeTab.url, activeTabId);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [activeTabId]); // Only depend on activeTabId

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
      if (activeWebview && domReadyWebviews.current.has(activeTabId)) {
        applyPluginsToWebview(activeWebview)
          .then(() => console.log(`Applied plugins to active tab: ${activeTabId}`))
          .catch(error => console.error(`Error applying plugins to active tab: ${activeTabId}`, error));
      }
      
      // Apply to all other tabs in the current workspace
      tabs.forEach(tab => {
        if (tab.id !== activeTabId) {
          const webview = webviewRefs.current[tab.id];
          if (webview && domReadyWebviews.current.has(tab.id)) {
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
    // Create a ref to track already processed tabs
    const processedTabs = new Set();
    let isMounted = true;
    
    const timeoutId = setTimeout(() => {
      if (!isMounted) return;
      
      const applyPluginsToWorkspace = async () => {
        console.log(`Switching to workspace: ${activeWorkspaceId}, applying plugins to all tabs`);
        
        // Apply plugins to tabs that are ready
        const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
        if (!currentWorkspace) return;
        
        for (const tab of currentWorkspace.tabs) {
          // Skip if we've already processed this tab
          if (processedTabs.has(tab.id)) continue;
          
          const webview = webviewRefs.current[tab.id];
          if (webview && tab.isReady && domReadyWebviews.current.has(tab.id)) {
            try {
              processedTabs.add(tab.id);
              await applyPluginsToWebview(webview);
            } catch (error) {
              console.error(`Error applying plugins to tab ${tab.id}:`, error);
            }
          }
        }
      };
      
      applyPluginsToWorkspace();
    }, 300); // Add a debounce delay
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [activeWorkspaceId]); // Remove workspaces from dependency array

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
        setShowAccountability(false);
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



  const openWebviewDevTools = () => {
    const webview = webviewRefs.current[activeTabId];
    if (webview) {
      webview.openDevTools();
    }
  };

  // Add this function to your component
  const captureWebviewConsoleLogs = (webview: Electron.WebviewTag, tabId: string) => {
    webview.addEventListener('console-message', (event) => {
      // Skip the known syntax errors about 'as' identifier
      if (event.message.includes("Unexpected identifier 'as'")) {
        return;
      }
      
      console.log(`[Tab ${tabId}] Console: ${event.message} (Line: ${event.line}, Source: ${event.sourceId})`);
      
      if (event.level === 2) { // Error level
        console.error(`[Tab ${tabId}] Error: ${event.message}`);
      }
    });
  };

  // Create global debug function to test Gatekeeper directly
  useEffect(() => {
    (window as any).debugOpenGatekeeper = (goalId?: string) => {
      // Try multiple methods to get the gatekeeper working
      console.log("DEBUG: Attempting to open gatekeeper with goal ID:", goalId);
      
      // First try using context directly if available
      try {
        // Method 1: Try to access context through devtools
        // @ts-ignore - Ignoring TS error for debugging purposes
        const contextProvider = document.querySelector('#root')?.__REACT_CONTEXT_DEVTOOLS?.stores?.AccountabilityContext?.context?._currentValue;
        
        if (contextProvider && contextProvider.openGatekeeperForGoal) {
          console.log("DEBUG: Directly calling openGatekeeperForGoal with:", goalId);
          if (goalId) {
            contextProvider.openGatekeeperForGoal(goalId);
          } else {
            // If no goal ID, try to get a goal from the context
            console.log("DEBUG: No goal ID provided, trying first available goal");
            // If context has goals, use the first one
            if (contextProvider.goals && contextProvider.goals.length > 0) {
              const firstGoal = contextProvider.goals[0];
              console.log(`DEBUG: Using first goal: ${firstGoal.title} (${firstGoal.id})`);
              contextProvider.openGatekeeperForGoal(firstGoal.id);
            } else {
              console.log("DEBUG: Context has no goals, trying force function");
              // Try using the force function
              if ((window as any).debugForceShowGatekeeper) {
                (window as any).debugForceShowGatekeeper();
              }
            }
          }
          return true;
        } else {
          console.log("DEBUG: Context provider function not found, trying global function");
        }
      } catch (error) {
        console.error("DEBUG: Error accessing context provider:", error);
      }
      
      // Method 2: Try using the global function
      try {
        if ((window as any).openGatekeeperForGoal) {
          console.log("DEBUG: Using global openGatekeeperForGoal function");
          if (goalId) {
            (window as any).openGatekeeperForGoal(goalId);
          } else {
            console.log("DEBUG: No goal ID provided, trying force function");
            if ((window as any).debugForceShowGatekeeper) {
              (window as any).debugForceShowGatekeeper();
            }
          }
          return true;
        } else {
          console.log("DEBUG: Global openGatekeeperForGoal function not found");
        }
      } catch (error) {
        console.error("DEBUG: Error using global function:", error);
      }
      
      console.error("DEBUG: Could not find any method to open gatekeeper");
      return false;
    };
  }, []);

  // Add effect for debug logging of GatekeeperChat
  useEffect(() => {
    console.log("App: GatekeeperChat status:", {
      showGatekeeperChat,
      hasActiveGoal: !!activeGoal,
      goalTitle: activeGoal?.title
    });
    
    // Set up a global debug function
    (window as any).debugGatekeeperStatus = () => {
      return {
        showGatekeeperChat,
        activeGoal: activeGoal ? {
          id: activeGoal.id,
          title: activeGoal.title,
          isCompleted: activeGoal.isCompleted,
          frequency: activeGoal.frequency,
          lastChecked: activeGoal.lastChecked
        } : null,
        apiKey: apiKey ? "Set" : "Not set",
        goalCount: (goals || []).length
      };
    };
    
   
    
    // Add a function to find and display the first goal that needs a check-in
    (window as any).checkInFirstDueGoal = () => {
      if (!goals || goals.length === 0) {
        console.log("No goals available to check");
        return false;
      }
      
      const now = new Date();
      
      // Find the first goal that needs a check-in
      for (const goal of goals) {
        if (goal.isCompleted) continue;
        
        const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : new Date(0);
        let checkInterval = 0;
        
        switch (goal.frequency) {
          case 'minute':
            checkInterval = 60 * 1000; // 1 minute
            break;
          case 'hourly':
            checkInterval = 60 * 60 * 1000; // 1 hour
            break;
          case 'daily':
            checkInterval = 24 * 60 * 60 * 1000; // 1 day
            break;
          case 'weekly':
            checkInterval = 7 * 24 * 60 * 60 * 1000; // 1 week
            break;
          case 'monthly':
            // Approximate a month as 30 days
            checkInterval = 30 * 24 * 60 * 60 * 1000;
            break;
        }
        
        const timeSinceLastCheck = now.getTime() - lastChecked.getTime();
        
        if (timeSinceLastCheck >= checkInterval) {
          console.log(`Goal "${goal.title}" needs a check-in (last checked ${Math.floor(timeSinceLastCheck/1000/60)} minutes ago)`);
          console.log("Opening GatekeeperChat for this goal");
          openGatekeeperForGoal(goal.id);
          return true;
        }
      }
      
      console.log("No goals currently need a check-in");
      return false;
    };
  }, [showGatekeeperChat, activeGoal, goals, apiKey]);

  // Add effect for logging when active goal changes
  useEffect(() => {
    if (activeGoal) {
      console.log("Active goal changed:", {
        id: activeGoal.id,
        title: activeGoal.title,
        isCompleted: activeGoal.isCompleted,
        showingChat: showGatekeeperChat
      });
    }
  }, [activeGoal]);

  // Add a function to force reload goals and trigger gatekeeper
  const debugForceReloadAndShowGatekeeper = async () => {
    console.log("App: Force reloading goals and showing gatekeeper");
    
    try {
      // Reload goals from storage
      if (typeof forceReloadGoals === 'function') {
        const reloadedGoals = await forceReloadGoals();
        console.log(`App: Reloaded ${reloadedGoals.length} goals from storage`);
        
        if (reloadedGoals.length > 0) {
          // Open gatekeeper for first goal
          const firstGoal = reloadedGoals[0];
          console.log(`App: Opening gatekeeper for goal: ${firstGoal.title}`);
          openGatekeeperForGoal(firstGoal.id);
          return;
        }
      }
      
      console.error("App: No goals found after reload or forceReloadGoals not available");
    } catch (error) {
      console.error("App: Error forcing reload", error);
    }
  };

  // Debug logging for GatekeeperChat render condition
  {(() => {
    console.log("App: GatekeeperChat render condition:", {
      showGatekeeperChat,
      hasActiveGoal: !!activeGoal,
      goalTitle: activeGoal?.title,
      goalId: activeGoal?.id,
      goalCount: goals?.length || 0,
      contextInitialized: !!forceReloadGoals // Check if context is initialized
    });
    
    // If goals are empty but we have the context functions, try to force load
    if (goals?.length === 0 && typeof forceReloadGoals === 'function') {
      console.log("App: No goals in context but forceReloadGoals available. Triggering reload...");
      forceReloadGoals().then(loadedGoals => {
        console.log(`App: Force reloaded ${loadedGoals.length} goals`);
      });
    }
    
    return null;
  })()}

  // Add a useEffect to directly check localStorage for goals if context fails
  useEffect(() => {
    if (goals?.length === 0 && typeof forceReloadGoals === 'function') {
      console.log("App: Goals context empty, attempting to load directly from localStorage");
      
      // Try direct localStorage access
      const STORAGE_KEY = 'accountability_goals';
      const savedGoals = localStorage.getItem(STORAGE_KEY);
      
      if (savedGoals) {
        try {
          const parsedGoals = JSON.parse(savedGoals);
          if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
            console.log(`App: Found ${parsedGoals.length} goals directly in localStorage. Forcing context reload.`);
            
            // Force context to reload goals
            forceReloadGoals().then(reloadedGoals => {
              console.log(`App: Force reload complete, now have ${reloadedGoals.length} goals in context`);
            });
          } else {
            console.log("App: No goals found in localStorage direct check");
          }
        } catch (error) {
          console.error("App: Error parsing localStorage goals", error);
        }
      } else {
        console.log("App: No goals found in localStorage");
      }
    }
  }, [goals?.length, forceReloadGoals]);

  // Add state for direct goal management in App.tsx
  const [directLocalGoals, setDirectLocalGoals] = useState<any[]>([]);
  // Modify state to track goal and if it's a scheduled check-in
  const [directActiveGoalInfo, setDirectActiveGoalInfo] = useState<{ goal: any | null, isScheduled: boolean }>({ goal: null, isScheduled: false });
  const [directShowGatekeeper, setDirectShowGatekeeper] = useState(false);

  // Load goals directly from localStorage
  useEffect(() => {
    console.log("App: Loading goals directly from localStorage");
    const STORAGE_KEY = 'accountability_goals';
    
    try {
      const savedGoals = localStorage.getItem(STORAGE_KEY);
      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals);
        if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
          console.log(`App: Successfully loaded ${parsedGoals.length} goals directly from localStorage`);
          setDirectLocalGoals(parsedGoals);
        } else {
          console.log("App: No goals found in localStorage or invalid format");
        }
      } else {
        console.log("App: No goals found in localStorage");
      }
    } catch (error) {
      console.error("App: Error loading goals from localStorage", error);
    }
  }, []);

  // Function to directly show the gatekeeper for a specific goal
  const directShowGatekeeperForGoal = (goalId: string, isScheduled: boolean = false) => {
    console.log(`App: Directly showing gatekeeper for goal ID: ${goalId}, Scheduled: ${isScheduled}`);
    
    const goal = directLocalGoals.find(g => g.id === goalId);
    if (goal) {
      console.log(`App: Found goal directly: ${goal.title}`);
      // Set both the goal and the scheduled flag
      setDirectActiveGoalInfo({ goal: goal, isScheduled: isScheduled });
      setDirectShowGatekeeper(true);
    } else {
      console.error(`App: Goal with ID ${goalId} not found in direct local goals`);
    }
  };

  // Function to close the direct gatekeeper
  const directCloseGatekeeper = () => {
    console.log("App: Directly closing gatekeeper");
    setDirectShowGatekeeper(false);
    // Reset the goal info state
    setDirectActiveGoalInfo({ goal: null, isScheduled: false });
  };

  // Function to update a goal directly
  const directUpdateGoal = (goalId: string, updates: any) => {
    console.log(`App: Directly updating goal ${goalId}`, updates);
    
    // Update in local state
    setDirectLocalGoals(prevGoals => {
      const updatedGoals = prevGoals.map(goal => 
        goal.id === goalId ? { ...goal, ...updates } : goal
      );
      
      // Save back to localStorage
      localStorage.setItem('accountability_goals', JSON.stringify(updatedGoals));
      
      // Also save to store service if available
      if (typeof storeService.saveAccountabilityGoals === 'function') {
        storeService.saveAccountabilityGoals(updatedGoals)
          .catch(err => console.error("Error saving updated goals to store service", err));
      }
      
      return updatedGoals;
    });
    
    // Update active goal if it's the one being updated
    if (directActiveGoalInfo.goal && directActiveGoalInfo.goal.id === goalId) {
      // Update the goal within the active goal info state
      setDirectActiveGoalInfo(prev => ({ ...prev, goal: { ...prev.goal, ...updates } }));
    }
  };

  // Add a button to trigger the direct gatekeeper
  useEffect(() => {
    // Expose a function to open the direct gatekeeper from anywhere
    (window as any).directOpenGatekeeperForGoal = directShowGatekeeperForGoal;
    
    // Expose a function to show the first available goal
    (window as any).directShowFirstGoal = () => {
      if (directLocalGoals.length > 0) {
        directShowGatekeeperForGoal(directLocalGoals[0].id);
        return true;
      }
      return false;
    };
  }, [directLocalGoals]);

  // Replace the GatekeeperChat rendering section
  // ... (removed old rendering logic)

  // NEW: Direct GatekeeperChat implementation - Updated to use directActiveGoalInfo
  {directShowGatekeeper && directActiveGoalInfo.goal && directActiveGoalInfo.goal.id && directActiveGoalInfo.goal.title && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[99999] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          directCloseGatekeeper();
        }
      }}
    >
      <div className="relative max-w-2xl w-full">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-t-lg font-medium shadow-lg flex items-center">
          <FiClock className="mr-2" />
          Goal Check-in Required
        </div>
        
        <GatekeeperChat
          // Pass the goal object
          goal={directActiveGoalInfo.goal}
          onClose={directCloseGatekeeper}
          onUpdateGoal={directUpdateGoal}
          apiKey={apiKey || localStorage.getItem('openai_api_key') || ''}
          selectedModel={selectedModel || localStorage.getItem('openai_model') || 'gpt-4o'}
          projects={projects} // Still pass projects from context here, assuming they might be needed eventually
          userContext={userContext}
          // Pass the isScheduled flag as a prop
          isScheduledCheckin={directActiveGoalInfo.isScheduled}
        />
        
        <div style={{ display: 'none' }} id="gatekeeper-chat-debug" data-goal-id={directActiveGoalInfo.goal.id}>
          Direct gatekeeper active for goal: {directActiveGoalInfo.goal.title}
        </div>
      </div>
    </div>
  )}

  // ... (keep isGoalDueForCheckin function) ...

  // Add a useEffect to check for goals that need attention - Update call
  useEffect(() => {
    if (directLocalGoals.length === 0) return;
    
    console.log(`App: Checking ${directLocalGoals.length} goals for check-in needs`);
    const goalsNeedingAttention = directLocalGoals.filter(goal => !goal.isCompleted && isGoalDueForCheckin(goal));
    
    if (goalsNeedingAttention.length > 0) {
      console.log(`App: Found ${goalsNeedingAttention.length} goals needing attention`);
      if (!directShowGatekeeper) {
        const goalToShow = goalsNeedingAttention[0];
        console.log(`App: Auto-showing gatekeeper for goal: ${goalToShow.title}`);
        // Pass true for the isScheduled flag
        directShowGatekeeperForGoal(goalToShow.id, true);
      }
    }
  }, [directLocalGoals, directShowGatekeeper]);

  // Add a periodic check for goals that need attention - Update call
  useEffect(() => {
    if (directLocalGoals.length === 0) return;
    
    console.log('App: Setting up periodic goal check interval');
    const checkGoalsInterval = setInterval(() => {
      if (directShowGatekeeper) return;
      
      console.log('App: Running periodic goal check');
      const goalsNeedingAttention = directLocalGoals.filter(goal => !goal.isCompleted && isGoalDueForCheckin(goal));
      
      if (goalsNeedingAttention.length > 0) {
        const goalToShow = goalsNeedingAttention[0];
        console.log(`App: Auto-showing gatekeeper for goal: ${goalToShow.title}`);
        // Pass true for the isScheduled flag
        directShowGatekeeperForGoal(goalToShow.id, true);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkGoalsInterval);
  }, [directLocalGoals, directShowGatekeeper]);

  // Add a function to check if a goal needs attention based on frequency (Copied from Accountability.tsx)
  const isGoalDueForCheckin = (goal: any) => {
    if (!goal || goal.isCompleted) return false;
    
    const now = new Date();
    const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : null;
    if (!lastChecked) return true; // Never checked
    
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

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Debug indicator for goals needing check-in */}
      {process.env.NODE_ENV === 'development' && goals && goals.length > 0 && (
        <div className="fixed bottom-4 left-4 bg-blue-900 text-white text-xs rounded-lg p-2 shadow-lg z-50">
          <div className="hover:bg-blue-800 p-1 rounded mb-1">
            <div>Goals: {goals.length}</div>
            <div>Need check-in: {goals.filter(g => !g.isCompleted && ((new Date().getTime() - new Date(g.lastChecked).getTime()) >= 60 * 1000)).length}</div>
            <div>Gatekeeper: {showGatekeeperChat ? 'Showing' : 'Hidden'}</div>
            <div>Direct goals: {directLocalGoals.length}</div>
          </div>
          
          <div className="mt-1 grid grid-cols-2 gap-1">
            <button 
              onClick={() => (window as any).forceShowGatekeeperChat()}
              className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-center"
            >
              Show Any Goal
            </button>
            
            <button 
              onClick={() => (window as any).checkInFirstDueGoal()}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-center"
            >
              Check-in Due Goal
            </button>
            
            <button 
              onClick={() => {
                console.log('App: Manual check for goals that need attention');
                
                if (directLocalGoals.length === 0) {
                  console.log('App: No goals available to check');
                  return;
                }
                
                // Find goals that need attention
                const goalsNeedingAttention = directLocalGoals.filter(goal => 
                  !goal.isCompleted && isGoalDueForCheckin(goal)
                );
                
                if (goalsNeedingAttention.length > 0) {
                  console.log(`App: Found ${goalsNeedingAttention.length} goals needing attention`);
                  const goalToShow = goalsNeedingAttention[0];
                  console.log(`App: Showing gatekeeper for goal: ${goalToShow.title}`);
                  directShowGatekeeperForGoal(goalToShow.id);
                } else {
                  console.log('App: No goals need attention right now');
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-center col-span-2"
            >
              Check Due Goals
            </button>
          </div>
        </div>
      )}
    
      
     
      
      {/* ORIGINAL GatekeeperChat - HIDDEN */}
      {false && showGatekeeperChat && activeGoal && activeGoal?.id && activeGoal?.title && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[99999] backdrop-blur-sm"
          onClick={(e) => {
            // Close when clicking overlay (but not the chat itself)
            if (e.target === e.currentTarget) {
              closeGatekeeperChat();
            }
          }}
        >
          <div className="relative max-w-2xl w-full">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-t-lg font-medium shadow-lg flex items-center">
              <FiClock className="mr-2" />
              Goal Check-in Required
            </div>
            
            <GatekeeperChat
              goal={activeGoal as any}
              onClose={closeGatekeeperChat}
              onUpdateGoal={updateGoal}
              apiKey={apiKey || localStorage.getItem('openai_api_key') || ''}
              selectedModel={selectedModel}
              projects={projects}
              userContext={userContext}
            />
            
            <div style={{ display: 'none' }} id="gatekeeper-chat-debug" data-goal-id={activeGoal?.id}>
              Gatekeeper active for goal: {activeGoal?.title}
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: Direct GatekeeperChat implementation */}
      {directShowGatekeeper && directActiveGoalInfo.goal && directActiveGoalInfo.goal.id && directActiveGoalInfo.goal.title && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[99999] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              directCloseGatekeeper();
            }
          }}
        >
          <div className="relative max-w-2xl w-full">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-t-lg font-medium shadow-lg flex items-center">
              <FiClock className="mr-2" />
              Goal Check-in Required
            </div>
            
            <GatekeeperChat
              // Pass the goal object
              goal={directActiveGoalInfo.goal}
              onClose={directCloseGatekeeper}
              onUpdateGoal={directUpdateGoal}
              apiKey={apiKey || localStorage.getItem('openai_api_key') || ''}
              selectedModel={selectedModel || localStorage.getItem('openai_model') || 'gpt-4o'}
              projects={projects} // Still pass projects from context here, assuming they might be needed eventually
              userContext={userContext}
              // Pass the isScheduled flag as a prop
              isScheduledCheckin={directActiveGoalInfo.isScheduled}
            />
            
            <div style={{ display: 'none' }} id="gatekeeper-chat-debug" data-goal-id={directActiveGoalInfo.goal.id}>
              Direct gatekeeper active for goal: {directActiveGoalInfo.goal.title}
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      <Sidebar 
        activeWorkspaceId={activeWorkspaceId}
        workspaces={workspaces}
        setActiveWorkspaceId={setActiveWorkspaceId}
        setActiveTabId={setActiveTabId}
        isAddingWorkspace={isAddingWorkspace}
        setIsAddingWorkspace={setIsAddingWorkspace}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
        addWorkspace={addWorkspace}
        addTab={addTab}
        editingWorkspaceId={editingWorkspaceId}
        // @ts-ignore - Component requires this prop
        setEditingWorkspaceId={setEditingWorkspaceId}
        editName={editName}
        setActiveTabToFirst={setActiveTabId}
        setShowSettings={setShowSettings}
        setShowDashboard={setShowDashboard}
        setShowAIChat={setShowAIChat}
        setShowWriter={setShowWriter}
        setShowTasks={setShowTasks}
        setShowPlan={setShowPlan}
        setShowImages={setShowImages}
        setShowMedia={setShowMedia}
        setShowWebsites={setShowWebsites}
        setShowSubscriptions={setShowSubscriptions}
        setShowAutomations={setShowAutomations}
        setShowAccountability={setShowAccountability}
        showSettings={showSettings}
        showDashboard={showDashboard}
        showAIChat={showAIChat}
        showWriter={showWriter}
        showTasks={showTasks}
        showPlan={showPlan}
        showImages={showImages}
        showMedia={showMedia}
        showWebsites={showWebsites}
        showSubscriptions={showSubscriptions}
        showAutomations={showAutomations}
        showAccountability={showAccountability}
        startEditingWorkspace={startEditingWorkspace}
        saveWorkspaceEdit={saveWorkspaceEdit}
        cancelEdit={cancelEdit}
        startEditingTab={startEditingTab}
        saveTabEdit={saveTabEdit}
        deleteWorkspace={deleteWorkspace}
        closeTab={closeTab}
        setEditName={setEditName}
      />

      <div className="flex-1 flex flex-col">
        {/* Restore the conditional rendering logic for different screens */}
        {showSettings ? (
          <Settings />
        ) : showAIChat ? (
          <AIChat />
        ) : showWriter ? (
          <Writer />
        ) : showTasks ? (
          <Tasks />
        ) : showPlan ? (
          <Plan />
        ) : showImages ? (
          <Images />
        ) : showMedia ? (
          <Media />
        ) : showDashboard ? (
          <Dashboard />
        ) : showSubscriptions ? (
          <Subscriptions />
        ) : showWebsites ? (
          <Websites />
        ) : showAutomations ? (
          <Automations />
        ) : showAccountability ? (
          <Accountability />
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
              // @ts-ignore - Component requires this prop
              openWebviewDevTools={openWebviewDevTools}
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
      
      {/* Add the console viewer component */}
      {!showSettings && !showAIChat && !showWriter && !showTasks && 
       !showPlan && !showImages && !showDashboard && !showSubscriptions && 
       !showWebsites && !showAutomations && !showAccountability && (
        <ConsoleViewer activeTabId={activeTabId} webviewRefs={webviewRefs} />
      )}
    </div>
  );
} 