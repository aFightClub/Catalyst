import React, { useState } from 'react';
import { FiCalendar, FiEdit, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { Channel, ChannelType, ContentPlan } from '../../types';

interface PlanDetailProps {
  plan: ContentPlan;
  onUpdatePlan: (plan: ContentPlan) => void;
  onDeletePlan: (planId: string) => void;
  onAddChannel: (planId: string, channel: Channel) => void;
  onSelectChannel: (planId: string, channelId: string) => void;
  onDeleteChannel: (planId: string, channelId: string) => void;
}

const PlanDetail: React.FC<PlanDetailProps> = ({ 
  plan, 
  onUpdatePlan, 
  onDeletePlan, 
  onAddChannel, 
  onSelectChannel, 
  onDeleteChannel 
}) => {
  // State for editing plan details
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(plan.name);
  const [editDescription, setEditDescription] = useState(plan.description || '');
  
  // State for adding a new channel
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>(ChannelType.FACEBOOK);
  
  // Save edited plan details
  const savePlanEdits = () => {
    if (!editName.trim()) return;
    
    onUpdatePlan({
      ...plan,
      name: editName.trim(),
      description: editDescription.trim() || undefined
    });
    
    setIsEditing(false);
  };
  
  // Cancel editing plan details
  const cancelEditing = () => {
    setEditName(plan.name);
    setEditDescription(plan.description || '');
    setIsEditing(false);
  };
  
  // Add a new channel
  const addChannel = () => {
    if (!newChannelName.trim()) return;
    
    const newChannel: Channel = {
      id: Date.now().toString(),
      name: newChannelName.trim(),
      type: newChannelType,
      status: 'draft'
    };
    
    onAddChannel(plan.id, newChannel);
    resetChannelForm();
  };
  
  // Reset new channel form
  const resetChannelForm = () => {
    setNewChannelName('');
    setNewChannelType(ChannelType.FACEBOOK);
    setShowAddChannelModal(false);
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get display info for channel type
  const getChannelTypeInfo = (type: ChannelType) => {
    const typeMap: Record<ChannelType, { icon: string; color: string }> = {
      [ChannelType.FACEBOOK]: { icon: 'facebook', color: 'text-blue-500' },
      [ChannelType.TWITTER]: { icon: 'twitter', color: 'text-sky-500' },
      [ChannelType.LINKEDIN]: { icon: 'linkedin', color: 'text-blue-700' },
      [ChannelType.INSTAGRAM]: { icon: 'instagram', color: 'text-pink-600' },
      [ChannelType.BLOG]: { icon: 'file-text', color: 'text-green-500' },
      [ChannelType.EMAIL]: { icon: 'mail', color: 'text-yellow-500' },
      [ChannelType.AD]: { icon: 'dollar-sign', color: 'text-purple-500' },
      [ChannelType.OTHER]: { icon: 'globe', color: 'text-gray-500' }
    };
    
    return typeMap[type] || { icon: 'help-circle', color: 'text-gray-500' };
  };
  
  // Get status display
  const getStatusDisplay = (status: 'draft' | 'scheduled' | 'published') => {
    const statusMap = {
      draft: { text: 'Draft', bgColor: 'bg-gray-600', textColor: 'text-white' },
      scheduled: { text: 'Scheduled', bgColor: 'bg-blue-800', textColor: 'text-blue-300' },
      published: { text: 'Published', bgColor: 'bg-green-800', textColor: 'text-green-300' }
    };
    
    return statusMap[status];
  };
  
  // Sort channels by status and date
  const sortedChannels = [...plan.channels].sort((a, b) => {
    // First by status priority (draft -> scheduled -> published)
    const statusPriority = { 'draft': 0, 'scheduled': 1, 'published': 2 };
    const statusDiff = statusPriority[a.status] - statusPriority[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by publish date (if available)
    if (a.publishDate && b.publishDate) {
      return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
    }
    
    // If no publish dates, sort by name
    return a.name.localeCompare(b.name);
  });
  
  return (
    <div className="p-6">
      {/* Plan Details Section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Plan Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelEditing}
                className="px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center"
              >
                <FiX className="mr-1" />
                Cancel
              </button>
              <button
                onClick={savePlanEdits}
                disabled={!editName.trim()}
                className={`px-3 py-1.5 rounded border flex items-center ${
                  editName.trim() 
                    ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' 
                    : 'border-gray-600 bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <FiSave className="mr-1" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                {plan.description && (
                  <p className="text-gray-400">{plan.description}</p>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                  title="Edit Plan"
                >
                  <FiEdit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDeletePlan(plan.id)}
                  className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-gray-700"
                  title="Delete Plan"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-400">
              <FiCalendar className="mr-1.5" />
              <span>{formatDate(plan.createdAt)}</span>
              <span className="mx-2">•</span>
              <span>Last Updated: {formatDate(plan.updatedAt)}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Channels Section */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Content</h3>
        <button
          onClick={() => setShowAddChannelModal(true)}
          className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center"
        >
          <FiPlus className="mr-1" />
          Add Content
        </button>
      </div>
      
      {sortedChannels.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
          <p className="text-gray-400 mb-2">No content added yet.</p>
          <p className="text-gray-500 text-sm">
            Add content for social media, blog posts, newsletters, or ads to organize your content plan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedChannels.map(channel => {
            const typeInfo = getChannelTypeInfo(channel.type);
            const statusInfo = getStatusDisplay(channel.status);
            
            return (
              <div
                key={channel.id}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => onSelectChannel(plan.id, channel.id)}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-white mb-1">{channel.name}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChannel(plan.id, channel.id);
                      }}
                      className="p-1 rounded text-gray-500 hover:text-red-400"
                      title="Delete Content"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center text-xs mb-3">
                    <span className={`${typeInfo.color} mr-2`}>
                      {channel.type}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                  
                  {channel.publishDate && (
                    <div className="text-xs text-gray-400 flex items-center">
                      <FiCalendar className="mr-1" />
                      <span>Publish: {formatDate(channel.publishDate)}</span>
                    </div>
                  )}
                  
                  {channel.document && (
                    <div className="mt-2 py-1 px-2 bg-gray-700 rounded text-xs text-gray-300 truncate">
                      {channel.document.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add Channel Modal */}
      {showAddChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Add New Content</h3>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Content Name</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="E.g., Facebook Post"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Content Type</label>
              <select
                value={newChannelType}
                onChange={(e) => setNewChannelType(e.target.value as ChannelType)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
              >
                <option value={ChannelType.FACEBOOK}>Facebook</option>
                <option value={ChannelType.TWITTER}>Twitter</option>
                <option value={ChannelType.LINKEDIN}>LinkedIn</option>
                <option value={ChannelType.INSTAGRAM}>Instagram</option>
                <option value={ChannelType.BLOG}>Blog</option>
                <option value={ChannelType.EMAIL}>Email</option>
                <option value={ChannelType.AD}>Advertisement</option>
                <option value={ChannelType.OTHER}>Other</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={resetChannelForm}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={addChannel}
                disabled={!newChannelName.trim()}
                className={`px-4 py-2 rounded text-white ${newChannelName.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`}
              >
                Add Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanDetail; 