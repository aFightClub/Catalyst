import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiFolder, FiCheck, FiX, FiEdit, FiMoreVertical, FiList, FiColumns, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';
import { storeService } from '../../services/storeService';
import DeleteConfirmationPopup from '../Common/DeleteConfirmationPopup';

// Task status enum
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
  color: string;
  createdAt: string;
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'default',
    name: 'General',
    color: '#3B82F6', // indigo-500
    createdAt: new Date().toISOString()
  },
  {
    id: 'work',
    name: 'Work',
    color: '#EF4444', // red-500
    createdAt: new Date().toISOString()
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#10B981', // emerald-500
    createdAt: new Date().toISOString()
  }
];

// Storage keys for localStorage - keeping for reference
const STORAGE_KEYS = {
  TASKS: 'tasks_list',
  PROJECTS: 'tasks_projects'
};

const COLORS = [
  '#3B82F6', // indigo-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#6366F1', // indigo-500
  '#F97316', // orange-500
];

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [showProjectActions, setShowProjectActions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [hideDoneTasks, setHideDoneTasks] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false);

  // Load tasks and projects on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log("Loading tasks and projects from store");
        
        // Load tasks
        const storedTasks = await storeService.getTasks();
        if (Array.isArray(storedTasks)) {
          // Handle migration for existing tasks without status
          const migratedTasks = storedTasks.map(task => ({
            ...task,
            status: task.status || (task.completed ? TaskStatus.DONE : TaskStatus.BACKLOG)
          }));
          setTasks(migratedTasks);
        } else {
          console.warn("Tasks data is not an array, using empty array", storedTasks);
          setTasks([]);
        }
        
        // Load projects
        const storedProjects = await storeService.getProjects();
        if (Array.isArray(storedProjects) && storedProjects.length > 0) {
          setProjects(storedProjects);
        } else {
          console.log("No projects found, using defaults");
          setProjects(DEFAULT_PROJECTS);
          await storeService.saveProjects(DEFAULT_PROJECTS);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        // Use defaults on error
        setTasks([]);
        setProjects(DEFAULT_PROJECTS);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save tasks whenever they change
  useEffect(() => {
    const saveTasks = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        console.log("Saving tasks to store:", tasks.length);
        await storeService.saveTasks(tasks);
      } catch (error) {
        console.error("Failed to save tasks:", error);
      }
    };
    
    saveTasks();
  }, [tasks, isLoading]);

  // Save projects whenever they change
  useEffect(() => {
    const saveProjects = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        console.log("Saving projects to store:", projects.length);
        await storeService.saveProjects(projects);
      } catch (error) {
        console.error("Failed to save projects:", error);
      }
    };
    
    saveProjects();
  }, [projects, isLoading]);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      projectId: activeProjectId,
      status: TaskStatus.BACKLOG
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(
      tasks.map(task => {
        if (task.id === taskId) {
          const completed = !task.completed;
          return { 
            ...task, 
            completed,
            // Update status when completing a task
            status: completed ? TaskStatus.DONE : task.status === TaskStatus.DONE ? TaskStatus.BACKLOG : task.status
          };
        }
        return task;
      })
    );
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(
      tasks.map(task => {
        if (task.id === taskId) {
          // Update completed state based on status
          const completed = newStatus === TaskStatus.DONE;
          return { ...task, status: newStatus, completed };
        }
        return task;
      })
    );
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setTaskToDelete(task);
      setIsTaskDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    
    setTasks(tasks.filter(task => task.id !== taskToDelete.id));
    if (editingTaskId === taskToDelete.id) {
      setEditingTaskId(null);
    }
    
    setTaskToDelete(null);
    setIsTaskDeleteConfirmOpen(false);
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
  };

  const saveEditedTask = () => {
    if (!editTaskTitle.trim() || !editingTaskId) return;

    setTasks(
      tasks.map(task =>
        task.id === editingTaskId ? { ...task, title: editTaskTitle.trim() } : task
      )
    );
    setEditingTaskId(null);
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
  };

  const addProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      color: newProjectColor,
      createdAt: new Date().toISOString()
    };

    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
    setIsCreatingProject(false);
    setNewProjectName('');
    setNewProjectColor(COLORS[0]);
  };

  const startEditingProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setShowProjectActions(null);
  };

  const saveEditedProject = () => {
    if (!editProjectName.trim() || !editingProjectId) return;

    setProjects(
      projects.map(project =>
        project.id === editingProjectId ? { ...project, name: editProjectName.trim() } : project
      )
    );
    setEditingProjectId(null);
  };

  const cancelEditingProject = () => {
    setEditingProjectId(null);
  };

  const deleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      alert('You must have at least one project');
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (project) {
      setProjectToDelete(project);
      setIsDeleteConfirmOpen(true);
      setShowProjectActions(null);
    }
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    
    // Delete the project
    const updatedProjects = projects.filter(project => project.id !== projectToDelete.id);
    setProjects(updatedProjects);
    
    // Delete all tasks associated with the project
    setTasks(tasks.filter(task => task.projectId !== projectToDelete.id));
    
    // Switch to another project if the active project was deleted
    if (activeProjectId === projectToDelete.id) {
      setActiveProjectId(updatedProjects[0]?.id || 'default');
    }
    
    setProjectToDelete(null);
    setIsDeleteConfirmOpen(false);
  };

  // Get tasks for the active project
  const filteredTasks = tasks && Array.isArray(tasks) 
    ? tasks.filter(task => task.projectId === activeProjectId)
    : [];

  // Group tasks by status for kanban view
  const groupedTasks = {
    [TaskStatus.BACKLOG]: filteredTasks.filter(task => task.status === TaskStatus.BACKLOG),
    [TaskStatus.DOING]: filteredTasks.filter(task => task.status === TaskStatus.DOING),
    [TaskStatus.DONE]: filteredTasks.filter(task => task.status === TaskStatus.DONE || task.completed)
  };

  // For list view, sort tasks
  const sortedTasks = [...filteredTasks]
    .filter(task => viewMode !== 'list' || !hideDoneTasks || (!task.completed && task.status !== TaskStatus.DONE))
    .sort((a, b) => {
      // Sort by completion status (incomplete tasks first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Then sort by status
      if (a.status !== b.status) {
        const statusOrder = { [TaskStatus.BACKLOG]: 0, [TaskStatus.DOING]: 1, [TaskStatus.DONE]: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Then sort by creation date (newest first for incomplete, oldest first for complete)
      if (a.completed) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Tasks</h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Tasks</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            title="List View"
          >
            <FiList className="mr-1" /> List
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            title="Kanban View"
          >
            <FiColumns className="mr-1" /> Kanban
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Projects Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-white font-medium">Projects</h3>
            <button 
              onClick={() => setIsCreatingProject(true)}
              className="btn-ghost btn-xs"
              title="New Project"
            >
              <FiPlus className="w-4 h-4" />
            </button>
          </div>
          
          {isCreatingProject ? (
            <div className="p-3 border-b border-gray-700">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Project name"
                autoFocus
              />
              
              <div className="flex items-center mb-2">
                <div 
                  className="w-6 h-6 rounded mr-2 cursor-pointer"
                  style={{ backgroundColor: newProjectColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                ></div>
                <span className="text-white text-sm">Project Color</span>
              </div>
              
              {showColorPicker && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {COLORS.map(color => (
                    <div
                      key={color}
                      className={`w-6 h-6 rounded cursor-pointer ${newProjectColor === color ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setNewProjectColor(color);
                        setShowColorPicker(false);
                      }}
                    ></div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsCreatingProject(false)}
                  className="btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addProject}
                  className="btn-primary btn-sm"
                  disabled={!newProjectName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          ) : null}
          
          <div className="flex-1 overflow-y-auto">
            {projects.map(project => (
              <div 
                key={project.id}
                className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${
                  activeProjectId === project.id ? 'bg-gray-700' : ''
                }`}
                onClick={() => setActiveProjectId(project.id)}
              >
                {editingProjectId === project.id ? (
                  <div className="flex">
                    <input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="flex-1 px-3 py-1 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditedProject();
                        if (e.key === 'Escape') cancelEditingProject();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEditedProject();
                      }}
                      className="btn-success btn-xs"
                    >
                      <FiCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEditingProject();
                      }}
                      className="btn-delete btn-xs rounded-r"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <span className="text-white font-medium truncate">
                        {project.name}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProjectActions(showProjectActions === project.id ? null : project.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-600 transition-opacity"
                      >
                        <FiMoreVertical className="w-4 h-4" />
                      </button>
                      
                      {showProjectActions === project.id && (
                        <div className="absolute right-0 top-full mt-1 bg-gray-700 rounded shadow-lg z-10 w-32">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingProject(project);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white text-sm flex items-center"
                          >
                            <FiEdit className="w-4 h-4 mr-2" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProject(project.id);
                              setShowProjectActions(null);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white text-sm flex items-center text-red-400"
                          >
                            <FiTrash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="text-gray-400 text-xs mt-1">
                  {Array.isArray(tasks) ? tasks.filter(task => task.projectId === project.id).length : 0} tasks
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-800 border-b border-gray-700">
            <h3 className="text-white font-medium mb-3">
              {projects.find(p => p.id === activeProjectId)?.name || 'Tasks'}
            </h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTask();
                }}
                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add a new task..."
              />
              <button
                onClick={addTask}
                className="btn-primary rounded-l-none"
                disabled={!newTaskTitle.trim()}
              >
                <FiPlus />
              </button>
            </div>
          </div>
          
          {viewMode === 'list' ? (
            // List View
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-400">
                  {hideDoneTasks ? 'Showing active tasks' : 'Showing all tasks'}
                </div>
                <button
                  onClick={() => setHideDoneTasks(!hideDoneTasks)}
                  className="btn-ghost btn-sm"
                  title={hideDoneTasks ? "Show completed tasks" : "Hide completed tasks"}
                >
                  {hideDoneTasks ? (
                    <>
                      <FiEye className="w-4 h-4 mr-1" /> Show completed
                    </>
                  ) : (
                    <>
                      <FiEyeOff className="w-4 h-4 mr-1" /> Hide completed
                    </>
                  )}
                </button>
              </div>
              
              {sortedTasks.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">
                  <FiFolder className="w-12 h-12 mx-auto mb-4" />
                  <p>No tasks yet</p>
                  <p className="text-sm mt-2">Add a new task to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTasks.map(task => (
                    <div 
                      key={task.id}
                      className={`p-3 rounded ${
                        task.completed ? 'bg-gray-800' : 'bg-gray-800'
                      } group hover:bg-gray-700 transition-colors`}
                    >
                      {editingTaskId === task.id ? (
                        <div className="flex">
                          <input
                            type="text"
                            value={editTaskTitle}
                            onChange={(e) => setEditTaskTitle(e.target.value)}
                            className="flex-1 px-3 py-1 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditedTask();
                              if (e.key === 'Escape') cancelEditingTask();
                            }}
                          />
                          <button
                            onClick={saveEditedTask}
                            className="btn-success btn-xs"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditingTask}
                            className="btn-delete btn-xs rounded-r"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start">
                          <button
                            onClick={() => toggleTaskCompletion(task.id)}
                            className={`mt-0.5 mr-3 w-5 h-5 rounded-full flex-shrink-0 border ${
                              task.completed 
                                ? 'bg-gray-500 border-gray-600' 
                                : 'border-gray-500 hover:border-white'
                            } flex items-center justify-center`}
                          >
                            {task.completed && <FiCheck className="w-3 h-3 text-white" />}
                          </button>
                          
                          <div className="flex-1">
                            <p className={`text-white ${task.completed ? 'line-through text-gray-400' : ''}`}>
                              {task.title}
                            </p>
                            <div className="text-xs text-gray-500 mt-1">
                              <span 
                                className={`px-2 py-0.5 rounded ${
                                  task.status === TaskStatus.BACKLOG ? 'bg-gray-600' :
                                  task.status === TaskStatus.DOING ? 'bg-indigo-900' :
                                  'bg-green-900'
                                }`}
                              >
                                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                              className="mr-2 bg-gray-700 border-none text-sm rounded text-white py-1"
                            >
                              <option value={TaskStatus.BACKLOG}>Backlog</option>
                              <option value={TaskStatus.DOING}>Doing</option>
                              <option value={TaskStatus.DONE}>Done</option>
                            </select>
                            <button
                              onClick={() => startEditingTask(task)}
                              className="btn-secondary btn-xs rounded"
                              title="Edit Task"
                            >
                              <FiEdit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="btn-delete btn-xs rounded"
                              title="Delete Task"
                            >
                              <FiTrash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Kanban View
            <div className="flex-1 overflow-auto p-4">
              <div className="flex h-full space-x-4">
                {/* Backlog Column */}
                <div className="flex-1 flex flex-col bg-gray-800 rounded-lg overflow-hidden min-w-[150px]">
                  <div className="p-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0 bg-gray-500"></div>
                      <h4 className="font-medium text-white">Backlog</h4>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {groupedTasks[TaskStatus.BACKLOG].length === 0 ? (
                      <div className="text-center text-gray-500 p-4 text-sm">
                        No tasks in backlog
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupedTasks[TaskStatus.BACKLOG].map(task => (
                          <div 
                            key={task.id}
                            className="p-3 bg-gray-700 rounded group hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-white">{task.title}</p>
                              </div>
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => updateTaskStatus(task.id, TaskStatus.DOING)}
                                  className="btn-primary btn-xs rounded"
                                  title="Move to Doing"
                                >
                                  <FiArrowRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => startEditingTask(task)}
                                  className="btn-secondary btn-xs rounded"
                                  title="Edit Task"
                                >
                                  <FiEdit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="btn-delete btn-xs rounded"
                                  title="Delete Task"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="flex-1 flex flex-col bg-gray-800 rounded-lg overflow-hidden min-w-[150px]">
                  <div className="p-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0 bg-indigo-600"></div>
                      <h4 className="font-medium text-white">Doing</h4>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {groupedTasks[TaskStatus.DOING].length === 0 ? (
                      <div className="text-center text-gray-500 p-4 text-sm">
                        No tasks in progress
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupedTasks[TaskStatus.DOING].map(task => (
                          <div 
                            key={task.id}
                            className="p-3 bg-gray-700 rounded group hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-white">{task.title}</p>
                              </div>
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => updateTaskStatus(task.id, TaskStatus.BACKLOG)}
                                  className="btn-secondary btn-xs rounded rotate-180"
                                  title="Move to Backlog"
                                >
                                  <FiArrowRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => updateTaskStatus(task.id, TaskStatus.DONE)}
                                  className="btn-success btn-xs rounded"
                                  title="Move to Done"
                                >
                                  <FiArrowRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => startEditingTask(task)}
                                  className="btn-secondary btn-xs rounded"
                                  title="Edit Task"
                                >
                                  <FiEdit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="btn-delete btn-xs rounded"
                                  title="Delete Task"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Done Column */}
                <div className="flex-1 flex flex-col bg-gray-800 rounded-lg overflow-hidden min-w-[150px]">
                  <div className="p-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0 bg-green-600"></div>
                      <h4 className="font-medium text-white">Done</h4>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {groupedTasks[TaskStatus.DONE].length === 0 ? (
                      <div className="text-center text-gray-500 p-4 text-sm">
                        No completed tasks
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupedTasks[TaskStatus.DONE].map(task => (
                          <div 
                            key={task.id}
                            className="p-3 bg-gray-700 rounded group hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-white line-through text-gray-400">{task.title}</p>
                              </div>
                              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => updateTaskStatus(task.id, TaskStatus.DOING)}
                                  className="btn-primary btn-xs rounded rotate-180"
                                  title="Move to Doing"
                                >
                                  <FiArrowRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="btn-delete btn-xs rounded"
                                  title="Delete Task"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Task Edit Modal */}
          {editingTaskId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-lg font-medium text-white mb-4">Edit Task</h3>
                <div className="mb-4">
                  <input
                    type="text"
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Status</label>
                  <select
                    value={tasks.find(t => t.id === editingTaskId)?.status}
                    onChange={(e) => updateTaskStatus(editingTaskId, e.target.value as TaskStatus)}
                    className="w-full bg-gray-700 border-none rounded text-white py-2 px-3"
                  >
                    <option value={TaskStatus.BACKLOG}>Backlog</option>
                    <option value={TaskStatus.DOING}>Doing</option>
                    <option value={TaskStatus.DONE}>Done</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={cancelEditingTask}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedTask}
                    className="btn-primary"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Task Confirmation Popup */}
      <DeleteConfirmationPopup
        isOpen={isTaskDeleteConfirmOpen}
        onClose={() => setIsTaskDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteTask}
        itemName={taskToDelete?.title || ''}
        itemType="task"
      />
      
      {/* Delete Project Confirmation Popup */}
      <DeleteConfirmationPopup
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteProject}
        itemName={projectToDelete?.name || ''}
        itemType="project"
      />
    </div>
  );
};

export default Tasks; 