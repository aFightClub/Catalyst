import React, { createContext, useState, useContext, useEffect } from 'react';
import { storeService } from '../services/storeService';

// Define interfaces
interface Goal {
  id: string;
  title: string;
  desiredGoal: string;
  startState: string;
  currentState: string;
  endState: string;
  frequency: 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  lastChecked: string;
  projectId?: string;
  voice?: string;
}

interface Project {
  id: string;
  name: string;
}

// Add UserContext interface
interface UserContext {
  name: string;
  company: string;
  voice: string;
  backStory: string;
  websiteLinks: string;
  additionalInfo: string;
}

// Context state interface
interface AccountabilityContextState {
  showGatekeeperChat: boolean;
  activeGoal: Goal | null;
  apiKey: string;
  selectedModel: string;
  projects: Project[];
  userContext: UserContext;
  goals: Goal[];
  openGatekeeperForGoal: (goalId: string) => boolean;
  closeGatekeeperChat: () => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  isGatekeeperInitialized: boolean;
  forceReloadGoals: () => Promise<Goal[]>;
}

// Create the context with default values
const AccountabilityContext = createContext<AccountabilityContextState>({
  showGatekeeperChat: false,
  activeGoal: null,
  apiKey: '',
  selectedModel: 'gpt-4o',
  projects: [],
  userContext: {
    name: '',
    company: '',
    voice: '',
    backStory: '',
    websiteLinks: '',
    additionalInfo: ''
  },
  goals: [],
  openGatekeeperForGoal: () => false,
  closeGatekeeperChat: () => {},
  updateGoal: async () => {},
  isGatekeeperInitialized: false,
  forceReloadGoals: async () => []
});

// Storage keys
const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
  MODEL: 'openai_model',
  ACCOUNTABILITY_GOALS: 'accountability_goals',
  PROJECTS: 'tasks_projects' 
};

// Define default projects (Matching local Project interface)
const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'default',
    name: 'General',
    // color: '#3B82F6', 
    // createdAt: new Date().toISOString()
  },
  {
    id: 'work',
    name: 'Work',
    // color: '#EF4444',
    // createdAt: new Date().toISOString()
  },
  {
    id: 'personal',
    name: 'Personal',
    // color: '#10B981',
    // createdAt: new Date().toISOString()
  }
];

