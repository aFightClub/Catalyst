import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../CodeEditor/index';
import { StoredPlugin } from '../../types/plugin';
import { pluginManager } from '../../services/pluginManager';
import { storeService } from '../../services/storeService';
import { FiKey, FiPackage, FiActivity, FiClock, FiPlay, FiEdit, FiTrash2, FiExternalLink, FiUser, FiMessageCircle, FiPlus, FiX, FiImage, FiSave } from 'react-icons/fi';
import PluginsManager from '../Plugins/PluginsManager';
import UpdateChecker from './UpdateChecker';

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
  CONTEXT = 'context',
  ASSISTANTS = 'assistants',
  API_KEYS = 'api_keys',
  PLUGINS = 'plugins',
  WORKFLOWS = 'workflows',
  UPDATES = 'updates',
  DATA_BACKUP = 'data_backup',
  CATEGORIES = 'categories',
}

// Define ApiKeys interface with index signature
interface ApiKeys {
  [key: string]: string | undefined;
  openai?: string;
}

// Define UserContext interface
interface UserContext {
  name: string;
  company: string;
  voice: string;
  backStory: string;
  websiteLinks: string;
  additionalInfo: string;
}

// Define Assistant interface
interface Assistant {
  id: string;
  name: string;
  systemPrompt: string;
  profileImage: string;
  createdAt: string;
}

