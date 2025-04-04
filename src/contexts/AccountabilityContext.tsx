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
  openGatekeeperForGoal: (goalId: string) => void;
  closeGatekeeperChat: () => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  isGatekeeperInitialized: boolean;
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
  openGatekeeperForGoal: () => {},
  closeGatekeeperChat: () => {},
  updateGoal: async () => {},
  isGatekeeperInitialized: false
});

// Storage keys
const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
  MODEL: 'openai_model',
  ACCOUNTABILITY_GOALS: 'accountability_goals'
};

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
        const storedProjects = await storeService.getProjects();
        if (Array.isArray(storedProjects) && storedProjects.length > 0) {
          setProjects(storedProjects);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };

    // Load goals
    const loadGoals = async () => {
      try {
        // Try to load from storeService first
        if (typeof storeService.getAccountabilityGoals === 'function') {
          const storedGoals = await storeService.getAccountabilityGoals();
          if (storedGoals && Array.isArray(storedGoals) && storedGoals.length > 0) {
            setGoals(storedGoals);
            return;
          }
        }
        
        // Fall back to localStorage
        const savedGoals = localStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS);
        if (savedGoals) {
          try {
            setGoals(JSON.parse(savedGoals));
          } catch (err) {
            console.error('Error loading saved goals', err);
          }
        }
      } catch (error) {
        console.error('Error loading goals from store:', error);
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
    loadApiKey();
    loadProjects();
    loadGoals();
    loadUserContext();
    
    // Mark as initialized when loaded
    setIsGatekeeperInitialized(true);
  }, []);

  // Function to open gatekeeper for a specific goal
  const openGatekeeperForGoal = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setActiveGoal(goal);
      setShowGatekeeperChat(true);
    }
  };

  // Function to close gatekeeper chat
  const closeGatekeeperChat = () => {
    setShowGatekeeperChat(false);
    setActiveGoal(null);
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

    // Expose a global function to open the gatekeeper from anywhere
    (window as any).openGatekeeperForGoal = openGatekeeperForGoal;
    
    // Set up background checking for goals
    const setupBackgroundChecking = () => {
      // Function to check if goals need attention
      (window as any).checkGoalsAndNotify = async () => {
        try {
          // Load goals from store to ensure we have the latest
          let storedGoals = goals;
          if (typeof storeService.getAccountabilityGoals === 'function') {
            const freshGoals = await storeService.getAccountabilityGoals();
            if (Array.isArray(freshGoals) && freshGoals.length > 0) {
              storedGoals = freshGoals;
            }
          }
          
          if (!Array.isArray(storedGoals) || storedGoals.length === 0) return [];
          
          const now = new Date();
          
          // Find goals that need checking based on frequency
          const goalsNeedingCheck = storedGoals.filter(goal => {
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
            
            return timeDiff >= checkInterval;
          });
          
          if (goalsNeedingCheck.length > 0) {
            // If there are any goals needing check, trigger notification
            if ((window as any).electron?.notifications?.send) {
              await (window as any).electron.notifications.send({
                title: 'Goal Check-in Reminder',
                body: `${goalsNeedingCheck.length} goal(s) need your attention!`,
              });
            }
            
            // Open the gatekeeper for the first goal that needs attention
            if (goalsNeedingCheck.length > 0 && !showGatekeeperChat) {
              openGatekeeperForGoal(goalsNeedingCheck[0].id);
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
    
    // Check goals every minute
    const intervalId = setInterval(() => {
      (window as any).checkGoalsAndNotify?.();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [isGatekeeperInitialized, goals, showGatekeeperChat]);

  return (
    <AccountabilityContext.Provider 
      value={{
        showGatekeeperChat,
        activeGoal,
        apiKey,
        selectedModel,
        projects,
        userContext,
        openGatekeeperForGoal,
        closeGatekeeperChat,
        updateGoal,
        isGatekeeperInitialized
      }}
    >
      {children}
    </AccountabilityContext.Provider>
  );
};

// Custom hook for using the context
export const useAccountability = () => useContext(AccountabilityContext);

export default AccountabilityContext; 