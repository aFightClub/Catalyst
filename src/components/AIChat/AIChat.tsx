import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiCpu, FiSettings, FiPlus, FiList, FiMessageCircle, FiChevronLeft, FiTrash2 } from 'react-icons/fi';
import { storeService } from '../../services/storeService';
import chatFunctions, { getCapabilitiesSystemPrompt } from '../../services/chatFunctions';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'function_call' | 'function_result';
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

// First, let's add CSS for the hidden function results
const markdownStyles = `
  .hidden-function-result {
    display: none;
  }
  
  .chat-message ul {
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }
  
  .chat-message ol {
    padding-left: 1.5rem;
    margin: 0.75rem 0;
    list-style-type: decimal;
  }
  
  .chat-message li {
    margin-bottom: 0.25rem;
  }
  
  .chat-message strong, .chat-message b {
    font-weight: bold;
  }
  
  .chat-message em, .chat-message i {
    font-style: italic;
  }
  
  .chat-message h1, .chat-message h2, .chat-message h3, 
  .chat-message h4, .chat-message h5, .chat-message h6 {
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .chat-message h1 { font-size: 1.5rem; }
  .chat-message h2 { font-size: 1.4rem; }
  .chat-message h3 { font-size: 1.3rem; }
  .chat-message h4 { font-size: 1.2rem; }
  .chat-message h5 { font-size: 1.1rem; }
  .chat-message h6 { font-size: 1rem; }
  
  .chat-message a {
    color: #60a5fa;
    text-decoration: underline;
  }
  
  .chat-message blockquote {
    border-left: 3px solid #4b5563;
    padding-left: 1rem;
    margin-left: 0;
    margin-right: 0;
    font-style: italic;
    color: #9ca3af;
  }
`;

