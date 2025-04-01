import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit, FiDollarSign, FiSave, FiX, FiCalendar, FiLink } from 'react-icons/fi';
import { storeService } from '../../services/storeService';
import DeleteConfirmationPopup from '../Common/DeleteConfirmationPopup';

interface Subscription {
  id: string;
  name: string;
  url: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  category: string;
  notes?: string;
  linkedWebsites?: string[]; // Array of website IDs
}

interface Website {
  id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  createdAt: string;
}

const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newSubscription, setNewSubscription] = useState<Subscription>({
    id: '',
    name: '',
    url: '',
    price: 0,
    billingCycle: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    category: 'Other',
    linkedWebsites: []
  });
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null);

  // Load subscriptions from store
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load subscriptions
        const storedSubscriptions = await storeService.getSubscriptions();
        if (Array.isArray(storedSubscriptions)) {
          setSubscriptions(storedSubscriptions);
        } else {
          console.warn("Subscriptions data is not an array, using empty array", storedSubscriptions);
          setSubscriptions([]);
        }
        
        // Load websites
        const storedWebsites = await storeService.getWebsites();
        if (Array.isArray(storedWebsites)) {
          setWebsites(storedWebsites);
        } else {
          console.warn("Websites data is not an array, using empty array", storedWebsites);
          setWebsites([]);
        }
        
        // Load categories
        const storedCategories = await storeService.getSubscriptionCategories();
        if (Array.isArray(storedCategories) && storedCategories.length > 0) {
          setCategories(storedCategories);
        } else {
          console.warn("Subscription categories not found, using default");
          setCategories([
            "Entertainment",
            "Productivity",
            "Utilities",
            "Social Media",
            "Shopping",
            "News",
            "Music",
            "Gaming",
            "Other"
          ]);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setSubscriptions([]);
        setWebsites([]);
        setCategories([
          "Entertainment",
          "Productivity",
          "Utilities",
          "Social Media",
          "Shopping",
          "News",
          "Music",
          "Gaming",
          "Other"
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save subscriptions when they change
  useEffect(() => {
    const saveSubscriptions = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        await storeService.saveSubscriptions(subscriptions);
      } catch (error) {
        console.error("Failed to save subscriptions:", error);
      }
    };
    
    saveSubscriptions();
  }, [subscriptions, isLoading]);

  // Calculate monthly and yearly costs
  const calculateCosts = () => {
    let monthlyCost = 0;
    let yearlyCost = 0;
    
    subscriptions.forEach(sub => {
      const price = parseFloat(sub.price.toString());
      if (sub.billingCycle === 'monthly') {
        monthlyCost += price;
        yearlyCost += price * 12;
      } else {
        monthlyCost += price / 12;
        yearlyCost += price;
      }
    });
    
    return {
      monthlyCost: formatCurrency(monthlyCost),
      yearlyCost: formatCurrency(yearlyCost)
    };
  };

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (editingSubscription) {
      setEditingSubscription(prev => ({ 
        ...prev!, 
        [name]: name === 'price' ? parseFloat(value) : value
      }));
    } else {
      setNewSubscription(prev => ({ 
        ...prev, 
        [name]: name === 'price' ? parseFloat(value) : value 
      }));
    }
  };

  // Handle website selection for linking
  const handleWebsiteSelection = (websiteId: string, isChecked: boolean) => {
    if (editingSubscription) {
      setEditingSubscription(prev => {
        if (!prev) return prev;
        const linkedWebsites = prev.linkedWebsites || [];
        if (isChecked && !linkedWebsites.includes(websiteId)) {
          return { ...prev, linkedWebsites: [...linkedWebsites, websiteId] };
        } else if (!isChecked && linkedWebsites.includes(websiteId)) {
          return { ...prev, linkedWebsites: linkedWebsites.filter(id => id !== websiteId) };
        }
        return prev;
      });
    } else {
      const linkedWebsites = newSubscription.linkedWebsites || [];
      if (isChecked && !linkedWebsites.includes(websiteId)) {
        setNewSubscription(prev => ({ 
          ...prev, 
          linkedWebsites: [...linkedWebsites, websiteId] 
        }));
      } else if (!isChecked && linkedWebsites.includes(websiteId)) {
        setNewSubscription(prev => ({ 
          ...prev, 
          linkedWebsites: linkedWebsites.filter(id => id !== websiteId) 
        }));
      }
    }
  };

  const openAddPopup = () => {
    setIsAddPopupOpen(true);
  };

  const closeAddPopup = () => {
    setIsAddPopupOpen(false);
    setNewSubscription({
      id: '',
      name: '',
      url: '',
      price: 0,
      billingCycle: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      category: 'Other',
      linkedWebsites: []
    });
  };

  const addSubscription = () => {
    if (!newSubscription.name.trim() || !newSubscription.price) return;
    
    const subscription: Subscription = {
      ...newSubscription,
      id: Date.now().toString()
    };
    
    setSubscriptions([...subscriptions, subscription]);
    setNewSubscription({
      id: '',
      name: '',
      url: '',
      price: 0,
      billingCycle: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      category: 'Other',
      linkedWebsites: []
    });
    setIsAddPopupOpen(false);
  };

  const startEditing = (id: string) => {
    const subscriptionToEdit = subscriptions.find(sub => sub.id === id);
    if (subscriptionToEdit) {
      setEditingSubscription({...subscriptionToEdit});
      setEditingSubscriptionId(id);
      setIsEditPopupOpen(true);
    }
  };

  const cancelEditing = () => {
    setEditingSubscriptionId(null);
    setEditingSubscription(null);
    setIsEditPopupOpen(false);
  };

  const saveEditing = () => {
    if (editingSubscription && editingSubscriptionId) {
      setSubscriptions(subs => 
        subs.map(sub => 
          sub.id === editingSubscriptionId 
            ? editingSubscription
            : sub
        )
      );
      setEditingSubscriptionId(null);
      setEditingSubscription(null);
      setIsEditPopupOpen(false);
    }
  };

  const deleteSubscription = (id: string) => {
    const subscription = subscriptions.find(sub => sub.id === id);
    if (subscription) {
      setSubscriptionToDelete(subscription);
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmDelete = () => {
    if (subscriptionToDelete) {
      setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionToDelete.id));
      if (editingSubscriptionId === subscriptionToDelete.id) {
        setEditingSubscriptionId(null);
        setIsEditPopupOpen(false);
      }
      setIsDeleteConfirmOpen(false);
      setSubscriptionToDelete(null);
    }
  };

  const getCategories = () => {
    // Use the categories from state
    return categories;
  };

  // Filter subscriptions by category
  const filteredSubscriptions = selectedCategory 
    ? subscriptions.filter(sub => sub.category === selectedCategory) 
    : subscriptions;

  // Calculate total costs based on filtered subscriptions
  const { monthlyCost, yearlyCost } = calculateCosts();

  // Group subscriptions by category
  const subscriptionsByCategory = filteredSubscriptions.reduce((groups, sub) => {
    const category = sub.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(sub);
    return groups;
  }, {} as Record<string, Subscription[]>);

  // Get website details by ID
  const getWebsiteById = (websiteId: string) => {
    return websites.find(site => site.id === websiteId);
  };

  const renderWebsiteSection = (sub: Subscription) => {
    const linkedSites = sub.linkedWebsites || [];
    if (linkedSites.length === 0) return null;
    
    return (
      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="text-sm font-medium mb-2 flex items-center">
          <FiLink className="mr-1" /> Linked Websites
        </h4>
        <div className="space-y-1">
          {linkedSites.map(siteId => {
            const website = getWebsiteById(siteId);
            if (!website) return null;
            
            return (
              <div key={siteId} className="flex items-center">
                <span className="text-sm text-blue-400 truncate">{website.name}</span>
                <a 
                  href={website.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-xs text-gray-400 hover:text-gray-300"
                >
                  (visit)
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-400">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-2">
            <FiDollarSign className="mr-2 text-green-500" />
            <h2 className="text-xl font-semibold">Monthly Cost</h2>
          </div>
          <p className="text-3xl font-bold">{monthlyCost}</p>
          <p className="text-sm text-gray-400 mt-2">across {subscriptions.length} subscriptions</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-2">
            <FiCalendar className="mr-2 text-blue-500" />
            <h2 className="text-xl font-semibold">Yearly Cost</h2>
          </div>
          <p className="text-3xl font-bold">{yearlyCost}</p>
          <p className="text-sm text-gray-400 mt-2">annual total</p>
        </div>
      </div>
      
      {/* Category filter and Add button in one row */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="w-full sm:w-auto">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value === '' ? null : e.target.value)}
            className="w-full min-w-[200px] px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">All Categories</option>
            {getCategories().map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={openAddPopup}
          className="btn-primary"
        >
          <FiPlus className="mr-2" />
          Add Subscription
        </button>
      </div>
      
      {/* Add Subscription Popup */}
      {isAddPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-semibold mb-4">Add New Subscription</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Service Name</label>
                <input
                  type="text"
                  name="name"
                  value={newSubscription.name}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Netflix, Spotify, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
                <input
                  type="text"
                  name="url"
                  value={newSubscription.url}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Price</label>
                <input
                  type="number"
                  name="price"
                  value={newSubscription.price}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Billing Cycle</label>
                <select
                  name="billingCycle"
                  value={newSubscription.billingCycle}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={newSubscription.startDate}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                <select
                  name="category"
                  value={newSubscription.category}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              {websites.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Linked Websites</label>
                  <div className="bg-gray-700 p-3 rounded-md max-h-40 overflow-y-auto">
                    {websites.length === 0 ? (
                      <p className="text-sm text-gray-400">No websites available. Add websites in the Websites tab.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {websites.map(website => (
                          <div key={website.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`new-website-${website.id}`}
                              checked={newSubscription.linkedWebsites?.includes(website.id) || false}
                              onChange={(e) => handleWebsiteSelection(website.id, e.target.checked)}
                              className="mr-2"
                            />
                            <label htmlFor={`new-website-${website.id}`} className="text-sm">
                              {website.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select websites powered by this subscription</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={newSubscription.notes || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={closeAddPopup}
                  className="btn-ghost"
                >
                  <FiX className="mr-2" /> Cancel
                </button>
                <button
                  onClick={addSubscription}
                  disabled={!newSubscription.name.trim() || !newSubscription.price}
                  className={`btn-success ${
                    !newSubscription.name.trim() || !newSubscription.price
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <FiSave className="mr-2" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Subscription Popup */}
      {isEditPopupOpen && editingSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-semibold mb-4">Edit Subscription</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Service Name</label>
                <input
                  type="text"
                  name="name"
                  value={editingSubscription.name}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
                <input
                  type="text"
                  name="url"
                  value={editingSubscription.url}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Price</label>
                <input
                  type="number"
                  name="price"
                  value={editingSubscription.price}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Billing Cycle</label>
                <select
                  name="billingCycle"
                  value={editingSubscription.billingCycle}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={editingSubscription.startDate}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                <select
                  name="category"
                  value={editingSubscription.category}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              {websites.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Linked Websites</label>
                  <div className="bg-gray-700 p-3 rounded-md max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {websites.map(website => (
                        <div key={website.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`edit-website-${editingSubscriptionId}-${website.id}`}
                            checked={editingSubscription.linkedWebsites?.includes(website.id) || false}
                            onChange={(e) => handleWebsiteSelection(website.id, e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor={`edit-website-${editingSubscriptionId}-${website.id}`} className="text-sm">
                            {website.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={editingSubscription.notes || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={cancelEditing}
                  className="btn-ghost"
                >
                  <FiX className="mr-2" /> Cancel
                </button>
                <button
                  onClick={saveEditing}
                  className="btn-success"
                >
                  <FiSave className="mr-2" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Popup */}
      <DeleteConfirmationPopup
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        itemName={subscriptionToDelete?.name || ''}
        itemType="subscription"
      />
      
      {/* Subscriptions list */}
      {filteredSubscriptions.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <FiDollarSign className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">No subscriptions found</h3>
          <p className="text-gray-400 mb-4">
            {selectedCategory 
              ? `No subscriptions found in category "${selectedCategory}".`
              : 'Add your first subscription to get started tracking your expenses.'}
          </p>
          {!isAddPopupOpen && (
            <div className="flex justify-center">
              <button
                onClick={openAddPopup}
                className="btn-primary"
              >
                <FiPlus className="inline mr-2" />
                Add Subscription
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {Object.entries(subscriptionsByCategory).map(([category, subs]) => (
            <div key={category} className="mb-8">
              <h2 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subs.map(sub => (
                  <div key={sub.id} className="bg-gray-800 rounded-lg p-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{sub.name}</h3>
                          {sub.url && (
                            <a 
                              href={sub.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-400 hover:underline text-sm"
                            >
                              {sub.url}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-lg">
                            ${sub.price}
                            <span className="text-sm text-gray-400 ml-1">
                              /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-400">
                        Started: {new Date(sub.startDate).toLocaleDateString()}
                      </div>
                      
                      {sub.notes && (
                        <div className="mt-3 text-sm bg-gray-700 p-2 rounded">
                          {sub.notes}
                        </div>
                      )}
                      
                      {/* Linked websites section */}
                      {renderWebsiteSection(sub)}
                      
                      <div className="mt-4 flex justify-end space-x-2">
                        <button
                          onClick={() => startEditing(sub.id)}
                          className="btn-secondary btn-sm"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => deleteSubscription(sub.id)}
                          className="btn-delete btn-sm"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions; 