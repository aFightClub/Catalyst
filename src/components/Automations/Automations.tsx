import React, { useState, useEffect } from 'react';
import { FiPlus, FiClock, FiCalendar, FiPlay, FiTrash2, FiEdit, FiSave, FiX, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { storeService } from '../../services/storeService';

// Define interfaces for our automation data
interface ScheduledAutomation {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM in 24h format
    date?: string; // ISO date string (YYYY-MM-DD) for one-time schedules
    daysOfWeek?: number[]; // 0-6 (Sunday to Saturday) for weekly schedules
    dayOfMonth?: number; // 1-31 for monthly schedules
  };
  lastRun?: string; // ISO date string
  nextRun?: string; // ISO date string
  enabled: boolean;
  createdAt: string;
}

interface Workflow {
  id: string;
  name: string;
  actions: any[];
  variables: string[];
  startUrl?: string;
}

// Declare the Electron API for opening new windows
declare global {
  interface Window {
    electron?: {
      send: (channel: string, data: any) => void;
    }
  }
}

const Automations: React.FC = () => {
  const [automations, setAutomations] = useState<ScheduledAutomation[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [workflowVariables, setWorkflowVariables] = useState<{[key: string]: {[varName: string]: string}}>({});

  // New automation form state with correct typing
  const [newAutomation, setNewAutomation] = useState<{
    name: string;
    workflowId: string;
    schedule: {
      type: 'once' | 'daily' | 'weekly' | 'monthly';
      time: string;
      date?: string;
      daysOfWeek?: number[];
      dayOfMonth?: number;
    };
    enabled: boolean;
  }>({
    name: '',
    workflowId: '',
    schedule: {
      type: 'once',
      time: '12:00',
      date: new Date().toISOString().split('T')[0]
    },
    enabled: true
  });

  // Load automations and workflows when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load workflows
        const storedWorkflows = await storeService.getWorkflows();
        if (Array.isArray(storedWorkflows)) {
          setWorkflows(storedWorkflows);
        }
        
        // Load automations
        const storedAutomations = await storeService.getAutomations();
        if (Array.isArray(storedAutomations)) {
          setAutomations(storedAutomations);
        }
        
        // Load workflow variables
        const storedVariables = await storeService.getWorkflowVariables();
        if (storedVariables) {
          setWorkflowVariables(storedVariables);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Background timer to check for automations that need to run
  useEffect(() => {
    const checkInterval = 60000; // Check every minute
    
    // Check automations when first loaded
    checkAndRunAutomations();
    
    // Set up interval to check regularly
    const intervalId = setInterval(() => {
      checkAndRunAutomations();
    }, checkInterval);
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [automations]);

  // Function to check if any automations need to be run
  const checkAndRunAutomations = () => {
    const now = new Date();
    setLastCheckTime(now);
    console.log("Checking automations at:", now.toLocaleTimeString());
    
    automations.forEach(automation => {
      if (!automation.enabled || !automation.nextRun) return;
      
      const nextRunTime = new Date(automation.nextRun);
      
      // If it's time to run this automation (nextRun time has passed)
      if (nextRunTime <= now) {
        console.log(`Time to run automation: ${automation.name}`);
        
        // Prepare variables for this workflow
        const variables = prepareWorkflowVariables(automation.workflowId);
        console.log('Using variables for scheduled run:', variables);
        
        // First try the Electron API if available
        if (window.electron) {
          // Use Electron's IPC to request opening a new window with the workflow
          window.electron.send('run-workflow-in-new-window', { 
            workflowId: automation.workflowId,
            variables,
            detached: true // Signal that this should run in a separate window
          });
        } else {
          // Fallback to opening in a new tab/window
          const workflow = workflows.find(w => w.id === automation.workflowId);
          if (workflow && workflow.startUrl) {
            // Add variables to URL for non-Electron environment
            let url = workflow.startUrl;
            const varsParam = encodeURIComponent(JSON.stringify(variables));
            url += (url.includes('?') ? '&' : '?') + `workflowVars=${varsParam}`;
            window.open(url, '_blank');
          } else {
            console.error("Cannot run workflow - no start URL available");
          }
        }
        
        // Update the automation with lastRun and calculate next run time
        updateAutomationAfterRun(automation);
      }
    });
  };

  // Update automation after it runs
  const updateAutomationAfterRun = async (automation: ScheduledAutomation) => {
    const now = new Date();
    const nextRun = calculateNextRunAfterExecution(automation.schedule);
    
    // For one-time automations, disable after running
    const shouldRemainEnabled = automation.schedule.type !== 'once';
    
    const updatedAutomation: ScheduledAutomation = {
      ...automation,
      lastRun: now.toISOString(),
      nextRun,
      enabled: shouldRemainEnabled
    };
    
    // Update in state
    const updatedAutomations = automations.map(a => 
      a.id === automation.id ? updatedAutomation : a
    );
    
    setAutomations(updatedAutomations);
    
    // Save to storage
    await storeService.saveAutomations(updatedAutomations);
  };

  // Function to prepare variables for a workflow
  const prepareWorkflowVariables = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow || !workflow.variables || workflow.variables.length === 0) return {};
    
    // Get stored variables for this workflow or initialize empty ones
    const storedVars = workflowVariables[workflowId] || {};
    const preparedVars: {[key: string]: string} = {};
    
    // For each variable defined in the workflow, get the stored value or default from actions
    workflow.variables.forEach(varName => {
      if (storedVars[varName]) {
        preparedVars[varName] = storedVars[varName];
      } else {
        // Try to find a default value from the workflow actions
        const typeAction = workflow.actions.find(a => 
          a.type === 'type' && a.data.variableName === varName
        );
        if (typeAction && typeAction.data.value) {
          preparedVars[varName] = typeAction.data.value;
        } else {
          preparedVars[varName] = ''; // Default to empty string if no value found
        }
      }
    });
    
    return preparedVars;
  };

  // Helper to calculate next run time
  const calculateNextRun = (schedule: ScheduledAutomation['schedule']): string => {
    return calculateNextRunAfterExecution(schedule);
  };
  
  // Calculate next run time based on schedule, assuming last run just happened
  const calculateNextRunAfterExecution = (schedule: ScheduledAutomation['schedule']): string => {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If time has already passed today, move to next occurrence
    if (nextRun < now) {
      nextRun = new Date(nextRun.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
    }
    
    switch (schedule.type) {
      case 'once':
        if (schedule.date) {
          const [year, month, day] = schedule.date.split('-').map(Number);
          nextRun.setFullYear(year, month - 1, day);
        }
        // If one-time and it already passed, set to far future to avoid re-running
        if (nextRun < now) {
          nextRun = new Date(9999, 11, 31); // Year 9999
        }
        break;
        
      case 'daily':
        if (nextRun < now) {
          nextRun = new Date(nextRun.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
        }
        break;
        
      case 'weekly':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          // Find next day of week that matches
          let dayFound = false;
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(nextRun.getTime() + i * 24 * 60 * 60 * 1000);
            if (schedule.daysOfWeek.includes(checkDate.getDay())) {
              nextRun = checkDate;
              dayFound = true;
              break;
            }
          }
          
          if (!dayFound) {
            // If no day found in next 7 days, use first day of week
            const daysToAdd = (7 - nextRun.getDay() + schedule.daysOfWeek[0]) % 7;
            nextRun = new Date(nextRun.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          }
        }
        break;
        
      case 'monthly':
        if (schedule.dayOfMonth) {
          // Set to the specified day of current month
          nextRun.setDate(schedule.dayOfMonth);
          
          // If date has passed, move to next month
          if (nextRun < now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
        break;
    }
    
    return nextRun.toISOString();
  };

  // Save a new automation
  const saveAutomation = async () => {
    if (!newAutomation.name || !newAutomation.workflowId || !newAutomation.schedule) return;
    
    try {
      // Find selected workflow to store its name
      const workflow = workflows.find(w => w.id === newAutomation.workflowId);
      if (!workflow) return;
      
      const nextRun = calculateNextRun(newAutomation.schedule);
      
      const automation: ScheduledAutomation = {
        id: isEditing ? isEditing : Date.now().toString(),
        name: newAutomation.name,
        workflowId: newAutomation.workflowId,
        workflowName: workflow.name,
        schedule: newAutomation.schedule,
        enabled: newAutomation.enabled,
        nextRun,
        createdAt: isEditing ? (automations.find(a => a.id === isEditing)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };
      
      if (isEditing) {
        // Update existing automation
        const updatedAutomations = automations.map(a => 
          a.id === isEditing ? automation : a
        );
        setAutomations(updatedAutomations);
        await storeService.saveAutomations(updatedAutomations);
        setIsEditing(null);
      } else {
        // Add new automation
        const updatedAutomations = [...automations, automation];
        setAutomations(updatedAutomations);
        await storeService.saveAutomations(updatedAutomations);
        setIsCreating(false);
      }
      
      // Reset form
      setNewAutomation({
        name: '',
        workflowId: '',
        schedule: {
          type: 'once',
          time: '12:00',
          date: new Date().toISOString().split('T')[0]
        },
        enabled: true
      });
    } catch (error) {
      console.error("Failed to save automation:", error);
    }
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name.startsWith('schedule.')) {
      const field = name.split('.')[1];
      setNewAutomation({
        ...newAutomation,
        schedule: {
          ...newAutomation.schedule,
          [field]: value
        }
      });
    } else {
      setNewAutomation({
        ...newAutomation,
        [name]: value
      });
    }
  };

  // Toggle automation enabled/disabled state
  const toggleAutomationState = async (id: string) => {
    try {
      const updatedAutomations = automations.map(automation => {
        if (automation.id === id) {
          const enabled = !automation.enabled;
          // Recalculate next run time if enabling
          const nextRun = enabled 
            ? calculateNextRun(automation.schedule) 
            : automation.nextRun;
            
          return { ...automation, enabled, nextRun };
        }
        return automation;
      });
      
      setAutomations(updatedAutomations);
      await storeService.saveAutomations(updatedAutomations);
    } catch (error) {
      console.error("Failed to toggle automation state:", error);
    }
  };

  // Run an automation manually
  const runAutomationManually = (id: string) => {
    const automation = automations.find(a => a.id === id);
    if (automation) {
      console.log(`Manually running automation: ${automation.name}`);
      try {
        // Prepare variables for this workflow
        const variables = prepareWorkflowVariables(automation.workflowId);
        console.log('Using variables:', variables);
        
        // First try the Electron API if available
        if (window.electron) {
          // Use Electron's IPC to request opening a new window with the workflow
          window.electron.send('run-workflow-in-new-window', { 
            workflowId: automation.workflowId,
            variables,
            detached: true // Signal that this should run in a separate window
          });
        } else {
          // Fallback to opening in a new tab/window
          const workflow = workflows.find(w => w.id === automation.workflowId);
          if (workflow && workflow.startUrl) {
            // Add variables to URL for non-Electron environment
            let url = workflow.startUrl;
            const varsParam = encodeURIComponent(JSON.stringify(variables));
            url += (url.includes('?') ? '&' : '?') + `workflowVars=${varsParam}`;
            window.open(url, '_blank');
          } else {
            console.error("Cannot run workflow - no start URL available");
          }
        }
        
        // Update the automation with lastRun and calculate next run time
        updateAutomationAfterRun(automation);
      } catch (error) {
        console.error("Failed to run automation manually:", error);
      }
    }
  };

  // Edit an existing automation
  const editAutomation = (id: string) => {
    const automation = automations.find(a => a.id === id);
    if (automation) {
      setNewAutomation({
        name: automation.name,
        workflowId: automation.workflowId,
        schedule: {
          ...automation.schedule
        },
        enabled: automation.enabled
      });
      setIsEditing(id);
      setIsCreating(false);
    }
  };

  // Delete an automation
  const deleteAutomation = async (id: string) => {
    try {
      const updatedAutomations = automations.filter(a => a.id !== id);
      setAutomations(updatedAutomations);
      await storeService.saveAutomations(updatedAutomations);
    } catch (error) {
      console.error("Failed to delete automation:", error);
    }
  };

  // Format date for display
  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return isoString;
    }
  };

  // Set variable for a workflow
  const handleVariableChange = (workflowId: string, varName: string, value: string) => {
    const updatedVars = {
      ...workflowVariables,
      [workflowId]: {
        ...(workflowVariables[workflowId] || {}),
        [varName]: value
      }
    };
    
    setWorkflowVariables(updatedVars);
    
    // Save to storage
    storeService.saveWorkflowVariables(updatedVars);
  };

  // Cancel editing or creating
  const cancelForm = () => {
    setIsCreating(false);
    setIsEditing(null);
    setNewAutomation({
      name: '',
      workflowId: '',
      schedule: {
        type: 'once',
        time: '12:00',
        date: new Date().toISOString().split('T')[0]
      },
      enabled: true
    });
  };

  // Get a human-readable description of the schedule
  const getScheduleDescription = (schedule: ScheduledAutomation['schedule']): string => {
    switch (schedule.type) {
      case 'once':
        return `Once on ${schedule.date} at ${schedule.time}`;
        
      case 'daily':
        return `Daily at ${schedule.time}`;
        
      case 'weekly':
        const days = schedule.daysOfWeek || [];
        const dayNames = days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
        return `Weekly on ${dayNames.join(', ')} at ${schedule.time}`;
        
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
        
      default:
        return 'Unknown schedule';
    }
  };

  // Render the create/edit form
  const renderForm = () => (
    <div className="bg-gray-800 p-6 rounded-lg mb-6">
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edit Automation' : 'Schedule New Automation'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={newAutomation.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Daily Website Check"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Select Workflow
          </label>
          <select
            name="workflowId"
            value={newAutomation.workflowId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a workflow</option>
            {workflows.map(workflow => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Schedule Type
          </label>
          <select
            name="schedule.type"
            value={newAutomation.schedule?.type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="once">Once (Specific Date)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Time
          </label>
          <input
            type="time"
            name="schedule.time"
            value={newAutomation.schedule?.time}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {newAutomation.schedule?.type === 'once' && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Date
            </label>
            <input
              type="date"
              name="schedule.date"
              value={newAutomation.schedule?.date}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        
        {newAutomation.schedule?.type === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <label key={day} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={newAutomation.schedule?.daysOfWeek?.includes(index) || false}
                    onChange={e => {
                      const checked = e.target.checked;
                      const daysOfWeek = newAutomation.schedule?.daysOfWeek || [];
                      const updatedDays = checked
                        ? [...daysOfWeek, index].sort((a, b) => a - b)
                        : daysOfWeek.filter(d => d !== index);
                      
                      setNewAutomation({
                        ...newAutomation,
                        schedule: {
                          ...newAutomation.schedule,
                          daysOfWeek: updatedDays
                        }
                      });
                    }}
                    className="mr-1"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {newAutomation.schedule?.type === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Day of Month
            </label>
            <select
              name="schedule.dayOfMonth"
              value={newAutomation.schedule?.dayOfMonth}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          onClick={cancelForm}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          <FiX className="inline mr-1" />
          Cancel
        </button>
        <button
          onClick={saveAutomation}
          disabled={!newAutomation.name || !newAutomation.workflowId}
          className={`px-4 py-2 rounded ${
            !newAutomation.name || !newAutomation.workflowId
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <FiSave className="inline mr-1" />
          {isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );

  // Render the list of automations
  const renderAutomationsList = () => (
    <div className="space-y-4">
      {automations.map(automation => (
        <div key={automation.id} className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium">{automation.name}</h3>
              <p className="text-sm text-gray-400">
                Workflow: {automation.workflowName}
              </p>
              <p className="text-sm text-gray-400">
                Schedule: {getScheduleDescription(automation.schedule)}
              </p>
              {automation.lastRun && (
                <p className="text-sm text-gray-400">
                  Last Run: {formatDate(automation.lastRun)}
                </p>
              )}
              {automation.nextRun && (
                <p className="text-sm text-gray-400">
                  Next Run: {formatDate(automation.nextRun)}
                </p>
              )}
              
              {/* Workflow Variables Section */}
              {(() => {
                const workflow = workflows.find(w => w.id === automation.workflowId);
                if (workflow?.variables && workflow.variables.length > 0) {
                  return (
                    <div className="mt-3 border-t border-gray-700 pt-2">
                      <p className="text-sm text-gray-400 mb-2">
                        Variables:
                      </p>
                      <div className="space-y-2">
                        {workflow.variables.map(varName => {
                          const varsForWorkflow = workflowVariables[automation.workflowId] || {};
                          const defaultAction = workflow.actions.find(
                            a => a.type === 'type' && a.data.variableName === varName
                          );
                          const defaultValue = defaultAction?.data.value || '';
                          const currentValue = varsForWorkflow[varName] !== undefined ? 
                            varsForWorkflow[varName] : defaultValue;
                            
                          return (
                            <div key={varName} className="flex items-center">
                              <span className="text-sm text-gray-300 w-28 mr-2">{varName}:</span>
                              <input
                                type="text"
                                value={currentValue}
                                onChange={(e) => handleVariableChange(
                                  automation.workflowId, 
                                  varName, 
                                  e.target.value
                                )}
                                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => toggleAutomationState(automation.id)}
                className={`p-2 rounded ${automation.enabled ? 'text-green-500' : 'text-gray-500'}`}
                title={automation.enabled ? 'Disable' : 'Enable'}
              >
                {automation.enabled ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
              </button>
              <button
                onClick={() => runAutomationManually(automation.id)}
                className="p-2 rounded text-blue-500 hover:bg-gray-700"
                title="Run Now"
              >
                <FiPlay className="w-5 h-5" />
              </button>
              <button
                onClick={() => editAutomation(automation.id)}
                className="p-2 rounded text-yellow-500 hover:bg-gray-700"
                title="Edit"
              >
                <FiEdit className="w-5 h-5" />
              </button>
              <button
                onClick={() => deleteAutomation(automation.id)}
                className="p-2 rounded text-red-500 hover:bg-gray-700"
                title="Delete"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
  
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Scheduled Automations</h1>
      
      {/* Status indicator for debug purposes */}
      <div className="text-xs text-gray-500 mb-2">
        Last check: {formatDate(lastCheckTime.toISOString())}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-400">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add button section */}
          {!isCreating && !isEditing && (
            <div className="mb-6">
              <button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700"
              >
                <FiPlus className="mr-2" />
                Schedule New Automation
              </button>
            </div>
          )}
          
          {/* Creation/Edit Form */}
          {(isCreating || isEditing) && renderForm()}
          
          {/* Empty state */}
          {automations.length === 0 && !isCreating && !isEditing && (
            <div className="bg-gray-800 p-8 rounded-lg text-center">
              <FiClock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold mb-2">No Automations Yet</h3>
              <p className="text-gray-400 mb-4">Schedule workflows to run automatically at specific times.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                <FiPlus className="inline mr-2" />
                Create Your First Automation
              </button>
            </div>
          )}
          
          {/* Automations list */}
          {automations.length > 0 && !isCreating && !isEditing && renderAutomationsList()}
        </div>
      )}
    </div>
  );
};

export default Automations;
