import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit, FiDollarSign, FiSave, FiX, FiCalendar } from 'react-icons/fi';
import { storeService } from '../../services/storeService';

interface Subscription {
  id: string;
  name: string;
  url: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  category: string;
  notes?: string;
}

const DEFAULT_CATEGORIES = [
  'Entertainment',
  'Productivity',
  'Utilities',
  'Social Media',
  'Shopping',
  'News',
  'Music',
  'Gaming',
  'Other'
];

const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newSubscription, setNewSubscription] = useState<Subscription>({
    id: '',
    name: '',
    url: '',
    price: 0,
    billingCycle: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    category: 'Other'
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load subscriptions from store
  useEffect(() => {
    const loadSubscriptions = async () => {
      setIsLoading(true);
      try {
        const storedSubscriptions = await storeService.getSubscriptions();
        if (Array.isArray(storedSubscriptions)) {
          setSubscriptions(storedSubscriptions);
        } else {
          console.warn("Subscriptions data is not an array, using empty array", storedSubscriptions);
          setSubscriptions([]);
        }
      } catch (error) {
        console.error("Failed to load subscriptions:", error);
        setSubscriptions([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSubscriptions();
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
      monthlyCost: monthlyCost.toFixed(2),
      yearlyCost: yearlyCost.toFixed(2)
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (editingSubscriptionId) {
      setSubscriptions(subs => 
        subs.map(sub => 
          sub.id === editingSubscriptionId 
            ? { ...sub, [name]: name === 'price' ? parseFloat(value) : value } 
            : sub
        )
      );
    } else {
      setNewSubscription(prev => ({ 
        ...prev, 
        [name]: name === 'price' ? parseFloat(value) : value 
      }));
    }
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
      category: 'Other'
    });
    setIsAddingNew(false);
  };

  const startEditing = (id: string) => {
    setEditingSubscriptionId(id);
  };

  const cancelEditing = () => {
    setEditingSubscriptionId(null);
  };

  const deleteSubscription = (id: string) => {
    if (confirm('Are you sure you want to delete this subscription?')) {
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
      if (editingSubscriptionId === id) {
        setEditingSubscriptionId(null);
      }
    }
  };

  const getCategories = () => {
    const existingCategories = new Set(subscriptions.map(sub => sub.category));
    const allCategories = new Set([...DEFAULT_CATEGORIES, ...existingCategories]);
    return Array.from(allCategories);
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
          <p className="text-3xl font-bold">${monthlyCost}</p>
          <p className="text-sm text-gray-400 mt-2">across {subscriptions.length} subscriptions</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-2">
            <FiCalendar className="mr-2 text-blue-500" />
            <h2 className="text-xl font-semibold">Yearly Cost</h2>
          </div>
          <p className="text-3xl font-bold">${yearlyCost}</p>
          <p className="text-sm text-gray-400 mt-2">annual total</p>
        </div>
      </div>
      
      {/* Category filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedCategory === null ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {getCategories().map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategory === category ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      {/* Add new subscription button */}
      {!isAddingNew && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center mb-6 hover:bg-blue-700"
        >
          <FiPlus className="mr-2" /> Add Subscription
        </button>
      )}
      
      {/* Add new subscription form */}
      {isAddingNew && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Subscription</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              name="notes"
              value={newSubscription.notes || ''}
              onChange={handleInputChange}
              className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center"
            >
              <FiX className="mr-2" /> Cancel
            </button>
            <button
              onClick={addSubscription}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              <FiSave className="mr-2" /> Save
            </button>
          </div>
        </div>
      )}
      
      {/* Subscriptions list */}
      {Object.entries(subscriptionsByCategory).map(([category, subs]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{category}</h2>
          <div className="space-y-4">
            {subs.map(subscription => (
              <div 
                key={subscription.id}
                className="bg-gray-800 rounded-lg p-4"
              >
                {editingSubscriptionId === subscription.id ? (
                  // Edit subscription form
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Service Name</label>
                        <input
                          type="text"
                          name="name"
                          value={subscription.name}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
                        <input
                          type="text"
                          name="url"
                          value={subscription.url}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Price</label>
                        <input
                          type="number"
                          name="price"
                          value={subscription.price}
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
                          value={subscription.billingCycle}
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
                          value={subscription.startDate}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                        <select
                          name="category"
                          value={subscription.category}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {getCategories().map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={subscription.notes || ''}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      ></textarea>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center"
                      >
                        <FiX className="mr-2" /> Cancel
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                      >
                        <FiSave className="mr-2" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // Subscription display
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{subscription.name}</h3>
                        {subscription.url && (
                          <a 
                            href={subscription.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-400 hover:underline text-sm"
                          >
                            {subscription.url}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-lg">
                          ${subscription.price}
                          <span className="text-sm text-gray-400 ml-1">
                            /{subscription.billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-400">
                      Started: {new Date(subscription.startDate).toLocaleDateString()}
                    </div>
                    
                    {subscription.notes && (
                      <div className="mt-3 text-sm bg-gray-700 p-2 rounded">
                        {subscription.notes}
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => startEditing(subscription.id)}
                        className="p-2 text-gray-400 hover:text-white"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => deleteSubscription(subscription.id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {filteredSubscriptions.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p>No subscriptions found{selectedCategory ? ` in "${selectedCategory}"` : ''}.</p>
          {!isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Your First Subscription
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Subscriptions; 