// Provider component
export const AccountabilityProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [showGatekeeperChat, setShowGatekeeperChat] = useState(false);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGatekeeperInitialized, setIsGatekeeperInitialized] = useState(false);
  const [userContext, setUserContext] = useState<UserContext>({
    name: '',
    company: '',
    voice: '',
    backStory: '',
    websiteLinks: '',
    additionalInfo: ''
  });

  // Define loadGoals function at the component level so it can be called from multiple places
  const loadGoals = async () => {
    try {
      console.log("AccountabilityContext: Loading goals... (SUPER AGGRESSIVE LOADER)");
      
      // ALWAYS check localStorage first as it's more reliable
      console.log("AccountabilityContext: DIRECTLY checking localStorage...");
      const savedGoals = localStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS);
      
      if (savedGoals) {
        try {
          const parsedGoals = JSON.parse(savedGoals);
          console.log(`AccountabilityContext: FOUND ${parsedGoals.length} goals in localStorage:`, 
                       JSON.stringify(parsedGoals.map((g: Goal) => ({ id: g.id, title: g.title }))));
          
          if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
            console.log(`AccountabilityContext: DIRECTLY setting ${parsedGoals.length} goals in context state`);
            
            // IMMEDIATE STATE UPDATE - use this function call pattern to ensure state updates
            setGoals(parsedGoals);
            
            // Also save to storeService for future use
            if (typeof storeService.saveAccountabilityGoals === 'function') {
              console.log("AccountabilityContext: Saving goals from localStorage to storeService");
              await storeService.saveAccountabilityGoals(parsedGoals);
            }
            
            return parsedGoals;
          }
        } catch (err) {
          console.error('Error parsing saved goals from localStorage', err);
        }
      }
      
      // Continue with the previous implementation...
      let loadedGoals: Goal[] = [];
      
      // Try storeService if localStorage didn't work
      if (typeof storeService.getAccountabilityGoals === 'function') {
        console.log("AccountabilityContext: Trying storeService since localStorage failed...");
        try {
          const storedGoals = await storeService.getAccountabilityGoals();
          if (storedGoals && Array.isArray(storedGoals) && storedGoals.length > 0) {
            console.log(`AccountabilityContext: FOUND ${storedGoals.length} goals in storeService`);
            loadedGoals = storedGoals;
            
            // DIRECT STATE UPDATE
            setGoals(loadedGoals);
            
            // Also save to localStorage for consistency
            localStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS, JSON.stringify(loadedGoals));
            
            return loadedGoals;
          }
        } catch (error) {
          console.error('Error loading goals from storeService', error);
        }
      }
      
      if (loadedGoals.length === 0) {
        console.log("AccountabilityContext: No goals found in any storage, initializing with empty array");
        setGoals([]);
      }
      
      return loadedGoals;
    } catch (error) {
      console.error('Error loading goals from store:', error);
      console.log("AccountabilityContext: Initializing with empty goals array due to error");
      setGoals([]);
      return [];
    }
  };

  // Load data on mount
  useEffect(() => {
    console.log("AccountabilityContext: Starting to load data");
    
    // Immediately check localStorage first to avoid async delay
    const localStorageKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (localStorageKey) {
      console.log("AccountabilityContext: Found API key in localStorage immediately");
      setApiKey(localStorageKey);
    }
    
    // Load API key from both sources to ensure consistency
    const loadApiKey = async () => {
      try {
        // Try storeService
        const keys = await storeService.getApiKeys();
        console.log("AccountabilityContext: API keys loaded from storeService:", keys);
        
        if (keys && keys.openai) {
          console.log("AccountabilityContext: Setting OpenAI API key from storeService:", keys.openai.substring(0, 5) + "...");
          setApiKey(keys.openai);
          
          // Ensure it's also in localStorage for backward compatibility
          localStorage.setItem(STORAGE_KEYS.API_KEY, keys.openai);
        } else if (localStorageKey) {
          // We already set the apiKey state from localStorage, now save to storeService for future use
          console.log("AccountabilityContext: Saving localStorage API key to storeService");
          await storeService.saveApiKeys({ openai: localStorageKey });
        } else {
          console.warn("AccountabilityContext: No OpenAI API key found in any storage");
        }
      } catch (error) {
        console.error('Failed to load/sync API key:', error);
      }
    };

    // Load selected model
    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
    if (savedModel) {
      setSelectedModel(savedModel);
    }

    // Load projects
    const loadProjects = async () => {
      try {
        console.log("AccountabilityContext: Loading projects...");
        const storedProjects = await storeService.getProjects();
        console.log("AccountabilityContext: Projects loaded from storeService:", storedProjects);
        
        // Check if projects were loaded successfully
        if (Array.isArray(storedProjects) && storedProjects.length > 0) {
          console.log(`AccountabilityContext: Setting ${storedProjects.length} projects in state`);
          setProjects(storedProjects);
        } else {
          // No projects found or error loading, use defaults
          console.warn("AccountabilityContext: No projects found or failed to load, using default projects.");
          setProjects(DEFAULT_PROJECTS);
          
          // Save defaults back to store
          try {
            await storeService.saveProjects(DEFAULT_PROJECTS);
            console.log("AccountabilityContext: Saved default projects to store.");
          } catch (saveError) {
            console.error("AccountabilityContext: Failed to save default projects:", saveError);
          }
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
        // Fallback to defaults on error
        console.warn("AccountabilityContext: Using default projects due to error.");
        setProjects(DEFAULT_PROJECTS);
        // Attempt to save defaults even on error
        try {
            await storeService.saveProjects(DEFAULT_PROJECTS);
        } catch (saveError) {
            // Ignore error here, already logged above
        }
      }
    };

    // Load user context from store
    const loadUserContext = async () => {
      try {
        const storedContext = await storeService.getUserContext();
        if (storedContext) {
          setUserContext(prev => ({
            ...prev,
            ...storedContext
          }));
        }
      } catch (error) {
        console.error('Failed to load user context:', error);
      }
    };

    // Load all data
    Promise.all([
      loadApiKey(),
      loadProjects(),
      loadGoals(),
      loadUserContext()
    ]).then(() => {
      console.log("AccountabilityContext: All data loaded, marking as initialized");
      setIsGatekeeperInitialized(true);
    }).catch(error => {
      console.error("AccountabilityContext: Error loading data:", error);
      // Still mark as initialized to prevent the system from getting stuck
      setIsGatekeeperInitialized(true);
    });
  }, []);

  // Add near the beginning of the provider component
  useEffect(() => {
    console.log("AccountabilityContext: Provider initialized", {
      goalsLoaded: goals.length,
      apiKeySet: !!apiKey,
      modelSelected: selectedModel
    });
    
    // Expose a global status function for debugging
    (window as any).checkAccountabilityContextStatus = () => {
      return {
        initialized: isGatekeeperInitialized,
        goalsCount: goals.length,
        showingGatekeeper: showGatekeeperChat,
        projects: projects.length
      };
    };
  }, []);

  // Add a more aggressive loader that runs on context initialization
  useEffect(() => {
    console.log("AccountabilityContext: Running aggressive goal loader on mount");
    loadGoals();
  }, []);

  // Add a periodic goal refresh to ensure context always has latest goals
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (goals.length === 0) {
        console.log("AccountabilityContext: Goals are empty, attempting refresh");
        loadGoals();
      }
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(refreshInterval);
  }, [goals.length]);

  // Force a check when isGatekeeperInitialized changes to true
  useEffect(() => {
    if (isGatekeeperInitialized && goals.length === 0) {
      console.log("AccountabilityContext: Initialized but no goals, trying emergency load");
      loadGoals();
    }
  }, [isGatekeeperInitialized, goals.length]);

  // Add a function to force reload goals from storage
  const forceReloadGoals = async (): Promise<Goal[]> => {
    console.log("AccountabilityContext: Force reloading goals from all storage sources... (EMERGENCY VERSION)");
    
    // FIRST: Try direct localStorage access for maximum reliability
    try {
      const savedGoals = localStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS);
      if (savedGoals) {
        try {
          const parsedGoals = JSON.parse(savedGoals) as Goal[];
          if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
            console.log(`AccountabilityContext: EMERGENCY LOADER - Found ${parsedGoals.length} goals in localStorage`);
            
            // Immediately update context state
            setGoals(parsedGoals);
            
            return parsedGoals;
          }
        } catch (err) {
          console.error("AccountabilityContext: Error parsing localStorage goals in emergency loader", err);
        }
      }
    } catch (error) {
      console.error("AccountabilityContext: Error in localStorage emergency access", error);
    }
    
    // Continue with the original implementation as a fallback
    let allGoals: Goal[] = [];
    let goalsFromStore: Goal[] = [];
    let goalsFromLocalStorage: Goal[] = [];
    
    // First try storeService
    try {
      if (typeof storeService.getAccountabilityGoals === 'function') {
        console.log("AccountabilityContext: Loading goals from storeService...");
        const storedGoals = await storeService.getAccountabilityGoals();
        
        if (storedGoals && Array.isArray(storedGoals) && storedGoals.length > 0) {
          console.log(`AccountabilityContext: Found ${storedGoals.length} goals in storeService:`, 
                     JSON.stringify(storedGoals.map((g: Goal) => ({ id: g.id, title: g.title }))));
          goalsFromStore = storedGoals;
          allGoals = [...storedGoals];
        } else {
          console.log("AccountabilityContext: No goals found in storeService");
        }
      }
    } catch (error) {
      console.error("AccountabilityContext: Error loading goals from storeService:", error);
    }
    
    // Then try localStorage again if the direct attempt failed
    try {
      console.log("AccountabilityContext: Trying localStorage as a fallback...");
      const savedGoals = localStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS);
      
      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals) as Goal[];
        
        if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
          console.log(`AccountabilityContext: Found ${parsedGoals.length} goals in localStorage:`, 
                     JSON.stringify(parsedGoals.map((g: Goal) => ({ id: g.id, title: g.title }))));
          
          goalsFromLocalStorage = parsedGoals;
          
          // Merge goals, giving preference to store goals if they exist
          const mergedGoals = [...allGoals];
          const existingIds = new Set(allGoals.map(g => g.id));
          
          // Add goals from localStorage that aren't already in the combined list
          for (const goal of parsedGoals) {
            if (!existingIds.has(goal.id)) {
              mergedGoals.push(goal);
              existingIds.add(goal.id);
            }
          }
          
          allGoals = mergedGoals;
        } else {
          console.log("AccountabilityContext: No valid goals found in localStorage");
        }
      } else {
        console.log("AccountabilityContext: No goals entry found in localStorage");
      }
    } catch (error) {
      console.error("AccountabilityContext: Error loading goals from localStorage:", error);
    }
    
    // Update state with all found goals
    if (allGoals.length > 0) {
      console.log(`AccountabilityContext: Setting state with ${allGoals.length} combined goals`);
      setGoals(allGoals);
      
      // Save combined goals to both storage mechanisms for consistency
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS, JSON.stringify(allGoals));
        
        if (typeof storeService.saveAccountabilityGoals === 'function') {
          await storeService.saveAccountabilityGoals(allGoals);
        }
        
        console.log("AccountabilityContext: Successfully saved combined goals to all storage");
      } catch (error) {
        console.error("AccountabilityContext: Error saving combined goals:", error);
      }
    } else {
      console.warn("AccountabilityContext: No goals found in any storage location!");
    }
    
    // Expose a debug function to dump all goals
    (window as any).dumpAccountabilityGoals = () => {
      return {
        fromStore: goalsFromStore.map(g => ({ id: g.id, title: g.title })),
        fromLocalStorage: goalsFromLocalStorage.map(g => ({ id: g.id, title: g.title })),
        combined: allGoals.map(g => ({ id: g.id, title: g.title })),
        inStateAfterLoad: goals.map(g => ({ id: g.id, title: g.title }))
      };
    };
    
    return allGoals;
  };

  // Function to open gatekeeper for a specific goal
  const openGatekeeperForGoal = (goalId: string) => {
    console.log(`AccountabilityContext: Attempting to open gatekeeper for goal ID: ${goalId} (direct call)`);
    
    // Add more detailed console.group for debugging
    console.group("Accountability Gatekeeper Open Request");
    console.log("Current state:", { 
      showGatekeeperChat, 
      currentActiveGoal: activeGoal?.title || "none",
      goalsCount: goals.length,
      matchingGoal: goals.find(g => g.id === goalId)?.title || "not found"
    });
    
    // Find the goal in our goals array
    const goal = goals.find(g => g.id === goalId);
    
    if (goal) {
      console.log(`AccountabilityContext: Found goal "${goal.title}" (${goal.id}), setting state...`);
      
      try {
        // First set activeGoal
        setActiveGoal(goal);
        
        // Then set showGatekeeperChat to true
        setShowGatekeeperChat(true);
        
        console.log(`AccountabilityContext: State set directly - activeGoal: ${goal.title}, showGatekeeperChat: true`);
        console.groupEnd();
        
        return true;
      } catch (err) {
        console.error("Error setting state:", err);
        console.groupEnd();
        return false;
      }
    } else {
      console.error(`AccountabilityContext: Goal with ID ${goalId} not found in available goals!`);
      console.log("Available goals:", goals.map(g => ({ id: g.id, title: g.title })));
      
      // Try to reload goals from store and find the goal
      const loadAndFindGoal = async () => {
        try {
          console.log(`AccountabilityContext: Trying to find goal by forcing reload...`);
          
          // Use the new force reload function
          const reloadedGoals = await forceReloadGoals();
          
          if (reloadedGoals.length > 0) {
            // Try to find the goal again after reloading
            const foundGoal = reloadedGoals.find(g => g.id === goalId);
            
            if (foundGoal) {
              console.log(`AccountabilityContext: Found goal "${foundGoal.title}" after forced reload`);
              
              // Set state
              setActiveGoal(foundGoal);
              setShowGatekeeperChat(true);
              
              console.log(`AccountabilityContext: State set after forced reload`);
              console.groupEnd();
              return true;
            }
          }
          
          console.error(`AccountabilityContext: Goal with ID ${goalId} not found even after forced reload!`);
          console.groupEnd();
          return false;
        } catch (error) {
          console.error(`AccountabilityContext: Error finding goal:`, error);
          console.groupEnd();
          return false;
        }
      };
      
      loadAndFindGoal();
      return false;
    }
  };

  // Function to close gatekeeper chat
  const closeGatekeeperChat = () => {
    console.log("AccountabilityContext: Closing gatekeeper chat");
    console.log("Current state before closing:", {
      showGatekeeperChat,
      hasActiveGoal: !!activeGoal,
      goalTitle: activeGoal?.title
    });
    
    // Immediately hide the chat and clear active goal
    setShowGatekeeperChat(false);
    setActiveGoal(null);
    
    console.log("AccountabilityContext: Gatekeeper chat closed, both states reset");
  };

  // Function to update a goal
  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    // Update local state
    const updatedGoals = goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, ...updates }
        : goal
    );
    
    setGoals(updatedGoals);
    
    // Update active goal if it's the one being updated
    if (activeGoal && activeGoal.id === goalId) {
      setActiveGoal({ ...activeGoal, ...updates });
    }
    
    // Save to storage
    try {
      // Save to localStorage for backward compatibility
      localStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS, JSON.stringify(updatedGoals));
      
      // Save to storeService if available
      if (typeof storeService.saveAccountabilityGoals === 'function') {
        await storeService.saveAccountabilityGoals(updatedGoals);
      }
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
  };

  // Set up global window functions for cross-component communication
  useEffect(() => {
    if (!isGatekeeperInitialized) return;

    console.log("AccountabilityContext: Setting up global window functions with initialized context");
    console.log(`AccountabilityContext: Current goals in context (${goals.length}):`, 
      JSON.stringify(goals.map(g => ({ id: g.id, title: g.title }))));

    // Expose a global function to open the gatekeeper from anywhere
    (window as any).openGatekeeperForGoal = openGatekeeperForGoal;
    
    // Add a debug function to force-show the gatekeeper with first available goal
    (window as any).debugForceShowGatekeeper = () => {
      console.log("AccountabilityContext: DEBUG - Force showing gatekeeper");
      if (goals.length > 0) {
        const firstGoal = goals[0];
        console.log(`AccountabilityContext: DEBUG - Using first goal: ${firstGoal.title} (${firstGoal.id})`);
        setActiveGoal(firstGoal);
        setShowGatekeeperChat(true);
        console.log("AccountabilityContext: DEBUG - State set directly");
        return true;
      } else {
        console.error("AccountabilityContext: DEBUG - No goals available to show");
        return false;
      }
    };
    
    // Add a debug function to check current context state
    (window as any).debugGetAccountabilityState = () => {
      return {
        showGatekeeperChat,
        activeGoal: activeGoal ? { id: activeGoal.id, title: activeGoal.title } : null,
        goalCount: goals.length,
        isInitialized: isGatekeeperInitialized
      };
    };
    
    // Set up a more aggressive check specifically for minute-frequency goals (for testing)
    const checkMinuteGoals = () => {
      console.log("Checking minute-frequency goals...");
      const minuteGoals = goals.filter(goal => 
        !goal.isCompleted && goal.frequency === 'minute'
      );
      
      if (minuteGoals.length > 0) {
        console.log(`Found ${minuteGoals.length} minute-frequency goals, checking if they need attention...`);
        
        const now = new Date();
        for (const goal of minuteGoals) {
          const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : new Date(0);
          const timeDiff = now.getTime() - lastChecked.getTime();
          const diffInSeconds = Math.floor(timeDiff / 1000);
          
          console.log(`Goal "${goal.title}" last checked ${diffInSeconds} seconds ago`);
          
          // If it's been more than 55 seconds, trigger the chat
          if (diffInSeconds >= 55) {
            console.log(`Opening gatekeeper for minute-frequency goal: ${goal.title}`);
            openGatekeeperForGoal(goal.id);
            // Only open one at a time
            break;
          }
        }
      }
    };
    
    // Check minute-goals every 10 seconds for more responsive testing
    const minuteCheckInterval = setInterval(checkMinuteGoals, 10000);
    
    // Setup regular background checking for all goals
    const setupBackgroundChecking = () => {
      // Function to check if goals need attention
      (window as any).checkGoalsAndNotify = async () => {
        try {
          console.log("Running background check for goals");
          // Load goals from store to ensure we have the latest
          let storedGoals = goals;
          if (typeof storeService.getAccountabilityGoals === 'function') {
            const freshGoals = await storeService.getAccountabilityGoals();
            if (Array.isArray(freshGoals) && freshGoals.length > 0) {
              storedGoals = freshGoals;
            }
          }
          
          if (!Array.isArray(storedGoals) || storedGoals.length === 0) {
            console.log("No goals found during background check");
            return [];
          }
          
          const now = new Date();
          
          // Find goals that need checking based on frequency
          const goalsNeedingCheck = storedGoals.filter(goal => {
            // Only filter out completed goals, all other goals are considered active
            if (goal.isCompleted) return false;
            
            const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : new Date(0);
            const timeDiff = now.getTime() - lastChecked.getTime();
            
            // Convert frequency to milliseconds
            let checkInterval: number;
            switch (goal.frequency) {
              case 'minute': checkInterval = 60 * 1000; break; // 1 minute (for testing)
              case 'hourly': checkInterval = 60 * 60 * 1000; break; // 1 hour
              case 'daily': checkInterval = 24 * 60 * 60 * 1000; break; // 1 day
              case 'weekly': checkInterval = 7 * 24 * 60 * 60 * 1000; break; // 1 week
              case 'monthly': checkInterval = 30 * 24 * 60 * 60 * 1000; break; // ~1 month
              default: checkInterval = 24 * 60 * 60 * 1000; // Default to daily
            }
            
            const needsCheck = timeDiff >= checkInterval;
            if (needsCheck) {
              console.log(`Goal "${goal.title}" needs attention (last checked ${Math.floor(timeDiff/1000/60)} minutes ago)`);
            }
            return needsCheck;
          });
          
          console.log(`Found ${goalsNeedingCheck.length} goals needing check`);
          
          if (goalsNeedingCheck.length > 0) {
            // If there are any goals needing check, trigger notification
            if ((window as any).electron?.notifications?.send) {
              await (window as any).electron.notifications.send({
                title: 'Goal Check-in Reminder',
                body: `${goalsNeedingCheck.length} goal(s) need your attention!`,
                onClick: () => {
                  // If the notification is clicked, open the first goal that needs attention
                  if (goalsNeedingCheck.length > 0) {
                    openGatekeeperForGoal(goalsNeedingCheck[0].id);
                  }
                }
              });
            }
            
            // Automatically open the gatekeeper for the first goal that needs attention
            // Only if no other gatekeeper is currently open
            if (goalsNeedingCheck.length > 0 && !showGatekeeperChat) {
              console.log(`Automatically opening gatekeeper for goal: ${goalsNeedingCheck[0].title}`);
              openGatekeeperForGoal(goalsNeedingCheck[0].id);
              
              // Mark this goal as checked to avoid repeated popups
              // Update the lastChecked timestamp for this goal
              const goalToUpdate = goalsNeedingCheck[0];
              updateGoal(goalToUpdate.id, {
                lastChecked: new Date().toISOString()
              });
            }
            
            return goalsNeedingCheck;
          }
          
          return [];
        } catch (error) {
          console.error('Error checking goals in background:', error);
          return [];
        }
      };
    };
    
    setupBackgroundChecking();
    
    // Check goals immediately when initialized and then every minute
    console.log("Setting up interval for checking goals...");
    (window as any).checkGoalsAndNotify?.();
    
    // Also add a function to check for upcoming deadlines
    (window as any).checkUpcomingGoalDeadlines = async () => {
      try {
        console.log("Checking for upcoming goal deadlines...");
        // Get all goals
        let storedGoals = goals;
        if (typeof storeService.getAccountabilityGoals === 'function') {
          const freshGoals = await storeService.getAccountabilityGoals();
          if (Array.isArray(freshGoals) && freshGoals.length > 0) {
            storedGoals = freshGoals;
          }
        }
        
        if (!Array.isArray(storedGoals) || storedGoals.length === 0) return [];
        
        const now = new Date();
        const upcomingDeadlines = [];
        
        // Find goals with deadlines coming up in the next 48 hours
        for (const goal of storedGoals) {
          if (goal.isCompleted || !goal.endDate) continue;
          
          const deadline = new Date(goal.endDate);
          const timeDiff = deadline.getTime() - now.getTime();
          const hoursRemaining = timeDiff / (1000 * 60 * 60);
          
          // If deadline is within 48 hours but not passed
          if (hoursRemaining > 0 && hoursRemaining <= 48) {
            upcomingDeadlines.push({
              goalId: goal.id,
              title: goal.title,
              hoursRemaining,
              deadline: deadline.toLocaleDateString()
            });
          }
        }
        
        // Send notification for upcoming deadlines
        if (upcomingDeadlines.length > 0 && (window as any).electron?.notifications?.send) {
          for (const deadline of upcomingDeadlines) {
            await (window as any).electron.notifications.send({
              title: 'Goal Deadline Approaching',
              body: `"${deadline.title}" is due in ${Math.round(deadline.hoursRemaining)} hours (${deadline.deadline})!`,
              onClick: () => {
                // If the notification is clicked, open the goal
                openGatekeeperForGoal(deadline.goalId);
              }
            });
          }
        }
        
        return upcomingDeadlines;
      } catch (error) {
        console.error('Error checking upcoming goal deadlines:', error);
        return [];
      }
    };
    
    // Run deadline check on startup and periodically
    (window as any).checkUpcomingGoalDeadlines?.();
    
    const intervalId = setInterval(() => {
      console.log("Checking goals and deadlines on interval...");
      (window as any).checkGoalsAndNotify?.();
      
      // Also check for upcoming deadlines every hour (less frequently)
      if (new Date().getMinutes() === 0) {
        (window as any).checkUpcomingGoalDeadlines?.();
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(minuteCheckInterval);
      clearInterval(intervalId);
    };
  }, [isGatekeeperInitialized, goals]);

  // Add a check in the main App component to directly access localStorage if context goals are empty
  useEffect(() => {
    // Add a timer to check if goals are loaded after context is initialized
    if (isGatekeeperInitialized && goals.length === 0) {
      console.log("AccountabilityContext: Initialized but goals still empty! Checking localStorage directly");
      
      // Try direct localStorage access
      const savedGoals = localStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS);
      if (savedGoals) {
        try {
          const parsedGoals = JSON.parse(savedGoals);
          if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
            console.log(`AccountabilityContext: EMERGENCY - Found ${parsedGoals.length} goals in localStorage, forcing state update`);
            setGoals(parsedGoals);
          }
        } catch (err) {
          console.error('Error in emergency localStorage load', err);
        }
      }
    }
  }, [isGatekeeperInitialized, goals.length]);

  return (
    <AccountabilityContext.Provider 
      value={{
        showGatekeeperChat,
        activeGoal,
        apiKey,
        selectedModel,
        projects,
        userContext,
        goals,
        openGatekeeperForGoal,
        closeGatekeeperChat,
        updateGoal,
        isGatekeeperInitialized,
        forceReloadGoals
      }}
    >
      
      {children}
    </AccountabilityContext.Provider>
  );
};

// Custom hook for using the context
export const useAccountability = () => useContext(AccountabilityContext);

export default AccountabilityContext; 