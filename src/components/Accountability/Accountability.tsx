import React, { useState, useEffect } from 'react';
import { FiTarget, FiPlus, FiEdit2, FiTrash2, FiClock, FiCalendar, FiCheck, FiMessageSquare, FiFolder } from 'react-icons/fi';
import GatekeeperChat from './GatekeeperChat';
import EditGoalModal from './EditGoalModal';
import { storeService } from '../../services/storeService';
import { useAccountability } from '../../contexts/AccountabilityContext';

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

const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
  MODEL: 'openai_model',
  ACCOUNTABILITY_GOALS: 'accountability_goals'
};

// Define default projects locally (copied from Tasks.tsx for direct use)
const DEFAULT_PROJECTS_LOCAL: Project[] = [
  { id: 'default', name: 'General' },
  { id: 'work', name: 'Work' },
  { id: 'personal', name: 'Personal' }
];

// Create a global variable to store the background check interval ID
let backgroundCheckIntervalId: number | null = null;

const Accountability: React.FC = () => {
  // Use the accountability context for shared state
  const contextValue = useAccountability();
  const { 
    openGatekeeperForGoal, 
    closeGatekeeperChat: contextCloseGatekeeperChat,
    updateGoal: contextUpdateGoal,
    selectedModel,
    forceReloadGoals,
    userContext,
    goals: contextGoals,
  } = contextValue;
  
  // Log the projects received from context on each render
  console.log('Accountability Component Render: Full context value:', contextValue);

  // Remove the showGatekeeperChat state variable since it's managed by context
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  // Remove local showGatekeeperChat state - we'll use the context version
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalStartState, setNewGoalStartState] = useState('');
  const [newGoalCurrentState, setNewGoalCurrentState] = useState('');
  const [newGoalEndState, setNewGoalEndState] = useState('');
  const [newGoalFrequency, setNewGoalFrequency] = useState<Goal['frequency']>('daily');
  const [newGoalEndDate, setNewGoalEndDate] = useState('');
  const [newGoalProjectId, setNewGoalProjectId] = useState<string>('');
  const [newGoalPrompt, setNewGoalPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCheckInGoal, setActiveCheckInGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  // Add a queue to track goals that need check-ins
  const [goalCheckQueue, setGoalCheckQueue] = useState<Goal[]>([]);
  // Flag to indicate a check-in is active
  const [isCheckingGoal, setIsCheckingGoal] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [localApiKey, setLocalApiKey] = useState<string>('');
  const [newGoalVoice, setNewGoalVoice] = useState<string>('');

  // Load API key and goals from localStorage on component mount
  useEffect(() => {
    // Load API key directly, similar to AIChat
    const loadApiKeyDirectly = async () => {
      let foundKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      console.log("Accountability: Checked localStorage directly for API key:", foundKey ? "Found" : "Not found");

      if (!foundKey) {
        try {
          const storedKeys = await storeService.getApiKeys();
          if (storedKeys && storedKeys.openai) {
            console.log("Accountability: Found API key in storeService");
            foundKey = storedKeys.openai;
            // Save to localStorage for consistency
            localStorage.setItem(STORAGE_KEYS.API_KEY, foundKey);
          }
        } catch (err) {
          console.error("Accountability: Error loading API keys from storeService", err);
        }
      }

      if (foundKey) {
        console.log("Accountability: Setting localApiKey state");
        setLocalApiKey(foundKey);
      } else {
        console.warn("Accountability: API key not found in localStorage or storeService.");
        setLocalApiKey(''); // Ensure it's empty if not found
      }
    };

    loadApiKeyDirectly();

    // Try to load goals from storeService first, then fallback to localStorage
    const loadGoals = async () => {
      try {
        // Try to load from storeService first - use a generic method to get the goals
        const storedGoals = await (storeService as any).getAccountabilityGoals?.();
        if (storedGoals && Array.isArray(storedGoals) && storedGoals.length > 0) {
          setGoals(storedGoals);
          // Update localStorage for backwards compatibility
          localStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS, JSON.stringify(storedGoals));
          return;
        }
        
        // Fall back to localStorage if storeService didn't have data
        const savedGoals = localStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS);
        if (savedGoals) {
          try {
            const parsedGoals = JSON.parse(savedGoals);
            setGoals(parsedGoals);
            // Save to storeService for future use
            await (storeService as any).saveAccountabilityGoals?.(parsedGoals);
          } catch (err) {
            console.error('Error loading saved goals', err);
            setError('Failed to load saved goals');
          }
        }
      } catch (error) {
        console.error('Error loading goals from store', error);
        // Fall back to localStorage
        const savedGoals = localStorage.getItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS);
        if (savedGoals) {
          try {
            setGoals(JSON.parse(savedGoals));
          } catch (err) {
            console.error('Error loading saved goals', err);
            setError('Failed to load saved goals');
          }
        }
      }
    };
    
    loadGoals();

    // Store loaded projects in local state if needed
    // Removed this section as we now load projects directly
    /*
    if (projects.length > 0) {
      setLocalProjects(projects);
    }
    */
  }, []);

  // NEW: Load projects directly into local state
  useEffect(() => {
    const loadLocalProjects = async () => {
      try {
        console.log("Accountability: Loading projects directly via storeService...");
        const storedProjects = await storeService.getProjects();
        if (Array.isArray(storedProjects) && storedProjects.length > 0) {
          console.log(`Accountability: Loaded ${storedProjects.length} projects directly.`);
          setLocalProjects(storedProjects);
        } else {
          console.warn("Accountability: No projects found directly, using local defaults.");
          setLocalProjects(DEFAULT_PROJECTS_LOCAL);
        }
      } catch (error) {
        console.error("Accountability: Error loading projects directly:", error);
        setLocalProjects(DEFAULT_PROJECTS_LOCAL); // Fallback on error
      }
    };
    loadLocalProjects();
  }, []);

  // Save goals to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS, JSON.stringify(goals));
    
    // Also save to storeService for persistent storage and export/import
    const saveGoalsToStore = async () => {
      try {
        await (storeService as any).saveAccountabilityGoals?.(goals);
      } catch (error) {
        console.error("Failed to save goals to store:", error);
      }
    };
    
    saveGoalsToStore();
    
    // Set up background goal checking
    setupBackgroundGoalChecking();
    
    // Cleanup function to clear interval when component unmounts
    return () => {
      if (backgroundCheckIntervalId !== null) {
        clearInterval(backgroundCheckIntervalId);
      }
    };
  }, [goals]);

  // Check for goals that need follow-up based on frequency
  useEffect(() => {
    const checkGoalsForFollowUp = () => {
      const now = new Date();
      const goalsNeedingCheckin: Goal[] = [];
      
      goals.forEach(goal => {
        if (goal.isCompleted) return;
        
        const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : null;
        if (!lastChecked) return;
        
        let shouldCheck = false;
        
        switch (goal.frequency) {
          case 'minute':
            shouldCheck = (now.getTime() - lastChecked.getTime()) >= 1 * 60 * 1000;
            break;
          case 'hourly':
            shouldCheck = (now.getTime() - lastChecked.getTime()) >= 60 * 60 * 1000;
            break;
          case 'daily':
            shouldCheck = (now.getTime() - lastChecked.getTime()) >= 24 * 60 * 60 * 1000;
            break;
          case 'weekly':
            shouldCheck = (now.getTime() - lastChecked.getTime()) >= 7 * 24 * 60 * 60 * 1000;
            break;
          case 'monthly':
            const lastMonth = lastChecked.getMonth();
            const currentMonth = now.getMonth();
            shouldCheck = (currentMonth !== lastMonth) || (now.getFullYear() > lastChecked.getFullYear());
            break;
        }
        
        if (shouldCheck) {
          console.log(`Time to check in on goal: ${goal.title}`);
          goalsNeedingCheckin.push(goal);
        }
      });
      
      // Add goals to check queue if they're not already in it
      if (goalsNeedingCheckin.length > 0) {
        setGoalCheckQueue(prevQueue => {
          const existingIds = new Set(prevQueue.map(g => g.id));
          const newGoals = goalsNeedingCheckin.filter(g => !existingIds.has(g.id));
          return [...prevQueue, ...newGoals];
        });
      }
    };
    
    // Check every minute
    const intervalId = setInterval(checkGoalsForFollowUp, 1 * 60 * 1000);
    
    // Initial check on component mount
    checkGoalsForFollowUp();
    
    return () => clearInterval(intervalId);
  }, [goals]);

  // Handle the goal check queue
  useEffect(() => {
    // If a check is already active or the queue is empty, do nothing
    if (isCheckingGoal || goalCheckQueue.length === 0) return;
    
    // Get the next goal from the queue
    const nextGoal = goalCheckQueue[0];
    console.log(`Opening check-in for queued goal: ${nextGoal.title}`);
    
    // Mark that we're checking a goal
    setIsCheckingGoal(true);
    
    // Open the GatekeeperChat for this goal
    openGatekeeperChat(nextGoal);
    
    // Remove this goal from the queue
    setGoalCheckQueue(prevQueue => prevQueue.slice(1));
  }, [goalCheckQueue, isCheckingGoal]);

  // Reset the checking flag when GatekeeperChat is closed
  useEffect(() => {
    if (!isCheckingGoal) {
      setSelectedGoal(null);
    }
  }, [isCheckingGoal]);

  // Set up the background checking when the component mounts
  useEffect(() => {
    setupBackgroundGoalChecking();
    
    // Set up interval to check goals regularly (every minute)
    const intervalId = setInterval(() => {
      // Use the function exposed to the window
      (window as any).checkGoalsAndNotify?.();
      
      // Also check for upcoming deadlines
      (window as any).checkUpcomingGoalDeadlines?.();
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [goals]); // Re-run when goals change

  // Function to setup background goal checking with calendar integration
  const setupBackgroundGoalChecking = () => {
    // Create a global function that can be called from outside React context (like Electron's main process)
    (window as any).checkGoalsAndNotify = async () => {
      try {
        // Load goals from store
        const storedGoals = await storeService.getAccountabilityGoals();
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
          
          // Return the goals needing check so the main process can open appropriate windows
          return goalsNeedingCheck;
        }
        
        return [];
      } catch (error) {
        console.error('Error checking goals in background:', error);
        return [];
      }
    };
    
    // Schedule upcoming goal deadlines as calendar events if they don't already exist
    const syncAllGoalDeadlines = async () => {
      try {
        // Get all goals from store
        const storedGoals = await storeService.getAccountabilityGoals();
        if (!Array.isArray(storedGoals) || storedGoals.length === 0) return;
        
        // Get current calendar events
        const storedEvents = localStorage.getItem('calendar_events');
        if (!storedEvents) return;
        
        const allEvents = JSON.parse(storedEvents);
        let eventsModified = false;
        
        // Check each goal and ensure it has a deadline event if not completed
        storedGoals.forEach(goal => {
          if (goal.isCompleted || !goal.endDate) return;
          
          // Check if this goal already has a deadline event
          const deadlineEvent = allEvents.find((event: any) => 
            event.id === `goal-deadline-${goal.id}` ||
            (event.title.toLowerCase().includes('deadline') && 
             event.title.toLowerCase().includes(goal.title.toLowerCase()))
          );
          
          // If no deadline event exists, create one
          if (!deadlineEvent) {
            const newEvent = {
              id: `goal-deadline-${goal.id}`,
              title: `Deadline: ${goal.title}`,
              date: new Date(goal.endDate).toISOString(),
              type: 'milestone' as 'event' | 'milestone',
              color: '#EF4444',
              projectId: goal.projectId
            };
            
            allEvents.push(newEvent);
            eventsModified = true;
          }
        });
        
        // Save updated events if modified
        if (eventsModified) {
          localStorage.setItem('calendar_events', JSON.stringify(allEvents));
        }
      } catch (error) {
        console.error('Error syncing goal deadlines with calendar:', error);
      }
    };
    
    // Run initial sync
    syncAllGoalDeadlines();
    
    // Expose another function to open the gatekeeper chat for a specific goal
    (window as any).openGatekeeperForGoal = (goalId: string) => {
      const foundGoal = goals.find(g => g.id === goalId);
      if (foundGoal) {
        setSelectedGoal(foundGoal);
      }
    };
    
    // Also expose a function to check for upcoming goal deadlines and send notifications
    (window as any).checkUpcomingGoalDeadlines = async () => {
      try {
        // Get all goals from store
        const storedGoals = await storeService.getAccountabilityGoals();
        if (!Array.isArray(storedGoals) || storedGoals.length === 0) return [];
        
        const now = new Date();
        const upcomingDeadlines = [];
        
        // Check which goals have deadlines coming up soon (within 48 hours)
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
              hoursRemaining
            });
          }
        }
        
        // Send notification for upcoming deadlines
        if (upcomingDeadlines.length > 0 && (window as any).electron?.notifications?.send) {
          for (const deadline of upcomingDeadlines) {
            await (window as any).electron.notifications.send({
              title: 'Goal Deadline Approaching',
              body: `"${deadline.title}" is due in ${Math.round(deadline.hoursRemaining)} hours!`,
            });
          }
        }
        
        return upcomingDeadlines;
      } catch (error) {
        console.error('Error checking upcoming goal deadlines:', error);
        return [];
      }
    };
  };

  const handleSubmitNewGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGoalPrompt.trim()) return;
    
    // *** DEBUG: Log API key at the time of use ***
    console.log('Accountability handleSubmit: Checking localApiKey right before use:', localApiKey);
    
    // Ensure we have a working API key by checking localStorage directly if context key is missing
    let workingApiKey = localApiKey;
    if (!workingApiKey) {
      const localStorageKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (localStorageKey) {
        console.log("Accountability: Found API key in localStorage, using it directly");
        workingApiKey = localStorageKey;
      }
    }
    
    console.log("Accountability: Creating goal with API key:", workingApiKey ? `${workingApiKey.substring(0, 5)}...` : "not set");
    
    // Check if API key is set
    if (!workingApiKey) {
      console.error("Accountability: API key is missing");
      setError('OpenAI API key not found. Please set it in the Settings → OpenAI Key section before creating goals.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      setIsProcessing(true);
      
      // Process the goal using OpenAI
      const processedGoal = await processGoalWithAI(newGoalPrompt, workingApiKey);
      
      const newGoal: Goal = {
        id: Date.now().toString(),
        title: processedGoal.title,
        desiredGoal: processedGoal.desiredGoal,
        startState: processedGoal.startState,
        currentState: processedGoal.currentState,
        endState: processedGoal.endState,
        frequency: processedGoal.frequency,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        isCompleted: false,
        lastChecked: new Date().toISOString(),
        projectId: selectedProjectId || undefined,
        voice: newGoalVoice.trim() || undefined
      };
      
      setGoals(prevGoals => [...prevGoals, newGoal]);
      setNewGoalPrompt('');
      setNewGoalVoice('');
    } catch (err) {
      console.error('Error processing goal with AI', err);
      setError('Failed to process your goal. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };

  const processGoalWithAI = async (prompt: string, overrideApiKey?: string) => {
    // Use override API key if provided, otherwise use from context
    const workingApiKey = overrideApiKey || localApiKey;
    
    console.log("processGoalWithAI: Using API key:", workingApiKey ? `${workingApiKey.substring(0, 5)}...` : "not set");
    
    if (!workingApiKey) {
      console.error("processGoalWithAI: No API key available");
      throw new Error('OpenAI API key not found');
    }

    try {
      // Create system message that instructs the AI how to process the goal
      const systemMessage = `You are an AI assistant that helps users create structured goals. 
      Take the user's goal description and extract the following information:
      1. A concise title for the goal
      2. The desired goal in the user's own words
      3. The current starting state
      4. What the current state is (usually same as starting state initially)
      5. The end state (what success looks like)
      6. The appropriate check-in frequency (minute, hourly, daily, weekly, or monthly)
      7. A reasonable end date (in ISO string format)
      8. Optionally, suggest a tone of voice (e.g., "encouraging", "direct", "friendly")
      
      Format your response as a JSON object with these fields: 
      { 
        "title": "string", 
        "desiredGoal": "string", 
        "startState": "string", 
        "currentState": "string", 
        "endState": "string", 
        "frequency": "minute|hourly|daily|weekly|monthly", 
        "endDate": "ISO date string",
        "suggestedVoice": "string (optional)"
      }`;

      // API call to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${workingApiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: `I want to: ${prompt}` }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to process goal with OpenAI');
      }

      const data = await response.json();
      const goalData = JSON.parse(data.choices[0].message.content);
      
      return {
        title: goalData.title,
        desiredGoal: goalData.desiredGoal,
        startState: goalData.startState,
        currentState: goalData.currentState,
        endState: goalData.endState,
        frequency: goalData.frequency,
        startDate: new Date().toISOString(),
        endDate: goalData.endDate,
        suggestedVoice: goalData.suggestedVoice
      };
    } catch (error) {
      console.error('Error in OpenAI call:', error);
      throw error;
    }
  };

  const updateGoalLastChecked = (goalId: string) => {
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { ...goal, lastChecked: new Date().toISOString() }
          : goal
      )
    );
  };

  const syncGoalWithCalendarEvents = (goalId: string) => {
    try {
      // Get current calendar events
      const storedEvents = localStorage.getItem('calendar_events');
      if (!storedEvents) return;
      
      const allEvents = JSON.parse(storedEvents) as any[];
      const goal = goals.find(g => g.id === goalId);
      
      if (!goal) return;
      
      // Find events associated with this goal
      const goalEvents = allEvents.filter(event => 
        event.title.toLowerCase().includes(goal.title.toLowerCase()) || 
        (goal.projectId && event.projectId === goal.projectId)
      );
      
      // Update goal deadlines in calendar if needed
      const deadlineEvent = goalEvents.find(event => 
        event.title.toLowerCase().includes('deadline') && 
        event.title.toLowerCase().includes(goal.title.toLowerCase())
      );
      
      // If goal has an end date but no deadline event, create one
      if (goal.endDate && !deadlineEvent && !goal.isCompleted) {
        const newEvent = {
          id: `goal-deadline-${goal.id}`,
          title: `Deadline: ${goal.title}`,
          date: new Date(goal.endDate).toISOString(),
          type: 'milestone' as 'event' | 'milestone',
          color: '#EF4444',
          projectId: goal.projectId
        };
        
        allEvents.push(newEvent);
        localStorage.setItem('calendar_events', JSON.stringify(allEvents));
      }
      
      // If goal is marked complete, update any associated deadline events
      if (goal.isCompleted && deadlineEvent) {
        const updatedEvents = allEvents.map(event => {
          if (event.id === deadlineEvent.id) {
            return {
              ...event,
              title: `Completed: ${goal.title}`,
              color: '#10B981' // Green color for completed
            };
          }
          return event;
        });
        
        localStorage.setItem('calendar_events', JSON.stringify(updatedEvents));
      }
    } catch (error) {
      console.error('Error syncing goal with calendar events:', error);
    }
  };

  const updateGoalStatus = (goalId: string, isCompleted: boolean) => {
    // Update local state
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { ...goal, isCompleted, lastChecked: new Date().toISOString() }
          : goal
      )
    );
    
    // Also update in the global context
    contextUpdateGoal(goalId, { isCompleted, lastChecked: new Date().toISOString() });
    
    // Sync with calendar events
    syncGoalWithCalendarEvents(goalId);
  };

  const updateGoal = (goalId: string, updates: Partial<Goal>) => {
    // Update local state
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { ...goal, ...updates }
          : goal
      )
    );
    
    // Update in global context
    contextUpdateGoal(goalId, updates);
    
    // If the update includes completion status or end date changes, sync with calendar
    if (updates.isCompleted !== undefined || updates.endDate !== undefined) {
      syncGoalWithCalendarEvents(goalId);
    }
  };

  const deleteGoal = (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
    }
  };

  const openGatekeeperChat = (goal: Goal) => {
    console.log(`Opening gatekeeper chat for goal: ${goal.title} (${goal.id})`);
    
    // Use the direct approach which bypasses the context issues
    if (typeof (window as any).directOpenGatekeeperForGoal === 'function') {
      console.log(`Using direct approach to open gatekeeper for goal ID: ${goal.id}`);
      (window as any).directOpenGatekeeperForGoal(goal.id);
      return;
    }
    
    // If direct approach is not available, fall back to context approach
    console.log(`Falling back to context approach for goal ID: ${goal.id}`);
    
    // Use the context function directly instead of setting local state
    if (openGatekeeperForGoal) {
      console.log(`Calling context.openGatekeeperForGoal with ID: ${goal.id}`);
      
      // Debug log to compare local goals with context goals
      console.log('Local component goals:', goals.length);
      console.log('Context goals from context object:', contextGoals.length);
      
      // Check if goal exists in context already
      const goalExistsInContext = contextGoals.some(g => g.id === goal.id);
      
      if (!goalExistsInContext) {
        console.log('Goal not found in context, synchronizing to store first...');
        
        // First save all goals to ensure the context has access to them
        const syncAndOpen = async () => {
          try {
            // Save all goals to store
            console.log(`Saving ${goals.length} goals to store...`);
            await storeService.saveAccountabilityGoals(goals);
            
            // Force context to reload goals
            console.log('Forcing context to reload goals...');
            const reloadedGoals = await forceReloadGoals();
            console.log(`Context reloaded ${reloadedGoals.length} goals`);
            
            // Now try to open the gatekeeper
            openGatekeeperForGoal(goal.id);
          } catch (error) {
            console.error('Error syncing goals to context:', error);
            // Try opening anyway as a fallback
            openGatekeeperForGoal(goal.id);
          }
        };
        
        syncAndOpen();
      } else {
        // Goal exists in context, proceed normally
        console.log('Goal found in context, opening gatekeeper directly...');
        openGatekeeperForGoal(goal.id);
      }
    } else {
      console.error("openGatekeeperForGoal function not available in context!");
    }
  };

  const closeGatekeeperChat = () => {
    setSelectedGoal(null);
    contextCloseGatekeeperChat(); // Call the context version
  };

  const openEditGoalModal = (goal: Goal) => {
    setEditingGoal(goal);
  };

  const closeEditGoalModal = () => {
    setEditingGoal(null);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Check for API key when component mounts
  useEffect(() => {
    // This useEffect can be removed or adapted if needed for other context values
    // console.log("Accountability component: localApiKey state:", localApiKey ? `${localApiKey.substring(0, 5)}...` : "not set");
  }, [localApiKey]); // <-- Update dependency if kept

  // Add a visual indicator for goals needing check-ins
  const isGoalDueForCheckin = (goal: Goal) => {
    if (goal.isCompleted) return false;
    
    const now = new Date();
    const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : null;
    if (!lastChecked) return true; // Never checked
    
    let timeThreshold = 0;
    
    switch (goal.frequency) {
      case 'minute':
        timeThreshold = 1 * 60 * 1000; // 1 minute
        break;
      case 'hourly':
        timeThreshold = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily':
        timeThreshold = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        timeThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case 'monthly':
        // For monthly, check if we're in a new month
        return (lastChecked.getMonth() !== now.getMonth()) || 
               (lastChecked.getFullYear() !== now.getFullYear());
    }
    
    return (now.getTime() - lastChecked.getTime()) >= timeThreshold;
  };

  // Add a debug function to force reload goals and try to open the gatekeeper
  const forceReloadAndOpenGatekeeper = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // First check the local component goals
      if (goals.length > 0) {
        console.log(`Using component goals: ${goals.length} available`);
        
        // First ensure the goals are synchronized to the store
        console.log("Ensuring goals are synchronized to store...");
        await storeService.saveAccountabilityGoals(goals);
        
        // Now force reload to make sure the context has them
        console.log("Forcing reload of goals from storage...");
        const reloadedGoals = await forceReloadGoals();
        console.log(`Reloaded ${reloadedGoals.length} goals into context`);
        
        // If we have goals after reload, use the first one
        if (reloadedGoals.length > 0) {
          const firstGoal = reloadedGoals[0];
          console.log(`Attempting to open gatekeeper for goal: ${firstGoal.title} (${firstGoal.id})`);
          openGatekeeperForGoal(firstGoal.id);
        } else if (goals.length > 0) {
          // If no context goals but we have component goals, try using the first component goal directly
          console.log("No goals found in context after reload, trying first component goal directly");
          const firstComponentGoal = goals[0];
          console.log(`Direct component goal: ${firstComponentGoal.title} (${firstComponentGoal.id})`);
          
          // Try to save this specific goal and then open it
          await storeService.saveAccountabilityGoals([firstComponentGoal]);
          await forceReloadGoals(); // Reload again to ensure context has this goal
          openGatekeeperForGoal(firstComponentGoal.id);
        } else {
          console.error("No goals found in component or context after reload");
          setError("No goals found after reload");
        }
      } else {
        console.error("No goals available in component to use");
        setError("No goals available to debug");
      }
    } catch (error) {
      console.error("Error reloading goals:", error);
      setError("Error reloading goals");
    } finally {
      // Set isProcessing to false when we're done, whether successful or not
      setIsProcessing(false);
    }
  };

  // Add this useEffect after the goals loading useEffect
  useEffect(() => {
    // If we have goals in the component but not in the context, synchronize them
    if (goals.length > 0 && contextGoals.length === 0) {
      console.log(`Accountability: Syncing ${goals.length} goals from component to context via storeService`);
      
      // Save to storeService to make them available to the context
      const syncGoalsToStore = async () => {
        try {
          // Save to both storage mechanisms for maximum compatibility
          localStorage.setItem(STORAGE_KEYS.ACCOUNTABILITY_GOALS, JSON.stringify(goals));
          
          if (typeof storeService.saveAccountabilityGoals === 'function') {
            await storeService.saveAccountabilityGoals(goals);
            
            // After saving, force a reload in the context to ensure it has the goals
            if (forceReloadGoals) {
              console.log('Accountability: Forcing context to reload goals after sync');
              const reloadedGoals = await forceReloadGoals();
              console.log(`Accountability: Context reloaded ${reloadedGoals.length} goals`);
            }
          }
        } catch (error) {
          console.error('Accountability: Error syncing goals to store:', error);
        }
      };
      
      syncGoalsToStore();
    }
  }, [goals, contextGoals, forceReloadGoals]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center">
          <FiTarget className="mr-2" />
          Accountability
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {/* Goals that need check-ins */}
          {goals.filter(goal => !goal.isCompleted && isGoalDueForCheckin(goal)).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4 rounded-md mb-8">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 flex items-center mb-3">
                <FiClock className="mr-2" />
                Goals Needing Check-in
              </h2>
              
              <div className="space-y-2">
                {goals.filter(goal => !goal.isCompleted && isGoalDueForCheckin(goal)).map(goal => (
                  <div 
                    key={`checkin-${goal.id}`} 
                    className="bg-white dark:bg-gray-800 p-3 rounded-md flex justify-between items-center shadow-sm"
                  >
                    <span className="font-medium">{goal.title}</span>
                    <button
                      onClick={() => openGatekeeperChat(goal)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center"
                    >
                      <FiMessageSquare className="mr-1" />
                      Check-in Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Goals with upcoming deadlines */}
          {goals.filter(goal => {
            if (goal.isCompleted || !goal.endDate) return false;
            const deadline = new Date(goal.endDate);
            const now = new Date();
            const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            return hoursRemaining > 0 && hoursRemaining <= 48;
          }).length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 p-4 rounded-md mb-8">
              <h2 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 flex items-center mb-3">
                <FiCalendar className="mr-2" />
                Goals Due Soon
              </h2>
              
              <div className="space-y-2">
                {goals.filter(goal => {
                  if (goal.isCompleted || !goal.endDate) return false;
                  const deadline = new Date(goal.endDate);
                  const now = new Date();
                  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
                  return hoursRemaining > 0 && hoursRemaining <= 48;
                }).map(goal => {
                  const deadline = new Date(goal.endDate);
                  const now = new Date();
                  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
                  
                  return (
                    <div 
                      key={`deadline-${goal.id}`} 
                      className="bg-white dark:bg-gray-800 p-3 rounded-md flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <span className="font-medium">{goal.title}</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Due in {Math.round(hoursRemaining)} hours ({deadline.toLocaleDateString()})
                        </p>
                      </div>
                      <button
                        onClick={() => openGatekeeperChat(goal)}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm flex items-center"
                      >
                        <FiMessageSquare className="mr-1" />
                        Update
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Add New Goal Form */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Goal</h2>
            
            <form onSubmit={handleSubmitNewGoal}>
              <div className="mb-4">
                <label className="block mb-2 font-medium">I want to...</label>
                <textarea
                  className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={newGoalPrompt}
                  onChange={(e) => setNewGoalPrompt(e.target.value)}
                  placeholder="Describe your goal in detail..."
                  disabled={isSubmitting}
                ></textarea>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Be specific and clear about what you want to achieve
                </p>
              </div>
              
              {/* Project selection dropdown */}
              <div className="mb-4">
                <label className="block mb-2 font-medium">Associate with Project</label>
                <select
                  className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">None</option>
                  {localProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Link this goal to a project for task management
                </p>
              </div>
              
              {/* Goal Voice Input */}
              <div className="mb-4">
                <label className="block mb-2 font-medium">Goal Voice/Tone (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={newGoalVoice}
                  onChange={(e) => setNewGoalVoice(e.target.value)}
                  placeholder="Describe the tone the AI should use (e.g., encouraging, firm, friendly)"
                  disabled={isSubmitting}
                ></textarea>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Guide the AI's personality when checking in on this goal.
                </p>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center transition-colors"
                disabled={isSubmitting || !newGoalPrompt.trim()}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing with AI...
                  </>
                ) : (
                  <>
                    <FiPlus className="mr-2" /> 
                    Create Goal
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Goals List */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Your Goals</h2>
            
            {goals.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
                <p className="text-gray-500 dark:text-gray-400">You haven't created any goals yet.</p>
              </div>
            ) : (
              goals.map(goal => {
                const needsCheckin = isGoalDueForCheckin(goal);
                
                return (
                  <div 
                    key={goal.id}
                    className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 ${
                      goal.isCompleted 
                        ? 'border-green-500' 
                        : needsCheckin 
                          ? 'border-red-500' 
                          : 'border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        {goal.title}
                        {!goal.isCompleted && needsCheckin && (
                          <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
                            Check-in needed
                          </span>
                        )}
                      </h3>
                      
                      <div className="flex space-x-2">
                        {!goal.isCompleted && (
                          <button
                            onClick={() => openGatekeeperChat(goal)}
                            className={`p-2 rounded-full ${
                              needsCheckin 
                                ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 animate-pulse' 
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                            }`}
                            title="Check-in for this goal"
                          >
                            <FiMessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => openEditGoalModal(goal)}
                          className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300"
                          title="Edit goal"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => updateGoalStatus(goal.id, !goal.isCompleted)}
                          className={`p-2 rounded-full ${
                            goal.isCompleted 
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' 
                              : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                          }`}
                          title={goal.isCompleted ? "Mark as not completed" : "Mark as completed"}
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300"
                          title="Delete goal"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="font-medium">Desired Goal:</div>
                        <p className="text-gray-700 dark:text-gray-300">{goal.desiredGoal}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="font-medium">Start State:</div>
                          <p className="text-gray-700 dark:text-gray-300">{goal.startState}</p>
                        </div>
                        
                        <div>
                          <div className="font-medium">Current State:</div>
                          <p className="text-gray-700 dark:text-gray-300">{goal.currentState}</p>
                        </div>
                        
                        <div>
                          <div className="font-medium">End State:</div>
                          <p className="text-gray-700 dark:text-gray-300">{goal.endState}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <div className="flex items-center">
                        <FiClock className="mr-1" /> 
                        Frequency: {goal.frequency.charAt(0).toUpperCase() + goal.frequency.slice(1)}
                      </div>
                      
                      <div className="flex items-center">
                        <FiCalendar className="mr-1" /> 
                        {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
                      </div>
                      
                      {goal.projectId && (
                        <div className="flex items-center">
                          <FiFolder className="mr-1" /> 
                          Project: {localProjects.find(p => p.id === goal.projectId)?.name || 'Unknown'}
                        </div>
                      )}
                      
                      {goal.isCompleted && (
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <FiCheck className="mr-1" /> 
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Goal Modal */}
      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={closeEditGoalModal}
          onSave={updateGoal}
          projects={localProjects}
        />
      )}

    </div>
  );
};

export default Accountability; 