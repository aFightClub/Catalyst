import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiCpu, FiSettings } from 'react-icons/fi';

interface Message {
  role: 'user' | 'assistant';
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

const STORAGE_KEYS = {
  MESSAGES: 'aichat_messages',
  API_KEY: 'openai_api_key',
  MODEL: 'openai_model',
  TASKS: 'tasks_list',
  PROJECTS: 'tasks_projects',
  DOCUMENTS: 'writer_docs'
};

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showAPISettings, setShowAPISettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
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
    // Load saved messages
    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
          setMessages(parsedMessages);
        }
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
      }
    }

    // Load API key
    let savedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    
    // If not found, check other possible storage locations used by Settings
    if (!savedKey) {
      // Try getting from settings storage
      const storedKeys = localStorage.getItem('api_keys');
      if (storedKeys) {
        try {
          const parsedKeys = JSON.parse(storedKeys);
          if (parsedKeys.openai) {
            savedKey = parsedKeys.openai;
            // Save it to our own storage for future use
            localStorage.setItem(STORAGE_KEYS.API_KEY, parsedKeys.openai);
          }
        } catch (e) {
          console.error('Failed to parse API keys:', e);
        }
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
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  }, [messages]);

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
    if (confirm('Are you sure you want to clear your chat history?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !apiKey) return;
    
    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Add empty assistant message (will be updated with stream)
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    try {
      // Format messages for API
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Configure request with function calling
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: true,
          functions: functionDefinitions,
          function_call: 'auto'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch response');
      }
      
      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      let partialResponse = '';
      let functionCallJson = '';
      let collectingFunctionArgs = false;
      let functionName = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the array buffer to text
        const chunk = new TextDecoder().decode(value);
        
        // Process SSE format
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            // Check for the end of the stream
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta;
              
              // Check for function call
              if (delta?.function_call) {
                if (delta.function_call.name) {
                  functionName = delta.function_call.name;
                  collectingFunctionArgs = true;
                }
                
                if (delta.function_call.arguments) {
                  functionCallJson += delta.function_call.arguments;
                }
                
                // Update message to show function call in progress
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: `Calling function: ${functionName}...`
                  };
                  return newMessages;
                });
              } 
              // Handle regular content
              else if (delta?.content) {
                partialResponse += delta.content;
                
                // Update the assistant's message with accumulated response
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: partialResponse
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
      
      // Process function call if present
      if (collectingFunctionArgs && functionName) {
        try {
          const functionArgs = JSON.parse(functionCallJson);
          const functionCall: FunctionCall = {
            name: functionName,
            arguments: functionArgs
          };
          
          // Execute the function
          const functionResult = await executeFunction(functionCall);
          
          // Add function result to messages
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: functionResult
            };
            return newMessages;
          });
        } catch (error) {
          console.error('Error executing function call:', error);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: `Error calling function: ${error instanceof Error ? error.message : 'Invalid function arguments'}`
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      
      // Update the assistant message with error
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">AI Chat</h2>
        <div className="flex items-center space-x-2">
          {messages.length > 0 && (
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

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <FiCpu className="w-12 h-12 mx-auto mb-4" />
            <p>Send a message to start chatting with AI</p>
          </div>
        ) : (
          messages.map((message, index) => (
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
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200" />
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
    </div>
  );
};

export default AIChat; 