// Add type definition for window.electron
declare global {
  interface Window {
    electron?: {
      send: (channel: string, data: any) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
  }
}

const Settings: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<SettingsPage>(SettingsPage.CONTEXT);
  const [plugins, setPlugins] = useState<StoredPlugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<StoredPlugin | null>(null);
  const [editorLanguage, setEditorLanguage] = useState<'javascript' | 'css' | 'jsx'>('javascript');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [workflowVariables, setWorkflowVariables] = useState<{[key: string]: string}>({});
  const [userContext, setUserContext] = useState<UserContext>({
    name: '',
    company: '',
    voice: '',
    backStory: '',
    websiteLinks: '',
    additionalInfo: ''
  });
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isAddingAssistant, setIsAddingAssistant] = useState(false);
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null);
  const [newAssistant, setNewAssistant] = useState<Partial<Assistant>>({
    name: '',
    systemPrompt: 'You are a helpful assistant.',
    profileImage: ''
  });
  
  // Data Backup page state
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [importOptions, setImportOptions] = useState({
    overwrite: false,
    importWorkspaces: true,
    importWorkflows: true,
    importTasks: true,
    importSubscriptions: true,
    importErasedElements: true,
    importAssistants: true,
    importWebsites: true,
    importChats: true,
    importDocuments: true,
    importProjects: true,
    importAutomations: true,
    importWorkflowVariables: true,
    importApiKeys: true,
    importUserContext: true,
    importWebsiteCategories: true,
    importSubscriptionCategories: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputBackupRef = useRef<HTMLInputElement>(null);

  const [websiteCategories, setWebsiteCategories] = useState<string[]>([]);
  const [subscriptionCategories, setSubscriptionCategories] = useState<string[]>([]);
  const [newWebsiteCategory, setNewWebsiteCategory] = useState('');
  const [newSubscriptionCategory, setNewSubscriptionCategory] = useState('');
  const [editingWebsiteCategory, setEditingWebsiteCategory] = useState<{index: number, value: string} | null>(null);
  const [editingSubscriptionCategory, setEditingSubscriptionCategory] = useState<{index: number, value: string} | null>(null);

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
    
    // Load user context from store
    const loadUserContext = async () => {
      try {
        const storedContext = await storeService.getUserContext();
        if (storedContext) {
          setUserContext(prevContext => ({
            ...prevContext,
            ...storedContext
          }));
        }
      } catch (error) {
        console.error('Failed to load user context:', error);
      }
    };
    
    // Load assistants from store
    const loadAssistants = async () => {
      try {
        const storedAssistants = await storeService.getAssistants();
        if (storedAssistants && Array.isArray(storedAssistants) && storedAssistants.length > 0) {
          setAssistants(storedAssistants);
        } else {
          // Create default assistant if none exist
          const defaultAssistant = {
            id: "default",
            name: "Default Assistant",
            systemPrompt: "You are a helpful assistant.",
            profileImage: "",
            createdAt: new Date().toISOString(),
          };
          setAssistants([defaultAssistant]);
          await storeService.saveAssistants([defaultAssistant]);
        }
      } catch (error) {
        console.error('Failed to load assistants:', error);
      }
    };
    
    // Load categories
    const loadCategories = async () => {
      try {
        const storedWebsiteCategories = await storeService.getWebsiteCategories();
        if (storedWebsiteCategories && Array.isArray(storedWebsiteCategories)) {
          setWebsiteCategories(storedWebsiteCategories);
        }
        
        const storedSubscriptionCategories = await storeService.getSubscriptionCategories();
        if (storedSubscriptionCategories && Array.isArray(storedSubscriptionCategories)) {
          setSubscriptionCategories(storedSubscriptionCategories);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    
    loadApiKeys();
    loadWorkflows();
    loadUserContext();
    loadAssistants();
    loadCategories();
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

  // Save user context
  const saveUserContext = async (context: UserContext) => {
    setUserContext(context);
    try {
      await storeService.saveUserContext(context as unknown as Record<string, string>);
    } catch (error) {
      console.error("Failed to save user context:", error);
    }
  };

  // Save assistants
  const saveAssistants = async (updatedAssistants: Assistant[]) => {
    setAssistants(updatedAssistants);
    try {
      await storeService.saveAssistants(updatedAssistants);
    } catch (error) {
      console.error("Failed to save assistants:", error);
    }
  };

  // Add new assistant
  const addAssistant = async () => {
    if (!newAssistant.name) return;
    
    const assistant: Assistant = {
      id: Date.now().toString(),
      name: newAssistant.name,
      systemPrompt: newAssistant.systemPrompt || 'You are a helpful assistant.',
      profileImage: newAssistant.profileImage || '',
      createdAt: new Date().toISOString()
    };
    
    const updatedAssistants = [...assistants, assistant];
    await saveAssistants(updatedAssistants);
    
    setNewAssistant({
      name: '',
      systemPrompt: 'You are a helpful assistant.',
      profileImage: ''
    });
    setIsAddingAssistant(false);
  };

  // Update assistant
  const updateAssistant = async (assistant: Assistant) => {
    const updatedAssistants = assistants.map(a => 
      a.id === assistant.id ? assistant : a
    );
    await saveAssistants(updatedAssistants);
    setEditingAssistantId(null);
  };

  // Delete assistant
  const deleteAssistant = async (id: string) => {
    // Don't delete if it's the only assistant
    if (assistants.length <= 1) {
      alert('You must have at least one assistant');
      return;
    }
    
    if (confirm('Are you sure you want to delete this assistant?')) {
      const updatedAssistants = assistants.filter(a => a.id !== id);
      await saveAssistants(updatedAssistants);
      
      if (editingAssistantId === id) {
        setEditingAssistantId(null);
      }
    }
  };

  // Handle profile image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isNew) {
        setNewAssistant(prev => ({
          ...prev,
          profileImage: reader.result as string
        }));
      } else if (editingAssistantId) {
        const updatedAssistants = assistants.map(a => 
          a.id === editingAssistantId 
            ? { ...a, profileImage: reader.result as string } 
            : a
        );
        setAssistants(updatedAssistants);
      }
    };
    reader.readAsDataURL(file);
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

  // Handle file input change (for browser-based file selection)
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setImportStatus("Reading file...");
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) {
            setImportStatus("Error: File is empty");
            return;
          }
          
          setImportStatus("Importing data...");
          const result = await storeService.importFromJSON(content, importOptions);
          
          if (result.success) {
            setImportStatus("Data imported successfully! Refreshing...");
            
            // Reload the page after a short delay to apply changes
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setImportStatus(`Import failed: ${result.message}`);
          }
        } catch (error) {
          console.error("Error importing data:", error);
          setImportStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Error reading file:", error);
      setImportStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle import button click
  const handleImportClick = async () => {
    if (!fileInputBackupRef.current?.files?.length) {
      setImportStatus("No file selected");
      return;
    }
    
    try {
      const file = fileInputBackupRef.current.files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          if (!fileContent) throw new Error("Failed to read file content");
          
          setImportStatus("Importing data...");
          
          // If we're using Electron, we can use the more robust import via IPC
          if (window.electron) {
            try {
              const result = await window.electron.invoke('import-data', {
                jsonData: fileContent,
                options: importOptions
              });
              
              if (result.success) {
                setImportStatus("Import successful! Reloading...");
                // Reload the app after 1 second to apply changes
                setTimeout(() => window.location.reload(), 1000);
              } else {
                setImportStatus(`Import failed: ${result.message}`);
              }
            } catch (error) {
              console.error('IPC import failed:', error);
              setImportStatus(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          } else {
            // Browser-based import
            const result = await storeService.importFromJSON(fileContent, {
              overwrite: importOptions.overwrite,
              importWorkspaces: importOptions.importWorkspaces,
              importWorkflows: importOptions.importWorkflows,
              importTasks: importOptions.importTasks,
              importSubscriptions: importOptions.importSubscriptions,
              importErasedElements: importOptions.importErasedElements,
              importAssistants: importOptions.importAssistants,
              importChats: importOptions.importChats,
              importWebsites: importOptions.importWebsites,
              importDocuments: importOptions.importDocuments,
              importProjects: importOptions.importProjects,
              importAutomations: importOptions.importAutomations,
              importWorkflowVariables: importOptions.importWorkflowVariables,
              importApiKeys: importOptions.importApiKeys,
              importUserContext: importOptions.importUserContext,
              importWebsiteCategories: importOptions.importWebsiteCategories,
              importSubscriptionCategories: importOptions.importSubscriptionCategories
            });
            
            if (result.success) {
              setImportStatus("Import successful! Reloading...");
              // Reload the app after 1 second to apply changes
              setTimeout(() => window.location.reload(), 1000);
            } else {
              setImportStatus(`Import failed: ${result.message}`);
            }
          }
        } catch (error) {
          console.error('Import processing error:', error);
          setImportStatus(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      
      reader.onerror = () => {
        setImportStatus("Error reading file");
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('File handling error:', error);
      setImportStatus(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Toggle import options
  const toggleOption = (option: keyof typeof importOptions) => {
    setImportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Handle exporting data
  const handleExportData = async () => {
    try {
      setExportStatus("Exporting data...");
      const jsonData = await storeService.exportAllData();
      
      // Check if we're in Electron environment
      if (window.electron?.invoke) {
        // Use native Electron save dialog
        setExportStatus("Choosing save location...");
        const defaultPath = `browser-backup-${new Date().toISOString().split('T')[0]}.json`;
        const result = await window.electron.invoke('export-data-to-file', { 
          content: jsonData,
          defaultPath
        });
        
        if (result.success) {
          setExportStatus(`Data saved to ${result.path}`);
        } else {
          setExportStatus(`Export canceled: ${result.message}`);
        }
      } else {
        // Browser environment fallback
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `browser-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setExportStatus("Data exported successfully!");
      }
      
      // Clear status after a few seconds
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error("Error exporting data:", error);
      setExportStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle deleting all data
  const handleDeleteAllData = async () => {
    if (!confirm("WARNING: This will permanently delete ALL your data including workspaces, workflows, assistants, and settings. This action CANNOT be undone. Are you absolutely sure?")) {
      return;
    }
    
    try {
      setDeleteStatus("Deleting all data...");
      
      // Delete all data types
      await storeService.saveWorkspaces([]);
      await storeService.saveWorkflows([]);
      await storeService.saveTasks([]);
      await storeService.saveSubscriptions([]);
      await storeService.saveErasedElements([]);
      await storeService.saveAssistants([]);
      await storeService.saveWebsites([]);
      await storeService.saveChats([]);
      await storeService.saveDocuments([]);
      await storeService.saveProjects([]);
      await storeService.saveAutomations([]);
      await storeService.saveWorkflowVariables({});
      await storeService.saveApiKeys({});
      await storeService.saveUserContext({
        name: '',
        company: '',
        voice: '',
        backStory: '',
        websiteLinks: '',
        additionalInfo: ''
      });
      
      setDeleteStatus("All data deleted successfully! Refreshing...");
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error deleting data:", error);
      setDeleteStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Categories management functions
  const addWebsiteCategory = async () => {
    if (!newWebsiteCategory.trim()) return;
    
    // Check for duplicates
    if (websiteCategories.includes(newWebsiteCategory.trim())) {
      alert('Category already exists');
      return;
    }
    
    const updatedCategories = [...websiteCategories, newWebsiteCategory.trim()];
    setWebsiteCategories(updatedCategories);
    setNewWebsiteCategory('');
    
    try {
      await storeService.saveWebsiteCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to save website categories:', error);
    }
  };
  
  const updateWebsiteCategory = async (index: number, newValue: string) => {
    if (!newValue.trim()) return;
    
    // Check for duplicates (excluding the current index)
    const otherCategories = websiteCategories.filter((_, i) => i !== index);
    if (otherCategories.includes(newValue.trim())) {
      alert('Category already exists');
      return;
    }
    
    const updatedCategories = [...websiteCategories];
    updatedCategories[index] = newValue.trim();
    setWebsiteCategories(updatedCategories);
    setEditingWebsiteCategory(null);
    
    try {
      await storeService.saveWebsiteCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to update website categories:', error);
    }
  };
  
  const deleteWebsiteCategory = async (index: number) => {
    if (confirm('Are you sure you want to delete this category? This may affect websites that use it.')) {
      const updatedCategories = [...websiteCategories];
      updatedCategories.splice(index, 1);
      setWebsiteCategories(updatedCategories);
      
      try {
        await storeService.saveWebsiteCategories(updatedCategories);
      } catch (error) {
        console.error('Failed to delete website category:', error);
      }
    }
  };
  
  const addSubscriptionCategory = async () => {
    if (!newSubscriptionCategory.trim()) return;
    
    // Check for duplicates
    if (subscriptionCategories.includes(newSubscriptionCategory.trim())) {
      alert('Category already exists');
      return;
    }
    
    const updatedCategories = [...subscriptionCategories, newSubscriptionCategory.trim()];
    setSubscriptionCategories(updatedCategories);
    setNewSubscriptionCategory('');
    
    try {
      await storeService.saveSubscriptionCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to save subscription categories:', error);
    }
  };
  
  const updateSubscriptionCategory = async (index: number, newValue: string) => {
    if (!newValue.trim()) return;
    
    // Check for duplicates (excluding the current index)
    const otherCategories = subscriptionCategories.filter((_, i) => i !== index);
    if (otherCategories.includes(newValue.trim())) {
      alert('Category already exists');
      return;
    }
    
    const updatedCategories = [...subscriptionCategories];
    updatedCategories[index] = newValue.trim();
    setSubscriptionCategories(updatedCategories);
    setEditingSubscriptionCategory(null);
    
    try {
      await storeService.saveSubscriptionCategories(updatedCategories);
    } catch (error) {
      console.error('Failed to update subscription categories:', error);
    }
  };
  
  const deleteSubscriptionCategory = async (index: number) => {
    if (confirm('Are you sure you want to delete this category? This may affect subscriptions that use it.')) {
      const updatedCategories = [...subscriptionCategories];
      updatedCategories.splice(index, 1);
      setSubscriptionCategories(updatedCategories);
      
      try {
        await storeService.saveSubscriptionCategories(updatedCategories);
      } catch (error) {
        console.error('Failed to delete subscription category:', error);
      }
    }
  };

  const renderNavigation = () => (
    <div className="flex flex-col h-full border-r border-gray-700 bg-gray-800 w-64 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Settings</h2>
      </div>
      
      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-2">
        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.CONTEXT ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.CONTEXT)}
        >
          <FiUser className="mr-3" />
          <span>User Context</span>
        </button>
        
        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.ASSISTANTS ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.ASSISTANTS)}
        >
          <FiMessageCircle className="mr-3" />
          <span>Assistants</span>
        </button>
        
        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.API_KEYS ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.API_KEYS)}
        >
          <FiKey className="mr-3" />
          <span>API Keys</span>
        </button>
        
        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.PLUGINS ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.PLUGINS)}
        >
          <FiPackage className="mr-3" />
          <span>Plugins</span>
        </button>
        
        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.WORKFLOWS ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.WORKFLOWS)}
        >
          <FiActivity className="mr-3" />
          <span>Workflows</span>
        </button>

        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.CATEGORIES ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.CATEGORIES)}
        >
          <FiActivity className="mr-3" />
          <span>Categories</span>
        </button>
        
        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.UPDATES ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.UPDATES)}
        >
          <FiActivity className="mr-3" />
          <span>Updates</span>
        </button>
        
        <button 
          className={`w-full text-left px-4 py-3 flex items-center ${currentPage === SettingsPage.DATA_BACKUP ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => setCurrentPage(SettingsPage.DATA_BACKUP)}
        >
          <FiActivity className="mr-3" />
          <span>Data Backup</span>
        </button>
      </div>
    </div>
  );

  const renderContextPage = () => (
    <div className="p-6 bg-gray-900">
      <h3 className="text-xl font-bold mb-6 text-white">Personal Context</h3>
      <p className="text-gray-400 mb-6">
        This information will be sent along with your prompts to AI chat to provide better context about you.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-gray-300 mb-2">Your Name</label>
          <input 
            type="text"
            value={userContext.name}
            onChange={(e) => saveUserContext({ ...userContext, name: e.target.value })}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">Company/Organization</label>
          <input 
            type="text"
            value={userContext.company}
            onChange={(e) => saveUserContext({ ...userContext, company: e.target.value })}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Acme Inc."
          />
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">Preferred AI Voice/Tone</label>
        <select
          value={userContext.voice}
          onChange={(e) => saveUserContext({ ...userContext, voice: e.target.value })}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a voice style...</option>
          <option value="professional">Professional</option>
          <option value="friendly">Friendly & Casual</option>
          <option value="technical">Technical Expert</option>
          <option value="concise">Concise & Direct</option>
          <option value="creative">Creative & Imaginative</option>
        </select>
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">Your Back Story (Background, Expertise, Interests)</label>
        <textarea
          value={userContext.backStory}
          onChange={(e) => saveUserContext({ ...userContext, backStory: e.target.value })}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
          placeholder="I'm a software developer with 5 years of experience in web development..."
        ></textarea>
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">Relevant Website Links</label>
        <textarea
          value={userContext.websiteLinks}
          onChange={(e) => saveUserContext({ ...userContext, websiteLinks: e.target.value })}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com, https://github.com/yourusername"
        ></textarea>
        <p className="text-gray-500 text-sm mt-1">Add relevant websites, social profiles, GitHub repositories, etc. (one per line)</p>
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">Additional Information</label>
        <textarea
          value={userContext.additionalInfo}
          onChange={(e) => saveUserContext({ ...userContext, additionalInfo: e.target.value })}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
          placeholder="Any other details you'd like the AI to know about you..."
        ></textarea>
      </div>
      
      <div className="border-t border-gray-700 pt-6">
        <h4 className="text-white font-medium mb-2">Privacy Note</h4>
        <p className="text-gray-400">Your personal context is stored locally on your device and is only sent with your AI chat prompts to provide personalized responses.</p>
      </div>
    </div>
  );

  const renderAssistantsPage = () => (
    <div className="p-6 bg-gray-900">
      <h3 className="text-xl font-bold mb-6 text-white">AI Assistants</h3>
      <p className="text-gray-400 mb-6">
        Create custom AI assistants with different personalities and expertise by configuring their system prompts.
      </p>
      
      {!isAddingAssistant && (
        <button
          onClick={() => setIsAddingAssistant(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
        >
          <FiPlus className="mr-2" /> Add New Assistant
        </button>
      )}
      
      {isAddingAssistant && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h4 className="text-lg font-semibold mb-4 text-white">Create New Assistant</h4>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Assistant Name</label>
            <input 
              type="text"
              value={newAssistant.name}
              onChange={(e) => setNewAssistant({...newAssistant, name: e.target.value})}
              className="w-full bg-gray-700 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Custom Assistant"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Profile Image</label>
            <div className="flex items-center">
              {newAssistant.profileImage ? (
                <div className="relative mr-4">
                  <img 
                    src={newAssistant.profileImage} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <button
                    onClick={() => setNewAssistant({...newAssistant, profileImage: ''})}
                    className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ) : (
                <div 
                  className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 mr-4 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FiImage size={24} />
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, true)}
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                {newAssistant.profileImage ? 'Change Image' : 'Upload Image'}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-1">Optional: Upload a profile image for your assistant</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">System Prompt</label>
            <textarea
              value={newAssistant.systemPrompt}
              onChange={(e) => setNewAssistant({...newAssistant, systemPrompt: e.target.value})}
              className="w-full bg-gray-700 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              placeholder="You are a helpful assistant..."
            ></textarea>
            <p className="text-gray-500 text-sm mt-1">Set the personality, expertise, and behavior of your assistant</p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsAddingAssistant(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={addAssistant}
              disabled={!newAssistant.name}
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${!newAssistant.name ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Create Assistant
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assistants.map(assistant => (
          <div key={assistant.id} className="bg-gray-800 rounded-lg overflow-hidden">
            {editingAssistantId === assistant.id ? (
              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Assistant Name</label>
                  <input 
                    type="text"
                    value={assistant.name}
                    onChange={(e) => {
                      const updated = [...assistants];
                      const index = updated.findIndex(a => a.id === assistant.id);
                      updated[index] = { ...updated[index], name: e.target.value };
                      setAssistants(updated);
                    }}
                    className="w-full bg-gray-700 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Profile Image</label>
                  <div className="flex items-center">
                    {assistant.profileImage ? (
                      <div className="relative mr-4">
                        <img 
                          src={assistant.profileImage} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <button
                          onClick={() => {
                            const updated = [...assistants];
                            const index = updated.findIndex(a => a.id === assistant.id);
                            updated[index] = { ...updated[index], profileImage: '' };
                            setAssistants(updated);
                          }}
                          className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 mr-4 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FiImage size={24} />
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, false)}
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                    >
                      {assistant.profileImage ? 'Change Image' : 'Upload Image'}
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">System Prompt</label>
                  <textarea
                    value={assistant.systemPrompt}
                    onChange={(e) => {
                      const updated = [...assistants];
                      const index = updated.findIndex(a => a.id === assistant.id);
                      updated[index] = { ...updated[index], systemPrompt: e.target.value };
                      setAssistants(updated);
                    }}
                    className="w-full bg-gray-700 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingAssistantId(null)}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateAssistant(assistant)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 flex items-center">
                  <div className="mr-4 flex-shrink-0">
                    {assistant.profileImage ? (
                      <img 
                        src={assistant.profileImage} 
                        alt={assistant.name} 
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        {assistant.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white">{assistant.name}</h4>
                    <div className="text-gray-400 text-sm">
                      Created {new Date(assistant.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="px-4 pb-3">
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-1">System Prompt</h5>
                    <div className="bg-gray-700 rounded p-3 text-sm text-gray-200 max-h-24 overflow-y-auto">
                      {assistant.systemPrompt}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingAssistantId(assistant.id)}
                      className="p-2 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      onClick={() => deleteAssistant(assistant.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-gray-700"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderApiKeysPage = () => (
    <div className="p-6 bg-gray-900">
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Plugins</h1>
      <PluginsManager />
    </div>
  );

  const renderWorkflowsPage = () => (
    <div className="flex h-full bg-gray-900">
      <div className="w-64 border-r border-gray-700 p-4 bg-gray-800 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-white">Saved Workflows</h3>
        <div className="space-y-2 overflow-y-auto">
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
      
      <div className="flex-1 p-4 overflow-y-auto">
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
          <div className="h-full flex flex-col items-center justify-center text-center">
            <FiActivity className="w-12 h-12 text-gray-500 mb-4" />
            <h4 className="text-lg font-medium mb-2 text-white">Select a workflow</h4>
            <p className="text-gray-400 text-center mb-4 max-w-md">
              You can view details and run your saved workflows from here.
              <br />
              To create new workflows, use the workflow button in the browser toolbar.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderUpdatesPage = () => (
    <div className="p-6 bg-gray-900">
      <h3 className="text-xl font-bold mb-6 text-white">Software Updates</h3>
      <p className="text-gray-400 mb-6">
        Check for and install updates to the latest version of the application.
      </p>
      
      <UpdateChecker />
    </div>
  );

  const renderDataBackupPage = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-gray-900 text-white">
        <h2 className="text-2xl font-bold mb-6">Data Backup & Restore</h2>
        
        {/* Export Section */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-semibold mb-4">Export Data</h3>
          <p className="text-gray-400 mb-4">
            Export all your data to a JSON file that you can save and import later.
          </p>
          
          <div className="flex items-center">
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              disabled={!!exportStatus && exportStatus.includes('Exporting')}
            >
              <FiSave className="mr-2" />
              Export All Data
            </button>
            {exportStatus && (
              <span className="ml-3 text-sm text-gray-300">{exportStatus}</span>
            )}
          </div>
        </div>
        
        {/* Import Section */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-semibold mb-4">Import Data</h3>
          <p className="text-gray-400 mb-4">
            Import previously exported data from a JSON file.
          </p>
          
          <div className="mb-4">
            <label className="font-semibold mb-2 block">Import Options</label>
            
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-3">
                <input 
                  type="checkbox"
                  id="overwrite"
                  checked={importOptions.overwrite}
                  onChange={() => toggleOption('overwrite')}
                  className="mr-2"
                />
                <label htmlFor="overwrite" className="cursor-pointer">
                  Overwrite existing data (instead of merging)
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importWorkspaces"
                    checked={importOptions.importWorkspaces}
                    onChange={() => toggleOption('importWorkspaces')}
                    className="mr-2"
                  />
                  <label htmlFor="importWorkspaces" className="cursor-pointer">
                    Workspaces
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importWorkflows"
                    checked={importOptions.importWorkflows}
                    onChange={() => toggleOption('importWorkflows')}
                    className="mr-2"
                  />
                  <label htmlFor="importWorkflows" className="cursor-pointer">
                    Workflows
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importTasks"
                    checked={importOptions.importTasks}
                    onChange={() => toggleOption('importTasks')}
                    className="mr-2"
                  />
                  <label htmlFor="importTasks" className="cursor-pointer">
                    Tasks
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importProjects"
                    checked={importOptions.importProjects}
                    onChange={() => toggleOption('importProjects')}
                    className="mr-2"
                  />
                  <label htmlFor="importProjects" className="cursor-pointer">
                    Projects
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importSubscriptions"
                    checked={importOptions.importSubscriptions}
                    onChange={() => toggleOption('importSubscriptions')}
                    className="mr-2"
                  />
                  <label htmlFor="importSubscriptions" className="cursor-pointer">
                    Subscriptions
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importWebsites"
                    checked={importOptions.importWebsites}
                    onChange={() => toggleOption('importWebsites')}
                    className="mr-2"
                  />
                  <label htmlFor="importWebsites" className="cursor-pointer">
                    Websites
                  </label>
                </div>

                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importWebsiteCategories"
                    checked={importOptions.importWebsiteCategories}
                    onChange={() => toggleOption('importWebsiteCategories')}
                    className="mr-2"
                  />
                  <label htmlFor="importWebsiteCategories" className="cursor-pointer">
                    Website Categories
                  </label>
                </div>

                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importSubscriptionCategories"
                    checked={importOptions.importSubscriptionCategories}
                    onChange={() => toggleOption('importSubscriptionCategories')}
                    className="mr-2"
                  />
                  <label htmlFor="importSubscriptionCategories" className="cursor-pointer">
                    Subscription Categories
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importChats"
                    checked={importOptions.importChats}
                    onChange={() => toggleOption('importChats')}
                    className="mr-2"
                  />
                  <label htmlFor="importChats" className="cursor-pointer">
                    Chats
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importAssistants"
                    checked={importOptions.importAssistants}
                    onChange={() => toggleOption('importAssistants')}
                    className="mr-2"
                  />
                  <label htmlFor="importAssistants" className="cursor-pointer">
                    Assistants
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importDocuments"
                    checked={importOptions.importDocuments}
                    onChange={() => toggleOption('importDocuments')}
                    className="mr-2"
                  />
                  <label htmlFor="importDocuments" className="cursor-pointer">
                    Documents
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importErasedElements"
                    checked={importOptions.importErasedElements}
                    onChange={() => toggleOption('importErasedElements')}
                    className="mr-2"
                  />
                  <label htmlFor="importErasedElements" className="cursor-pointer">
                    Erased Elements
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importAutomations"
                    checked={importOptions.importAutomations}
                    onChange={() => toggleOption('importAutomations')}
                    className="mr-2"
                  />
                  <label htmlFor="importAutomations" className="cursor-pointer">
                    Automations
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importWorkflowVariables"
                    checked={importOptions.importWorkflowVariables}
                    onChange={() => toggleOption('importWorkflowVariables')}
                    className="mr-2"
                  />
                  <label htmlFor="importWorkflowVariables" className="cursor-pointer">
                    Workflow Variables
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importApiKeys"
                    checked={importOptions.importApiKeys}
                    onChange={() => toggleOption('importApiKeys')}
                    className="mr-2"
                  />
                  <label htmlFor="importApiKeys" className="cursor-pointer">
                    API Keys
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    id="importUserContext"
                    checked={importOptions.importUserContext}
                    onChange={() => toggleOption('importUserContext')}
                    className="mr-2"
                  />
                  <label htmlFor="importUserContext" className="cursor-pointer">
                    User Context
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              ref={fileInputBackupRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputBackupRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <FiSave className="mr-2" />
              Choose JSON File
            </button>
            {importStatus && (
              <span className="ml-3 text-sm text-gray-300">{importStatus}</span>
            )}
          </div>
        </div>
        
        {/* Delete Data Section */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-red-500">Delete All Data</h3>
          <p className="text-gray-400 mb-4">
            This will permanently delete all your data and cannot be undone.
            Make sure to export a backup first if you want to save your data.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            >
              <FiTrash2 className="mr-2" />
              Delete All Data
            </button>
          ) : (
            <div>
              <p className="text-red-400 font-semibold mb-3">
                Are you absolutely sure? This cannot be undone!
              </p>
              <div className="flex items-center">
                <button
                  onClick={handleDeleteAllData}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center mr-3"
                >
                  <FiTrash2 className="mr-2" />
                  Yes, Delete Everything
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {deleteStatus && (
            <p className="mt-3 text-sm text-gray-300">{deleteStatus}</p>
          )}
        </div>
      </div>
    );
  };

  const renderCategoriesPage = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-6">Categories Management</h2>
      
      {/* Website Categories */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Website Categories</h3>
          <div className="flex items-center">
            <input
              type="text"
              value={newWebsiteCategory}
              onChange={(e) => setNewWebsiteCategory(e.target.value)}
              placeholder="New category"
              className="px-3 py-2 mr-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addWebsiteCategory}
              disabled={!newWebsiteCategory.trim()}
              className={`px-4 py-2 rounded flex items-center ${!newWebsiteCategory.trim() ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <FiPlus className="mr-2" />
              Add
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {websiteCategories.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No categories found. Add your first website category.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {websiteCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-700">
                  {editingWebsiteCategory && editingWebsiteCategory.index === index ? (
                    <input
                      type="text"
                      value={editingWebsiteCategory.value}
                      onChange={(e) => setEditingWebsiteCategory({...editingWebsiteCategory, value: e.target.value})}
                      className="flex-1 px-3 py-2 mr-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateWebsiteCategory(index, editingWebsiteCategory.value);
                        } else if (e.key === 'Escape') {
                          setEditingWebsiteCategory(null);
                        }
                      }}
                    />
                  ) : (
                    <span>{category}</span>
                  )}
                  
                  <div className="flex items-center">
                    {editingWebsiteCategory && editingWebsiteCategory.index === index ? (
                      <>
                        <button
                          onClick={() => updateWebsiteCategory(index, editingWebsiteCategory.value)}
                          className="p-2 text-blue-400 hover:text-blue-300"
                          title="Save"
                        >
                          <FiSave />
                        </button>
                        <button
                          onClick={() => setEditingWebsiteCategory(null)}
                          className="p-2 text-gray-400 hover:text-gray-300"
                          title="Cancel"
                        >
                          <FiX />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingWebsiteCategory({index, value: category})}
                          className="p-2 text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => deleteWebsiteCategory(index)}
                          className="p-2 text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Subscription Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Subscription Categories</h3>
          <div className="flex items-center">
            <input
              type="text"
              value={newSubscriptionCategory}
              onChange={(e) => setNewSubscriptionCategory(e.target.value)}
              placeholder="New category"
              className="px-3 py-2 mr-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addSubscriptionCategory}
              disabled={!newSubscriptionCategory.trim()}
              className={`px-4 py-2 rounded flex items-center ${!newSubscriptionCategory.trim() ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <FiPlus className="mr-2" />
              Add
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {subscriptionCategories.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No categories found. Add your first subscription category.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {subscriptionCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-700">
                  {editingSubscriptionCategory && editingSubscriptionCategory.index === index ? (
                    <input
                      type="text"
                      value={editingSubscriptionCategory.value}
                      onChange={(e) => setEditingSubscriptionCategory({...editingSubscriptionCategory, value: e.target.value})}
                      className="flex-1 px-3 py-2 mr-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateSubscriptionCategory(index, editingSubscriptionCategory.value);
                        } else if (e.key === 'Escape') {
                          setEditingSubscriptionCategory(null);
                        }
                      }}
                    />
                  ) : (
                    <span>{category}</span>
                  )}
                  
                  <div className="flex items-center">
                    {editingSubscriptionCategory && editingSubscriptionCategory.index === index ? (
                      <>
                        <button
                          onClick={() => updateSubscriptionCategory(index, editingSubscriptionCategory.value)}
                          className="p-2 text-blue-400 hover:text-blue-300"
                          title="Save"
                        >
                          <FiSave />
                        </button>
                        <button
                          onClick={() => setEditingSubscriptionCategory(null)}
                          className="p-2 text-gray-400 hover:text-gray-300"
                          title="Cancel"
                        >
                          <FiX />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingSubscriptionCategory({index, value: category})}
                          className="p-2 text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => deleteSubscriptionCategory(index)}
                          className="p-2 text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case SettingsPage.CONTEXT:
        return renderContextPage();
      case SettingsPage.ASSISTANTS:
        return renderAssistantsPage();
      case SettingsPage.API_KEYS:
        return renderApiKeysPage();
      case SettingsPage.PLUGINS:
        return renderPluginsPage();
      case SettingsPage.WORKFLOWS:
        return renderWorkflowsPage();
      case SettingsPage.UPDATES:
        return renderUpdatesPage();
      case SettingsPage.DATA_BACKUP:
        return renderDataBackupPage();
      case SettingsPage.CATEGORIES:
        return renderCategoriesPage();
      default:
        return <div>Unknown page</div>;
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {renderNavigation()}
      <div className="flex-1 overflow-y-auto">
        {renderCurrentPage()}
      </div>
    </div>
  );
};

export default Settings;
