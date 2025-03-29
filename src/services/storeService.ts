// Create a more robust storage system - this avoids the ESM/CJS conflicts

// Define schema and default values for our stores
const schema = {
  tasks: {
    type: "array",
    default: [],
  },
  projects: {
    type: "array",
    default: [
      {
        id: "default",
        name: "General",
        color: "#3B82F6",
        createdAt: new Date().toISOString(),
      },
      {
        id: "work",
        name: "Work",
        color: "#EF4444",
        createdAt: new Date().toISOString(),
      },
      {
        id: "personal",
        name: "Personal",
        color: "#10B981",
        createdAt: new Date().toISOString(),
      },
    ],
  },
  documents: {
    type: "array",
    default: [],
  },
  workflows: {
    type: "array",
    default: [],
  },
  workflowVariables: {
    type: "object",
    default: {},
  },
  workspaces: {
    type: "array",
    default: [
      {
        id: "default",
        name: "Default Workspace",
        tabs: [
          {
            id: "1",
            title: "Google",
            url: "https://google.com",
            isReady: false,
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ],
  },
  erasedElements: {
    type: "array",
    default: [],
  },
  apiKeys: {
    type: "object",
    default: {},
  },
  websites: {
    type: "array",
    default: [],
  },
  websiteCategories: {
    type: "array",
    default: [
      "Personal",
      "Business",
      "Blog",
      "E-commerce",
      "Portfolio",
      "Social Media",
      "Education",
      "Other",
    ],
  },
  subscriptions: {
    type: "array",
    default: [],
  },
  subscriptionCategories: {
    type: "array",
    default: [
      "Entertainment",
      "Productivity",
      "Utilities",
      "Social Media",
      "Shopping",
      "News",
      "Music",
      "Gaming",
      "Other",
    ],
  },
  userContext: {
    type: "object",
    default: {
      name: "",
      company: "",
      voice: "",
      backStory: "",
      websiteLinks: "",
      additionalInfo: "",
    },
  },
  assistants: {
    type: "array",
    default: [
      {
        id: "default",
        name: "Default Assistant",
        systemPrompt: "You are a helpful assistant.",
        profileImage: "",
        createdAt: new Date().toISOString(),
      },
    ],
  },
  chats: {
    type: "array",
    default: [],
  },
  automations: {
    type: "array",
    default: [],
  },
};

// Track initialization status
let isInitialized = false;
let storeReady = false;
let store: any = null;

// Check if we're in Electron
const isElectron = () => {
  return !!(
    typeof window !== "undefined" &&
    (window as any).process &&
    (window as any).process.type
  );
};

// Create a memory store
function createMemoryStore() {
  console.log("Using in-memory store");
  const memoryStore: Record<string, any> = {};

  // Initialize with defaults
  Object.entries(schema).forEach(([key, value]) => {
    memoryStore[key] = value.default;
  });

  return {
    get: (key: string) => {
      return (
        memoryStore[key] ?? schema[key as keyof typeof schema]?.default ?? null
      );
    },
    set: (key: string, value: any) => {
      memoryStore[key] = value;
      return true;
    },
    delete: (key: string) => {
      delete memoryStore[key];
      return true;
    },
    clear: () => {
      Object.keys(memoryStore).forEach((key) => {
        delete memoryStore[key];
      });
      return true;
    },
  };
}

// Create a localStorage-based store
function createLocalStorageStore() {
  console.log("Using localStorage-based store");

  // Initialize with defaults
  Object.entries(schema).forEach(([key, value]) => {
    if (localStorage.getItem(`store_${key}`) === null) {
      localStorage.setItem(`store_${key}`, JSON.stringify(value.default));
    }
  });

  return {
    get: (key: string) => {
      const value = localStorage.getItem(`store_${key}`);
      if (!value) {
        // Return default value from schema if available
        return schema[key as keyof typeof schema]?.default || null;
      }
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    },
    set: (key: string, value: any) => {
      localStorage.setItem(`store_${key}`, JSON.stringify(value));
      return true;
    },
    delete: (key: string) => {
      localStorage.removeItem(`store_${key}`);
      return true;
    },
    clear: () => {
      Object.keys(schema).forEach((key) => {
        localStorage.removeItem(`store_${key}`);
      });
      return true;
    },
  };
}

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const testKey = "__test_store_key__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Initialize the store asynchronously
const initStore = async () => {
  if (storeReady) return store;

  try {
    // In Electron environment, use a compatible approach
    // This assumes you've properly set up Electron context
    if (isElectron()) {
      console.log("Running in Electron environment");

      // Access Electron APIs through window instead of direct import
      // This avoids ESM/CJS conflicts
      if ((window as any).electron?.store) {
        console.log("Using Electron IPC for storage");
        store = (window as any).electron.store;
      } else {
        // Fallback to localStorage if electron.store is not available
        store = isLocalStorageAvailable()
          ? createLocalStorageStore()
          : createMemoryStore();
      }
    } else {
      // In browser or development environment, use localStorage
      store = isLocalStorageAvailable()
        ? createLocalStorageStore()
        : createMemoryStore();
    }

    storeReady = true;
    return store;
  } catch (error) {
    console.error("Store initialization error:", error);
    // Fallback to memory store
    store = createMemoryStore();
    storeReady = true;
    return store;
  }
};

// Start initialization right away
const storePromise = initStore();

// Helper function to ensure store is initialized before use
const ensureStore = async () => {
  if (!storeReady) {
    await storePromise;
  }
  return store;
};

// Helper functions for common operations
export const storeService = {
  // Tasks
  getTasks: async () => {
    const s = await ensureStore();
    return s.get("tasks") as any[];
  },
  saveTasks: async (tasks: any[]) => {
    const s = await ensureStore();
    return s.set("tasks", tasks);
  },

  // Projects
  getProjects: async () => {
    const s = await ensureStore();
    return s.get("projects") as any[];
  },
  saveProjects: async (projects: any[]) => {
    const s = await ensureStore();
    return s.set("projects", projects);
  },

  // Documents
  getDocuments: async () => {
    const s = await ensureStore();
    return s.get("documents") as any[];
  },
  saveDocuments: async (documents: any[]) => {
    const s = await ensureStore();
    return s.set("documents", documents);
  },

  // Workflows
  getWorkflows: async () => {
    const s = await ensureStore();
    return s.get("workflows") as any[];
  },
  saveWorkflows: async (workflows: any[]) => {
    const s = await ensureStore();
    return s.set("workflows", workflows);
  },

  // Workflow Variables
  getWorkflowVariables: async () => {
    const s = await ensureStore();
    return s.get("workflowVariables") as {
      [workflowId: string]: { [varName: string]: string };
    };
  },
  saveWorkflowVariables: async (variables: {
    [workflowId: string]: { [varName: string]: string };
  }) => {
    const s = await ensureStore();
    return s.set("workflowVariables", variables);
  },

  // Workspaces
  getWorkspaces: async () => {
    const s = await ensureStore();
    return s.get("workspaces") as any[];
  },
  saveWorkspaces: async (workspaces: any[]) => {
    const s = await ensureStore();
    return s.set("workspaces", workspaces);
  },

  // Websites
  getWebsites: async () => {
    const s = await ensureStore();
    return s.get("websites") as any[];
  },
  saveWebsites: async (websites: any[]) => {
    const s = await ensureStore();
    return s.set("websites", websites);
  },

  // Website Categories
  getWebsiteCategories: async () => {
    const s = await ensureStore();
    return s.get("websiteCategories") as string[];
  },
  saveWebsiteCategories: async (categories: string[]) => {
    const s = await ensureStore();
    return s.set("websiteCategories", categories);
  },

  // Subscriptions
  getSubscriptions: async () => {
    const s = await ensureStore();
    return s.get("subscriptions") as any[];
  },
  saveSubscriptions: async (subscriptions: any[]) => {
    const s = await ensureStore();
    return s.set("subscriptions", subscriptions);
  },

  // Subscription Categories
  getSubscriptionCategories: async () => {
    const s = await ensureStore();
    return s.get("subscriptionCategories") as string[];
  },
  saveSubscriptionCategories: async (categories: string[]) => {
    const s = await ensureStore();
    return s.set("subscriptionCategories", categories);
  },

  // User Context
  getUserContext: async () => {
    const s = await ensureStore();
    return s.get("userContext") as Record<string, string>;
  },
  saveUserContext: async (context: Record<string, string>) => {
    const s = await ensureStore();
    return s.set("userContext", context);
  },

  // Assistants
  getAssistants: async () => {
    const s = await ensureStore();
    return s.get("assistants") as any[];
  },
  saveAssistants: async (assistants: any[]) => {
    const s = await ensureStore();
    return s.set("assistants", assistants);
  },

  // Chats
  getChats: async () => {
    const s = await ensureStore();
    return s.get("chats") as any[];
  },
  saveChats: async (chats: any[]) => {
    const s = await ensureStore();
    return s.set("chats", chats);
  },

  // Erased Elements
  getErasedElements: async () => {
    const s = await ensureStore();
    return s.get("erasedElements") as any[];
  },
  saveErasedElements: async (elements: any[]) => {
    const s = await ensureStore();
    return s.set("erasedElements", elements);
  },

  // API Keys
  getApiKeys: async () => {
    const s = await ensureStore();
    return s.get("apiKeys") as Record<string, string | undefined>;
  },
  saveApiKeys: async (apiKeys: Record<string, string | undefined>) => {
    const s = await ensureStore();
    return s.set("apiKeys", apiKeys);
  },

  // Automations
  getAutomations: async () => {
    const s = await ensureStore();
    return s.get("automations") as any[];
  },
  saveAutomations: async (automations: any[]) => {
    const s = await ensureStore();
    return s.set("automations", automations);
  },

  // Export all data to a JSON file
  exportAllData: async (): Promise<string> => {
    const s = await ensureStore();

    // Collect all data from the store
    const exportData = {
      tasks: await s.get("tasks"),
      projects: await s.get("projects"),
      documents: await s.get("documents"),
      workflows: await s.get("workflows"),
      workflowVariables: await s.get("workflowVariables"),
      workspaces: await s.get("workspaces"),
      erasedElements: await s.get("erasedElements"),
      apiKeys: await s.get("apiKeys"),
      websites: await s.get("websites"),
      websiteCategories: await s.get("websiteCategories"),
      subscriptions: await s.get("subscriptions"),
      subscriptionCategories: await s.get("subscriptionCategories"),
      userContext: await s.get("userContext"),
      assistants: await s.get("assistants"),
      chats: await s.get("chats"),
      automations: await s.get("automations"),
      exportDate: new Date().toISOString(),
      appVersion: "1.0.0", // Add version for future compatibility checks
    };

    // Convert to JSON string
    return JSON.stringify(exportData, null, 2);
  },

  // Import data from a JSON file
  importFromJSON: async (
    jsonData: string,
    options: {
      overwrite?: boolean;
      importWorkspaces?: boolean;
      importWorkflows?: boolean;
      importTasks?: boolean;
      importSubscriptions?: boolean;
      importErasedElements?: boolean;
      importAssistants?: boolean;
      importChats?: boolean;
      importWebsites?: boolean;
      importDocuments?: boolean;
      importProjects?: boolean;
      importAutomations?: boolean;
      importWorkflowVariables?: boolean;
      importApiKeys?: boolean;
      importUserContext?: boolean;
      importWebsiteCategories?: boolean;
      importSubscriptionCategories?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const s = await ensureStore();
      const data = JSON.parse(jsonData);

      // Check if the data format is valid
      if (!data || typeof data !== "object") {
        return { success: false, message: "Invalid data format" };
      }

      // Import data selectively based on options
      if (options.importWorkspaces !== false && data.workspaces) {
        if (options.overwrite) {
          await s.set("workspaces", data.workspaces);
        } else {
          // Merge workspaces, avoiding duplicates by ID
          const currentWorkspaces = (await s.get("workspaces")) as any[];
          const existingIds = new Set(currentWorkspaces.map((w) => w.id));
          const newWorkspaces = [...currentWorkspaces];

          for (const workspace of data.workspaces) {
            if (!existingIds.has(workspace.id)) {
              newWorkspaces.push(workspace);
              existingIds.add(workspace.id);
            }
          }

          await s.set("workspaces", newWorkspaces);
        }
      }

      if (options.importWorkflows !== false && data.workflows) {
        if (options.overwrite) {
          await s.set("workflows", data.workflows);
        } else {
          const currentWorkflows = (await s.get("workflows")) as any[];
          const existingIds = new Set(currentWorkflows.map((w) => w.id));
          const newWorkflows = [...currentWorkflows];

          for (const workflow of data.workflows) {
            if (!existingIds.has(workflow.id)) {
              newWorkflows.push(workflow);
              existingIds.add(workflow.id);
            }
          }

          await s.set("workflows", newWorkflows);
        }
      }

      // Import other data types as needed
      if (options.importTasks !== false && data.tasks) {
        if (options.overwrite) {
          await s.set("tasks", data.tasks);
        } else {
          const currentTasks = (await s.get("tasks")) as any[];
          const existingIds = new Set(currentTasks.map((t) => t.id));
          const newTasks = [...currentTasks];

          for (const task of data.tasks) {
            if (!existingIds.has(task.id)) {
              newTasks.push(task);
              existingIds.add(task.id);
            }
          }

          await s.set("tasks", newTasks);
        }
      }

      if (options.importSubscriptions !== false && data.subscriptions) {
        if (options.overwrite) {
          await s.set("subscriptions", data.subscriptions);
        } else {
          const currentSubs = (await s.get("subscriptions")) as any[];
          const existingIds = new Set(currentSubs.map((sub) => sub.id));
          const newSubs = [...currentSubs];

          for (const sub of data.subscriptions) {
            if (!existingIds.has(sub.id)) {
              newSubs.push(sub);
              existingIds.add(sub.id);
            }
          }

          await s.set("subscriptions", newSubs);
        }
      }

      if (options.importErasedElements !== false && data.erasedElements) {
        if (options.overwrite) {
          await s.set("erasedElements", data.erasedElements);
        } else {
          // For erased elements, we can't easily check for duplicates,
          // so we'll add them all and let the UI filter out duplicates
          const currentElements = (await s.get("erasedElements")) as any[];
          await s.set("erasedElements", [
            ...currentElements,
            ...data.erasedElements,
          ]);
        }
      }

      if (options.importWebsites !== false && data.websites) {
        if (options.overwrite) {
          await s.set("websites", data.websites);
        } else {
          const currentSites = (await s.get("websites")) as any[];
          const existingIds = new Set(currentSites.map((site) => site.id));
          const newSites = [...currentSites];

          for (const site of data.websites) {
            if (!existingIds.has(site.id)) {
              newSites.push(site);
              existingIds.add(site.id);
            }
          }

          await s.set("websites", newSites);
        }
      }

      if (options.importAssistants !== false && data.assistants) {
        if (options.overwrite) {
          await s.set("assistants", data.assistants);
        } else {
          const currentAssistants = (await s.get("assistants")) as any[];
          const existingIds = new Set(currentAssistants.map((a) => a.id));
          const newAssistants = [...currentAssistants];

          for (const assistant of data.assistants) {
            if (!existingIds.has(assistant.id)) {
              newAssistants.push(assistant);
              existingIds.add(assistant.id);
            }
          }

          await s.set("assistants", newAssistants);
        }
      }

      if (options.importChats !== false && data.chats) {
        if (options.overwrite) {
          await s.set("chats", data.chats);
        } else {
          const currentChats = (await s.get("chats")) as any[];
          const existingIds = new Set(currentChats.map((chat) => chat.id));
          const newChats = [...currentChats];

          for (const chat of data.chats) {
            if (!existingIds.has(chat.id)) {
              newChats.push(chat);
              existingIds.add(chat.id);
            }
          }

          await s.set("chats", newChats);
        }
      }

      if (options.importDocuments !== false && data.documents) {
        if (options.overwrite) {
          await s.set("documents", data.documents);
        } else {
          const currentDocs = (await s.get("documents")) as any[];
          const existingIds = new Set(currentDocs.map((doc) => doc.id));
          const newDocs = [...currentDocs];

          for (const doc of data.documents) {
            if (!existingIds.has(doc.id)) {
              newDocs.push(doc);
              existingIds.add(doc.id);
            }
          }

          await s.set("documents", newDocs);
        }
      }

      if (options.importProjects !== false && data.projects) {
        if (options.overwrite) {
          await s.set("projects", data.projects);
        } else {
          const currentProjects = (await s.get("projects")) as any[];
          const existingIds = new Set(currentProjects.map((proj) => proj.id));
          const newProjects = [...currentProjects];

          for (const project of data.projects) {
            if (!existingIds.has(project.id)) {
              newProjects.push(project);
              existingIds.add(project.id);
            }
          }

          await s.set("projects", newProjects);
        }
      }

      if (options.importAutomations !== false && data.automations) {
        if (options.overwrite) {
          await s.set("automations", data.automations);
        } else {
          const currentAutomations = (await s.get("automations")) as any[];
          const existingIds = new Set(
            currentAutomations.map((auto) => auto.id)
          );
          const newAutomations = [...currentAutomations];

          for (const automation of data.automations) {
            if (!existingIds.has(automation.id)) {
              newAutomations.push(automation);
              existingIds.add(automation.id);
            }
          }

          await s.set("automations", newAutomations);
        }
      }

      if (options.importWorkflowVariables !== false && data.workflowVariables) {
        if (options.overwrite) {
          await s.set("workflowVariables", data.workflowVariables);
        } else {
          const currentVars = (await s.get("workflowVariables")) as Record<
            string,
            Record<string, string>
          >;
          const mergedVars = { ...currentVars };

          // Merge workflow variables
          for (const [workflowId, variables] of Object.entries(
            data.workflowVariables
          )) {
            if (!mergedVars[workflowId]) {
              mergedVars[workflowId] = variables as Record<string, string>;
            } else {
              mergedVars[workflowId] = {
                ...mergedVars[workflowId],
                ...(variables as Record<string, string>),
              };
            }
          }

          await s.set("workflowVariables", mergedVars);
        }
      }

      // Import API Keys
      if (options.importApiKeys !== false && data.apiKeys) {
        if (options.overwrite) {
          await s.set("apiKeys", data.apiKeys);
        } else {
          const currentApiKeys = (await s.get("apiKeys")) as Record<
            string,
            string | undefined
          >;
          const mergedApiKeys = { ...currentApiKeys };

          // Only add keys that don't exist or are empty in the current store
          for (const [key, value] of Object.entries(data.apiKeys)) {
            if (!mergedApiKeys[key] || mergedApiKeys[key] === "") {
              mergedApiKeys[key] = value as string | undefined;
            }
          }

          await s.set("apiKeys", mergedApiKeys);
        }
      }

      // Import User Context
      if (options.importUserContext !== false && data.userContext) {
        if (options.overwrite) {
          await s.set("userContext", data.userContext);
        } else {
          const currentContext = (await s.get("userContext")) as Record<
            string,
            string
          >;
          const mergedContext = { ...currentContext };

          // Merge user context
          for (const [key, value] of Object.entries(data.userContext)) {
            // Only override empty values unless overwrite is true
            if (!mergedContext[key] || mergedContext[key] === "") {
              mergedContext[key] = value as string;
            }
          }

          await s.set("userContext", mergedContext);
        }
      }

      if (options.importWebsiteCategories !== false && data.websiteCategories) {
        if (options.overwrite) {
          await s.set("websiteCategories", data.websiteCategories);
        } else {
          const currentCategories = (await s.get(
            "websiteCategories"
          )) as string[];
          // Merge categories, avoiding duplicates
          const mergedCategories = Array.from(
            new Set([...currentCategories, ...data.websiteCategories])
          );
          await s.set("websiteCategories", mergedCategories);
        }
      }

      if (
        options.importSubscriptionCategories !== false &&
        data.subscriptionCategories
      ) {
        if (options.overwrite) {
          await s.set("subscriptionCategories", data.subscriptionCategories);
        } else {
          const currentCategories = (await s.get(
            "subscriptionCategories"
          )) as string[];
          // Merge categories, avoiding duplicates
          const mergedCategories = Array.from(
            new Set([...currentCategories, ...data.subscriptionCategories])
          );
          await s.set("subscriptionCategories", mergedCategories);
        }
      }

      return { success: true, message: "Data imported successfully" };
    } catch (error) {
      console.error("Error importing data:", error);
      return {
        success: false,
        message: `Error importing data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },

  // Check if store is initialized
  isInitialized: () => isInitialized,

  // Migrate from localStorage if we're using the actual Electron Store
  migrateFromLocalStorage: async () => {
    // Skip if already initialized
    if (isInitialized) {
      console.log("Store already initialized, skipping migration");
      return;
    }

    const s = await ensureStore();

    // Skip migration if we're using localStorage-based store
    if (s === createLocalStorageStore() || s === createMemoryStore()) {
      console.log("Using storage fallback, skipping migration");
      isInitialized = true;
      return;
    }

    try {
      // Since we're using non-localStorage store, migrate data from localStorage

      // Migrate tasks
      const localTasks = localStorage.getItem("tasks_list");
      if (localTasks) {
        s.set("tasks", JSON.parse(localTasks));
        localStorage.removeItem("tasks_list");
      }

      // Migrate projects
      const localProjects = localStorage.getItem("tasks_projects");
      if (localProjects) {
        s.set("projects", JSON.parse(localProjects));
        localStorage.removeItem("tasks_projects");
      }

      // Migrate documents
      const localDocs = localStorage.getItem("writer_docs");
      if (localDocs) {
        s.set("documents", JSON.parse(localDocs));
        localStorage.removeItem("writer_docs");
      }

      // Migrate workflows
      const localWorkflows = localStorage.getItem("workflows");
      if (localWorkflows) {
        s.set("workflows", JSON.parse(localWorkflows));
        localStorage.removeItem("workflows");
      }

      // Migrate tabs to workspaces if available
      const localTabs = localStorage.getItem("tabs");
      if (localTabs) {
        try {
          const tabs = JSON.parse(localTabs);
          if (Array.isArray(tabs) && tabs.length > 0) {
            // Create a default workspace with these tabs
            const workspace = {
              id: "default",
              name: "Migrated Workspace",
              tabs,
              createdAt: new Date().toISOString(),
            };
            s.set("workspaces", [workspace]);
          }
        } catch (e) {
          console.error("Failed to migrate tabs to workspaces:", e);
        }
        localStorage.removeItem("tabs");
      }

      // Migrate subscriptions
      const localSubscriptions = localStorage.getItem("subscriptions");
      if (localSubscriptions) {
        s.set("subscriptions", JSON.parse(localSubscriptions));
        localStorage.removeItem("subscriptions");
      }

      // Migrate user context
      const localUserContext = localStorage.getItem("user_context");
      if (localUserContext) {
        s.set("userContext", JSON.parse(localUserContext));
        localStorage.removeItem("user_context");
      }

      // Migrate assistants
      const localAssistants = localStorage.getItem("assistants");
      if (localAssistants) {
        s.set("assistants", JSON.parse(localAssistants));
        localStorage.removeItem("assistants");
      }

      // Migrate chats
      const localChats = localStorage.getItem("chats");
      if (localChats) {
        s.set("chats", JSON.parse(localChats));
        localStorage.removeItem("chats");
      }

      // Migrate erased elements
      const localErasedElements = localStorage.getItem("erased_elements");
      if (localErasedElements) {
        s.set("erasedElements", JSON.parse(localErasedElements));
        localStorage.removeItem("erased_elements");
      }

      // Migrate API keys
      const localApiKeys = localStorage.getItem("api_keys");
      if (localApiKeys) {
        s.set("apiKeys", JSON.parse(localApiKeys));
        localStorage.removeItem("api_keys");
      }

      console.log(
        "Successfully migrated data from localStorage to persistent store"
      );

      // Mark as initialized
      isInitialized = true;
    } catch (error) {
      console.error("Error migrating from localStorage:", error);
      isInitialized = true; // Still mark as initialized to prevent retries
    }
  },

  // Function to wait for store initialization
  waitForReady: async () => {
    return await storePromise;
  },
};

export default storeService;
