import React, { useState, useEffect } from 'react';
import { FiCalendar, FiEdit, FiLink, FiPaperclip, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { Channel, ChannelType, ContentPlan, PlanDocument } from '../../types';
import { storeService } from '../../services/storeService';

interface ChannelDetailProps {
  plan: ContentPlan;
  channel: Channel;
  onUpdateChannel: (channel: Channel) => void;
  onDeleteChannel: () => void;
}

const ChannelDetail: React.FC<ChannelDetailProps> = ({
  plan,
  channel,
  onUpdateChannel,
  onDeleteChannel
}) => {
  // Channel editing state
  const [name, setName] = useState(channel.name);
  const [type, setType] = useState(channel.type);
  const [status, setStatus] = useState(channel.status);
  const [publishDate, setPublishDate] = useState(channel.publishDate ? channel.publishDate.split('T')[0] : '');
  const [notes, setNotes] = useState(channel.notes || '');
  const [showDocumentSelect, setShowDocumentSelect] = useState(false);
  
  // Documents state
  const [documents, setDocuments] = useState<PlanDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(channel.document?.id || '');
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoadingDocuments(true);
      try {
        const storedDocuments = await storeService.getDocuments();
        if (Array.isArray(storedDocuments)) {
          setDocuments(storedDocuments);
        } else {
          setDocuments([]);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
        setDocuments([]);
      } finally {
        setIsLoadingDocuments(false);
      }
    };
    
    loadDocuments();
  }, []);
  
  // Save changes
  const saveChanges = () => {
    if (!name.trim()) return;
    
    // Find the selected document
    const document = selectedDocumentId 
      ? documents.find(doc => doc.id === selectedDocumentId) 
      : undefined;
    
    const updatedChannel: Channel = {
      ...channel,
      name: name.trim(),
      type,
      status,
      notes: notes.trim() || undefined,
      document,
      publishDate: publishDate ? new Date(publishDate).toISOString() : undefined
    };
    
    onUpdateChannel(updatedChannel);
  };
  
  // Utility function to convert channel type to display name
  const getChannelTypeName = (channelType: ChannelType): string => {
    const displayNames: Record<ChannelType, string> = {
      [ChannelType.FACEBOOK]: 'Facebook',
      [ChannelType.TWITTER]: 'Twitter',
      [ChannelType.LINKEDIN]: 'LinkedIn',
      [ChannelType.INSTAGRAM]: 'Instagram',
      [ChannelType.BLOG]: 'Blog',
      [ChannelType.EMAIL]: 'Email',
      [ChannelType.AD]: 'Advertisement',
      [ChannelType.OTHER]: 'Other'
    };
    
    return displayNames[channelType] || String(channelType);
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Schedule push notification on Mac (using Electron API if available)
  const scheduleNotification = async () => {
    if (!publishDate) return;
    
    try {
      // Use Electron API if available (in production)
      if ((window as any).electron?.notifications?.schedule) {
        await (window as any).electron.notifications.schedule({
          title: `Content Ready to Publish: ${name}`,
          body: `Your ${getChannelTypeName(type)} content "${name}" is scheduled to publish today.`,
          timestamp: new Date(publishDate).getTime()
        });
        
        alert('Reminder set! You will receive a notification on publish date.');
      } else {
        // Fallback to localStorage for development
        const reminders = JSON.parse(localStorage.getItem('planReminders') || '[]');
        reminders.push({
          id: Date.now().toString(),
          planId: plan.id,
          channelId: channel.id,
          title: `Content Ready to Publish: ${name}`,
          body: `Your ${getChannelTypeName(type)} content "${name}" is scheduled to publish today.`,
          timestamp: new Date(publishDate).getTime()
        });
        
        localStorage.setItem('planReminders', JSON.stringify(reminders));
        alert('Reminder saved! (Native notifications only work in production build)');
      }
    } catch (err) {
      console.error('Failed to schedule notification:', err);
      alert('Failed to schedule notification. See console for details.');
    }
  };
  
  // Set the status based on publish date
  useEffect(() => {
    if (publishDate) {
      const now = new Date();
      const publishDateTime = new Date(publishDate);
      
      // If publish date is in the past, suggest setting to published
      if (publishDateTime < now && status !== 'published') {
        const shouldUpdate = window.confirm('The publish date is in the past. Would you like to mark this as "Published"?');
        if (shouldUpdate) {
          setStatus('published');
        }
      } else if (publishDateTime > now && status === 'draft') {
        // If publish date is in the future, suggest scheduling
        const shouldUpdate = window.confirm('You\'ve set a future publish date. Would you like to mark this as "Scheduled"?');
        if (shouldUpdate) {
          setStatus('scheduled');
        }
      }
    }
  }, [publishDate]);
  
  return (
    <div className="p-6">
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <div className="mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Channel Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ChannelType)}
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
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'scheduled' | 'published')}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Publish Date</label>
            <div className="flex">
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded-l border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
              />
              {publishDate && status === 'scheduled' && (
                <button
                  onClick={scheduleNotification}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-r hover:bg-indigo-700 flex items-center"
                  title="Set Reminder"
                >
                  <FiCalendar className="mr-1" />
                  Remind
                </button>
              )}
            </div>
            {publishDate && (
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(new Date(publishDate).toISOString())}
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
              rows={3}
              placeholder="Add any notes or details here..."
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-1">Linked Document</label>
            {channel.document ? (
              <div className="flex items-center justify-between bg-gray-700 p-3 rounded border border-gray-600">
                <div className="flex items-center">
                  <FiPaperclip className="text-blue-400 mr-2" />
                  <span className="text-white">{channel.document.title}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDocumentSelect(true)}
                    className="p-1 text-gray-400 hover:text-blue-400"
                    title="Change Document"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDocumentId('');
                      saveChanges();
                    }}
                    className="p-1 text-gray-400 hover:text-red-400"
                    title="Remove Document"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDocumentSelect(true)}
                className="w-full px-3 py-2 flex items-center justify-center rounded border border-dashed border-gray-600 text-gray-400 hover:text-blue-400 hover:border-blue-400"
              >
                <FiLink className="mr-1" />
                Link a Document
              </button>
            )}
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={onDeleteChannel}
              className="px-3 py-2 bg-red-900 text-red-200 rounded hover:bg-red-800 flex items-center"
            >
              <FiTrash2 className="mr-1" />
              Delete Channel
            </button>
            
            <button
              onClick={saveChanges}
              disabled={!name.trim()}
              className={`px-4 py-2 rounded text-white flex items-center ${name.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`}
            >
              <FiSave className="mr-1" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
      
      {/* Document Selection Modal */}
      {showDocumentSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FiPaperclip className="mr-2" />
              Select Document
            </h3>
            
            <div className="mb-6 max-h-96 overflow-y-auto">
              {isLoadingDocuments ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-400">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-gray-400 mb-2">No documents found</p>
                  <p className="text-gray-500 text-sm">
                    Create documents in the Write section to link them to your content plan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded cursor-pointer flex items-center justify-between ${
                        selectedDocumentId === doc.id
                          ? 'bg-blue-900 border border-blue-700'
                          : 'bg-gray-700 border border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedDocumentId(doc.id)}
                    >
                      <div className="flex items-center">
                        <FiPaperclip className={`mr-2 ${selectedDocumentId === doc.id ? 'text-blue-400' : 'text-gray-400'}`} />
                        <span className="text-white">{doc.title}</span>
                      </div>
                      {selectedDocumentId === doc.id && (
                        <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDocumentSelect(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveChanges();
                  setShowDocumentSelect(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Link Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelDetail;