import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../CodeEditor/index';
import { StoredPlugin } from '../../types/plugin';
import { pluginManager } from '../../services/pluginManager';
import { storeService } from '../../services/storeService';
import { FiKey, FiPackage, FiActivity, FiClock, FiPlay, FiEdit, FiTrash2, FiExternalLink, FiUser, FiMessageCircle, FiPlus, FiX, FiImage, FiSave } from 'react-icons/fi';

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
  AUTOMATIONS = 'automations',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    loadApiKeys();
    loadWorkflows();
    loadUserContext();
    loadAssistants();
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

  const renderNavigation = () => (
    <div className="w-64 bg-gray-900 h-full border-r border-gray-700 p-4 flex flex-col overflow-y-auto">
      <h2 className="text-xl font-bold mb-6 text-white">Settings</h2>
      <div className="space-y-2">
        <button 
          onClick={() => setCurrentPage(SettingsPage.CONTEXT)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.CONTEXT ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiUser className="mr-2" />
          <span>Context</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.ASSISTANTS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.ASSISTANTS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiMessageCircle className="mr-2" />
          <span>Assistants</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.API_KEYS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.API_KEYS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiKey className="mr-2" />
          <span>API Keys</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.PLUGINS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.PLUGINS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiPackage className="mr-2" />
          <span>Plugins</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.WORKFLOWS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.WORKFLOWS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiActivity className="mr-2" />
          <span>Workflows</span>
        </button>
        <button 
          onClick={() => setCurrentPage(SettingsPage.AUTOMATIONS)}
          className={`w-full flex items-center p-2 rounded-lg ${
            currentPage === SettingsPage.AUTOMATIONS ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FiClock className="mr-2" />
          <span>Scheduled Automations</span>
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
    <div className="flex h-full bg-gray-900">
      <div className="w-64 border-r border-gray-700 p-4 bg-gray-800 overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-white">Installed Plugins</h3>
        <button
          onClick={createNewPlugin}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Plugin
        </button>
        <div className="space-y-2 overflow-y-auto">
          {plugins.map(plugin => (
            <div
              key={plugin.id}
              className={`p-2 rounded cursor-pointer flex justify-between items-center ${
                selectedPlugin?.id === plugin.id ? 'bg-gray-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setSelectedPlugin(plugin)}
            >
              <span className="text-white">{plugin.name}</span>
              <input
                type="checkbox"
                checked={plugin.enabled}
                onChange={(e) => updatePlugin({ ...plugin, enabled: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex-1 p-4">
        {selectedPlugin ? (
          <div className="h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <input
                type="text"
                value={selectedPlugin.name}
                onChange={(e) => updatePlugin({ ...selectedPlugin, name: e.target.value })}
                className="bg-gray-800 text-white px-2 py-1 rounded"
              />
              <div className="space-x-2">
                <select
                  value={selectedPlugin.type}
                  onChange={(e) => handleTypeChange(e.target.value as 'css' | 'js' | 'html')}
                  className="bg-gray-800 text-white px-2 py-1 rounded"
                >
                  <option value="js">JavaScript</option>
                  <option value="css">CSS</option>
                  <option value="html">HTML</option>
                </select>
                <button
                  onClick={() => deletePlugin(selectedPlugin.id)}
                  className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex-1">
              <CodeEditor
                value={selectedPlugin.code}
                onChange={(code: string) => updatePlugin({ ...selectedPlugin, code })}
                language={editorLanguage}
                placeholder={`Enter ${selectedPlugin.type.toUpperCase()} code here...`}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a plugin or create a new one
          </div>
        )}
      </div>
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
      
      <div className="flex-1 p-4">
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
          <div className="h-full flex items-center justify-center text-gray-500">
            <FiActivity className="w-12 h-12 mb-4" />
            <h4 className="text-lg font-medium mb-2 text-white">Select a workflow</h4>
            <p className="text-gray-400 text-center mb-4 max-w-md">
              You can view details and run your saved workflows from here.
              To create new workflows, use the workflow button in the browser toolbar.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAutomationsPage = () => (
    <div className="p-6 bg-gray-900 text-white">
      <h3 className="text-xl font-bold mb-6">Scheduled Automations</h3>
      <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
        <FiClock className="w-12 h-12 mb-4 text-gray-500" />
        <h4 className="text-lg font-medium mb-2">Set Up Scheduled Tasks</h4>
        <p className="text-gray-400 mb-4">
          Schedule browser tasks to run automatically at specific times or intervals.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create Schedule
        </button>
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
      case SettingsPage.AUTOMATIONS:
        return renderAutomationsPage();
      default:
        return renderContextPage();
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
