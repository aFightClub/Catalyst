import React, { useState } from 'react';
import { 
  FiLayers, FiSettings, FiPlus, FiEdit2, FiCheck, FiX, FiTrash2, FiHome, 
  FiMessageSquare, FiEdit3, FiCheckSquare, FiCalendar, FiImage, FiDollarSign,
  FiGlobe, FiZap, FiClock, FiTarget
} from 'react-icons/fi';
import { useAccountability } from '../contexts/AccountabilityContext';

// Helper function to check if a goal needs check-in
const isGoalDueForCheckin = (goal: any) => {
  if (goal.isCompleted) return false;
  
  const now = new Date();
  const lastChecked = goal.lastChecked ? new Date(goal.lastChecked) : new Date(0);
  
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

interface SidebarProps {
  // ... existing props
}

const Sidebar: React.FC<SidebarProps> = ({ 
  // ... existing props destructuring
}) => {
  // Access the accountability context to check goals
  const { goals } = useAccountability();
  
  // Calculate how many goals need check-ins
  const goalsNeedingCheckin = goals.filter(goal => !goal.isCompleted && isGoalDueForCheckin(goal)).length;

  // ... rest of component
  
  // In the sidebar items section, modify the Accountability button
  <button
    onClick={() => handleSidebarItemClick('accountability')}
    className={`w-full text-left px-4 py-2 rounded-md flex items-center ${
      showAccountability ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
    }`}
  >
    <FiTarget className="mr-2" /> 
    <span>Accountability</span>
    {goalsNeedingCheckin > 0 && (
      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
        {goalsNeedingCheckin}
      </span>
    )}
  </button>
} 