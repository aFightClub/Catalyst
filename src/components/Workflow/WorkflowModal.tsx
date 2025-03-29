import React, { useState } from 'react';
import { FiPlay, FiTrash2, FiArrowUp, FiArrowDown, FiEdit2 } from 'react-icons/fi';
import { ActionType, Workflow, WorkflowAction } from '../../types';

interface WorkflowModalProps {
  showWorkflowModal: boolean;
  workflowModalMode: 'create' | 'list';
  newWorkflowName: string;
  isRecording: boolean;
  currentRecording: WorkflowAction[];
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  workflowVariables: {[key: string]: string};
  setNewWorkflowName: (name: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  saveWorkflow: () => void;
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  setWorkflowVariables: (variables: {[key: string]: string} | ((prev: {[key: string]: string}) => {[key: string]: string})) => void;
  playWorkflow: (workflow: Workflow, variables: {[key: string]: string}) => void;
  setWorkflows: (updaterFn: Workflow[] | ((prev: Workflow[]) => Workflow[])) => void;
  setWorkflowModalMode: (mode: 'create' | 'list') => void;
  setShowWorkflowModal: (show: boolean) => void;
  setCurrentRecording: (recording: WorkflowAction[] | ((prev: WorkflowAction[]) => WorkflowAction[])) => void;
  handleEditWorkflow: (workflow: Workflow) => void;
}

const WorkflowModal: React.FC<WorkflowModalProps> = ({
  showWorkflowModal,
  workflowModalMode,
  newWorkflowName,
  isRecording,
  currentRecording,
  workflows,
  selectedWorkflow,
  workflowVariables,
  setNewWorkflowName,
  startRecording,
  stopRecording,
  saveWorkflow,
  setSelectedWorkflow,
  setWorkflowVariables,
  playWorkflow,
  setWorkflows,
  setWorkflowModalMode,
  setShowWorkflowModal,
  setCurrentRecording,
  handleEditWorkflow
}) => {
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  
  if (!showWorkflowModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg w-1/2 max-h-[80vh] overflow-auto">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {workflowModalMode === 'create' ? 'Create Workflow' : 'Workflows'}
          </h2>
        </div>
        
        <div className="p-4">
          {workflowModalMode === 'create' ? (
            <>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Workflow Name</label>
                <input
                  type="text"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter workflow name"
                />
              </div>
              
              {isRecording ? (
                <div className="mb-4 text-center">
                  <div className="text-red-400 mb-2 flex items-center justify-center">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                    Recording in progress
                  </div>
                  <p className="text-gray-400 mb-4">
                    Perform actions on the page and they will be recorded.
                    Click "Stop Recording" when done.
                  </p>
                  <button
                    onClick={stopRecording}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Stop Recording
                  </button>
                </div>
              ) : (
                <>
                  {currentRecording.length > 0 ? (
                    <div className="mb-4">
                      <h3 className="text-white font-medium mb-2">Recorded Actions</h3>
                      <div className="bg-gray-900 p-3 rounded mb-4 max-h-60 overflow-auto">
                        {currentRecording.map((action, index) => (
                          <div key={index} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
                            <div className="flex justify-between">
                              <span className="text-blue-400">
                                {action.type.toUpperCase()}
                              </span>
                              <div className="flex items-center">
                                <span className="text-gray-500 text-sm mr-2">
                                  {new Date(action.timestamp).toLocaleTimeString()}
                                </span>
                                <button
                                  onClick={() => setEditingActionIndex(index)}
                                  className="text-blue-400 hover:text-blue-300 p-1 ml-1"
                                  title="Edit action"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    // Remove this action from the recording
                                    setCurrentRecording(prev => 
                                      prev.filter((_, i) => i !== index)
                                    );
                                  }}
                                  className="text-red-400 hover:text-red-300 p-1"
                                  title="Remove action"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                                {index > 0 && (
                                  <button
                                    onClick={() => {
                                      // Move this action up
                                      setCurrentRecording(prev => {
                                        const newRecording = [...prev];
                                        [newRecording[index-1], newRecording[index]] = 
                                        [newRecording[index], newRecording[index-1]];
                                        return newRecording;
                                      });
                                    }}
                                    className="text-blue-400 hover:text-blue-300 p-1 ml-1"
                                    title="Move up"
                                  >
                                    <FiArrowUp className="w-4 h-4" />
                                  </button>
                                )}
                                {index < currentRecording.length - 1 && (
                                  <button
                                    onClick={() => {
                                      // Move this action down
                                      setCurrentRecording(prev => {
                                        const newRecording = [...prev];
                                        [newRecording[index], newRecording[index+1]] = 
                                        [newRecording[index+1], newRecording[index]];
                                        return newRecording;
                                      });
                                    }}
                                    className="text-blue-400 hover:text-blue-300 p-1 ml-1"
                                    title="Move down"
                                  >
                                    <FiArrowDown className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {editingActionIndex === index ? (
                              <div className="bg-gray-700 p-2 mt-2 rounded">
                                <h4 className="text-white text-sm font-medium mb-2">Edit Action</h4>
                                
                                {action.type === ActionType.CLICK && (
                                  <div className="mb-2">
                                    <label className="text-gray-300 text-xs block mb-1">Selector</label>
                                    <input
                                      type="text"
                                      className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1"
                                      value={action.target || ''}
                                      onChange={(e) => {
                                        const updatedAction = {...action, target: e.target.value};
                                        setCurrentRecording(prev => {
                                          const newRecording = [...prev];
                                          newRecording[index] = updatedAction;
                                          return newRecording;
                                        });
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {(action.type === ActionType.INPUT || action.type === ActionType.TYPE) && (
                                  <>
                                    <div className="mb-2">
                                      <label className="text-gray-300 text-xs block mb-1">Selector</label>
                                      <input
                                        type="text"
                                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1"
                                        value={action.target || ''}
                                        onChange={(e) => {
                                          const updatedAction = {...action, target: e.target.value};
                                          setCurrentRecording(prev => {
                                            const newRecording = [...prev];
                                            newRecording[index] = updatedAction;
                                            return newRecording;
                                          });
                                        }}
                                      />
                                    </div>
                                    <div className="mb-2">
                                      <label className="text-gray-300 text-xs block mb-1">Value</label>
                                      <input
                                        type="text"
                                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1"
                                        value={action.value || ''}
                                        onChange={(e) => {
                                          const updatedAction = {...action, value: e.target.value};
                                          if (action.data) {
                                            updatedAction.data = {...action.data, value: e.target.value};
                                          }
                                          setCurrentRecording(prev => {
                                            const newRecording = [...prev];
                                            newRecording[index] = updatedAction;
                                            return newRecording;
                                          });
                                        }}
                                      />
                                    </div>
                                  </>
                                )}
                                
                                {action.type === ActionType.WAIT && (
                                  <div className="mb-2">
                                    <label className="text-gray-300 text-xs block mb-1">Wait time (ms)</label>
                                    <input
                                      type="number"
                                      min="100"
                                      step="100"
                                      className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1"
                                      value={action.value || '1000'}
                                      onChange={(e) => {
                                        const updatedAction = {...action, value: e.target.value};
                                        setCurrentRecording(prev => {
                                          const newRecording = [...prev];
                                          newRecording[index] = updatedAction;
                                          return newRecording;
                                        });
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {action.type === ActionType.JAVASCRIPT && (
                                  <>
                                    <div className="mb-2">
                                      <label className="text-gray-300 text-xs block mb-1">JavaScript Code</label>
                                      <textarea
                                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1 font-mono h-32"
                                        value={action.data?.code || ''}
                                        onChange={(e) => {
                                          const updatedAction = {...action};
                                          if (!updatedAction.data) updatedAction.data = {};
                                          updatedAction.data.code = e.target.value;
                                          setCurrentRecording(prev => {
                                            const newRecording = [...prev];
                                            newRecording[index] = updatedAction;
                                            return newRecording;
                                          });
                                        }}
                                        placeholder={"// Add your JavaScript code here\n// Use {{content}} as a placeholder for dynamic content"}
                                      />
                                    </div>
                                    <div className="mb-2">
                                      <label className="text-gray-300 text-xs block mb-1">Default Content Value (replaces {"{{content}}"})</label>
                                      <input
                                        type="text"
                                        className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1"
                                        value={action.data?.defaultContent || ''}
                                        onChange={(e) => {
                                          const updatedAction = {...action};
                                          if (!updatedAction.data) updatedAction.data = {};
                                          updatedAction.data.defaultContent = e.target.value;
                                          setCurrentRecording(prev => {
                                            const newRecording = [...prev];
                                            newRecording[index] = updatedAction;
                                            return newRecording;
                                          });
                                        }}
                                        placeholder="Default value"
                                      />
                                    </div>
                                    <div className="mb-2">
                                      <label className="text-gray-300 text-xs block mb-1">
                                        Make content variable 
                                        <span className="text-gray-400 ml-1 text-xs">(Allow user to set content when running workflow)</span>
                                      </label>
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          className="mr-2"
                                          checked={!!action.data?.variableName}
                                          onChange={(e) => {
                                            const updatedAction = {...action};
                                            if (!updatedAction.data) updatedAction.data = {};
                                            
                                            if (e.target.checked) {
                                              // Generate a variable name
                                              updatedAction.data.variableName = `js_content_${index}`;
                                            } else {
                                              // Remove variable name
                                              delete updatedAction.data.variableName;
                                            }
                                            
                                            setCurrentRecording(prev => {
                                              const newRecording = [...prev];
                                              newRecording[index] = updatedAction;
                                              return newRecording;
                                            });
                                          }}
                                        />
                                        <span className="text-gray-300 text-sm">
                                          {action.data?.variableName || "Not a variable (fixed content)"}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                )}
                                
                                <div className="flex justify-end mt-3">
                                  <button
                                    onClick={() => setEditingActionIndex(null)}
                                    className="bg-blue-500 text-white text-xs rounded px-3 py-1 hover:bg-blue-600"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {action.type === ActionType.CLICK && (
                                  <div className="text-gray-300 text-sm">
                                    Clicked: {action.data.text || action.data.selector}
                                  </div>
                                )}
                                {action.type === ActionType.TYPE && (
                                  <div className="text-gray-300 text-sm">
                                    Typed: 
                                    <input
                                      type="text"
                                      className="ml-2 bg-gray-700 px-2 py-1 rounded text-white w-4/5"
                                      defaultValue={action.data.value}
                                      placeholder={action.data.placeholder}
                                      onChange={(e) => {
                                        const varName = action.data.variableName;
                                        if (varName) {
                                          setWorkflowVariables((prev) => ({
                                            ...prev,
                                            [varName]: e.target.value
                                          }));
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                                {action.type === ActionType.NAVIGATE && (
                                  <div className="text-gray-300 text-sm">
                                    Navigated to: {action.data.url}
                                  </div>
                                )}
                                {action.type === ActionType.KEYPRESS && (
                                  <div className="text-gray-300 text-sm">
                                    Key pressed: {action.data.key}
                                  </div>
                                )}
                                {action.type === ActionType.SUBMIT && (
                                  <div className="text-gray-300 text-sm">
                                    Form submitted: {action.data.selector}
                                  </div>
                                )}
                                {action.type === ActionType.WAIT && (
                                  <div className="text-gray-300 text-sm">
                                    Wait: {action.value || 1000}ms
                                  </div>
                                )}
                                {action.type === ActionType.JAVASCRIPT && (
                                  <div className="text-gray-300 text-sm">
                                    <div>JavaScript: {action.data?.code?.substring(0, 50)}...</div>
                                    {action.data?.variableName ? (
                                      <div className="mt-1">
                                        Variable: {action.data.variableName}
                                        <input
                                          type="text"
                                          className="ml-2 bg-gray-700 px-2 py-1 rounded text-white w-1/2"
                                          defaultValue={
                                            (workflowVariables && action.data.variableName in workflowVariables) 
                                              ? workflowVariables[action.data.variableName] 
                                              : action.data.defaultContent || ''
                                          }
                                          placeholder="Content value"
                                          onChange={(e) => {
                                            const varName = action.data.variableName;
                                            if (varName) {
                                              setWorkflowVariables((prev) => ({
                                                ...prev,
                                                [varName]: e.target.value
                                              }));
                                            }
                                          }}
                                        />
                                      </div>
                                    ) : action.data?.defaultContent ? (
                                      <div className="mt-1">
                                        Default content: {action.data.defaultContent}
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            setCurrentRecording([]);
                            setNewWorkflowName('');
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Discard Recording
                        </button>
                        <button
                          onClick={() => {
                            // Add a new JavaScript action to the recording
                            const newAction: WorkflowAction = {
                              type: ActionType.JAVASCRIPT,
                              timestamp: new Date().toISOString(),
                              data: {
                                code: '// Add your JavaScript code here\n// Use {{content}} as a placeholder for dynamic content',
                                placeholder: '{{content}}'
                              }
                            };
                            setCurrentRecording(prev => [...prev, newAction]);
                            // Set this new action as the one being edited
                            setEditingActionIndex(currentRecording.length);
                          }}
                          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        >
                          Add JavaScript
                        </button>
                        <button
                          onClick={saveWorkflow}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save Workflow
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 text-center">
                      <p className="text-gray-400 mb-4">
                        Click "Start Recording" to begin capturing actions.
                      </p>
                      <button
                        onClick={() => {
                          startRecording();
                          setShowWorkflowModal(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Start Recording
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {selectedWorkflow ? (
                <div>
                  <div className="flex items-center mb-4">
                    <button
                      onClick={() => setSelectedWorkflow(null)}
                      className="bg-gray-600 text-white px-3 py-1 rounded flex items-center hover:bg-gray-500 mr-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back
                    </button>
                    <h3 className="text-white font-medium">
                      Run Workflow: {selectedWorkflow.name}
                    </h3>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {/* Group inputs by type for better organization */}
                    
                    {/* Regular input variables */}
                    {selectedWorkflow.variables && selectedWorkflow.variables.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-gray-300 text-sm font-medium mb-2">Form Inputs</h4>
                        {selectedWorkflow.variables.map(varName => {
                          const action = selectedWorkflow.actions.find(a => 
                            a.type === ActionType.TYPE && a.data?.variableName === varName
                          );
                          
                          return (
                            <div key={varName} className="mb-3">
                              <label className="block text-gray-300 mb-1">
                                {action?.data?.placeholder || 'Input'} ({varName})
                              </label>
                              <input
                                type="text"
                                className="w-full bg-gray-700 px-3 py-2 rounded text-white"
                                defaultValue={action?.data?.value || ''}
                                onChange={(e) => {
                                  setWorkflowVariables((prev) => ({
                                    ...prev,
                                    [varName]: e.target.value
                                  }));
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* JavaScript content variables */}
                    {selectedWorkflow.actions
                      .filter(a => a.type === ActionType.JAVASCRIPT && a.data?.variableName)
                      .map(action => {
                        const varName = action.data?.variableName;
                        if (!varName) return null;
                        
                        return (
                          <div key={varName} className="mb-3">
                            <label className="block text-gray-300 mb-1">
                              JavaScript Content ({varName})
                            </label>
                            <input
                              type="text"
                              className="w-full bg-gray-700 px-3 py-2 rounded text-white"
                              defaultValue={action.data?.defaultContent || ''}
                              onChange={(e) => {
                                setWorkflowVariables((prev) => ({
                                  ...prev,
                                  [varName]: e.target.value
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          playWorkflow(selectedWorkflow, workflowVariables);
                          setSelectedWorkflow(null);
                          setShowWorkflowModal(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Run Workflow
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {workflows.length > 0 ? (
                    <div>
                      <div className="space-y-3 mb-4">
                        {workflows.map(workflow => (
                          <div 
                            key={workflow.id} 
                            className="bg-gray-700 rounded p-3 hover:bg-gray-600 cursor-pointer"
                            onClick={() => setSelectedWorkflow(workflow)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-white font-medium">
                                {workflow.name}
                              </span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWorkflow(workflow);
                                    
                                    // First check for JavaScript actions with content variables
                                    const jsContentVars = workflow.actions
                                      .filter(a => a.type === ActionType.JAVASCRIPT && a.data?.variableName)
                                      .map(a => a.data?.variableName)
                                      .filter(Boolean) as string[];
                                    
                                    // Combine with regular input variables
                                    const allVariables = [
                                      ...(workflow.variables || []),
                                      ...jsContentVars
                                    ];
                                    
                                    // Show variable input form if there are any variables
                                    if (allVariables.length > 0) {
                                      console.log("Workflow has variables:", allVariables);
                                      const varMap: {[key: string]: string} = {};
                                      
                                      // Add regular input variables
                                      if (workflow.variables) {
                                        workflow.variables.forEach(v => {
                                          const action = workflow.actions.find(a => 
                                            a.type === ActionType.TYPE && a.data?.variableName === v
                                          );
                                          varMap[v] = action?.data?.value || '';
                                        });
                                      }
                                      
                                      // Add JavaScript content variables
                                      jsContentVars.forEach(v => {
                                        const action = workflow.actions.find(a => 
                                          a.type === ActionType.JAVASCRIPT && a.data?.variableName === v
                                        );
                                        varMap[v] = action?.data?.defaultContent || '';
                                      });
                                      
                                      setWorkflowVariables(varMap);
                                    } else {
                                      // Play workflow immediately if no variables
                                      playWorkflow(workflow, {});
                                      setShowWorkflowModal(false);
                                    }
                                  }}
                                  className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                                  title="Run Workflow"
                                >
                                  <FiPlay className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Load workflow for editing
                                    handleEditWorkflow(workflow);
                                  }}
                                  className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  title="Edit Workflow"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWorkflows(workflows.filter(w => w.id !== workflow.id));
                                  }}
                                  className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                  title="Delete Workflow"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="text-gray-400 text-sm">
                              {workflow.actions.length} actions
                              {workflow.variables.length > 0 && ` • ${workflow.variables.length} variables`}
                              {workflow.startUrl && (
                                <div className="mt-1 truncate">
                                  <span className="text-gray-500">URL:</span> {workflow.startUrl}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No workflows saved yet. Create one to get started.
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-between">
          {workflowModalMode === 'create' ? (
            <button
              onClick={() => {
                setWorkflowModalMode('list');
                if (isRecording) {
                  stopRecording();
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Saved Workflows
            </button>
          ) : (
            <button
              onClick={() => {
                setWorkflowModalMode('create');
                setSelectedWorkflow(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create New Workflow
            </button>
          )}
          
          <button
            onClick={() => {
              setShowWorkflowModal(false);
              if (isRecording) {
                stopRecording();
              }
              setSelectedWorkflow(null);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkflowModal; 