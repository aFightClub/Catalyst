import React, { useState, useEffect } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
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
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
}

interface EditGoalModalProps {
  goal: Goal;
  onClose: () => void;
  onSave: (goalId: string, updates: Partial<Goal>) => void;
  projects: Project[];
}

const EditGoalModal: React.FC<EditGoalModalProps> = ({ goal, onClose, onSave, projects }) => {
  const [title, setTitle] = useState(goal.title);
  const [desiredGoal, setDesiredGoal] = useState(goal.desiredGoal);
  const [startState, setStartState] = useState(goal.startState);
  const [currentState, setCurrentState] = useState(goal.currentState);
  const [endState, setEndState] = useState(goal.endState);
  const [frequency, setFrequency] = useState(goal.frequency);
  const [endDate, setEndDate] = useState(goal.endDate.split('T')[0]);
  const [projectId, setProjectId] = useState(goal.projectId || '');

  const handleSave = () => {
    // Validate all fields
    if (!title.trim() || !desiredGoal.trim() || !startState.trim() || 
        !currentState.trim() || !endState.trim() || !endDate) {
      alert('Please fill out all required fields');
      return;
    }

    const updates: Partial<Goal> = {
      title: title.trim(),
      desiredGoal: desiredGoal.trim(),
      startState: startState.trim(),
      currentState: currentState.trim(),
      endState: endState.trim(),
      frequency,
      projectId: projectId || undefined,
      endDate: new Date(endDate).toISOString(),
    };

    onSave(goal.id, updates);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Goal</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Desired Goal</label>
            <textarea
              value={desiredGoal}
              onChange={(e) => setDesiredGoal(e.target.value)}
              className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Start State</label>
              <textarea
                value={startState}
                onChange={(e) => setStartState(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Current State</label>
              <textarea
                value={currentState}
                onChange={(e) => setCurrentState(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">End State</label>
              <textarea
                value={endState}
                onChange={(e) => setEndState(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Goal['frequency'])}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="minute">Every Minute (testing)</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Target End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
          >
            <FiSave className="mr-2" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditGoalModal; 