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
  isBusinessExpense?: boolean; // New field for business expense flag
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
    linkedWebsites: [],
    isBusinessExpense: false
  });
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<Subscription | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);

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

  // Load budget from store
  useEffect(() => {
    const loadBudget = async () => {
      try {
        const storedBudget = await storeService.getBudget();
        if (storedBudget && !isNaN(parseFloat(storedBudget))) {
          setMonthlyBudget(parseFloat(storedBudget));
        }
      } catch (error) {
        console.error("Failed to load budget:", error);
      }
    };
    
    loadBudget();
  }, []);

  // Save budget when it changes
  useEffect(() => {
    const saveBudget = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        await storeService.saveBudget(monthlyBudget.toString());
      } catch (error) {
        console.error("Failed to save budget:", error);
      }
    };
    
    saveBudget();
  }, [monthlyBudget, isLoading]);

  // Calculate monthly and yearly costs
  const calculateCosts = () => {
    let monthlyCost = 0;
    let yearlyCost = 0;
    let businessMonthlyCost = 0;
    
    subscriptions.forEach(sub => {
      const price = parseFloat(sub.price.toString());
      if (sub.billingCycle === 'monthly') {
        monthlyCost += price;
        yearlyCost += price * 12;
        if (sub.isBusinessExpense) {
          businessMonthlyCost += price;
        }
      } else {
        monthlyCost += price / 12;
        yearlyCost += price;
        if (sub.isBusinessExpense) {
          businessMonthlyCost += price / 12;
        }
      }
    });
    
    return {
      monthlyCost: formatCurrency(monthlyCost),
      yearlyCost: formatCurrency(yearlyCost),
      businessMonthlyCost: formatCurrency(businessMonthlyCost),
      isOverBudget: monthlyBudget > 0 && monthlyCost > monthlyBudget,
      budgetDifference: formatCurrency(monthlyCost - monthlyBudget),
      rawMonthlyCost: monthlyCost
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
      linkedWebsites: [],
      isBusinessExpense: false
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
      linkedWebsites: [],
      isBusinessExpense: false
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
  const costs = calculateCosts();

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
          <FiLink className="mr-1" /> Websites
        </h4>
        <div className="space-y-1">
          {linkedSites.map(siteId => {
            const website = getWebsiteById(siteId);
            if (!website) return null;
            
            return (
              <div key={siteId} className="flex items-center">
                <span className="text-sm text-indigo-400 truncate">{website.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // New function to handle saving budget
  const saveBudget = () => {
    setIsBudgetSettingsOpen(false);
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
          <p className={`text-3xl font-bold ${costs.isOverBudget ? 'text-red-500' : ''}`}>
            {costs.monthlyCost}
            {costs.isOverBudget && (
              <span className="text-red-500 text-sm ml-2">
                ({costs.budgetDifference} over budget)
              </span>
            )}
          </p>
          <div className="flex flex-col">
            <p className="text-sm text-gray-400 mt-2">across {subscriptions.length} subscriptions</p>
            {costs.businessMonthlyCost !== "$0.00" && (
              <p className="text-sm text-blue-400 mt-1">
                Business expenses: {costs.businessMonthlyCost}/mo
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-2">
            <FiCalendar className="mr-2 text-indigo-500" />
            <h2 className="text-xl font-semibold">Yearly Cost</h2>
          </div>
          <p className="text-3xl font-bold">{costs.yearlyCost}</p>
          <p className="text-sm text-gray-400 mt-2">annual total</p>
        </div>
      </div>
      
      {/* Category filter and Add button in one row */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="w-full sm:w-auto">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value === '' ? null : e.target.value)}
            className="w-full min-w-[200px] px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">All Categories</option>
            {getCategories().map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setIsBudgetSettingsOpen(true)}
            className="btn-ghost"
            title="Budget Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          
          <button
            onClick={openAddPopup}
            className="btn-primary"
          >
            <FiPlus className="mr-2" />
            Add Subscription
          </button>
        </div>
      </div>
      
      {/* Budget Settings Popup */}
      {isBudgetSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Budget Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Monthly Budget</label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 to disable budget tracking</p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setIsBudgetSettingsOpen(false)}
                  className="btn-ghost"
                >
                  <FiX className="mr-2" /> Cancel
                </button>
                <button
                  onClick={saveBudget}
                  className="btn-success"
                >
                  <FiSave className="mr-2" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                <select
                  name="category"
                  value={newSubscription.category}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="isBusinessExpense"
                  name="isBusinessExpense"
                  checked={newSubscription.isBusinessExpense || false}
                  onChange={(e) => setNewSubscription({...newSubscription, isBusinessExpense: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isBusinessExpense" className="text-sm text-gray-300">
                  Business Expense
                </label>
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
                <input
                  type="text"
                  name="url"
                  value={editingSubscription.url}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Price</label>
                <input
                  type="number"
                  name="price"
                  value={editingSubscription.price}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                <select
                  name="category"
                  value={editingSubscription.category}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="editIsBusinessExpense"
                  name="isBusinessExpense"
                  checked={editingSubscription.isBusinessExpense || false}
                  onChange={(e) => setEditingSubscription({...editingSubscription, isBusinessExpense: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="editIsBusinessExpense" className="text-sm text-gray-300">
                  Business Expense
                </label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => deleteSubscription(editingSubscriptionId!)}
                  className="btn-delete mr-auto"
                >
                  <FiTrash2 className="mr-2" /> Delete
                </button>
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
                  <div 
                    key={sub.id} 
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 cursor-pointer transition-colors duration-200"
                    onClick={() => startEditing(sub.id)}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{sub.name}</h3>
                          {sub.url && (
                            <a 
                              href={sub.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-indigo-400 hover:underline text-sm"
                              onClick={(e) => e.stopPropagation()} // Prevent triggering the card's onClick
                            >
                              {sub.url}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-lg">
                            ${sub.price}
                            <span className="text-sm text-gray-400 ml-1">
                              /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                            </span>
                          </span>
                          <span className="text-xs text-gray-400">
                            {sub.billingCycle === 'monthly' 
                              ? `$${(sub.price * 12).toFixed(2)}/year`
                              : `$${(sub.price / 12).toFixed(2)}/month`}
                          </span>
                          {sub.isBusinessExpense && (
                            <span className="text-xs text-blue-400 mt-1">Business Expense</span>
                          )}
                        </div>
                      </div>
                      
                      
                      {sub.notes && (
                        <div className="mt-3 text-sm bg-gray-700 p-2 rounded">
                          {sub.notes}
                        </div>
                      )}
                      
                      {/* Linked websites section */}
                      {renderWebsiteSection(sub)}
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