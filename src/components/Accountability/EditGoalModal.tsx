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
  voice?: string;
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
  const [localTitle, setLocalTitle] = useState(goal.title);
  const [localDesiredGoal, setLocalDesiredGoal] = useState(goal.desiredGoal);
  const [localStartState, setLocalStartState] = useState(goal.startState);
  const [localCurrentState, setLocalCurrentState] = useState(goal.currentState);
  const [localEndState, setLocalEndState] = useState(goal.endState);
  const [localFrequency, setLocalFrequency] = useState<Goal['frequency']>(goal.frequency);
  const [localEndDate, setLocalEndDate] = useState(goal.endDate.split('T')[0]);
  const [localProjectId, setLocalProjectId] = useState(goal.projectId || '');
  const [localVoice, setLocalVoice] = useState(goal.voice || '');

  const handleSave = () => {
    // Validate all fields
    if (!localTitle.trim() || !localDesiredGoal.trim() || !localStartState.trim() || 
        !localCurrentState.trim() || !localEndState.trim() || !localEndDate) {
      alert('Please fill out all required fields');
      return;
    }

    const updates: Partial<Goal> = {
      title: localTitle.trim(),
      desiredGoal: localDesiredGoal.trim(),
      startState: localStartState.trim(),
      currentState: localCurrentState.trim(),
      endState: localEndState.trim(),
      frequency: localFrequency,
      projectId: localProjectId || undefined,
      endDate: new Date(localEndDate).toISOString(),
      voice: localVoice.trim() || undefined
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
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Desired Goal</label>
            <textarea
              value={localDesiredGoal}
              onChange={(e) => setLocalDesiredGoal(e.target.value)}
              className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Start State</label>
              <textarea
                value={localStartState}
                onChange={(e) => setLocalStartState(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Current State</label>
              <textarea
                value={localCurrentState}
                onChange={(e) => setLocalCurrentState(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">End State</label>
              <textarea
                value={localEndState}
                onChange={(e) => setLocalEndState(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              ></textarea>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Frequency</label>
              <select
                value={localFrequency}
                onChange={(e) => setLocalFrequency(e.target.value as Goal['frequency'])}
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
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="w-full px-3 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Project</label>
              <select
                value={localProjectId}
                onChange={(e) => setLocalProjectId(e.target.value)}
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

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Voice/Tone (Optional)</label>
            <textarea
              className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2"
              rows={2}
              value={localVoice}
              onChange={(e) => setLocalVoice(e.target.value)}
              placeholder="Describe the tone the AI should use..."
            />
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