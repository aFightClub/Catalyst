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
  subscriptions: {
    type: "array",
    default: [],
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

  // Websites
  getWebsites: async () => {
    const s = await ensureStore();
    return s.get("websites") as any[];
  },
  saveWebsites: async (websites: any[]) => {
    const s = await ensureStore();
    return s.set("websites", websites);
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
