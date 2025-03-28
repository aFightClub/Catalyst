import React from 'react';
import { FiPlay, FiTrash2 } from 'react-icons/fi';
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
  setShowWorkflowModal
}) => {
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
                              <span className="text-gray-500 text-sm">
                                {new Date(action.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
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
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
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
                        onClick={startRecording}
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
              {workflows.length > 0 ? (
                <div>
                  <h3 className="text-white font-medium mb-2">Saved Workflows</h3>
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
                                // Show variable input form if there are variables
                                if (workflow.variables.length > 0) {
                                  const varMap: {[key: string]: string} = {};
                                  workflow.variables.forEach(v => {
                                    const action = workflow.actions.find(a => 
                                      a.type === ActionType.TYPE && a.data.variableName === v
                                    );
                                    varMap[v] = action?.data.value || '';
                                  });
                                  setWorkflowVariables(varMap);
                                } else {
                                  // Play workflow immediately if no variables
                                  playWorkflow(workflow, {});
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
              
              {selectedWorkflow && selectedWorkflow.variables.length > 0 && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <h3 className="text-white font-medium mb-3">
                    Run Workflow: {selectedWorkflow.name}
                  </h3>
                  
                  <div className="space-y-3 mb-4">
                    {selectedWorkflow.variables.map(varName => {
                      const action = selectedWorkflow.actions.find(a => 
                        a.type === ActionType.TYPE && a.data.variableName === varName
                      );
                      
                      return (
                        <div key={varName} className="mb-3">
                          <label className="block text-gray-300 mb-1">
                            {action?.data.placeholder || 'Input'} ({varName})
                          </label>
                          <input
                            type="text"
                            className="w-full bg-gray-700 px-3 py-2 rounded text-white"
                            defaultValue={action?.data.value || ''}
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
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Run Workflow
                      </button>
                    </div>
                  </div>
                </div>
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