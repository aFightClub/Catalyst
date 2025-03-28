import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import { FiPlus, FiSettings, FiChrome, FiArrowLeft, FiArrowRight, FiRefreshCw, FiPackage, FiLayout, FiTrash2, FiCode, FiPlay, FiList, FiMessageSquare, FiEdit, FiCheckSquare, FiImage, FiHome, FiDollarSign, FiGlobe, FiLoader, FiClock } from 'react-icons/fi'
import { applyPluginsToWebview, Plugin } from './plugins'
import { pluginManager } from './services/pluginManager'
import { storeService } from './services/storeService'
import Settings from './components/Settings/Settings'
import AIChat from './components/AIChat/AIChat'
import Writer from './components/Writer/Writer'
import Tasks from './components/Tasks/Tasks'
import Images from './components/Images/Images'
import Dashboard from './components/Dashboard/Dashboard'
import Subscriptions from './components/Subscriptions/Subscriptions'
import Websites from './components/Websites/Websites'
import Automations from './components/Automations/Automations'

// Define layout types
enum LayoutType {
  SINGLE = 'single',
  DOUBLE = 'double',
  TRIPLE = 'triple'
}

// Define workflow action types
enum ActionType {
  CLICK = 'click',
  TYPE = 'type',
  NAVIGATE = 'navigate',
  WAIT = 'wait',
  HOVER = 'hover',
  KEYPRESS = 'keypress',
  SUBMIT = 'submit'
}

interface WorkflowAction {
  type: ActionType;
  data: any;
  timestamp: number;
}

interface Workflow {
  id: string;
  name: string;
  actions: WorkflowAction[];
  variables: string[];
  startUrl?: string; // The URL where the workflow should start
}

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isReady: boolean;
}

interface Workspace {
  id: string;
  name: string;
  tabs: Tab[];
  createdAt: string;
}

interface ErasedElement {
  url: string;  // Original URL for backwards compatibility
  domain: string; // Domain where this rule applies
  selector: string; // CSS selector to hide
}

