import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit, FiCalendar, FiFilter, FiFolder, FiLayout, FiLink, FiClock } from 'react-icons/fi';
import { storeService } from '../../services/storeService';
import { ContentPlan, Channel, ChannelType, PlanDocument } from '../../types';
import PlanList from './PlanList';
import PlanDetail from './PlanDetail';
import ChannelDetail from './ChannelDetail';

const Plan: React.FC = () => {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'plan' | 'channel'>('list');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');

  // Load plans from storage
  useEffect(() => {
    const loadPlans = async () => {
      setIsLoading(true);
      try {
        const storedPlans = await storeService.getContentPlans();
        if (Array.isArray(storedPlans)) {
          setPlans(storedPlans);
        } else {
          // Initialize with empty array if no plans found
          setPlans([]);
        }
      } catch (err) {
        console.error('Failed to load content plans:', err);
        setError('Failed to load content plans. Please try again.');
        setPlans([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPlans();
  }, []);

  // Save plans whenever they change
  useEffect(() => {
    const savePlans = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        await storeService.saveContentPlans(plans);
      } catch (err) {
        console.error('Failed to save content plans:', err);
        setError('Failed to save changes. Please try again.');
      }
    };
    
    if (plans.length > 0) {
      savePlans();
    }
  }, [plans, isLoading]);

  // Create a new plan
  const createPlan = () => {
    if (!newPlanName.trim()) return;
    
    const newPlan: ContentPlan = {
      id: Date.now().toString(),
      name: newPlanName.trim(),
      description: newPlanDescription.trim() || undefined,
      channels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setPlans([...plans, newPlan]);
    setNewPlanName('');
    setNewPlanDescription('');
    setShowAddPlanModal(false);
    
    // Select the new plan
    setSelectedPlanId(newPlan.id);
    setActiveView('plan');
  };

  // Update a plan
  const updatePlan = (updatedPlan: ContentPlan) => {
    setPlans(plans.map(plan => 
      plan.id === updatedPlan.id 
        ? { ...updatedPlan, updatedAt: new Date().toISOString() } 
        : plan
    ));
  };

  // Delete a plan
  const deletePlan = (planId: string) => {
    if (confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      setPlans(plans.filter(plan => plan.id !== planId));
      
      // If the deleted plan was selected, go back to list view
      if (selectedPlanId === planId) {
        setSelectedPlanId(null);
        setActiveView('list');
      }
    }
  };

  // Add a channel to a plan
  const addChannel = (planId: string, channel: Channel) => {
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        return {
          ...plan,
          channels: [...plan.channels, channel],
          updatedAt: new Date().toISOString()
        };
      }
      return plan;
    }));
  };

  // Update a channel
  const updateChannel = (planId: string, updatedChannel: Channel) => {
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        return {
          ...plan,
          channels: plan.channels.map(channel => 
            channel.id === updatedChannel.id ? updatedChannel : channel
          ),
          updatedAt: new Date().toISOString()
        };
      }
      return plan;
    }));
  };

  // Delete a channel
  const deleteChannel = (planId: string, channelId: string) => {
    if (confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      setPlans(plans.map(plan => {
        if (plan.id === planId) {
          return {
            ...plan,
            channels: plan.channels.filter(channel => channel.id !== channelId),
            updatedAt: new Date().toISOString()
          };
        }
        return plan;
      }));
      
      // If the deleted channel was selected, go back to plan view
      if (selectedChannelId === channelId) {
        setSelectedChannelId(null);
        setActiveView('plan');
      }
    }
  };

  // View handlers
  const viewPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setActiveView('plan');
  };

  const viewChannel = (planId: string, channelId: string) => {
    setSelectedPlanId(planId);
    setSelectedChannelId(channelId);
    setActiveView('channel');
  };

  const backToPlans = () => {
    setActiveView('list');
    setSelectedPlanId(null);
    setSelectedChannelId(null);
  };

  const backToPlan = () => {
    setActiveView('plan');
    setSelectedChannelId(null);
  };

  // Get active plan and channel
  const activePlan = selectedPlanId 
    ? plans.find(plan => plan.id === selectedPlanId) || null
    : null;
    
  const activeChannel = activePlan && selectedChannelId
    ? activePlan.channels.find(channel => channel.id === selectedChannelId) || null
    : null;

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">Loading content plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-900 p-6">
        <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 mb-4 max-w-md">
          <h3 className="text-red-500 font-semibold mb-2">Error</h3>
          <p className="text-white">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          {activeView === 'list' ? (
            <h2 className="text-xl font-bold text-white flex items-center">
              <FiCalendar className="mr-2" />
              Content Plans
            </h2>
          ) : activeView === 'plan' && activePlan ? (
            <div className="flex items-center">
              <button 
                onClick={backToPlans}
                className="mr-2 p-1 rounded hover:bg-gray-700 text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-bold text-white flex items-center">
                <FiFolder className="mr-2" />
                {activePlan.name}
              </h2>
            </div>
          ) : activeView === 'channel' && activePlan && activeChannel ? (
            <div className="flex items-center">
              <button 
                onClick={backToPlan}
                className="mr-2 p-1 rounded hover:bg-gray-700 text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-bold text-white flex items-center">
                <FiLayout className="mr-2" />
                {activeChannel.name}
              </h2>
            </div>
          ) : null}
        </div>
        
        {activeView === 'list' && (
          <button
            onClick={() => setShowAddPlanModal(true)}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center"
          >
            <FiPlus className="w-5 h-5 mr-1" />
            <span>New Plan</span>
          </button>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeView === 'list' && (
          <PlanList 
            plans={plans} 
            onSelectPlan={viewPlan} 
            onDeletePlan={deletePlan} 
          />
        )}
        
        {activeView === 'plan' && activePlan && (
          <PlanDetail 
            plan={activePlan} 
            onUpdatePlan={updatePlan}
            onDeletePlan={deletePlan}
            onAddChannel={addChannel}
            onSelectChannel={viewChannel}
            onDeleteChannel={deleteChannel}
          />
        )}
        
        {activeView === 'channel' && activePlan && activeChannel && (
          <ChannelDetail
            plan={activePlan}
            channel={activeChannel}
            onUpdateChannel={(channel) => updateChannel(activePlan.id, channel)}
            onDeleteChannel={() => deleteChannel(activePlan.id, activeChannel.id)}
          />
        )}
      </div>
      
      {/* Add Plan Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Create New Content Plan</h3>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Plan Name</label>
              <input
                type="text"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="E.g., Q2 Marketing Campaign"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Description (Optional)</label>
              <textarea
                value={newPlanDescription}
                onChange={(e) => setNewPlanDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="Brief description of this content plan"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddPlanModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={createPlan}
                disabled={!newPlanName.trim()}
                className={`px-4 py-2 rounded text-white ${newPlanName.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`}
              >
                Create Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plan; 