import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiCpu, FiSettings, FiPlus, FiList, FiMessageCircle, FiChevronLeft, FiTrash2 } from 'react-icons/fi';
import { storeService } from '../../services/storeService';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface UserContext {
  name: string;
  company: string;
  voice: string;
  backStory: string;
  websiteLinks: string;
  additionalInfo: string;
}

interface Assistant {
  id: string;
  name: string;
  systemPrompt: string;
  profileImage: string;
  createdAt: string;
}

interface Chat {
  id: string;
  title: string;
  assistantId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  MESSAGES: 'aichat_messages',
  API_KEY: 'openai_api_key',
  MODEL: 'openai_model',
  TASKS: 'tasks_list',
  PROJECTS: 'tasks_projects',
  DOCUMENTS: 'writer_docs'
};

const AIChat: React.FC = () => {
  // Chat and assistant state
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [showAssistantSelect, setShowAssistantSelect] = useState(false);
  
  // Original state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showAPISettings, setShowAPISettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [userContext, setUserContext] = useState<UserContext>({
    name: '',
    company: '',
    voice: '',
    backStory: '',
    websiteLinks: '',
    additionalInfo: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Available models
  const availableModels = [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable multimodal model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Most powerful text model' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' }
  ];

  // Function definitions for function calling
  const functionDefinitions: FunctionDefinition[] = [
    {
      name: 'create_task',
      description: 'Create a new task in the task manager',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the task'
          },
          projectId: {
            type: 'string',
            description: 'The project ID to add the task to'
          }
        },
        required: ['title']
      }
    },
    {
      name: 'create_document',
      description: 'Create a new document in the writer',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the document'
          },
          content: {
            type: 'string',
            description: 'Initial content for the document'
          }
        },
        required: ['name']
      }
    }
  ];

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load API key
        let savedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        
        // If not found, check other possible storage locations used by Settings
        if (!savedKey) {
          // Try getting from settings storage
          const storedKeys = await storeService.getApiKeys();
          if (storedKeys && storedKeys.openai) {
            savedKey = storedKeys.openai;
            // Save it to our own storage for future use
            localStorage.setItem(STORAGE_KEYS.API_KEY, storedKeys.openai);
          }
        }
        
        if (savedKey) {
          setApiKey(savedKey);
        }
    
        // Load selected model
        const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
        if (savedModel) {
          setSelectedModel(savedModel);
        }
        
        // Load user context
        const storedContext = await storeService.getUserContext();
        if (storedContext) {
          setUserContext(prev => ({
            ...prev,
            ...storedContext
          }));
        }
        
        // Load assistants
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
        
        // Load chats
        const storedChats = await storeService.getChats();
        if (storedChats && Array.isArray(storedChats) && storedChats.length > 0) {
          setChats(storedChats);
          
          // Set the most recent chat as active
          const mostRecentChat = storedChats.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          
          setActiveChatId(mostRecentChat.id);
          setMessages(mostRecentChat.messages);
          setShowChatList(false);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    }
  }, [apiKey]);

  // Save selected model to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel);
  }, [selectedModel]);

  // Update messages when active chat changes
  useEffect(() => {
    if (activeChatId) {
      const activeChat = chats.find(chat => chat.id === activeChatId);
      if (activeChat) {
        setMessages(activeChat.messages);
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId, chats]);

  // Save chats when they change
  useEffect(() => {
    if (chats.length > 0) {
      const saveChatsToStore = async () => {
        await storeService.saveChats(chats);
      };
      saveChatsToStore();
    }
  }, [chats]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial scroll to bottom when component mounts
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Clear chat history
  const clearChatHistory = () => {
    if (!activeChatId) return;
    
    if (confirm('Are you sure you want to clear this chat history?')) {
      // Create a new updated chats array with empty messages for the active chat
      const updatedChats = chats.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: [], updatedAt: new Date().toISOString() } 
          : chat
      );
      
      setChats(updatedChats);
      setMessages([]);
    }
  };
  
  // Delete chat
  const deleteChat = (chatId: string) => {
    if (confirm('Are you sure you want to delete this chat?')) {
      const updatedChats = chats.filter(chat => chat.id !== chatId);
      setChats(updatedChats);
      
      if (chatId === activeChatId) {
        if (updatedChats.length > 0) {
          setActiveChatId(updatedChats[0].id);
        } else {
          setActiveChatId(null);
          setMessages([]);
          setShowChatList(true);
        }
      }
    }
  };
  
  // Create a new chat with selected assistant
  const createNewChat = (assistantId: string) => {
    const assistant = assistants.find(a => a.id === assistantId);
    if (!assistant) return;
    
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `Chat with ${assistant.name}`,
      assistantId: assistant.id,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    setActiveChatId(newChat.id);
    setMessages([]);
    setShowAssistantSelect(false);
    setShowChatList(false);
  };
  
  // Get assistant for current chat
  const getActiveAssistant = (): Assistant | undefined => {
    if (!activeChatId) return undefined;
    
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return undefined;
    
    return assistants.find(a => a.id === chat.assistantId);
  };
  
  // Generate a title for the chat based on first message
  const generateChatTitle = (userMessage: string): string => {
    // Take first 30 characters of the user's message and add ellipsis if needed
    const title = userMessage.length > 30
      ? `${userMessage.substring(0, 30)}...`
      : userMessage;
    
    return title;
  };
  
  // Update chat title
  const updateChatTitle = (chatId: string, userMessage: string) => {
    const updatedChats = chats.map(chat => {
      if (chat.id === chatId && (!chat.title || chat.title.startsWith('Chat with '))) {
        return {
          ...chat,
          title: generateChatTitle(userMessage)
        };
      }
      return chat;
    });
    
    setChats(updatedChats);
  };

  // Execute function calls
  const executeFunction = async (functionCall: FunctionCall): Promise<string> => {
    try {
      if (functionCall.name === 'create_task') {
        const { title, projectId = 'default' } = functionCall.arguments;
        
        // Load existing tasks
        const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS) || '[]';
        const tasks = JSON.parse(savedTasks);
        
        // Load existing projects to ensure the project exists
        let projects = [];
        const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        if (savedProjects) {
          try {
            projects = JSON.parse(savedProjects);
          } catch (e) {
            console.error('Failed to parse saved projects:', e);
            // Create default projects if parsing fails
            projects = [
              {
                id: 'default',
                name: 'General',
                color: '#3B82F6',
                createdAt: new Date().toISOString()
              },
              {
                id: 'work',
                name: 'Work',
                color: '#EF4444',
                createdAt: new Date().toISOString()
              },
              {
                id: 'personal',
                name: 'Personal',
                color: '#10B981',
                createdAt: new Date().toISOString()
              }
            ];
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
          }
        } else {
          // Create default projects if none exist
          projects = [
            {
              id: 'default',
              name: 'General',
              color: '#3B82F6',
              createdAt: new Date().toISOString()
            },
            {
              id: 'work',
              name: 'Work',
              color: '#EF4444',
              createdAt: new Date().toISOString()
            },
            {
              id: 'personal',
              name: 'Personal',
              color: '#10B981',
              createdAt: new Date().toISOString()
            }
          ];
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        }
        
        // Verify project exists, or default to 'default'
        const validProjectId = projects.some((p: {id: string}) => p.id === projectId) ? projectId : 'default';
        
        // Create new task
        const newTask = {
          id: Date.now().toString(),
          title,
          completed: false,
          createdAt: new Date().toISOString(),
          projectId: validProjectId
        };
        
        // Add task and save back to localStorage
        tasks.push(newTask);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        
        return `Task "${title}" created successfully!`;
      } 
      else if (functionCall.name === 'create_document') {
        const { name, content = '' } = functionCall.arguments;
        
        // Load existing documents
        const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS) || '[]';
        const documents = JSON.parse(savedDocs);
        
        // Split content by newlines and create paragraph blocks
        const contentBlocks = [];
        
        // Add header block
        contentBlocks.push({
          type: 'header',
          data: {
            text: name,
            level: 1
          }
        });
        
        // Process content into separate paragraph blocks for better formatting
        if (content) {
          const paragraphs = content.split('\n\n').filter((p: string) => p.trim());
          
          // If no double newlines found, try splitting by single newlines
          const lines = paragraphs.length > 0 ? 
            paragraphs : 
            content.split('\n').filter((p: string) => p.trim());
          
          lines.forEach((line: string) => {
            contentBlocks.push({
              type: 'paragraph',
              data: {
                text: line.trim()
              }
            });
          });
        } else {
          // Default empty paragraph
          contentBlocks.push({
            type: 'paragraph',
            data: {
              text: 'Document content goes here...'
            }
          });
        }
        
        // Create new document
        const newDoc = {
          id: Date.now().toString(),
          name,
          content: {
            time: new Date().getTime(),
            blocks: contentBlocks
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Add document and save back to localStorage
        documents.push(newDoc);
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
        
        return `Document "${name}" created successfully!`;
      }
      
      return 'Function not implemented';
    } catch (error) {
      console.error('Error executing function:', error);
      return `Error executing function: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  // Create a context message from user profile
  const createContextMessage = (): string => {
    const parts = [];
    
    if (userContext.name || userContext.company) {
      parts.push(`USER INFORMATION:`);
      if (userContext.name) parts.push(`Name: ${userContext.name}`);
      if (userContext.company) parts.push(`Company/Organization: ${userContext.company}`);
    }
    
    if (userContext.backStory) {
      parts.push(`\nUSER BACKGROUND:\n${userContext.backStory}`);
    }
    
    if (userContext.websiteLinks) {
      parts.push(`\nUSER WEBSITES/LINKS:\n${userContext.websiteLinks}`);
    }
    
    if (userContext.additionalInfo) {
      parts.push(`\nADDITIONAL CONTEXT:\n${userContext.additionalInfo}`);
    }
    
    if (userContext.voice) {
      parts.push(`\nTONE/VOICE PREFERENCE: Please respond in a ${userContext.voice} tone.`);
    }
    
    return parts.join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Check if API key is set
    if (!apiKey) {
      setShowAPISettings(true);
      return;
    }
    
    // If no active chat, create one with the default assistant
    if (!activeChatId) {
      if (assistants.length === 0) {
        alert('No assistants available. Please create an assistant in Settings.');
        return;
      }
      
      // Open assistant select if multiple assistants exist
      if (assistants.length > 1) {
        setShowAssistantSelect(true);
        return;
      }
      
      // Use the only assistant available
      createNewChat(assistants[0].id);
      return;
    }
    
    const userMessage: Message = { role: 'user', content: input };
    
    // Update the messages state for immediate feedback
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Update the active chat in the chats array
    const updatedChats = chats.map(chat => {
      if (chat.id === activeChatId) {
        // Update chat title if this is the first message
        const shouldUpdateTitle = chat.messages.length === 0 || 
          (chat.messages.length === 1 && chat.messages[0].role === 'system');
        
        return {
          ...chat,
          messages: updatedMessages,
          title: shouldUpdateTitle ? generateChatTitle(input) : chat.title,
          updatedAt: new Date().toISOString()
        };
      }
      return chat;
    });
    
    setChats(updatedChats);
    setInput('');
    setIsLoading(true);
    
    // Add empty message to show the typing indicator
    const typingMessage: Message = { role: 'assistant' as const, content: '' };
    setMessages([...updatedMessages, typingMessage]);
    
    try {
      // Get the active assistant
      const activeAssistant = getActiveAssistant();
      if (!activeAssistant) throw new Error('No active assistant found');
      
      // Copy messages for API but don't include the typing indicator
      const apiMessages = [...updatedMessages];
      
      // If this is the first user message, prepend the system prompt + context
      if (messages.filter(m => m.role === 'user').length === 0) {
        // Start with assistant's system prompt
        let systemPrompt = activeAssistant.systemPrompt;
        
        // Add user context if available
        const contextContent = createContextMessage();
        if (contextContent) {
          systemPrompt += '\n\n' + contextContent;
        }
        
        // Add system message at the beginning
        apiMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Configure request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          functions: functionDefinitions.map(fn => ({
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
          })),
          function_call: 'auto'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch response');
      }
      
      const data = await response.json();
      const assistantResponse = data.choices[0]?.message;
      
      // Handle function calls
      if (assistantResponse.function_call) {
        const functionName = assistantResponse.function_call.name;
        const functionArgs = JSON.parse(assistantResponse.function_call.arguments);
        
        const functionCall: FunctionCall = {
          name: functionName,
          arguments: functionArgs
        };
        
        // Execute the function
        const functionResult = await executeFunction(functionCall);
        
        // Replace the typing indicator with function call message and result
        const functionCallMessage: Message = {
          role: 'assistant' as const,
          content: `Calling function: ${functionName}...`
        };
        
        const functionResultMessage: Message = {
          role: 'assistant' as const,
          content: functionResult
        };
        
        // Remove typing indicator and add function messages
        const newMessages = [...updatedMessages, functionCallMessage, functionResultMessage];
        setMessages(newMessages);
        
        // Update the chat in the chats array
        const updatedChatsWithFunction = chats.map(chat => 
          chat.id === activeChatId 
            ? { ...chat, messages: newMessages, updatedAt: new Date().toISOString() } 
            : chat
        );
        
        setChats(updatedChatsWithFunction);
      } 
      // Handle normal text response
      else if (assistantResponse.content) {
        // Replace the typing indicator with the actual response
        const newMessages = [...updatedMessages, {
          role: 'assistant' as const,
          content: assistantResponse.content
        }];
        
        setMessages(newMessages);
        
        // Update the chat in the chats array
        const updatedChatsWithResponse = chats.map(chat => 
          chat.id === activeChatId 
            ? { ...chat, messages: newMessages, updatedAt: new Date().toISOString() } 
            : chat
        );
        
        setChats(updatedChatsWithResponse);
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      
      // Replace typing indicator with error message
      const errorMessage: Message = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      const newMessages = [...updatedMessages, errorMessage];
      setMessages(newMessages);
      
      // Update the chat in the chats array
      const updatedChatsWithError = chats.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: newMessages, updatedAt: new Date().toISOString() } 
          : chat
      );
      
      setChats(updatedChatsWithError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          {!showChatList && (
            <button
              onClick={() => setShowChatList(true)}
              className="p-2 rounded-lg hover:bg-gray-700 mr-2"
              title="Show Chat List"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl font-bold text-white">AI Chat</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {!showChatList && messages.length > 0 && (
            <button
              onClick={clearChatHistory}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
              title="Clear Chat History"
            >
              Clear
            </button>
          )}
          <button 
            onClick={() => setShowAPISettings(!showAPISettings)}
            className="p-2 rounded-lg hover:bg-gray-700"
            title="API Settings"
          >
            <FiSettings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showAPISettings ? (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">OpenAI API Key</label>
            <div className="flex">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your OpenAI API key"
              />
              <button
                onClick={() => setShowAPISettings(false)}
                className="px-4 py-2 bg-blue-600 rounded-r hover:bg-blue-700"
              >
                Save
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Model</label>
            <div className="grid gap-2">
              {availableModels.map(model => (
                <div 
                  key={model.id}
                  className={`p-3 rounded cursor-pointer ${
                    selectedModel === model.id 
                      ? 'bg-blue-600 border border-blue-400' 
                      : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedModel(model.id)}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-sm text-gray-400">{model.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showChatList ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <button
              onClick={() => setShowAssistantSelect(true)}
              className="w-full px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <FiPlus className="mr-2" />
              <span>New Chat</span>
            </button>
          </div>
          
          {showAssistantSelect ? (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Select an Assistant</h3>
              <div className="space-y-3">
                {assistants.map(assistant => (
                  <div 
                    key={assistant.id}
                    className="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
                    onClick={() => createNewChat(assistant.id)}
                  >
                    <div className="mr-3">
                      {assistant.profileImage ? (
                        <img 
                          src={assistant.profileImage} 
                          alt={assistant.name} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          {assistant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{assistant.name}</h4>
                      <p className="text-sm text-gray-400 truncate max-w-xs">
                        {assistant.systemPrompt.length > 50 
                          ? assistant.systemPrompt.substring(0, 50) + '...' 
                          : assistant.systemPrompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowAssistantSelect(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          
          <h3 className="text-lg font-semibold mb-2 text-white">Recent Chats</h3>
          
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FiMessageCircle className="w-12 h-12 mx-auto mb-4" />
              <p>No chats yet. Start a new conversation!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map(chat => {
                const chatAssistant = assistants.find(a => a.id === chat.assistantId);
                return (
                  <div 
                    key={chat.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer ${
                      chat.id === activeChatId ? 'bg-gray-700' : 'hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setMessages(chat.messages);
                      setShowChatList(false);
                    }}
                  >
                    <div className="mr-3">
                      {chatAssistant?.profileImage ? (
                        <img 
                          src={chatAssistant.profileImage} 
                          alt={chatAssistant.name} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                          {chatAssistant ? chatAssistant.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white truncate">{chat.title}</h4>
                      <div className="text-xs text-gray-400">
                        {new Date(chat.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <FiCpu className="w-12 h-12 mx-auto mb-4" />
                <p>Send a message to start chatting</p>
              </div>
            ) : (
              messages
                .filter(msg => msg.role !== 'system') // Don't show system messages
                .map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-3/4 rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.content || (isLoading && index === messages.length - 1 ? (
                        <div className="flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="24" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                            <circle cx="16" cy="10" r="0" fill="currentColor">
                              <animate attributeName="r" begin=".67" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;1.75;0;0"/>
                            </circle>
                            <circle cx="12" cy="10" r="0" fill="currentColor">
                              <animate attributeName="r" begin=".33" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;1.75;0;0"/>
                            </circle>
                            <circle cx="8" cy="10" r="0" fill="currentColor">
                              <animate attributeName="r" begin="0" calcMode="spline" dur="1.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" repeatCount="indefinite" values="0;1.75;0;0"/>
                            </circle>
                          </svg>
                        </div>
                      ) : '')}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <form onSubmit={handleSubmit} className="flex">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your message..."
                disabled={isLoading || !apiKey}
              />
              <button
                type="submit"
                className={`px-4 py-2 rounded-r flex items-center justify-center ${
                  isLoading || !apiKey || !input.trim()
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isLoading || !apiKey || !input.trim()}
              >
                <FiSend className="w-5 h-5" />
              </button>
            </form>
            {!apiKey && (
              <p className="mt-2 text-sm text-red-400">
                Please set your OpenAI API key in settings
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AIChat; 