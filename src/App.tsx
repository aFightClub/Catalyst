import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import { FiPlus, FiSettings, FiChrome, FiArrowLeft, FiArrowRight, FiRefreshCw, FiPackage, FiLayout, FiTrash2, FiCode, FiPlay, FiList, FiMessageSquare, FiEdit, FiCheckSquare, FiImage, FiHome } from 'react-icons/fi'
import { applyPluginsToWebview, Plugin } from './plugins'
import { pluginManager } from './services/pluginManager'
import Settings from './components/Settings/Settings'
import AIChat from './components/AIChat/AIChat'
import Writer from './components/Writer/Writer'
import Tasks from './components/Tasks/Tasks'
import Images from './components/Images/Images'
import Dashboard from './components/Dashboard/Dashboard'

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
  HOVER = 'hover'
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
}

interface Tab {
  id: string
  title: string
  url: string
  favicon?: string
  isReady?: boolean
}

interface ErasedElement {
  url: string;
  selector: string;
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Google', url: 'https://google.com', isReady: false }
  ])
  const [activeTabId, setActiveTabId] = useState('1')
  const [urlInput, setUrlInput] = useState('')
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
  
  // Load erased elements from localStorage
  useEffect(() => {
    const storedElements = localStorage.getItem('erased_elements');
    if (storedElements) {
      try {
        setErasedElements(JSON.parse(storedElements));
      } catch (error) {
        console.error('Failed to parse erased elements:', error);
      }
    }
  }, []);

  // Save erased elements to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('erased_elements', JSON.stringify(erasedElements));
  }, [erasedElements]);

  // Load workflows from localStorage
  useEffect(() => {
    const storedWorkflows = localStorage.getItem('workflows');
    if (storedWorkflows) {
      try {
        setWorkflows(JSON.parse(storedWorkflows));
      } catch (error) {
        console.error('Failed to parse stored workflows:', error);
      }
    }
  }, []);

  // Save workflows to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('workflows', JSON.stringify(workflows));
  }, [workflows]);

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
            selector: data.selector
          };
          
          // Add to erased elements
          setErasedElements(prev => {
            // Check for duplicates
            const exists = prev.some(el => 
              el.url === newErasedElement.url && 
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

  // Apply erased elements CSS when a page loads
  const applyErasedElementsCSS = useCallback(async (webview: Electron.WebviewTag, url: string) => {
    try {
      // Match by hostname to apply eraser rules across pages on the same site
      const hostname = new URL(url).hostname;
      
      // Filter elements by hostname
      const elementsForUrl = erasedElements.filter(element => {
        try {
          return new URL(element.url).hostname === hostname;
        } catch (e) {
          return false;
        }
      });
      
      if (elementsForUrl.length > 0) {
        console.log(`Applying ${elementsForUrl.length} erased elements for ${hostname}`);
        
        // Generate CSS
        const selectors = elementsForUrl.map(element => element.selector).join(', ');
        const css = `${selectors} { display: none !important; opacity: 0 !important; visibility: hidden !important; }`;
        
        // Apply CSS with retry mechanism
        const applyCSS = async (retryCount = 0) => {
          try {
            await webview.executeJavaScript(`
              (function() {
                // First remove any existing eraser styles
                const existingStyle = document.getElementById('eraser-styles');
                if (existingStyle) existingStyle.remove();
                
                // Create a new style element
                const style = document.createElement('style');
                style.id = 'eraser-styles';
                style.textContent = ${JSON.stringify(css)};
                
                // Append to head if it exists, otherwise to document
                if (document.head) {
                  document.head.appendChild(style);
                } else if (document.documentElement) {
                  document.documentElement.appendChild(style);
                }
                
                console.log('Applied eraser CSS: ${elementsForUrl.length} selectors');
                return true;
              })();
            `);
            console.log('Successfully applied eraser CSS');
          } catch (error) {
            console.error('Error applying eraser CSS:', error);
            
            // Retry up to 3 times with increasing delay
            if (retryCount < 3) {
              console.log(`Retrying CSS application (${retryCount + 1}/3) in ${(retryCount + 1) * 300}ms`);
              setTimeout(() => applyCSS(retryCount + 1), (retryCount + 1) * 300);
            }
          }
        };
        
        await applyCSS();
      }
    } catch (error) {
      console.error('Error in applyErasedElementsCSS:', error);
    }
  }, [erasedElements]);

  const addTab = () => {
    const newTab = {
      id: Date.now().toString(),
      title: 'New Tab',
      url: 'https://google.com',
      isReady: false
    }
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  const navigateToUrl = (url: string) => {
    const processedUrl = url.startsWith('http') ? url : `https://${url}`
    const activeTab = tabs.find(tab => tab.id === activeTabId)
    if (activeTab) {
      const updatedTabs = tabs.map(tab => 
        tab.id === activeTabId ? { ...tab, url: processedUrl, title: 'Loading...' } : tab
      )
      setTabs(updatedTabs)
      setUrlInput(processedUrl)
      
      const webview = webviewRefs.current[activeTabId]
      if (webview && activeTab.isReady) {
        try {
          webview.loadURL(processedUrl)
        } catch (error) {
          console.error('Error loading URL:', error)
        }
      }
    }
  }

  const setupWebviewEvents = useCallback((webview: Electron.WebviewTag, tabId: string) => {
    webview.addEventListener('dom-ready', async () => {
      console.log('WebView DOM ready for tab:', tabId)
      
      setTabs(tabs => tabs.map(tab => 
        tab.id === tabId ? { ...tab, isReady: true } : tab
      ))
      
      if (!initialLoadCompleted.current.has(tabId)) {
        initialLoadCompleted.current.add(tabId)
        
        // Wait for the page to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        try {
          // Apply plugins
          await applyPluginsToTab(tabId)
          
          // Apply erased elements CSS
          const tab = tabs.find(t => t.id === tabId);
          if (tab) {
            applyErasedElementsCSS(webview, tab.url);
          }
        } catch (error) {
          console.error('Failed to apply page modifications:', error)
        }
      }
    })
    
    webview.addEventListener('did-finish-load', async () => {
      handleWebviewLoad(tabId)
      
      // Also apply erased elements CSS here to ensure they persist after navigation
      try {
        const tab = tabs.find(t => t.id === tabId);
        if (tab && tab.isReady) {
          await applyErasedElementsCSS(webview, tab.url);
        }
      } catch (error) {
        console.error('Failed to apply erased elements CSS:', error)
      }
    })
    
    webview.addEventListener('did-fail-load', (event: any) => {
      console.error(`Failed to load: ${event.errorDescription}`)
      setTabs(tabs => tabs.map(tab =>
        tab.id === tabId ? { ...tab, title: 'Error Loading Page' } : tab
      ))
    })
    
    webview.addEventListener('page-title-updated', (event: any) => {
      const title = event.title
      setTabs(tabs => tabs.map(tab =>
        tab.id === tabId ? { ...tab, title } : tab
      ))
    })
    
    webview.addEventListener('did-navigate', async () => {
      handleWebviewLoad(tabId)
      
      // Re-apply erased elements after navigation
      try {
        const tab = tabs.find(t => t.id === tabId);
        if (tab && tab.isReady) {
          // Add a small delay to ensure the DOM is ready
          setTimeout(async () => {
            await applyErasedElementsCSS(webview, webview.getURL());
          }, 500);
        }
      } catch (error) {
        console.error('Failed to apply erased elements CSS after navigation:', error)
      }
    })
    
    webview.addEventListener('did-navigate-in-page', async () => {
      handleWebviewLoad(tabId)
      
      // Re-apply for in-page navigation (hash changes, etc.)
      try {
        const tab = tabs.find(t => t.id === tabId);
        if (tab && tab.isReady) {
          await applyErasedElementsCSS(webview, webview.getURL());
        }
      } catch (error) {
        console.error('Failed to apply erased elements CSS after in-page navigation:', error)
      }
    })
  }, [applyErasedElementsCSS, tabs])

  const handleWebviewLoad = (tabId: string) => {
    const webview = webviewRefs.current[tabId]
    const tab = tabs.find(t => t.id === tabId)
    
    if (!webview || !tab || !tab.isReady) return
    
    try {
      const title = webview.getTitle() || 'Web Page'
      const url = webview.getURL()
      
      if (tabId === activeTabId) {
        setUrlInput(url)
      }
      
      let domain = ''
      try {
        domain = new URL(url).hostname
      } catch (e) {
        domain = url
      }
      
      setTabs(tabs => tabs.map(tab =>
        tab.id === tabId ? { 
          ...tab, 
          title, 
          url,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
        } : tab
      ))
    } catch (error) {
      console.error('Error handling webview load:', error)
    }
  }

  const applyPluginsToTab = useCallback(async (tabId: string) => {
    const webview = webviewRefs.current[tabId];
    if (webview && !webview.isLoading()) {
      try {
        await applyPluginsToWebview(webview);
      } catch (error) {
        console.error('Failed to apply plugins to tab:', error);
      }
    }
  }, []);

  const handleWebviewRef = useCallback((webview: Electron.WebviewTag | null, tabId: string) => {
    if (!webview) return;
    
    webviewRefs.current[tabId] = webview;
    setupWebviewEvents(webview, tabId);
  }, [setupWebviewEvents]);

  useEffect(() => {
    Object.keys(webviewRefs.current).forEach(tabId => {
      applyPluginsToTab(tabId);
    });
  }, [applyPluginsToTab]);

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

  // Function to render the layout based on currentLayout
  const renderLayout = () => {
    switch (currentLayout) {
      case LayoutType.SINGLE:
        return (
          <main className="flex-1 p-2.5 pt-0">
            {tabs.map(tab => (
              <div
                key={tab.id}
                style={{ display: activeTabId === tab.id ? 'block' : 'none', height: '100%' }}
                className="rounded-md overflow-hidden shadow-lg"
              >
                <webview
                  ref={(ref) => handleWebviewRef(ref as Electron.WebviewTag, tab.id)}
                  src={tab.url}
                  style={{ width: '100%', height: '100%' }}
                  webpreferences="contextIsolation=false,nodeIntegration=true"
                  allowpopups="true"
                />
              </div>
            ))}
          </main>
        );
      
      case LayoutType.DOUBLE:
        // Show two tabs side by side
        return (
          <main className="flex-1 p-2.5 pt-0 flex">
            <div className="w-1/2 pr-1 h-full">
              {tabs.length > 0 && (
                <div className="h-full rounded-md overflow-hidden shadow-lg">
                  <webview
                    ref={(ref) => handleWebviewRef(ref as Electron.WebviewTag, tabs[0].id)}
                    src={tabs[0].url}
                    style={{ width: '100%', height: '100%' }}
                    webpreferences="contextIsolation=false,nodeIntegration=true"
                    allowpopups="true"
                  />
                </div>
              )}
            </div>
            <div className="w-1/2 pl-1 h-full">
              {tabs.length > 1 ? (
                <div className="h-full rounded-md overflow-hidden shadow-lg">
                  <webview
                    ref={(ref) => handleWebviewRef(ref as Electron.WebviewTag, tabs[1].id)}
                    src={tabs[1].url}
                    style={{ width: '100%', height: '100%' }}
                    webpreferences="contextIsolation=false,nodeIntegration=true"
                    allowpopups="true"
                  />
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
                {tabs.length > 0 && (
                  <div className="h-full rounded-md overflow-hidden shadow-lg">
                    <webview
                      ref={(ref) => handleWebviewRef(ref as Electron.WebviewTag, tabs[0].id)}
                      src={tabs[0].url}
                      style={{ width: '100%', height: '100%' }}
                      webpreferences="contextIsolation=false,nodeIntegration=true"
                      allowpopups="true"
                    />
                  </div>
                )}
              </div>
              <div className="w-1/2 pl-1 h-full">
                {tabs.length > 1 ? (
                  <div className="h-full rounded-md overflow-hidden shadow-lg">
                    <webview
                      ref={(ref) => handleWebviewRef(ref as Electron.WebviewTag, tabs[1].id)}
                      src={tabs[1].url}
                      style={{ width: '100%', height: '100%' }}
                      webpreferences="contextIsolation=false,nodeIntegration=true"
                      allowpopups="true"
                    />
                  </div>
                ) : (
                  <div className="h-full rounded-md overflow-hidden shadow-lg flex items-center justify-center bg-gray-800 text-gray-400">
                    Add another tab to view here
                  </div>
                )}
              </div>
            </div>
            <div className="h-1/2 pt-1">
              {tabs.length > 2 ? (
                <div className="h-full rounded-md overflow-hidden shadow-lg">
                  <webview
                    ref={(ref) => handleWebviewRef(ref as Electron.WebviewTag, tabs[2].id)}
                    src={tabs[2].url}
                    style={{ width: '100%', height: '100%' }}
                    webpreferences="contextIsolation=false,nodeIntegration=true"
                    allowpopups="true"
                  />
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
    setShowWorkflowModal(true);
    setWorkflowModalMode('create');
    
    const webview = webviewRefs.current[activeTabId];
    if (webview) {
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
          
          // Track typing
          document.addEventListener('input', (e) => {
            if (!window.workflowRecording || !e.target || !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return;
            
            const element = e.target;
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
            
            // Log the typing action
            console.log('WORKFLOW_ACTION:' + JSON.stringify({
              type: 'type',
              data: {
                selector,
                value: element.value,
                placeholder: element.placeholder
              },
              timestamp: Date.now()
            }));
          }, true);
          
          // Track hover
          document.addEventListener('mouseover', (e) => {
            if (!window.workflowRecording) return;
            
            // Only log hovers on elements with handlers (links, buttons, etc.)
            const element = e.target;
            if (element instanceof HTMLAnchorElement || 
                element instanceof HTMLButtonElement || 
                element.onclick || 
                element.onmouseover ||
                element.role === 'button') {
              
              let selector = '';
              if (element.id) {
                selector = '#' + element.id;
              } else {
                selector = element.tagName.toLowerCase();
                
                if (element.classList && element.classList.length) {
                  const classes = Array.from(element.classList).slice(0, 2);
                  selector += classes.map(c => '.' + c).join('');
                }
              }
              
              // Log the hover action (throttled to avoid too many events)
              if (!element.hasAttribute('data-last-hover') || 
                  Date.now() - parseInt(element.getAttribute('data-last-hover') || '0') > 1000) {
                
                element.setAttribute('data-last-hover', Date.now().toString());
                
                console.log('WORKFLOW_ACTION:' + JSON.stringify({
                  type: 'hover',
                  data: {
                    selector,
                    text: element.textContent?.trim()
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
    
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: newWorkflowName.trim(),
      actions: currentRecording,
      variables
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
    
    for (const action of workflow.actions) {
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
        
        case ActionType.NAVIGATE:
          try {
            await webview.loadURL(action.data.url);
          } catch (e) {
            console.error('Failed to navigate:', e);
          }
          break;
        
        case ActionType.HOVER:
          await webview.executeJavaScript(`
            (function() {
              try {
                const element = document.querySelector('${action.data.selector}');
                if (element) {
                  element.dispatchEvent(new MouseEvent('mouseover', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                  }));
                  return true;
                }
                return false;
              } catch (e) {
                console.error('Failed to hover over element:', e);
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
                                    className="ml-2 bg-gray-700 px-2 py-1 rounded text-white"
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
                              {action.type === ActionType.HOVER && (
                                <div className="text-gray-300 text-sm">
                                  Hovered: {action.data.text || action.data.selector}
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
            }}
            className={`w-full p-2 mb-2 rounded-lg ${showDashboard ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiHome className="w-5 h-5" />
            <span>Home</span>
          </button>
        </div>

        <div className="text-sm font-medium text-gray-400 px-4 py-2">
          Tabs
        </div>
        
        <div className="flex-1 overflow-y-auto mb-2">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`px-4 py-2 cursor-pointer flex items-center justify-between group ${
                activeTabId === tab.id && !showDashboard && !showAIChat && !showWriter && !showTasks && !showImages && !showSettings ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <div 
                className="flex items-center space-x-2 overflow-hidden flex-1"
                onClick={() => {
                  setActiveTabId(tab.id)
                  setShowDashboard(false)
                  setShowSettings(false)
                  setShowAIChat(false)
                  setShowWriter(false)
                  setShowTasks(false)
                  setShowImages(false)
                }}
              >
                {tab.favicon ? (
                  <img src={tab.favicon} className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <FiChrome className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{tab.title}</span>
              </div>
              <button
                className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  // Don't close the tab if it's the only one
                  if (tabs.length <= 1) return
                  
                  // If closing the active tab, activate another tab first
                  if (tab.id === activeTabId) {
                    const tabIndex = tabs.findIndex(t => t.id === tab.id)
                    const newActiveTab = tabs[tabIndex === 0 ? 1 : tabIndex - 1]
                    setActiveTabId(newActiveTab.id)
                  }
                  
                  // Remove the tab from webviewRefs
                  const newWebviewRefs = { ...webviewRefs.current }
                  delete newWebviewRefs[tab.id]
                  webviewRefs.current = newWebviewRefs
                  
                  // Remove the tab from tabs state
                  setTabs(tabs.filter(t => t.id !== tab.id))
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <div className="px-2 pb-2 space-y-2 border-t border-gray-700 pt-2">
          <button
            onClick={addTab}
            className="w-full p-2 rounded-lg bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 flex items-center justify-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>New Tab</span>
          </button>
          
          <button 
            onClick={() => {
              setShowAIChat(!showAIChat)
              setShowDashboard(false)
              setShowSettings(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowImages(false)
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
            }}
            className={`w-full p-2 rounded-lg ${showImages ? 'bg-blue-600' : ''} hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2`}
          >
            <FiImage className="w-5 h-5" />
            <span>Images</span>
          </button>
          
          <button 
            onClick={() => {
              setShowSettings(!showSettings)
              setShowDashboard(false)
              setShowAIChat(false)
              setShowWriter(false)
              setShowTasks(false)
              setShowImages(false)
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
                        onClick={() => {
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
                        onClick={() => {
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
    </div>
  )
} 