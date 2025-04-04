import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiList, FiCheck, FiClock, FiCalendar } from 'react-icons/fi';
import { storeService } from '../../services/storeService';

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
  projectId?: string; // Optional project ID
}

enum TaskStatus {
  BACKLOG = 'backlog',
  DOING = 'doing',
  DONE = 'done',
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  projectId: string;
  status: TaskStatus;
}

interface Project {
  id: string;
  name: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  time?: string; // Time in HH:MM format
  type: 'event' | 'milestone';
  projectId?: string; // For milestones
  color: string;
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly';
  recurrenceEndDate?: string; // ISO string, optional end date for recurring events
}

interface Message {
  id: string;
  sender: 'user' | 'gatekeeper';
  text: string;
  timestamp: Date;
}

interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
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

interface GatekeeperChatProps {
  goal: Goal;
  onClose: () => void;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => void;
  apiKey: string;
  selectedModel: string;
  projects: Project[]; // Add projects prop
  userContext?: UserContext; // Add optional userContext prop
}

const GatekeeperChat: React.FC<GatekeeperChatProps> = ({ goal, onClose, onUpdateGoal, apiKey, selectedModel, projects, userContext }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<CalendarEvent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tasks associated with the goal's project
  useEffect(() => {
    const loadTasks = async () => {
      if (goal.projectId) {
        try {
          const allTasks = await storeService.getTasks();
          if (Array.isArray(allTasks)) {
            setTasks(allTasks);
            
            // Filter tasks for the goal's project
            const projectTasks = allTasks.filter(task => 
              task.projectId === goal.projectId &&
              (task.status === TaskStatus.BACKLOG || task.status === TaskStatus.DOING)
            );
            setRelatedTasks(projectTasks);
          }
        } catch (error) {
          console.error('Error loading tasks:', error);
        }
      }
    };
    
    loadTasks();
  }, [goal.projectId]);

  // Load calendar events related to the goal
  useEffect(() => {
    const loadCalendarEvents = () => {
      try {
        // Load calendar events from localStorage
        const storedEvents = localStorage.getItem('calendar_events');
        if (storedEvents) {
          const allEvents = JSON.parse(storedEvents) as CalendarEvent[];
          setCalendarEvents(allEvents);
          
          // Filter events that might be related to this goal
          // Match by title containing the goal title or related to the goal's project
          const goalRelatedEvents = allEvents.filter(event => {
            // Match by goal title in the event title
            const titleMatch = event.title.toLowerCase().includes(goal.title.toLowerCase());
            
            // Match by project ID if the goal has a project
            const projectMatch = goal.projectId && event.projectId === goal.projectId;
            
            return titleMatch || projectMatch;
          });
          
          setRelatedEvents(goalRelatedEvents);
        }
      } catch (error) {
        console.error('Error loading calendar events:', error);
      }
    };
    
    loadCalendarEvents();
  }, [goal.title, goal.projectId]);

  // Generate initial welcome message from the Gatekeeper
  useEffect(() => {
    const initialMessage = generateWelcomeMessage(goal, relatedTasks, relatedEvents);
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'gatekeeper',
        text: initialMessage,
        timestamp: new Date()
      }
    ]);
  }, [goal, relatedTasks, relatedEvents]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateWelcomeMessage = (goal: Goal, relatedTasks: Task[], relatedEvents: CalendarEvent[]) => {
    const now = new Date();
    const endDate = new Date(goal.endDate);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let tasksSection = '';
    if (goal.projectId && relatedTasks.length > 0) {
      tasksSection = `\n\nYou have ${relatedTasks.length} active tasks related to this goal:`;
      relatedTasks.forEach((task, index) => {
        tasksSection += `\n${index + 1}. ${task.title} (${task.status === TaskStatus.BACKLOG ? 'Backlog' : 'In Progress'})`;
      });
    }
    
    let eventsSection = '';
    if (relatedEvents.length > 0) {
      eventsSection = `\n\nYou have ${relatedEvents.length} calendar events related to this goal:`;
      relatedEvents.forEach((event, index) => {
        const eventDate = new Date(event.date);
        const dateString = eventDate.toLocaleDateString();
        eventsSection += `\n${index + 1}. ${event.title} (${dateString}${event.time ? ' at ' + event.time : ''})`;
      });
    }
    
    return `Hi there! I'm your Accountability Gatekeeper for your goal: "${goal.title}".

Your current status is: "${goal.currentState}"

Your end goal is: "${goal.endState}"

You have ${daysLeft} days left until your target completion date.${tasksSection}${eventsSection}

How are you progressing on this goal? Any updates you'd like to share? I can help manage your tasks and calendar events related to this goal.`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Process the message with OpenAI to determine appropriate response
      const gatekeeperResponse = await processUserResponse(userMessage.text);
      
      // Add gatekeeper response
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'gatekeeper',
        text: gatekeeperResponse.reply,
        timestamp: new Date()
      }]);
      
      // Update goal if needed
      onUpdateGoal(goal.id, gatekeeperResponse.updates);
      
      // Reload tasks if they were modified
      if (gatekeeperResponse.tasksModified) {
        const updatedTasks = await storeService.getTasks();
        if (Array.isArray(updatedTasks)) {
          setTasks(updatedTasks);
          // Update related tasks
          const projectTasks = updatedTasks.filter(task => 
            task.projectId === goal.projectId &&
            (task.status === TaskStatus.BACKLOG || task.status === TaskStatus.DOING)
          );
          setRelatedTasks(projectTasks);
        }
      }
      
      // Reload calendar events if they were modified
      if (gatekeeperResponse.eventsModified) {
        // Load calendar events from localStorage
        const storedEvents = localStorage.getItem('calendar_events');
        if (storedEvents) {
          const allEvents = JSON.parse(storedEvents) as CalendarEvent[];
          setCalendarEvents(allEvents);
          
          // Filter events that might be related to this goal
          const goalRelatedEvents = allEvents.filter(event => {
            const titleMatch = event.title.toLowerCase().includes(goal.title.toLowerCase());
            const projectMatch = goal.projectId && event.projectId === goal.projectId;
            return titleMatch || projectMatch;
          });
          
          setRelatedEvents(goalRelatedEvents);
        }
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error response from gatekeeper
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'gatekeeper',
        text: "I'm sorry, I had trouble processing your response. Can you try again?",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Task management functions
  const createTask = async (title: string, status: TaskStatus = TaskStatus.BACKLOG): Promise<boolean> => {
    if (!goal.projectId) return false;
    
    try {
      const newTask: Task = {
        id: Date.now().toString(),
        title,
        completed: status === TaskStatus.DONE,
        createdAt: new Date().toISOString(),
        projectId: goal.projectId,
        status,
      };
      
      const updatedTasks = [...tasks, newTask];
      await storeService.saveTasks(updatedTasks);
      return true;
    } catch (error) {
      console.error('Error creating task:', error);
      return false;
    }
  };
  
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus): Promise<boolean> => {
    try {
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          // Update completed state based on status
          const completed = newStatus === TaskStatus.DONE;
          return { ...task, status: newStatus, completed };
        }
        return task;
      });
      
      await storeService.saveTasks(updatedTasks);
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  };
  
  const completeTask = async (taskId: string): Promise<boolean> => {
    return updateTaskStatus(taskId, TaskStatus.DONE);
  };

  // Calendar event management functions
  const createCalendarEvent = async (
    title: string, 
    date: string, 
    time?: string,
    type: 'event' | 'milestone' = 'event',
    isRecurring: boolean = false,
    recurrenceType?: 'daily' | 'weekly' | 'monthly',
    recurrenceEndDate?: string
  ): Promise<boolean> => {
    try {
      // Default color based on event type
      const color = type === 'milestone' ? '#EF4444' : '#3B82F6';
      
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title,
        date: new Date(date).toISOString(),
        time,
        type,
        color,
        isRecurring,
        recurrenceType,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
        projectId: goal.projectId // Associate with the goal's project if it has one
      };
      
      // Add to existing events
      const updatedEvents = [...calendarEvents, newEvent];
      
      // Save to localStorage
      localStorage.setItem('calendar_events', JSON.stringify(updatedEvents));
      
      return true;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return false;
    }
  };
  
  const updateCalendarEvent = async (eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> => {
    try {
      const eventIndex = calendarEvents.findIndex(event => event.id === eventId);
      if (eventIndex === -1) return false;
      
      // Update the event
      const updatedEvents = [...calendarEvents];
      updatedEvents[eventIndex] = {
        ...updatedEvents[eventIndex],
        ...updates,
        // Convert date strings to ISO format if provided
        date: updates.date ? new Date(updates.date).toISOString() : updatedEvents[eventIndex].date,
        recurrenceEndDate: updates.recurrenceEndDate ? new Date(updates.recurrenceEndDate).toISOString() : updatedEvents[eventIndex].recurrenceEndDate
      };
      
      // Save to localStorage
      localStorage.setItem('calendar_events', JSON.stringify(updatedEvents));
      
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  };
  
  const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
    try {
      const updatedEvents = calendarEvents.filter(event => event.id !== eventId);
      
      // Save to localStorage
      localStorage.setItem('calendar_events', JSON.stringify(updatedEvents));
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  };

  const processUserResponse = async (userMessage: string): Promise<{
    reply: string;
    updates: Partial<Goal>;
    tasksModified: boolean;
    eventsModified: boolean;
  }> => {
    // Ensure we have a working API key by checking localStorage directly if provided key is missing
    let workingApiKey = apiKey;
    if (!workingApiKey) {
      const localStorageKey = localStorage.getItem('openai_api_key');
      if (localStorageKey) {
        console.log("GatekeeperChat: Found API key in localStorage, using it directly");
        workingApiKey = localStorageKey;
      }
    }
    
    if (!workingApiKey) {
      throw new Error('OpenAI API key not found. Please set it in the Settings → OpenAI Key section.');
    }
    
    try {
      // Create system message that instructs the AI on how to process the response
      const systemMessage = `You are an AI assistant acting as an Accountability Gatekeeper.
      You're checking in on the user's progress for their goal: "${goal.title}".
      
      ${userContext?.name ? `The user's name is ${userContext.name}.` : ''}
      ${userContext?.company ? `They work at ${userContext.company}.` : ''}
      ${userContext?.backStory ? `Background about the user: ${userContext.backStory}` : ''}
      ${userContext?.voice ? `Preferred communication style: ${userContext.voice}` : ''}
      
      Current goal details:
      - Desired goal: ${goal.desiredGoal}
      - Current state: ${goal.currentState}
      - End state: ${goal.endState}
      - Start date: ${new Date(goal.startDate).toLocaleDateString()}
      - Target end date: ${new Date(goal.endDate).toLocaleDateString()}
      - Check-in frequency: ${goal.frequency}
      
      ${goal.projectId ? `This goal is associated with the project "${projects.find(p => p.id === goal.projectId)?.name || 'Unknown'}"` : ''}
      
      ${relatedTasks.length > 0 ? 
        `There are ${relatedTasks.length} tasks related to this goal:
        ${relatedTasks.map((task, i) => `${i+1}. ${task.title} (Status: ${task.status})`).join('\n')}` 
        : 'There are no tasks associated with this goal yet.'}
      
      ${relatedEvents.length > 0 ? 
        `There are ${relatedEvents.length} calendar events related to this goal:
        ${relatedEvents.map((event, i) => {
          const eventDate = new Date(event.date);
          return `${i+1}. ${event.title} (${eventDate.toLocaleDateString()}${event.time ? ' at ' + event.time : ''})`;
        }).join('\n')}` 
        : 'There are no calendar events associated with this goal yet.'}
      
      ${userContext?.additionalInfo ? `Additional context about the user: ${userContext.additionalInfo}` : ''}
      
      Based on the user's message, determine:
      1. If the user has completed their goal
      2. What the new current state of the goal should be based on their update
      3. An encouraging and helpful response that acknowledges their progress
      4. If you need to create or update tasks related to this goal
      5. If you need to create, update, or delete calendar events/reminders for this goal
      
      When speaking to the user, address them by name if you know it, and maintain the preferred communication style.
      
      You can perform any of the following actions:
      
      TASK ACTIONS:
      - Create a new task for this goal project
      - Mark an existing task as complete
      - Update a task status to "doing" to indicate it's in progress
      
      CALENDAR ACTIONS:
      - Create a new calendar event/reminder related to this goal
      - Update an existing calendar event/reminder
      - Delete a calendar event/reminder
      
      Format your response as a JSON object with these fields:
      {
        "isCompleted": boolean,
        "newCurrentState": "string with the updated current state, or null if unchanged",
        "tasks": [
          {
            "action": "create" | "complete" | "update",
            "title": "string (only for create action)",
            "taskId": "string (only for complete or update actions)",
            "newStatus": "backlog" | "doing" | "done" (only for update action)"
          }
        ],
        "calendarEvents": [
          {
            "action": "create" | "update" | "delete",
            "eventId": "string (only for update or delete actions)",
            "title": "string (for create or update actions)",
            "date": "YYYY-MM-DD (for create or update actions)",
            "time": "HH:MM (optional, for create or update actions)",
            "type": "event" | "milestone" (for create or update actions)",
            "isRecurring": boolean (optional, for create or update actions),
            "recurrenceType": "daily" | "weekly" | "monthly" (optional, for create or update actions),
            "recurrenceEndDate": "YYYY-MM-DD" (optional, for create or update actions)
          }
        ],
        "reply": "string with your encouraging response to the user that mentions any task or calendar changes you've made"
      }`;
      
      // Make OpenAI API call
      console.log("GatekeeperChat: Making API call with key:", workingApiKey ? `${workingApiKey.substring(0, 5)}...` : "not set");
      
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
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to process response with OpenAI');
      }
      
      const data = await response.json();
      const processedResponse = JSON.parse(data.choices[0].message.content);
      
      // Prepare updates for the goal
      const updates: Partial<Goal> = {
        lastChecked: new Date().toISOString()
      };
      
      // If the goal is completed, update that field and update any related calendar events
      if (processedResponse.isCompleted) {
        updates.isCompleted = true;
        
        // Additionally, update any deadline events in the calendar to show as completed
        try {
          const updatedEvents = calendarEvents.map(event => {
            // Find deadline events related to this goal
            if (event.title.toLowerCase().includes(`deadline: ${goal.title.toLowerCase()}`)) {
              return {
                ...event,
                title: `Completed: ${goal.title}`,
                color: '#10B981' // Green color for completed
              };
            }
            return event;
          });
          
          // Save the updated events
          localStorage.setItem('calendar_events', JSON.stringify(updatedEvents));
        } catch (error) {
          console.error('Error updating calendar deadline events:', error);
        }
      }
      
      // If there's a new current state, update that as well
      if (processedResponse.newCurrentState && processedResponse.newCurrentState !== goal.currentState) {
        updates.currentState = processedResponse.newCurrentState;
      }
      
      // Process task updates
      let tasksModified = false;
      if (processedResponse.tasks && Array.isArray(processedResponse.tasks) && goal.projectId) {
        for (const taskAction of processedResponse.tasks) {
          if (taskAction.action === 'create' && taskAction.title) {
            const success = await createTask(taskAction.title);
            tasksModified = tasksModified || success;
          } 
          else if (taskAction.action === 'complete' && taskAction.taskId) {
            const success = await completeTask(taskAction.taskId);
            tasksModified = tasksModified || success;
          } 
          else if (taskAction.action === 'update' && taskAction.taskId && taskAction.newStatus) {
            const status = 
              taskAction.newStatus === 'backlog' ? TaskStatus.BACKLOG :
              taskAction.newStatus === 'doing' ? TaskStatus.DOING :
              TaskStatus.DONE;
            const success = await updateTaskStatus(taskAction.taskId, status);
            tasksModified = tasksModified || success;
          }
        }
      }
      
      // Process calendar event updates
      let eventsModified = false;
      if (processedResponse.calendarEvents && Array.isArray(processedResponse.calendarEvents)) {
        for (const eventAction of processedResponse.calendarEvents) {
          if (eventAction.action === 'create' && eventAction.title && eventAction.date) {
            const success = await createCalendarEvent(
              eventAction.title,
              eventAction.date,
              eventAction.time,
              eventAction.type || 'event',
              eventAction.isRecurring || false,
              eventAction.recurrenceType,
              eventAction.recurrenceEndDate
            );
            eventsModified = eventsModified || success;
          } 
          else if (eventAction.action === 'update' && eventAction.eventId) {
            const updates: Partial<CalendarEvent> = {};
            if (eventAction.title) updates.title = eventAction.title;
            if (eventAction.date) updates.date = eventAction.date;
            if (eventAction.time !== undefined) updates.time = eventAction.time;
            if (eventAction.type) updates.type = eventAction.type;
            if (eventAction.isRecurring !== undefined) updates.isRecurring = eventAction.isRecurring;
            if (eventAction.recurrenceType) updates.recurrenceType = eventAction.recurrenceType;
            if (eventAction.recurrenceEndDate !== undefined) updates.recurrenceEndDate = eventAction.recurrenceEndDate;
            
            const success = await updateCalendarEvent(eventAction.eventId, updates);
            eventsModified = eventsModified || success;
          } 
          else if (eventAction.action === 'delete' && eventAction.eventId) {
            const success = await deleteCalendarEvent(eventAction.eventId);
            eventsModified = eventsModified || success;
          }
        }
      }
      
      return {
        reply: processedResponse.reply,
        updates,
        tasksModified,
        eventsModified
      };
    } catch (error) {
      console.error('Error in OpenAI call:', error);
      throw error;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Goal Check-in: {goal.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Section - Tasks and Calendar */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-3">
          {/* Tasks Section */}
          {goal.projectId && relatedTasks.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center mb-2">
                <FiList className="mr-2 text-indigo-500" />
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-300">Related Tasks</h3>
              </div>
              <div className="text-sm space-y-1 max-h-[100px] overflow-y-auto">
                {relatedTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="flex items-center">
                      <div 
                        className={`w-2 h-2 rounded-full mr-2 ${
                          task.status === TaskStatus.DOING ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                      ></div>
                      <span className="text-gray-800 dark:text-gray-200">{task.title}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        task.status === TaskStatus.BACKLOG ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200' :
                        task.status === TaskStatus.DOING ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      }`}>
                        {task.status === TaskStatus.BACKLOG ? 'Backlog' : 
                         task.status === TaskStatus.DOING ? 'In Progress' : 'Done'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Calendar Events Section */}
          {relatedEvents.length > 0 && (
            <div>
              <div className="flex items-center mb-2">
                <FiCalendar className="mr-2 text-purple-500" />
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-300">Related Events</h3>
              </div>
              <div className="text-sm space-y-1 max-h-[100px] overflow-y-auto">
                {relatedEvents.map(event => {
                  const eventDate = new Date(event.date);
                  return (
                    <div key={event.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <div className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: event.color }}
                        ></div>
                        <span className="text-gray-800 dark:text-gray-200">{event.title}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {eventDate.toLocaleDateString()} {event.time && `at ${event.time}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>
                <div className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2">
            <textarea
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 dark:text-white"
              placeholder="Type your update here..."
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className={`p-2 rounded-md ${
                isLoading || !inputMessage.trim()
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatekeeperChat; 