// Convert legacy erased elements to new format during migration
const migrateErasedElements = (elements: any[]): ErasedElement[] => {
  return elements.map(element => {
    // Check if it's already in the new format
    if (element.domain) {
      return element;
    }
    
    // Convert from old format to new format
    try {
      const url = new URL(element.url);
      return {
        url: element.url,
        domain: url.hostname.replace('www.', ''),
        selector: element.selector
      };
    } catch (error) {
      // Fallback if URL parsing fails
      return {
        url: element.url,
        domain: element.url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0],
        selector: element.selector
      };
    }
  });
};

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
      tabs: [{ id: '1', title: 'Google', url: 'https://google.com', isReady: false }],
      createdAt: new Date().toISOString()
    }
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('default');
  const [activeTabId, setActiveTabId] = useState('1');
  const [urlInput, setUrlInput] = useState('');
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  
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

  // UI State for sidebar features
  const [showAIChat, setShowAIChat] = useState(false)
  const [showWriter, setShowWriter] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showImages, setShowImages] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true) // Dashboard shown by default
  const [showSubscriptions, setShowSubscriptions] = useState(false)
  const [showWebsites, setShowWebsites] = useState(false)
  const [showAutomations, setShowAutomations] = useState(false)
  
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

  // Save workspaces debounce timer
  const saveWorkspacesTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Save workspaces to store whenever they change
  useEffect(() => {
    // Don't save if we're just initializing
    if (isInitialized.current) {
      saveWorkspaces(workspaces);
    }
  }, [saveWorkspaces, workspaces]);

  // Save erased elements
  const saveErasedElements = useCallback(async () => {
    try {
      if (erasedElements.length > 0) {
        await storeService.saveErasedElements(erasedElements);
        console.log(`Saved ${erasedElements.length} erased elements`);
      }
    } catch (error) {
      console.error('Failed to save erased elements:', error);
    }
  }, [erasedElements]);

  // Save erased elements to store whenever they change
  useEffect(() => {
    if (isInitialized.current && erasedElements.length > 0) {
      saveErasedElements();
    }
  }, [erasedElements, saveErasedElements]);

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

  // Save workflows to store whenever they change
  useEffect(() => {
    const saveWorkflows = async () => {
      try {
        await storeService.saveWorkflows(workflows);
      } catch (error) {
        console.error('Failed to save workflows:', error);
      }
    };
    saveWorkflows();
  }, [workflows]);

  // Listen for custom workflow run events from settings
  useEffect(() => {
    const handleRunWorkflow = (event: any) => {
      const { workflowId, variables } = event.detail;
      runWorkflowInNewTab(workflowId, variables || {});
    };

    // Add event listener for DOM events
    window.addEventListener('run-workflow', handleRunWorkflow);

    // Clean up
    return () => {
      window.removeEventListener('run-workflow', handleRunWorkflow);
    };
  }, []);

  // Function to run a workflow in a new tab
  const runWorkflowInNewTab = (workflowId: string, variables: {[key: string]: string} = {}) => {
    // Find the workflow by ID
    const workflowToRun = workflows.find(w => w.id === workflowId);
    if (!workflowToRun) {
      console.error('Workflow not found:', workflowId);
      return;
    }

    // Create a new tab in the current workspace
    const newTabId = Date.now().toString();
    const initialUrl = workflowToRun.startUrl || 'about:blank';
    
    const newTab = {
      id: newTabId,
      title: `Running: ${workflowToRun.name}`,
      url: initialUrl,
      isReady: false
    };
    
    // Add the new tab to the current workspace
    setWorkspaces(prevWorkspaces => 
      prevWorkspaces.map(workspace => 
        workspace.id === activeWorkspaceId
          ? { ...workspace, tabs: [...workspace.tabs, newTab] }
          : workspace
      )
    );
    
    setActiveTabId(newTabId);
    
    // Hide settings
    setShowSettings(false);
    
    // We'll run the workflow after the tab has been created and loaded
    // The webview's dom-ready event will trigger this
    
    // We need to store this workflow to run it when the tab is ready
    const pendingWorkflowRun = {
      tabId: newTabId,
      workflow: workflowToRun,
      variables: variables
    };
    setPendingWorkflowRun(pendingWorkflowRun);
  };
  
  // Track pending workflow runs
  const [pendingWorkflowRun, setPendingWorkflowRun] = useState<{tabId: string, workflow: Workflow, variables: {[key: string]: string}} | null>(null);
  
  // Check if we need to run a workflow when a tab becomes ready
  useEffect(() => {
    if (pendingWorkflowRun && 
        activeWorkspace.tabs.some(tab => tab.id === pendingWorkflowRun.tabId && tab.isReady)) {
      // Tab is ready, run the workflow
      const { workflow, variables } = pendingWorkflowRun;
      setTimeout(() => {
        playWorkflow(workflow, variables);
        setPendingWorkflowRun(null);
      }, 1000); // Small delay to ensure the page is fully loaded
    }
  }, [workspaces, pendingWorkflowRun, activeWorkspace]);

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

  // Apply erased elements CSS to a webview based on URL
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
        .map(element => `${element.selector} { display: none !important; }`)
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

  // Add a tab to the current workspace
  const addTab = () => {
    const newTab = {
      id: Date.now().toString(),
      title: 'New Tab',
      url: 'https://google.com',
      isReady: false
    };
    
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

  // Navigate to a URL in the current tab
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
                    ? { ...tab, url: processedUrl, title: 'Loading...' } 
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
  
  // Add state for tracking loading status
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set());
  
  // Apply plugins to a specific tab
  const applyPluginsToTab = async (tabId: string) => {
    const webview = webviewRefs.current[tabId];
    if (!webview) return;
    
    try {
      console.log(`Applying plugins to tab ${tabId}`);
      
      // Apply plugins from plugin manager
      const plugins = pluginManager.getPlugins().filter(p => p.enabled);
      
      // Apply all plugins at once instead of individually
      await applyPluginsToWebview(webview);
    } catch (error) {
      console.error(`Error applying plugins to tab ${tabId}:`, error);
    }
  };

  // Update handleWebviewRef to track loading state and enhance it
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
        // We'll let did-stop-loading handle the erased elements and plugins
      });
      
      webview.addEventListener('did-start-loading', () => {
        // Set loading flag
        isLoading = true;
        
        // Set tab to loading state
        setLoadingTabs(prev => new Set([...prev, tabId]));
        
        // Update tab title to show loading
        setWorkspaces(prevWorkspaces => 
          prevWorkspaces.map(workspace => {
            const tabExists = workspace.tabs.some(tab => tab.id === tabId);
            if (tabExists) {
              return {
                ...workspace,
                tabs: workspace.tabs.map(tab => 
                  tab.id === tabId 
                    ? { ...tab, title: 'Loading...', isReady: false } 
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
          // Clear loading state immediately
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
                          title: title || url.replace(/^https?:\/\//, '').split('/')[0],
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
          
          // Make sure we clear loading state on error too
          setLoadingTabs(prev => {
            const newSet = new Set(prev);
            newSet.delete(tabId);
            return newSet;
          });
          
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
                      ? { ...tab, title: newTitle } 
                      : tab
                  )
                };
              }
              return workspace;
            })
          );
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

  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId)
    if (activeTab) {
      setUrlInput(activeTab.url)
    }
  }, [activeTabId, tabs])

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
        />
      </div>
    );
  };

  // Function to render the layout based on currentLayout
  const renderLayout = () => {
    const currentWorkspaceTabs = activeWorkspace?.tabs || [];
    
    switch (currentLayout) {
      case LayoutType.SINGLE:
        return (
          <main className="flex-1 p-2.5 pt-0">
            {currentWorkspaceTabs.map(tab => (
              <div
                key={tab.id}
                style={{ display: activeTabId === tab.id ? 'block' : 'none', height: '100%' }}
                className="rounded-md overflow-hidden shadow-lg"
              >
                {renderWebviewWithLoader(tab.id, tab.url)}
              </div>
            ))}
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
    }
  };

  // Start recording a new workflow
  const startRecording = () => {
    setIsRecording(true);
    setCurrentRecording([]);
    setShowWorkflowModal(false); // Close the modal when starting recording
    
    const webview = webviewRefs.current[activeTabId];
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    
    if (webview && currentTab) {
      // Store the initial URL for this workflow
      const initialUrl = currentTab.url;
      
      // Record initial navigation action
      setCurrentRecording([{
        type: ActionType.NAVIGATE,
        data: {
          url: initialUrl
        },
        timestamp: Date.now()
      }]);
      
      // Inject recording script
      webview.executeJavaScript(`
        (function() {
          window.workflowRecording = true;
          
          // Create recording UI indicator
          const indicator = document.createElement('div');
          indicator.id = 'workflow-recording-indicator';
          indicator.style.position = 'fixed';
          indicator.style.top = '10px';
          indicator.style.right = '10px';
          indicator.style.backgroundColor = 'rgba(220, 38, 38, 0.8)';
          indicator.style.color = 'white';
          indicator.style.padding = '5px 10px';
          indicator.style.borderRadius = '4px';
          indicator.style.zIndex = '999999';
          indicator.style.fontFamily = 'Arial, sans-serif';
          indicator.style.fontSize = '12px';
          indicator.textContent = 'Recording...';
          document.body.appendChild(indicator);
          
          // Track clicks
          window.addEventListener('click', (e) => {
            if (!window.workflowRecording) return;
            
            // Get path to element
            let path = [];
            let element = e.target;
            
            if (element.id) {
              path.push('#' + element.id);
            } else {
              let selector = element.tagName.toLowerCase();
              
              // Add classes (max 2)
              if (element.classList && element.classList.length) {
                const classes = Array.from(element.classList).slice(0, 2);
                selector += classes.map(c => '.' + c).join('');
              }
              
              // Add position if needed
              let siblings = Array.from(element.parentNode.children).filter(
                el => el.tagName === element.tagName
              );
              
              if (siblings.length > 1) {
                const index = siblings.indexOf(element);
                selector += ':nth-child(' + (index + 1) + ')';
              }
              
              path.push(selector);
            }
            
            // Log the action
            console.log('WORKFLOW_ACTION:' + JSON.stringify({
              type: 'click',
              data: {
                selector: path.join(' '),
                x: e.clientX,
                y: e.clientY,
                text: element.textContent?.trim()
              },
              timestamp: Date.now()
            }));
          }, true);
          
          // Track input values (consolidated approach)
          const inputElements = new WeakMap();
          
          // Track input and change events
          const trackInput = (e) => {
            if (!window.workflowRecording || !e.target || 
                !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return;
            
            const element = e.target;
            
            // Create a selector for the element if we haven't tracked it yet
            if (!inputElements.has(element)) {
              let selector = '';
              if (element.id) {
                selector = '#' + element.id;
              } else {
                selector = element.tagName.toLowerCase();
                
                if (element.classList && element.classList.length) {
                  const classes = Array.from(element.classList).slice(0, 2);
                  selector += classes.map(c => '.' + c).join('');
                }
                
                if (element.name) {
                  selector += '[name="' + element.name + '"]';
                }
              }
              
              // Initial setup - track the element
              inputElements.set(element, { 
                selector: selector,
                value: element.value,
                lastValue: '',
                lastLogged: 0
              });
              
              // Add event listeners for capturing final value
              element.addEventListener('blur', () => {
                captureInputValue(element);
              });
              
              // Handle form submissions
              if (element.form) {
                element.form.addEventListener('submit', () => {
                  captureInputValue(element);
                });
              }
              
              // Handle Enter key press
              element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && element instanceof HTMLInputElement) {
                  captureInputValue(element);
                  
                  // Also log the Enter key press
                  console.log('WORKFLOW_ACTION:' + JSON.stringify({
                    type: 'keypress',
                    data: {
                      key: 'Enter',
                      selector: inputElements.get(element).selector
                    },
                    timestamp: Date.now()
                  }));
                }
              });
            }
            
            // Always update the current value
            const data = inputElements.get(element);
            data.value = element.value;
            inputElements.set(element, data);
          };
          
          // Function to capture and log input value changes
          const captureInputValue = (element) => {
            if (!inputElements.has(element)) return;
            
            const data = inputElements.get(element);
            const currentValue = element.value;
            
            // Only log if the value has changed and is not empty
            if (currentValue && 
                currentValue.trim() && 
                currentValue !== data.lastValue) {
              
              console.log('WORKFLOW_ACTION:' + JSON.stringify({
                type: 'type',
                data: {
                  selector: data.selector,
                  value: currentValue,
                  placeholder: element.placeholder || ''
                },
                timestamp: Date.now()
              }));
              
              // Update last value
              data.lastValue = currentValue;
              inputElements.set(element, data);
            }
          };
          
          // Check inputs periodically to capture ongoing typing
          const checkInputsInterval = setInterval(() => {
            if (!window.workflowRecording) {
              clearInterval(checkInputsInterval);
              return;
            }
            
            // Check all active input elements
            document.querySelectorAll('input:focus, textarea:focus').forEach(element => {
              if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && 
                  inputElements.has(element)) {
                captureInputValue(element);
              }
            });
          }, 2000);  // Check every 2 seconds
          
          // Attach input tracking
          document.addEventListener('input', trackInput, true);
          document.addEventListener('change', trackInput, true);
          
          // Track any existing input fields that might already have content
          document.querySelectorAll('input, textarea').forEach(element => {
            if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && 
                element.value && element.value.trim()) {
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
          
          // Track forms for submission
          document.addEventListener('submit', (e) => {
            if (!window.workflowRecording) return;
            
            const form = e.target;
            if (form instanceof HTMLFormElement) {
              // Log the form submission
              const formSelector = form.id ? "#" + form.id : "form";
              
              console.log('WORKFLOW_ACTION:' + JSON.stringify({
                type: 'submit',
                data: {
                  selector: formSelector,
                  action: form.action || window.location.href
                },
                timestamp: Date.now()
              }));
            }
          }, true);
          
          // Track keyboard events for Enter key
          document.addEventListener('keydown', (e) => {
            if (!window.workflowRecording) return;
            
            // Only capture Enter key to avoid noise
            if (e.key === 'Enter') {
              // Avoid duplicating Enter on inputs (already handled above)
              if (!(e.target instanceof HTMLInputElement)) {
                const targetSelector = e.target 
                  ? e.target.tagName.toLowerCase() 
                  : 'document';
                  
                console.log('WORKFLOW_ACTION:' + JSON.stringify({
                  type: 'keypress',
                  data: {
                    key: 'Enter',
                    selector: targetSelector,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey
                  },
                  timestamp: Date.now()
                }));
              }
            }
          }, true);
          
          // Track navigation
          const originalPushState = history.pushState;
          history.pushState = function() {
            originalPushState.apply(this, arguments);
            
            if (window.workflowRecording) {
              console.log('WORKFLOW_ACTION:' + JSON.stringify({
                type: 'navigate',
                data: {
                  url: window.location.href
                },
                timestamp: Date.now()
              }));
            }
          };
          
          window.addEventListener('popstate', () => {
            if (window.workflowRecording) {
              console.log('WORKFLOW_ACTION:' + JSON.stringify({
                type: 'navigate',
                data: {
                  url: window.location.href
                },
                timestamp: Date.now()
              }));
            }
          });
        })();
      `);
      
      // Listen for workflow action events
      webview.addEventListener('console-message', handleWorkflowConsoleMessage);
    }
  };

  // Stop recording the current workflow
  const stopRecording = () => {
    setIsRecording(false);
    
    const webview = webviewRefs.current[activeTabId];
    if (webview) {
      // Remove recording indicator and cleanup
      webview.executeJavaScript(`
        (function() {
          window.workflowRecording = false;
          const indicator = document.getElementById('workflow-recording-indicator');
          if (indicator) indicator.remove();
        })();
      `);
      
      // Remove console message listener
      webview.removeEventListener('console-message', handleWorkflowConsoleMessage);
      
      // Process variables in the recording
      processWorkflowVariables();
    }
  };

  // Process the recorded workflow to identify variables
  const processWorkflowVariables = () => {
    // Extract text inputs that might contain variables
    const typeActions = currentRecording.filter(action => action.type === ActionType.TYPE);
    const variableMap: {[key: string]: string} = {};
    
    typeActions.forEach((action, index) => {
      const varName = `var_${index + 1}`;
      variableMap[varName] = action.data.value;
      
      // Update the action to use the variable
      action.data.variableName = varName;
    });
    
    setWorkflowVariables(variableMap);
  };

  // Handle console messages from the webview for workflow recording
  const handleWorkflowConsoleMessage = (event: any) => {
    const message = event.message;
    if (message.startsWith('WORKFLOW_ACTION:')) {
      try {
        const action = JSON.parse(message.substring('WORKFLOW_ACTION:'.length));
        setCurrentRecording(prev => [...prev, action]);
      } catch (error) {
        console.error('Error parsing workflow action:', error);
      }
    }
  };

  // Save the current recording as a workflow
  const saveWorkflow = () => {
    if (currentRecording.length === 0 || !newWorkflowName.trim()) {
      return;
    }
    
    // Extract variables
    const variables = Object.keys(workflowVariables);
    
    // Get the starting URL from the first navigation action
    const firstNavAction = currentRecording.find(action => action.type === ActionType.NAVIGATE);
    const startUrl = firstNavAction ? firstNavAction.data.url : '';
    
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: newWorkflowName.trim(),
      actions: currentRecording,
      variables,
      startUrl
    };
    
    setWorkflows(prev => [...prev, newWorkflow]);
    setCurrentRecording([]);
    setNewWorkflowName('');
    setShowWorkflowModal(false);
    setWorkflowVariables({});
  };

  // Play back a saved workflow
  const playWorkflow = async (workflow: Workflow, variables: {[key: string]: string}) => {
    const webview = webviewRefs.current[activeTabId];
    if (!webview || !tabs.find(tab => tab.id === activeTabId)?.isReady) return;
    
    try {
      // First navigate to the starting URL if it exists
      if (workflow.startUrl) {
        // Update the tab URL
        setWorkspaces(prevWorkspaces => 
          prevWorkspaces.map(workspace => 
            workspace.id === activeWorkspaceId
              ? { 
                  ...workspace, 
                  tabs: workspace.tabs.map(tab => 
                    tab.id === activeTabId 
                      ? { ...tab, url: workflow.startUrl || tab.url, title: 'Loading...' } 
                      : tab
                  ) 
                }
              : workspace
          )
        );
        
        setUrlInput(workflow.startUrl);
        
        // Navigate to the URL
        await webview.loadURL(workflow.startUrl);
        
        // Wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Now play the rest of the workflow actions
      for (const action of workflow.actions) {
        // Skip the initial navigation action since we already handled it
        if (action.type === ActionType.NAVIGATE && action.data.url === workflow.startUrl) {
          continue;
        }
        
        switch (action.type) {
          case ActionType.CLICK:
            await webview.executeJavaScript(`
              (function() {
                try {
                  const element = document.querySelector('${action.data.selector}');
                  if (element) {
                    element.click();
                    return true;
                  }
                  return false;
                } catch (e) {
                  console.error('Failed to click element:', e);
                  return false;
                }
              })();
            `);
            break;
          
          case ActionType.TYPE:
            // Use variable value if available
            let textValue = action.data.value;
            if (action.data.variableName && variables[action.data.variableName]) {
              textValue = variables[action.data.variableName];
            }
            
            await webview.executeJavaScript(`
              (function() {
                try {
                  const element = document.querySelector('${action.data.selector}');
                  if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
                    element.value = ${JSON.stringify(textValue)};
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.focus();
                    return true;
                  }
                  return false;
                } catch (e) {
                  console.error('Failed to type in element:', e);
                  return false;
                }
              })();
            `);
            break;
          
          case ActionType.KEYPRESS:
            // Handle key press events like Enter
            if (action.data.key === 'Enter') {
              await webview.executeJavaScript(`
                (function() {
                  try {
                    const element = document.querySelector('${action.data.selector}');
                    if (element) {
                      // Focus the element first
                      element.focus();
                      
                      // Create and dispatch an Enter keydown event
                      const keyEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                      });
                      element.dispatchEvent(keyEvent);
                      
                      return true;
                    } else {
                      // If no specific element, dispatch on the document
                      document.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                      }));
                      return true;
                    }
                  } catch (e) {
                    console.error('Failed to send key event:', e);
                    return false;
                  }
                })();
              `);
            }
            break;
          
          case ActionType.NAVIGATE:
            try {
              await webview.loadURL(action.data.url);
            } catch (e) {
              console.error('Failed to navigate:', e);
            }
            break;
          
          case ActionType.SUBMIT:
            await webview.executeJavaScript(`
              (function() {
                try {
                  const form = document.querySelector('${action.data.selector}');
                  if (form && form instanceof HTMLFormElement) {
                    form.submit();
                    return true;
                  }
                  return false;
                } catch (e) {
                  console.error('Failed to submit form:', e);
                  return false;
                }
              })();
            `);
            break;
          
          case ActionType.WAIT:
            await new Promise(resolve => setTimeout(resolve, action.data.duration || 1000));
            break;
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Failed to play back workflow:', error);
    }
  };

  // Modal for creating or viewing workflows
  const renderWorkflowModal = () => {
    if (!showWorkflowModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg shadow-lg w-1/2 max-h-[80vh] overflow-auto">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">
              {workflowModalMode === 'create' ? 'Create Workflow' : 'Workflows'}
            </h2>
          </div>
          
          <div className="p-4">
            {workflowModalMode === 'create' ? (
              <>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Workflow Name</label>
                  <input
                    type="text"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter workflow name"
                  />
                </div>
                
                {isRecording ? (
                  <div className="mb-4 text-center">
                    <div className="text-red-400 mb-2 flex items-center justify-center">
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                      Recording in progress
                    </div>
                    <p className="text-gray-400 mb-4">
                      Perform actions on the page and they will be recorded.
                      Click "Stop Recording" when done.
                    </p>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Stop Recording
                    </button>
                  </div>
                ) : (
                  <>
                    {currentRecording.length > 0 ? (
                      <div className="mb-4">
                        <h3 className="text-white font-medium mb-2">Recorded Actions</h3>
                        <div className="bg-gray-900 p-3 rounded mb-4 max-h-60 overflow-auto">
                          {currentRecording.map((action, index) => (
                            <div key={index} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
                              <div className="flex justify-between">
                                <span className="text-blue-400">
                                  {action.type.toUpperCase()}
                                </span>
                                <span className="text-gray-500 text-sm">
                                  {new Date(action.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              {action.type === ActionType.CLICK && (
                                <div className="text-gray-300 text-sm">
                                  Clicked: {action.data.text || action.data.selector}
                                </div>
                              )}
                              {action.type === ActionType.TYPE && (
                                <div className="text-gray-300 text-sm">
                                  Typed: 
                                  <input
                                    type="text"
                                    className="ml-2 bg-gray-700 px-2 py-1 rounded text-white w-4/5"
                                    defaultValue={action.data.value}
                                    placeholder={action.data.placeholder}
                                    onChange={(e) => {
                                      const varName = action.data.variableName;
                                      if (varName) {
                                        setWorkflowVariables(prev => ({
                                          ...prev,
                                          [varName]: e.target.value
                                        }));
                                      }
                                    }}
                                  />
                                </div>
                              )}
                              {action.type === ActionType.NAVIGATE && (
                                <div className="text-gray-300 text-sm">
                                  Navigated to: {action.data.url}
                                </div>
                              )}
                              {action.type === ActionType.KEYPRESS && (
                                <div className="text-gray-300 text-sm">
                                  Key pressed: {action.data.key}
                                </div>
                              )}
                              {action.type === ActionType.SUBMIT && (
                                <div className="text-gray-300 text-sm">
                                  Form submitted: {action.data.selector}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={saveWorkflow}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save Workflow
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 text-center">
                        <p className="text-gray-400 mb-4">
                          Click "Start Recording" to begin capturing actions.
                        </p>
                        <button
                          onClick={startRecording}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Start Recording
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {workflows.length > 0 ? (
                  <div>
                    <h3 className="text-white font-medium mb-2">Saved Workflows</h3>
                    <div className="space-y-3 mb-4">
                      {workflows.map(workflow => (
                        <div 
                          key={workflow.id} 
                          className="bg-gray-700 rounded p-3 hover:bg-gray-600 cursor-pointer"
                          onClick={() => setSelectedWorkflow(workflow)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-white font-medium">
                              {workflow.name}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkflow(workflow);
                                  // Show variable input form if there are variables
                                  if (workflow.variables.length > 0) {
                                    const varMap = {} as {[key: string]: string};
                                    workflow.variables.forEach(v => {
                                      const action = workflow.actions.find(a => 
                                        a.type === ActionType.TYPE && a.data.variableName === v
                                      );
                                      varMap[v] = action?.data.value || '';
                                    });
                                    setWorkflowVariables(varMap);
                                  } else {
                                    // Play workflow immediately if no variables
                                    playWorkflow(workflow, {});
                                  }
                                }}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                                title="Run Workflow"
                              >
                                <FiPlay className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkflows(workflows.filter(w => w.id !== workflow.id));
                                }}
                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                title="Delete Workflow"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-gray-400 text-sm">
                            {workflow.actions.length} actions
                            {workflow.variables.length > 0 && ` • ${workflow.variables.length} variables`}
                            {workflow.startUrl && (
                              <div className="mt-1 truncate">
                                <span className="text-gray-500">URL:</span> {workflow.startUrl}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No workflows saved yet. Create one to get started.
                  </div>
                )}
                
                {selectedWorkflow && selectedWorkflow.variables.length > 0 && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-white font-medium mb-3">
                      Run Workflow: {selectedWorkflow.name}
                    </h3>
                    
                    <div className="space-y-3 mb-4">
                      {selectedWorkflow.variables.map(varName => {
                        const action = selectedWorkflow.actions.find(a => 
                          a.type === ActionType.TYPE && a.data.variableName === varName
                        );
                        
                        return (
                          <div key={varName} className="mb-3">
                            <label className="block text-gray-300 mb-1">
                              {action?.data.placeholder || 'Input'} ({varName})
                            </label>
                            <input
                              type="text"
                              className="w-full bg-gray-700 px-3 py-2 rounded text-white"
                              defaultValue={action?.data.value || ''}
                              onChange={(e) => {
                                setWorkflowVariables(prev => ({
                                  ...prev,
                                  [varName]: e.target.value
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                      
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            playWorkflow(selectedWorkflow, workflowVariables);
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
              </>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-700 flex justify-between">
            {workflowModalMode === 'create' ? (
              <button
                onClick={() => {
                  setWorkflowModalMode('list');
                  if (isRecording) {
                    stopRecording();
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Saved Workflows
              </button>
            ) : (
              <button
                onClick={() => {
                  setWorkflowModalMode('create');
                  setSelectedWorkflow(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create New Workflow
              </button>
            )}
            
            <button
              onClick={() => {
                setShowWorkflowModal(false);
                if (isRecording) {
                  stopRecording();
                }
                setSelectedWorkflow(null);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add a new workspace
  const addWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    
    // Generate unique ID for workspace and first tab
    const workspaceId = Date.now().toString();
    const tabId = `${workspaceId}-tab1`;
    
    console.log(`Creating new workspace: ${newWorkspaceName.trim()} with ID ${workspaceId} and tab ${tabId}`);
    
    const newWorkspace: Workspace = {
      id: workspaceId,
      name: newWorkspaceName.trim(),
      tabs: [{ id: tabId, title: 'New Tab', url: 'https://google.com', isReady: false }],
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

  // Delete a workspace
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

  // Close a tab
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

  return (
    <div className="h-screen flex">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col pt-12">
        <div className="flex flex-col">
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
            className={`w-full p-2 mb-2 rounded-lg ${showDashboard ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiHome className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
        </div>

        <div className="text-sm font-medium text-gray-400 px-4 py-2 flex justify-between items-center">
          <span>Workspaces</span>
          <button 
            onClick={() => setIsAddingWorkspace(true)}
            className="p-1 hover:bg-gray-700 rounded"
            title="Add New Workspace"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
        
        {isAddingWorkspace && (
          <div className="px-4 py-2 mb-2">
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
        
        <div className="flex-1 overflow-y-auto mb-2">
          {workspaces.map(workspace => (
            <div
              key={workspace.id}
              className={`mb-2 ${activeWorkspaceId === workspace.id ? 'bg-gray-700' : ''}`}
            >
              <div 
                className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-700"
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
                }}
              >
                <div className="flex items-center">
                  <FiPackage className="w-4 h-4 mr-2" />
                  <span className="font-medium">{workspace.name}</span>
                </div>
                
                {workspaces.length > 1 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWorkspace(workspace.id);
                    }}
                    className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Workspace"
                  >
                    &times;
                  </button>
                )}
              </div>
              
              {/* Show tabs for active workspace */}
              {activeWorkspaceId === workspace.id && !showDashboard && 
               !showSettings && !showAIChat && !showWriter && !showTasks && 
               !showImages && !showSubscriptions && !showWebsites && (
                <div className="ml-4 border-l border-gray-700 pl-2">
                  {workspace.tabs.map(tab => (
                    <div
                      key={tab.id}
                      className={`px-2 py-1 cursor-pointer flex items-center justify-between group ${
                        activeTabId === tab.id ? 'bg-gray-600' : 'hover:bg-gray-600'
                      }`}
                    >
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
                      <button
                        className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(workspace.id, tab.id);
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  
                  {/* Add New Tab button inside workspace */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addTab();
                    }}
                    className="w-full mt-1 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-600 rounded flex items-center"
                  >
                    <FiPlus className="mr-1 w-3 h-3" />
                    <span>New Tab</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-2 pb-2 space-y-2 border-t border-gray-700 pt-2">
          <button 
            onClick={() => {
              setShowAIChat(!showAIChat)
              setShowDashboard(false)
              setShowSettings(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowImages(false)
              setShowSubscriptions(false)
              setShowWebsites(false)
            }}
            className={`w-full p-2 rounded-lg ${showAIChat ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiMessageSquare className="w-5 h-5" />
            <span>AI Chat</span>
          </button>
          
          <button 
            onClick={() => {
              setShowWriter(!showWriter)
              setShowDashboard(false)
              setShowSettings(false)
              setShowAIChat(false)
              setShowTasks(false)
              setShowImages(false)
              setShowSubscriptions(false)
              setShowWebsites(false)
            }}
            className={`w-full p-2 rounded-lg ${showWriter ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiEdit className="w-5 h-5" />
            <span>Writer</span>
          </button>
          
          <button 
            onClick={() => {
              setShowTasks(!showTasks)
              setShowDashboard(false)
              setShowSettings(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowImages(false)
              setShowSubscriptions(false)
              setShowWebsites(false)
            }}
            className={`w-full p-2 rounded-lg ${showTasks ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiCheckSquare className="w-5 h-5" />
            <span>Tasks</span>
          </button>
          
          <button 
            onClick={() => {
              setShowImages(!showImages)
              setShowDashboard(false)
              setShowSettings(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowSubscriptions(false)
              setShowWebsites(false)
            }}
            className={`w-full p-2 rounded-lg ${showImages ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiImage className="w-5 h-5" />
            <span>Images</span>
          </button>
          
          <button 
            onClick={() => {
              setShowWebsites(!showWebsites)
              setShowDashboard(false)
              setShowSettings(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowImages(false)
              setShowSubscriptions(false)
              setShowAutomations(false)
            }}
            className={`w-full p-2 rounded-lg ${showWebsites ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiGlobe className="w-5 h-5" />
            <span>Websites</span>
          </button>
          
          <button 
            onClick={() => {
              setShowSubscriptions(!showSubscriptions)
              setShowDashboard(false)
              setShowSettings(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowImages(false)
              setShowWebsites(false)
              setShowAutomations(false)
            }}
            className={`w-full p-2 rounded-lg ${showSubscriptions ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiDollarSign className="w-5 h-5" />
            <span>Subscriptions</span>
          </button>
          
          <button 
            onClick={() => {
              setShowAutomations(!showAutomations)
              setShowDashboard(false)
              setShowSettings(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowImages(false)
              setShowWebsites(false)
              setShowSubscriptions(false)
            }}
            className={`w-full p-2 rounded-lg ${showAutomations ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiClock className="w-5 h-5" />
            <span>Automations</span>
          </button>
          
          <button 
            onClick={() => {
              setShowSettings(!showSettings)
              setShowDashboard(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowImages(false)
              setShowSubscriptions(false)
              setShowWebsites(false)
            }}
            className={`w-full p-2 rounded-lg ${showSettings ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiSettings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

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
            <div className="h-14 bg-gray-800 flex items-center px-4 space-x-2">
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
              
              <div className="mr-2 px-2 py-1 bg-gray-700 rounded text-sm">
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
                        View Workflows
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
                        onClick={() => {
                          setCurrentLayout(LayoutType.SINGLE);
                          setShowLayoutDropdown(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg mb-1 hover:bg-gray-700 ${currentLayout === LayoutType.SINGLE ? 'bg-blue-600' : ''}`}
                      >
                        Single View
                      </button>
                      <button
                        onClick={() => {
                          setCurrentLayout(LayoutType.DOUBLE);
                          setShowLayoutDropdown(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg mb-1 hover:bg-gray-700 ${currentLayout === LayoutType.DOUBLE ? 'bg-blue-600' : ''}`}
                      >
                        Double View
                      </button>
                      <button
                        onClick={() => {
                          setCurrentLayout(LayoutType.TRIPLE);
                          setShowLayoutDropdown(false);
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

            {/* Use the dynamic layout renderer */}
            {renderLayout()}
          </>
        )}
      </div>
      
      {/* Workflow Modal */}
      {renderWorkflowModal()}

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
    </div>
  )
} 