const AIChat: React.FC = () => {
  // Chat and assistant state
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [showAssistantSelect, setShowAssistantSelect] = useState(false);
  const [showLandingScreen, setShowLandingScreen] = useState(true);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  
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
    { id: 'o1-2024-12-17', name: 'o1', description: 'Advanced reasoning capability' },
    { id: 'o3-mini-2025-01-31', name: 'o3-mini', description: 'Efficient smaller model with good capabilities' },
    { id: 'gpt-4.5-preview-2025-02-27', name: 'GPT-4.5', description: 'Premium model with advanced capabilities ($$$$)' },
    { id: 'gpt-4o-mini-2024-07-18', name: 'o4 Mini', description: 'Cheap, fast model' },
  ];

  // Function definitions for function calling
  const functionDefinitions: FunctionDefinition[] = [
    // Plan & Content Functions
    {
      name: 'get_plans',
      description: 'Get all content plans or details of a specific plan',
      parameters: {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'Optional: ID of a specific plan to retrieve'
          }
        }
      }
    },
    {
      name: 'create_plan',
      description: 'Create a new content plan',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the content plan'
          },
          description: {
            type: 'string',
            description: 'Optional: Description of the content plan'
          }
        },
        required: ['name']
      }
    },
    {
      name: 'update_plan',
      description: 'Update an existing content plan',
      parameters: {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'ID of the plan to update'
          },
          updates: {
            type: 'object',
            description: 'Fields to update',
            properties: {
              name: {
                type: 'string',
                description: 'New name for the plan'
              },
              description: {
                type: 'string',
                description: 'New description for the plan'
              }
            }
          }
        },
        required: ['planId', 'updates']
      }
    },
    {
      name: 'delete_plan',
      description: 'Delete a content plan',
      parameters: {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'ID of the plan to delete'
          }
        },
        required: ['planId']
      }
    },
    {
      name: 'add_channel',
      description: 'Add a new channel to a content plan',
      parameters: {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'ID of the plan to add the channel to'
          },
          channelData: {
            type: 'object',
            description: 'Channel information',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the channel'
              },
              type: {
                type: 'string',
                description: 'Type of channel (e.g., facebook, twitter, instagram, blog, email)'
              },
              status: {
                type: 'string',
                description: 'Status of the channel (draft, scheduled, published)'
              },
              description: {
                type: 'string',
                description: 'Optional: Description of the channel'
              },
              audience: {
                type: 'string',
                description: 'Optional: Target audience for the channel'
              },
              publishDate: {
                type: 'string',
                description: 'Optional: Scheduled publish date (ISO format)'
              }
            }
          }
        },
        required: ['planId', 'channelData']
      }
    },
    {
      name: 'update_channel',
      description: 'Update an existing channel in a content plan',
      parameters: {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'ID of the plan containing the channel'
          },
          channelId: {
            type: 'string',
            description: 'ID of the channel to update'
          },
          updates: {
            type: 'object',
            description: 'Fields to update',
            properties: {
              name: {
                type: 'string',
                description: 'New name for the channel'
              },
              type: {
                type: 'string',
                description: 'New type for the channel'
              },
              status: {
                type: 'string',
                description: 'New status for the channel'
              },
              description: {
                type: 'string',
                description: 'New description for the channel'
              },
              audience: {
                type: 'string',
                description: 'New target audience for the channel'
              },
              publishDate: {
                type: 'string',
                description: 'New publish date for the channel (ISO format)'
              }
            }
          }
        },
        required: ['planId', 'channelId', 'updates']
      }
    },
    {
      name: 'delete_channel',
      description: 'Delete a channel from a content plan',
      parameters: {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'ID of the plan containing the channel'
          },
          channelId: {
            type: 'string',
            description: 'ID of the channel to delete'
          }
        },
        required: ['planId', 'channelId']
      }
    },
    {
      name: 'update_channel_document',
      description: 'Create or update a document for a channel',
      parameters: {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'ID of the plan containing the channel'
          },
          channelId: {
            type: 'string',
            description: 'ID of the channel to update the document for'
          },
          documentTitle: {
            type: 'string',
            description: 'Title of the document'
          },
          documentContent: {
            type: 'string',
            description: 'Content of the document'
          }
        },
        required: ['planId', 'channelId', 'documentTitle', 'documentContent']
      }
    },
    
    // Website Functions
    {
      name: 'get_websites',
      description: 'Get all websites or details of a specific website',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'Optional: ID of a specific website to retrieve'
          }
        }
      }
    },
    {
      name: 'create_website',
      description: 'Create a new website',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the website'
          },
          url: {
            type: 'string',
            description: 'URL of the website'
          },
          category: {
            type: 'string',
            description: 'Category of the website'
          },
          description: {
            type: 'string',
            description: 'Optional: Description of the website'
          },
          status: {
            type: 'string',
            description: 'Optional: Status of the website (active, idea, archived)'
          }
        },
        required: ['name', 'url']
      }
    },
    {
      name: 'update_website',
      description: 'Update an existing website',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'ID of the website to update'
          },
          updates: {
            type: 'object',
            description: 'Fields to update',
            properties: {
              name: {
                type: 'string',
                description: 'New name for the website'
              },
              url: {
                type: 'string',
                description: 'New URL for the website'
              },
              category: {
                type: 'string',
                description: 'New category for the website'
              },
              description: {
                type: 'string',
                description: 'New description for the website'
              },
              status: {
                type: 'string',
                description: 'New status for the website (active, idea, archived)'
              }
            }
          }
        },
        required: ['websiteId', 'updates']
      }
    },
    {
      name: 'delete_website',
      description: 'Delete a website',
      parameters: {
        type: 'object',
        properties: {
          websiteId: {
            type: 'string',
            description: 'ID of the website to delete'
          }
        },
        required: ['websiteId']
      }
    },
    {
      name: 'get_website_categories',
      description: 'Get all website categories',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    
    // Subscription Functions
    {
      name: 'get_subscriptions',
      description: 'Get all subscriptions or details of a specific subscription',
      parameters: {
        type: 'object',
        properties: {
          subscriptionId: {
            type: 'string',
            description: 'Optional: ID of a specific subscription to retrieve'
          }
        }
      }
    },
    {
      name: 'create_subscription',
      description: 'Create a new subscription',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the subscription'
          },
          url: {
            type: 'string',
            description: 'URL of the subscription'
          },
          price: {
            type: 'number',
            description: 'Price of the subscription'
          },
          billingCycle: {
            type: 'string',
            description: 'Billing cycle (monthly, yearly)'
          },
          startDate: {
            type: 'string',
            description: 'Start date of the subscription (YYYY-MM-DD)'
          },
          category: {
            type: 'string',
            description: 'Category of the subscription'
          },
          notes: {
            type: 'string',
            description: 'Optional: Notes about the subscription'
          },
          linkedWebsites: {
            type: 'array',
            description: 'Optional: IDs of websites linked to this subscription',
            items: {
              type: 'string'
            }
          }
        },
        required: ['name', 'price']
      }
    },
    {
      name: 'update_subscription',
      description: 'Update an existing subscription',
      parameters: {
        type: 'object',
        properties: {
          subscriptionId: {
            type: 'string',
            description: 'ID of the subscription to update'
          },
          updates: {
            type: 'object',
            description: 'Fields to update',
            properties: {
              name: {
                type: 'string',
                description: 'New name for the subscription'
              },
              url: {
                type: 'string',
                description: 'New URL for the subscription'
              },
              price: {
                type: 'number',
                description: 'New price for the subscription'
              },
              billingCycle: {
                type: 'string',
                description: 'New billing cycle for the subscription'
              },
              startDate: {
                type: 'string',
                description: 'New start date for the subscription'
              },
              category: {
                type: 'string',
                description: 'New category for the subscription'
              },
              notes: {
                type: 'string',
                description: 'New notes for the subscription'
              },
              linkedWebsites: {
                type: 'array',
                description: 'New linked websites for the subscription',
                items: {
                  type: 'string'
                }
              }
            }
          }
        },
        required: ['subscriptionId', 'updates']
      }
    },
    {
      name: 'delete_subscription',
      description: 'Delete a subscription',
      parameters: {
        type: 'object',
        properties: {
          subscriptionId: {
            type: 'string',
            description: 'ID of the subscription to delete'
          }
        },
        required: ['subscriptionId']
      }
    },
    {
      name: 'get_subscription_categories',
      description: 'Get all subscription categories',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    
    // Calendar Functions
    {
      name: 'get_calendar_events',
      description: 'Get all calendar events or events in a specific date range',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Optional: Start date for filtering events (YYYY-MM-DD)'
          },
          endDate: {
            type: 'string',
            description: 'Optional: End date for filtering events (YYYY-MM-DD)'
          }
        }
      }
    },
    {
      name: 'create_calendar_event',
      description: 'Create a new calendar event or milestone',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the event'
          },
          date: {
            type: 'string',
            description: 'Date of the event (YYYY-MM-DD)'
          },
          time: {
            type: 'string',
            description: 'Optional: Time of the event (HH:MM)'
          },
          type: {
            type: 'string',
            description: 'Type of the event (event, milestone)'
          },
          projectId: {
            type: 'string',
            description: 'Optional: Project ID if this is a milestone'
          },
          color: {
            type: 'string',
            description: 'Optional: Color for the event (hex code)'
          },
          isRecurring: {
            type: 'boolean',
            description: 'Optional: Whether this is a recurring event'
          },
          recurrenceType: {
            type: 'string',
            description: 'Optional: Type of recurrence (daily, weekly, monthly)'
          },
          recurrenceEndDate: {
            type: 'string',
            description: 'Optional: End date for recurring events (YYYY-MM-DD)'
          }
        },
        required: ['title', 'date']
      }
    },
    {
      name: 'update_calendar_event',
      description: 'Update an existing calendar event',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'ID of the event to update'
          },
          updates: {
            type: 'object',
            description: 'Fields to update',
            properties: {
              title: {
                type: 'string',
                description: 'New title for the event'
              },
              date: {
                type: 'string',
                description: 'New date for the event'
              },
              time: {
                type: 'string',
                description: 'New time for the event'
              },
              type: {
                type: 'string',
                description: 'New type for the event'
              },
              projectId: {
                type: 'string',
                description: 'New project ID for the event'
              },
              color: {
                type: 'string',
                description: 'New color for the event'
              },
              isRecurring: {
                type: 'boolean',
                description: 'Whether this is a recurring event'
              },
              recurrenceType: {
                type: 'string',
                description: 'New type of recurrence'
              },
              recurrenceEndDate: {
                type: 'string',
                description: 'New end date for recurring events'
              }
            }
          }
        },
        required: ['eventId', 'updates']
      }
    },
    {
      name: 'delete_calendar_event',
      description: 'Delete a calendar event',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'ID of the event to delete'
          }
        },
        required: ['eventId']
      }
    },
    {
      name: 'get_projects',
      description: 'Get all projects for milestone creation',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    
    // Reminder Functions
    {
      name: 'get_reminders',
      description: 'Get all content reminders',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'create_reminder',
      description: 'Create a new manual reminder',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the reminder'
          },
          type: {
            type: 'string',
            description: 'Type of reminder (facebook, twitter, instagram, blog, email, meeting, task, other)'
          },
          publishDate: {
            type: 'string',
            description: 'Date of the reminder (YYYY-MM-DD)'
          },
          time: {
            type: 'string',
            description: 'Optional: Time of the reminder (HH:MM)'
          },
          notes: {
            type: 'string',
            description: 'Optional: Additional notes for the reminder'
          }
        },
        required: ['title', 'publishDate']
      }
    },
    {
      name: 'delete_reminder',
      description: 'Delete a manual reminder',
      parameters: {
        type: 'object',
        properties: {
          reminderId: {
            type: 'string',
            description: 'ID of the reminder to delete'
          }
        },
        required: ['reminderId']
      }
    },
    
    // Legacy function definitions (keeping for backward compatibility)
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
    },
    {
      name: 'get_tasks',
      description: 'Get list of tasks from the task manager',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Optional: Filter tasks by project ID'
          },
          completed: {
            type: 'boolean',
            description: 'Optional: Filter tasks by completion status'
          }
        }
      }
    },
    {
      name: 'get_documents',
      description: 'Get list of documents from the writer',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Optional: Get a specific document by ID'
          }
        }
      }
    },
    
    // Search functions for enhanced functionality
    {
      name: 'search_plans',
      description: 'Search for content plans by name or description',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find matching plans'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'search_channels',
      description: 'Search for channels by name, type, or document content',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find matching channels'
          },
          planId: {
            type: 'string',
            description: 'Optional: Limit search to channels in this plan'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'search_websites',
      description: 'Search for websites by name, URL, category, or description',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find matching websites'
          },
          status: {
            type: 'string',
            description: 'Optional: Filter by status (active, idea, archived)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'search_subscriptions',
      description: 'Search for subscriptions by name, category, URL, or notes',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find matching subscriptions'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'search_calendar_events',
      description: 'Search for calendar events by title',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find matching calendar events'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'search_reminders',
      description: 'Search for reminders by title or notes',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find matching reminders'
          }
        },
        required: ['query']
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
          
          // Just load chats but show landing screen
          setShowLandingScreen(true);
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

  // Update the formatMessageContent function to better handle markdown
  const formatMessageContent = (content: string) => {
    if (!content) return '';
    
    // Detect code blocks with triple backticks
    const codeBlockRegex = /```([\w]*)\n([\s\S]*?)```/g;
    
    let formattedContent = content;
    let match;
    
    // Store matches to process all at once to avoid regex state issues
    const matches = [];
    while ((match = codeBlockRegex.exec(content)) !== null) {
      matches.push({
        fullMatch: match[0],
        language: match[1] || '',
        code: match[2]
      });
    }
    
    // Replace code blocks with JSX
    for (const match of matches) {
      const codeBlockId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const replacementHTML = `<div class="relative bg-gray-800 rounded-md my-5 overflow-hidden shadow-lg border border-gray-700">
        <div class="flex items-center justify-between px-4 py-2 bg-gray-700 text-xs">
          <span class="text-gray-300 font-medium">${match.language || 'code'}</span>
          <button 
            class="text-gray-300 hover:text-white px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 transition-colors duration-200"
            onclick="(() => { 
              const codeEl = document.getElementById('${codeBlockId}'); 
              if (codeEl) {
                navigator.clipboard.writeText(codeEl.textContent || '');
                const button = event.currentTarget;
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => { button.textContent = originalText; }, 2000);
              }
            })(); return false;"
          >
            Copy
          </button>
        </div>
        <pre class="p-4 overflow-x-auto bg-gray-800"><code id="${codeBlockId}" class="text-green-400 text-sm font-mono leading-relaxed">${match.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
      </div>`;
      
      formattedContent = formattedContent.replace(match.fullMatch, replacementHTML);
    }
    
    // Basic markdown formatting (outside of code blocks)
    // Handle headers (h1-h6)
    formattedContent = formattedContent.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    formattedContent = formattedContent.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    formattedContent = formattedContent.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    formattedContent = formattedContent.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    formattedContent = formattedContent.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    formattedContent = formattedContent.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    
    // Handle bold and italic text
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedContent = formattedContent.replace(/__(.*?)__/g, '<strong>$1</strong>');
    formattedContent = formattedContent.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Handle lists
    const processLists = (content: string): string => {
      // Process unordered lists
      const ulRegex = /^[-*] (.*?)$((\n(?:^ {2,4}[-*] .*?$))*)/gm;
      let result = content.replace(ulRegex, (match, item, subItems) => {
        let listItems = `<li>${item}</li>`;
        
        if (subItems) {
          // Process nested items (simplified)
          const nestedItems = subItems.match(/^ {2,4}[-*] (.*?)$/gm);
          if (nestedItems) {
            listItems += '<ul>';
            for (const nestedItem of nestedItems) {
              const itemText = nestedItem.replace(/^ {2,4}[-*] /, '');
              listItems += `<li>${itemText}</li>`;
            }
            listItems += '</ul>';
          }
        }
        
        return `<ul>${listItems}</ul>`;
      });
      
      // Process ordered lists
      const olRegex = /^[0-9]+\. (.*?)$((\n(?:^ {2,4}[0-9]+\. .*?$))*)/gm;
      result = result.replace(olRegex, (match, item, subItems) => {
        let listItems = `<li>${item}</li>`;
        
        if (subItems) {
          // Process nested items (simplified)
          const nestedItems = subItems.match(/^ {2,4}[0-9]+\. (.*?)$/gm);
          if (nestedItems) {
            listItems += '<ol>';
            for (const nestedItem of nestedItems) {
              const itemText = nestedItem.replace(/^ {2,4}[0-9]+\. /, '');
              listItems += `<li>${itemText}</li>`;
            }
            listItems += '</ol>';
          }
        }
        
        return `<ol>${listItems}</ol>`;
      });
      
      return result;
    };
    
    formattedContent = processLists(formattedContent);
    
    // Handle links
    formattedContent = formattedContent.replace(/\[([^\[]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Handle blockquotes
    formattedContent = formattedContent.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Convert line breaks to <br> and wrap paragraphs for proper rendering
    if (!matches.length) {
      // Split by double newlines to identify paragraphs
      const paragraphs = formattedContent.split(/\n\n+/);
      formattedContent = paragraphs.map(p => {
        // Don't wrap list items or headers in paragraphs
        if (p.startsWith('<ul>') || p.startsWith('<ol>') || 
            p.startsWith('<h1>') || p.startsWith('<h2>') || 
            p.startsWith('<h3>') || p.startsWith('<h4>') || 
            p.startsWith('<h5>') || p.startsWith('<h6>') ||
            p.startsWith('<blockquote>')) {
          return p;
        }
        // Convert single newlines to <br> within paragraphs
        const processed = p.replace(/\n/g, '<br>');
        return `<p class="mb-3">${processed}</p>`;
      }).join('');
    } else {
      // Process text outside of code blocks
      const fragments = formattedContent.split(/(<div class="relative bg-gray-800.*?<\/div>)/gs);
      formattedContent = fragments.map(fragment => {
        if (fragment.startsWith('<div class="relative bg-gray-800')) {
          return fragment; // This is a code block, leave it as is
        } else {
          // Process text content
          const paragraphs = fragment.split(/\n\n+/);
          return paragraphs.map(p => {
            // Don't wrap list items or headers in paragraphs
            if (p.startsWith('<ul>') || p.startsWith('<ol>') || 
                p.startsWith('<h1>') || p.startsWith('<h2>') || 
                p.startsWith('<h3>') || p.startsWith('<h4>') || 
                p.startsWith('<h5>') || p.startsWith('<h6>') ||
                p.startsWith('<blockquote>')) {
              return p;
            }
            const processed = p.trim().replace(/\n/g, '<br>');
            return processed ? `<p class="mb-3">${processed}</p>` : '';
          }).join('');
        }
      }).join('');
    }
    
    return formattedContent;
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    return (
      <div className="flex items-center text-blue-400">
        <span className="mr-2">AI is thinking</span>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-400 opacity-75 animate-pulse mx-0.5"></div>
          <div className="w-2 h-2 rounded-full bg-blue-400 opacity-75 animate-pulse mx-0.5" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-blue-400 opacity-75 animate-pulse mx-0.5" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
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
  
  // Add these new functions for chat renaming
  // Start renaming a chat
  const startRenaming = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setRenamingChatId(chatId);
      setNewChatTitle(chat.title);
    }
  };

  // Rename chat
  const renameChat = () => {
    if (!renamingChatId || !newChatTitle.trim()) return;
    
    const updatedChats = chats.map(chat => 
      chat.id === renamingChatId
        ? { ...chat, title: newChatTitle.trim() }
        : chat
    );
    
    setChats(updatedChats);
    setRenamingChatId(null);
    setNewChatTitle('');
  };

  // Handle renaming cancel
  const cancelRenaming = () => {
    setRenamingChatId(null);
    setNewChatTitle('');
  };

  // Navigate to new chat screen
  const navigateToNewChat = () => {
    setShowLandingScreen(false);
    setShowAssistantSelect(true);
    setShowChatList(false);
  };

  // Navigate to past chats
  const navigateToPastChats = () => {
    setShowLandingScreen(false);
    setShowChatList(true);
    setShowAssistantSelect(false);
  };

  // Create a new chat with selected assistant
  const createNewChat = (assistantId: string) => {
    const assistant = assistants.find(a => a.id === assistantId);
    if (!assistant) return;
    
    // Include the capabilities in the system prompt
    const enhancedAssistant = {
      ...assistant,
      systemPrompt: assistant.systemPrompt + '\n\n' + getCapabilitiesSystemPrompt()
    };
    
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `Chat with ${enhancedAssistant.name}`,
      assistantId: enhancedAssistant.id,
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
    setShowLandingScreen(false);
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
    console.log('Executing function:', functionCall);
    
    try {
      // Check if function exists in our chatFunctions service
      const { name, arguments: args } = functionCall;
      
      // Create a message to show to the user about the function call
      let functionMessage = `I'm going to ${name.replace(/_/g, ' ')} for you.`;
      
      // Data/Content Plans Functions
      if (name === 'get_plans') {
        const planId = args.planId;
        const result = await chatFunctions.getPlans(planId);
        return JSON.stringify(result);
      } 
      else if (name === 'create_plan') {
        const { name, description } = args;
        // Ask for confirmation
        if (!window.confirm(`Create a new content plan named "${name}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.createPlan(name, description);
        return JSON.stringify(result);
      }
      else if (name === 'update_plan') {
        const { planId, updates } = args;
        // Ask for confirmation
        if (!window.confirm(`Update content plan with ID "${planId}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.updatePlan(planId, updates);
        return JSON.stringify(result);
      }
      else if (name === 'delete_plan') {
        const { planId } = args;
        // Ask for confirmation
        if (!window.confirm(`Are you sure you want to delete the content plan? This action cannot be undone.`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.deletePlan(planId);
        return JSON.stringify(result);
      }
      else if (name === 'add_channel') {
        const { planId, channelData } = args;
        const result = await chatFunctions.addChannel(planId, channelData);
        return JSON.stringify(result);
      }
      else if (name === 'update_channel') {
        const { planId, channelId, updates } = args;
        const result = await chatFunctions.updateChannel(planId, channelId, updates);
        return JSON.stringify(result);
      }
      else if (name === 'delete_channel') {
        const { planId, channelId } = args;
        // Ask for confirmation
        if (!window.confirm(`Are you sure you want to delete this channel? This action cannot be undone.`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.deleteChannel(planId, channelId);
        return JSON.stringify(result);
      }
      else if (name === 'update_channel_document') {
        const { planId, channelId, documentTitle, documentContent } = args;
        const result = await chatFunctions.updateChannelDocument(planId, channelId, documentTitle, documentContent);
        return JSON.stringify(result);
      }
      
      // Website Functions
      else if (name === 'get_websites') {
        const websiteId = args.websiteId;
        const result = await chatFunctions.getWebsites(websiteId);
        return JSON.stringify(result);
      }
      else if (name === 'create_website') {
        const websiteData = args;
        // Ask for confirmation
        if (!window.confirm(`Create a new website named "${websiteData.name}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.createWebsite(websiteData);
        return JSON.stringify(result);
      }
      else if (name === 'update_website') {
        const { websiteId, updates } = args;
        // Ask for confirmation
        if (!window.confirm(`Update website with ID "${websiteId}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.updateWebsite(websiteId, updates);
        return JSON.stringify(result);
      }
      else if (name === 'delete_website') {
        const { websiteId } = args;
        // Ask for confirmation
        if (!window.confirm(`Are you sure you want to delete this website? This action cannot be undone.`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.deleteWebsite(websiteId);
        return JSON.stringify(result);
      }
      else if (name === 'get_website_categories') {
        const result = await chatFunctions.getWebsiteCategories();
        return JSON.stringify(result);
      }
      
      // Subscription Functions
      else if (name === 'get_subscriptions') {
        const subscriptionId = args.subscriptionId;
        const result = await chatFunctions.getSubscriptions(subscriptionId);
        return JSON.stringify(result);
      }
      else if (name === 'create_subscription') {
        const subscriptionData = args;
        // Ask for confirmation
        if (!window.confirm(`Create a new subscription for "${subscriptionData.name}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.createSubscription(subscriptionData);
        return JSON.stringify(result);
      }
      else if (name === 'update_subscription') {
        const { subscriptionId, updates } = args;
        // Ask for confirmation
        if (!window.confirm(`Update subscription with ID "${subscriptionId}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.updateSubscription(subscriptionId, updates);
        return JSON.stringify(result);
      }
      else if (name === 'delete_subscription') {
        const { subscriptionId } = args;
        // Ask for confirmation
        if (!window.confirm(`Are you sure you want to delete this subscription? This action cannot be undone.`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.deleteSubscription(subscriptionId);
        return JSON.stringify(result);
      }
      else if (name === 'get_subscription_categories') {
        const result = await chatFunctions.getSubscriptionCategories();
        return JSON.stringify(result);
      }
      
      // Calendar Functions
      else if (name === 'get_calendar_events') {
        const { startDate, endDate } = args;
        const result = await chatFunctions.getCalendarEvents(startDate, endDate);
        return JSON.stringify(result);
      }
      else if (name === 'create_calendar_event') {
        const eventData = args;
        // Ask for confirmation
        if (!window.confirm(`Create a new calendar event: "${eventData.title}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.createCalendarEvent(eventData);
        return JSON.stringify(result);
      }
      else if (name === 'update_calendar_event') {
        const { eventId, updates } = args;
        // Ask for confirmation
        if (!window.confirm(`Update calendar event with ID "${eventId}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.updateCalendarEvent(eventId, updates);
        return JSON.stringify(result);
      }
      else if (name === 'delete_calendar_event') {
        const { eventId } = args;
        // Ask for confirmation
        if (!window.confirm(`Are you sure you want to delete this calendar event? This action cannot be undone.`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.deleteCalendarEvent(eventId);
        return JSON.stringify(result);
      }
      else if (name === 'get_projects') {
        const result = await chatFunctions.getProjects();
        return JSON.stringify(result);
      }
      
      // Reminder Functions
      else if (name === 'get_reminders') {
        const result = await chatFunctions.getReminders();
        return JSON.stringify(result);
      }
      else if (name === 'create_reminder') {
        const { title, type, publishDate, time, notes } = args;
        // Ask for confirmation
        if (!window.confirm(`Create a new reminder: "${title}"?`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.createReminder(title, type, publishDate, time, notes);
        return JSON.stringify(result);
      }
      else if (name === 'delete_reminder') {
        const { reminderId } = args;
        // Ask for confirmation
        if (!window.confirm(`Are you sure you want to delete this reminder? This action cannot be undone.`)) {
          return 'Operation cancelled by user.';
        }
        const result = await chatFunctions.deleteReminder(reminderId);
        return JSON.stringify(result);
      }
      
      // Default case if function not found
      return `Function "${name}" not implemented or not found.`;
    } 
    catch (error) {
      console.error('Error executing function:', error);
      return `Error executing function: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  // Create context message from user data
  const createContextMessage = (): string => {
    // Combine all user context into a single string
    let contextParts: string[] = [];
    
    if (userContext.name) {
      contextParts.push(`The user's name is ${userContext.name}.`);
    }
    
    if (userContext.company) {
      contextParts.push(`They work at ${userContext.company}.`);
    }
    
    if (userContext.voice) {
      contextParts.push(`When responding, use a ${userContext.voice} tone.`);
    }
    
    if (userContext.backStory) {
      contextParts.push(`Background information: ${userContext.backStory}`);
    }
    
    if (userContext.websiteLinks) {
      contextParts.push(`Their relevant websites are: ${userContext.websiteLinks}`);
    }
    
    if (userContext.additionalInfo) {
      contextParts.push(`Additional information: ${userContext.additionalInfo}`);
    }
    
    // Add a note about having access to the app data
    contextParts.push(`You have access to the user's content plans, websites, subscriptions, calendar events, and reminders in this application. You can help the user create, read, update, and delete this data using your function calling capabilities.`);
    
    return contextParts.join('\n');
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
    
    // Set loading state immediately
    setIsLoading(true);
    
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
    
    // Add empty message to show the typing indicator
    const typingMessage: Message = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, typingMessage]);
    
    try {
      // Get the active assistant
      const activeAssistant = getActiveAssistant();
      if (!activeAssistant) {
        throw new Error('No active assistant found');
      }
      
      // Create messages array for API call
      let apiMessages: Message[] = [];
      
      // Always include the system prompt and user context
      let systemPrompt = activeAssistant.systemPrompt;
      
      // Add user context
      const contextMessage = createContextMessage();
      if (contextMessage) {
        systemPrompt += `\n\n${contextMessage}`;
      }
      
      // Add access to app data note
      systemPrompt += '\n\nYou have access to app data through function calling. Help the user manage their content, websites, subscriptions, events, and reminders.';
      
      // Add the system prompt
      apiMessages.push({
        role: 'system',
        content: systemPrompt
      });
      
      // Include previous messages for context (excluding any previous system messages)
      const conversationMessages = messages.filter(m => m.role !== 'system');
      apiMessages = [...apiMessages, ...conversationMessages];
      
      // Add new user message
      apiMessages.push(userMessage);
      
      // Configure request with streaming enabled
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
          function_call: 'auto',
          stream: true // Enable streaming
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch response');
      }
      
      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Cannot read response stream');
      
      // Initialize our response content
      let responseContent = '';
      let functionCallData = '';
      let isFunctionCall = false;
      let functionName = '';
      
      // Set up a temporary message that will be updated as the stream progresses
      const streamingMessage: Message = { 
        role: 'assistant',
        content: '' 
      };
      
      // Add the temporary message to the chat
      setMessages([...updatedMessages, streamingMessage]);
      
      // Process the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        
        // Split the chunk by lines and process each line
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          // Check if it's the end of the stream
          if (line === 'data: [DONE]') continue;
          
          // Remove the "data: " prefix and parse JSON
          const jsonData = line.replace(/^data: /, '');
          try {
            const data = JSON.parse(jsonData);
            const delta = data.choices[0]?.delta;
            
            // Check for function call
            if (delta.function_call) {
              isFunctionCall = true;
              if (delta.function_call.name) {
                functionName = delta.function_call.name;
              }
              if (delta.function_call.arguments) {
                functionCallData += delta.function_call.arguments;
              }
              
              // Show that we're preparing to call a function
              streamingMessage.content = `Preparing to call function: ${functionName}...`;
              streamingMessage.type = 'function_call';
              setMessages([...updatedMessages, streamingMessage]);
            } 
            // Process content delta
            else if (delta.content) {
              // Add new content
              responseContent += delta.content;
              
              // Update the streaming message with new content
              streamingMessage.content = responseContent;
              
              // Update messages to show the partial content
              setMessages([...updatedMessages, { ...streamingMessage }]);
            }
          } catch (error) {
            console.warn('Error parsing streaming JSON:', error);
          }
        }
      }
      
      // Once the stream is complete, handle function calls if needed
      if (isFunctionCall) {
        try {
          // Parse the complete function call arguments
          const functionArgs = JSON.parse(functionCallData);
          
          const functionCall: FunctionCall = {
            name: functionName,
            arguments: functionArgs
          };
          
          // Execute the function
          const functionResult = await executeFunction(functionCall);
          
          // Create function call message - but don't show it to the user
          const functionCallMessage: Message = {
            role: 'assistant',
            content: `Calling function: ${functionName}...`,
            type: 'function_call'
          };
          
          const functionResultMessage: Message = {
            role: 'assistant',
            content: functionResult,
            type: 'function_result'
          };
          
          // Store these messages in the chat history, but don't display them to the user
          const historyMessages = [...updatedMessages, functionCallMessage, functionResultMessage];
          
          // Show a temporary message to the user
          setMessages([...updatedMessages, {
            role: 'assistant',
            content: 'Processing your request...'
          }]);
          
          // Now send the function result back to OpenAI to get a human-readable response
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [
                // Include system message with context again
                {
                  role: 'system',
                  content: systemPrompt
                },
                ...apiMessages.filter(m => m.role !== 'system'), // Previous conversation context without system message
                functionCallMessage, // The function call that was made
                // Add a system message explaining the function result
                {
                  role: 'system',
                  content: 'The function has been executed. Please provide a helpful response based on the function result. Format your response using markdown for better readability.'
                },
                // Add the function result as an assistant message
                {
                  role: 'assistant',
                  content: functionResult
                }
              ]
            })
          });
          
          const responseData = await response.json();
          const humanReadableResponse = responseData.choices[0]?.message?.content || 'I processed your request, but couldn\'t generate a good response.';
          
          // Create the final human-readable message
          const finalResponseMessage: Message = {
            role: 'assistant',
            content: humanReadableResponse
          };
          
          // Update messages with all the history plus the human-readable response
          const newMessages = [...historyMessages, finalResponseMessage];
          setMessages([...updatedMessages, finalResponseMessage]); // Only show the final human-readable response to the user
          
          // Update the chat in the chats array with the full history
          const updatedChatsWithFunction = chats.map(chat => 
            chat.id === activeChatId 
              ? { ...chat, messages: newMessages, updatedAt: new Date().toISOString() } 
              : chat
          );
          
          setChats(updatedChatsWithFunction);
        } catch (error) {
          console.error('Error executing function or getting response:', error);
          
          // Show error to user
          const errorMessage: Message = {
            role: 'assistant',
            content: 'I encountered an error while processing your request. Please try again.'
          };
          
          setMessages([...updatedMessages, errorMessage]);
          
          const updatedChatsWithError = chats.map(chat => 
            chat.id === activeChatId 
              ? { ...chat, messages: [...updatedMessages, errorMessage], updatedAt: new Date().toISOString() } 
              : chat
          );
          
          setChats(updatedChatsWithError);
        }
      } else {
        // Finalize the regular text response
        const finalMessage: Message = {
          role: 'assistant',
          content: responseContent
        };
        
        // Update messages with the complete response
        const newMessages = [...updatedMessages, finalMessage];
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
      // Set loading to false only after everything is complete
      setIsLoading(false);
    }
  };

  // Add this CSS class for the loading indicator near the top
  const loadingIndicatorStyles = `
    .loading-indicator {
      position: fixed;
      top: 90px;
      right: 20px;
      z-index: 1000;
      background-color: rgba(30, 41, 59, 0.8);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .loading-spinner {
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      border-top: 3px solid #3b82f6;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;



  return (
    <div className="flex flex-col h-full bg-gray-900">
      <style>{loadingIndicatorStyles}</style>
      <style>{markdownStyles}</style>
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          {!showLandingScreen && !showChatList && (
            <button
              onClick={() => {
                setShowLandingScreen(true);
                setActiveChatId(null);
                setMessages([]);
              }}
              className="p-2 rounded-lg hover:bg-gray-700 mr-2"
              title="Back to Home"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
          )}
          {!showLandingScreen && !showChatList && activeChatId && renamingChatId === activeChatId ? (
            <div className="flex items-center">
              <input
                type="text"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                className="px-2 py-1 bg-gray-700 rounded text-white text-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter chat name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') renameChat();
                  if (e.key === 'Escape') cancelRenaming();
                }}
              />
              <div className="flex space-x-1 ml-2">
                <button
                  onClick={renameChat}
                  className="p-1 text-gray-300 hover:text-green-500 rounded"
                  title="Save"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={cancelRenaming}
                  className="p-1 text-gray-300 hover:text-red-500 rounded"
                  title="Cancel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ) : !showLandingScreen && !showChatList && activeChatId ? (
            <div className="flex items-center">
              {(() => {
                const activeAssistant = getActiveAssistant();
                return activeAssistant ? (
                  <div className="mr-3">
                    {activeAssistant.profileImage ? (
                      <img 
                        src={activeAssistant.profileImage} 
                        alt={activeAssistant.name} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                        {activeAssistant.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <h2 className="text-xl font-bold text-white">
                {chats.find(c => c.id === activeChatId)?.title || 'Chat'}
              </h2>
              <button
                onClick={() => {
                  const chat = chats.find(c => c.id === activeChatId);
                  if (chat) {
                    setRenamingChatId(activeChatId);
                    setNewChatTitle(chat.title);
                  }
                }}
                className="ml-2 p-1 text-gray-400 hover:text-blue-500 rounded"
                title="Rename Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-white">Chat</h2>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!showLandingScreen && !showChatList && messages.length > 0 && (
            <>
              <button
                onClick={clearChatHistory}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
                title="Clear Chat History"
              >
                Clear
              </button>
              <button
                onClick={() => deleteChat(activeChatId!)}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-500"
                title="Delete Chat"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </>
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

      {showLandingScreen ? (
        <div className="flex-1 overflow-hidden bg-gray-900 p-8">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Chat Card */}
              <div 
                onClick={navigateToNewChat}
                className="flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl  cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02]"
              >
                <div className="p-8 flex-1 flex flex-col items-center justify-center">
                  <div className="bg-white/20 p-4 rounded-full mb-6">
                    <FiPlus className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium text-gray-100  mb-2">New Chat</h2>
                  <p className="text-gray-500 text-center">Start a conversation with an assistant</p>
                </div>
                <div className="bg-black/20 py-4 text-center">
                  <span className="text-white/90 font-medium">Create New &rarr;</span>
                </div>
              </div>
              
              {/* Past Chats Card */}
              <div 
                onClick={navigateToPastChats}
                className="flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl cursor-pointer border border-gray-700 transform hover:-translate-y-1 hover:scale-[1.02]"
              >
                <div className="p-8 flex-1 flex flex-col items-center justify-center">
                  <div className="bg-white/10 p-4 rounded-full mb-6">
                    <FiList className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-medium text-gray-100  mb-2">Past Chats</h2>
                  <p className="text-gray-500 text-center">Continue a previous conversation</p>
                </div>
                <div className="bg-black/20 py-4 text-center">
                  <span className="text-white/90 font-medium">View History &rarr;</span>
                </div>
              </div>
            </div>
            
            {/* Extra information section */}
            <div className="mt-8 text-center text-gray-400 text-sm">
              <p>Powered by OpenAI models with function calling capabilities</p>
            </div>
          </div>
        </div>
      ) : showAssistantSelect ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setShowLandingScreen(true)}
              className="px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 flex items-center justify-center"
            >
              <FiChevronLeft className="mr-2" />
              <span>Back</span>
            </button>
          </div>
          
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
          </div>
        </div>
      ) : showChatList ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setShowLandingScreen(true)}
              className="px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 flex items-center justify-center"
            >
              <FiChevronLeft className="mr-2" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setShowAssistantSelect(true)}
              className="flex-1 px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <FiPlus className="mr-2" />
              <span>New Chat</span>
            </button>
          </div>
          
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
                
                // Renaming mode for this chat
                if (renamingChatId === chat.id) {
                  return (
                    <div 
                      key={chat.id}
                      className="p-3 rounded-lg bg-gray-700 group"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center">
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
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            className="w-full px-2 py-1 bg-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter chat name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameChat();
                              if (e.key === 'Escape') cancelRenaming();
                            }}
                          />
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={renameChat}
                            className="p-1 text-gray-300 hover:text-green-500 rounded"
                            title="Save"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelRenaming}
                            className="p-1 text-gray-300 hover:text-red-500 rounded"
                            title="Cancel"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Regular display mode
                return (
                  <div 
                    key={chat.id}
                    className="flex items-center p-3 rounded-lg cursor-pointer group relative hover:bg-gray-800"
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setMessages(chat.messages);
                      setShowChatList(false);
                      setShowLandingScreen(false);
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
                    <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenaming(chat.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                        title="Rename"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 flex justify-center">
            <div
              ref={messagesContainerRef}
              className="max-w-2xl w-full"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">
                  <FiCpu className="w-12 h-12 mx-auto mb-4" />
                  <p>Send a message to start chatting</p>
                </div>
              ) : (
                <div className="space-y-4 p-12">
                  {messages
                    .filter(msg => msg.role !== 'system') // Don't show system messages
                    .map((message, index) => (
                    <div
                      key={index}
                      className="flex flex-col"
                    >
                      {message.role === 'user' ? (
                        <div className="self-end max-w-3/4 bg-gray-700 rounded-lg p-3 text-white">
                          <div className="whitespace-pre-wrap user-msg">
                            <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                          </div>
                        </div>
                      ) : message.type === 'function_call' ? (
                        <div className="self-start max-w-full w-full bg-gray-800 border-l-4 border-blue-500 px-3 py-2 my-2 text-blue-300 text-sm flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <div className="font-mono">{message.content}</div>
                        </div>
                      ) : message.type === 'function_result' ? (
                        <div className="hidden-function-result">
                          {message.content}
                        </div>
                      ) : (
                        <div className="self-start max-w-3/4 bg-transparent text-white">
                          <div className="chat-message">
                            {isLoading && index === messages.length - 1 && message.content === '' ? (
                              renderTypingIndicator()
                            ) : (
                              <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
              {isLoading && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-center">
            <div className="max-w-2xl w-full">
              <form onSubmit={handleSubmit} className="flex">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto resize
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !isLoading && apiKey) {
                        handleSubmit(e as any);
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-l resize-none overflow-hidden focus:outline-none focus:ring-0  min-h-[40px] max-h-[200px]"
                  placeholder="Type your message..."
                  disabled={isLoading || !apiKey}
                  rows={1}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
                    }
                  }}
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
        </>
      )}
    </div>
  );
};

export default AIChat; 