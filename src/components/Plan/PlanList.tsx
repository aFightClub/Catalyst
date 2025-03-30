import React from 'react';
import { FiCalendar, FiClock, FiEdit, FiFolder, FiLayout, FiTrash2 } from 'react-icons/fi';
import { ContentPlan } from '../../types';

interface PlanListProps {
  plans: ContentPlan[];
  onSelectPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

const PlanList: React.FC<PlanListProps> = ({ plans, onSelectPlan, onDeletePlan }) => {
  // Format date to a readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Get channel count by status
  const getChannelStats = (plan: ContentPlan) => {
    const total = plan.channels.length;
    const draft = plan.channels.filter(c => c.status === 'draft').length;
    const scheduled = plan.channels.filter(c => c.status === 'scheduled').length;
    const published = plan.channels.filter(c => c.status === 'published').length;
    
    return { total, draft, scheduled, published };
  };
  
  // Get upcoming scheduled items
  const getUpcomingCount = (plan: ContentPlan) => {
    const now = new Date().getTime();
    const oneWeekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    
    return plan.channels.filter(channel => {
      if (!channel.publishDate) return false;
      const publishTime = new Date(channel.publishDate).getTime();
      return channel.status === 'scheduled' && publishTime > now && publishTime <= oneWeekFromNow;
    }).length;
  };
  
  // If there are no plans, show empty state
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg">
          <FiFolder className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">No Content Plans Yet</h3>
          <p className="text-gray-400 mb-4">
            Create your first content plan to organize your publishing schedule across different channels.
          </p>
          <p className="text-gray-400 mb-6">
            Content plans help you manage social media posts, blog articles, email newsletters, and more in one place.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => {
          const stats = getChannelStats(plan);
          const upcomingCount = getUpcomingCount(plan);
          
          return (
            <div
              key={plan.id}
              className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors shadow-lg"
            >
              <div 
                className="p-5 cursor-pointer"
                onClick={() => onSelectPlan(plan.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePlan(plan.id);
                      }}
                      className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-700"
                      title="Delete Plan"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {plan.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{plan.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="flex items-center text-blue-400 mb-1">
                      <FiLayout className="w-4 h-4 mr-2" />
                      <span className="text-xs uppercase font-semibold">Channels</span>
                    </div>
                    <p className="text-lg font-semibold text-white">{stats.total}</p>
                  </div>
                  
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="flex items-center text-yellow-400 mb-1">
                      <FiClock className="w-4 h-4 mr-2" />
                      <span className="text-xs uppercase font-semibold">Upcoming</span>
                    </div>
                    <p className="text-lg font-semibold text-white">{upcomingCount}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="w-3 h-3 mr-1" />
                    <span>Created: {formatDate(plan.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="mr-2">Status:</span>
                    <div className="flex items-center space-x-1">
                      <span className="px-1.5 py-0.5 bg-gray-700 rounded">{stats.draft} Draft</span>
                      <span className="px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded">{stats.scheduled} Scheduled</span>
                      <span className="px-1.5 py-0.5 bg-green-900 text-green-300 rounded">{stats.published} Published</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanList; 