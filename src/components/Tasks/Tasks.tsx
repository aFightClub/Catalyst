import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiFolder, FiCheck, FiX, FiEdit, FiMoreVertical } from 'react-icons/fi';
import { storeService } from '../../services/storeService';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  projectId: string;
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
    color: '#3B82F6', // blue-500
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
  '#3B82F6', // blue-500
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

  // Load tasks and projects on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log("Loading tasks and projects from store");
        
        // Load tasks
        const storedTasks = await storeService.getTasks();
        if (Array.isArray(storedTasks)) {
          setTasks(storedTasks);
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
      projectId: activeProjectId
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(
      tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    if (editingTaskId === taskId) {
      setEditingTaskId(null);
    }
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

  const deleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      alert('You must have at least one project');
      return;
    }

    if (confirm('Are you sure you want to delete this project and all its tasks?')) {
      // Delete the project
      const updatedProjects = projects.filter(project => project.id !== projectId);
      setProjects(updatedProjects);
      
      // Delete all tasks associated with the project
      setTasks(tasks.filter(task => task.projectId !== projectId));
      
      // Switch to another project if the active project was deleted
      if (activeProjectId === projectId) {
        setActiveProjectId(updatedProjects[0]?.id || 'default');
      }
    }
  };

  // Get tasks for the active project, sorted by completion status and creation date
  const filteredTasks = tasks && Array.isArray(tasks) 
    ? tasks
        .filter(task => task.projectId === activeProjectId)
        .sort((a, b) => {
          // Sort by completion status (incomplete tasks first)
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          // Then sort by creation date (newest first for incomplete, oldest first for complete)
          if (a.completed) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          } else {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        })
    : [];

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
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Projects Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-white font-medium">Projects</h3>
            <button 
              onClick={() => setIsCreatingProject(true)}
              className="p-1 rounded hover:bg-gray-700"
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
                className="w-full px-3 py-2 bg-gray-700 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={addProject}
                  className="px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-700"
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
                            deleteProject(project.id);
                            setShowProjectActions(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white text-sm flex items-center"
                        >
                          <FiTrash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
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
            
            <div className="flex">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTask();
                }}
                className="flex-1 px-4 py-2 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a new task..."
              />
              <button
                onClick={addTask}
                className={`px-4 py-2 rounded-r flex items-center justify-center ${
                  !newTaskTitle.trim()
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={!newTaskTitle.trim()}
              >
                <FiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <FiFolder className="w-12 h-12 mx-auto mb-4" />
                <p>No tasks yet</p>
                <p className="text-sm mt-2">Add a new task to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map(task => (
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
                          className="flex-1 px-3 py-1 bg-gray-700 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedTask();
                            if (e.key === 'Escape') cancelEditingTask();
                          }}
                        />
                        <button
                          onClick={saveEditedTask}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700"
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditingTask}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded-r"
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
                              ? 'bg-green-500 border-green-600' 
                              : 'border-gray-500 hover:border-white'
                          } flex items-center justify-center`}
                        >
                          {task.completed && <FiCheck className="w-3 h-3 text-white" />}
                        </button>
                        
                        <div className="flex-1">
                          <p className={`text-white ${task.completed ? 'line-through text-gray-400' : ''}`}>
                            {task.title}
                          </p>
                        </div>
                        
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditingTask(task)}
                            className="p-1 rounded hover:bg-gray-600"
                            title="Edit Task"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded hover:bg-red-600"
                            title="Delete Task"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tasks; 