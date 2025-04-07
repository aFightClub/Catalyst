import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit, FiDollarSign, FiSave, FiX, FiCalendar, FiLink, FiMaximize2, FiMinimize2, FiRefreshCw } from 'react-icons/fi';
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
  favicon?: string; // Store the favicon URL
}

interface Website {
  id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  API_KEY: 'openai_api_key',
};

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
    isBusinessExpense: false,
    favicon: ''
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
  // New state for AI Summary
  const [isAISummaryPopupOpen, setIsAISummaryPopupOpen] = useState(false);
  const [aiSummary, setAISummary] = useState<string>('');
  const [isGeneratingAISummary, setIsGeneratingAISummary] = useState(false);
  const [isAISummaryExpanded, setIsAISummaryExpanded] = useState(true);
  const [userContext, setUserContext] = useState<{
    name: string;
    company: string;
    voice: string;
    backStory: string;
    websiteLinks: string;
    additionalInfo: string;
  }>({
    name: '',
    company: '',
    voice: '',
    backStory: '',
    websiteLinks: '',
    additionalInfo: ''
  });
  const [isFetchingFavicon, setIsFetchingFavicon] = useState(false);

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
        
        // Load user context
        const storedContext = await storeService.getUserContext();
        if (storedContext) {
          setUserContext(prevContext => ({
            ...prevContext,
            ...storedContext
          }));
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
    let businessYearlyCost = 0;
    let personalMonthlyCost = 0;
    let personalYearlyCost = 0;
    
    subscriptions.forEach(sub => {
      const price = parseFloat(sub.price.toString());
      if (sub.billingCycle === 'monthly') {
        monthlyCost += price;
        yearlyCost += price * 12;
        if (sub.isBusinessExpense) {
          businessMonthlyCost += price;
          businessYearlyCost += price * 12;
        } else {
          personalMonthlyCost += price;
          personalYearlyCost += price * 12;
        }
      } else {
        monthlyCost += price / 12;
        yearlyCost += price;
        if (sub.isBusinessExpense) {
          businessMonthlyCost += price / 12;
          businessYearlyCost += price;
        } else {
          personalMonthlyCost += price / 12;
          personalYearlyCost += price;
        }
      }
    });
    
    return {
      monthlyCost: formatCurrency(monthlyCost),
      yearlyCost: formatCurrency(yearlyCost),
      businessMonthlyCost: formatCurrency(businessMonthlyCost),
      businessYearlyCost: formatCurrency(businessYearlyCost),
      personalMonthlyCost: formatCurrency(personalMonthlyCost),
      personalYearlyCost: formatCurrency(personalYearlyCost),
      isOverBudget: monthlyBudget > 0 && personalMonthlyCost > monthlyBudget,
      budgetDifference: formatCurrency(personalMonthlyCost - monthlyBudget),
      rawMonthlyCost: monthlyCost,
      rawPersonalMonthlyCost: personalMonthlyCost
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
      isBusinessExpense: false,
      favicon: ''
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
      isBusinessExpense: false,
      favicon: ''
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
      <div className="pt-2 border-t border-gray-700/50">
        <h4 className="text-xs font-medium mb-2 flex items-center text-gray-400">
          <FiLink className="mr-1" size={12} /> Connected Websites
        </h4>
        <div className="flex flex-wrap gap-2">
          {linkedSites.map(siteId => {
            const website = getWebsiteById(siteId);
            if (!website) return null;
            
            return (
              <div key={siteId} className="text-xs bg-gray-700/60 px-2 py-1 rounded">
                <span className="text-indigo-400 truncate">{website.name}</span>
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

  // Function to generate AI summary
  const generateAISummary = async (isRegenerate = false) => {
    if (subscriptions.length === 0) return;
    
    setIsGeneratingAISummary(true);
    
    try {
      // Prepare data to send to OpenAI
      const costs = calculateCosts();
      
      // Organize subscriptions by category and sort by price
      const subsByCategory = Object.entries(subscriptionsByCategory).map(([category, subs]) => ({
        category,
        subscriptions: subs.map(sub => ({
          name: sub.name,
          price: sub.price,
          billingCycle: sub.billingCycle,
          isBusinessExpense: sub.isBusinessExpense
        }))
      }));
      
      // Sort subscriptions by price (highest to lowest)
      const sortedSubscriptions = [...subscriptions].sort((a, b) => {
        const aMonthlyPrice = a.billingCycle === 'monthly' ? a.price : a.price / 12;
        const bMonthlyPrice = b.billingCycle === 'monthly' ? b.price : b.price / 12;
        return bMonthlyPrice - aMonthlyPrice;
      });
      
      const top5Subscriptions = sortedSubscriptions.slice(0, 5).map(sub => ({
        name: sub.name,
        price: sub.price,
        billingCycle: sub.billingCycle,
        monthlyPrice: sub.billingCycle === 'monthly' ? sub.price : sub.price / 12
      }));
      
      // Get API key from localStorage
      const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      
      // Try getting from settings storage if not found in localStorage
      let finalApiKey = apiKey;
      if (!finalApiKey) {
        try {
          const storedKeys = await storeService.getApiKeys();
          if (storedKeys && storedKeys.openai) {
            finalApiKey = storedKeys.openai;
            // Save it to localStorage for future use
            localStorage.setItem(STORAGE_KEYS.API_KEY, storedKeys.openai);
          }
        } catch (error) {
          console.error('Error retrieving API key from settings:', error);
        }
      }
      
      if (!finalApiKey) {
        throw new Error('OpenAI API key is missing. Please set it in Settings > AI Configuration.');
      }
      
      // Create user context message
      let userContextMessage = '';
      if (userContext.name) {
        userContextMessage += `This analysis is for ${userContext.name}`;
        if (userContext.company) {
          userContextMessage += ` who works at ${userContext.company}`;
        }
        userContextMessage += '. ';
      }
      
      if (userContext.backStory) {
        userContextMessage += `${userContext.backStory} `;
      }
      
      // Prepare prompt for OpenAI
      const prompt = {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that provides concise, helpful analysis of subscription expenses. Personalize your response and align your advice with the user's context. Use HTML tags like <strong>, <em>, and <u> for emphasis when appropriate."
          },
          {
            role: "user",
            content: `Please provide a brief analysis of my subscription expenses. Keep it short and actionable.
            
            ${userContextMessage ? 'Personal context: ' + userContextMessage : ''}
            
            Monthly total: ${costs.personalMonthlyCost}
            Yearly total: ${costs.personalYearlyCost}
            Budget: ${monthlyBudget > 0 ? formatCurrency(monthlyBudget) : 'Not set'}
            ${costs.isOverBudget ? `Over budget by: ${costs.budgetDifference}` : ''}
            
            Top expenses: ${JSON.stringify(top5Subscriptions)}
            Subscriptions by category: ${JSON.stringify(subsByCategory)}
            
            Include: 
            1. Quick overview of my subscription situation
            2. My biggest expenses 
            3. Any categories where I might be overspending
            4. 1-2 practical suggestions to reduce costs
            
            Format with bullet points where appropriate. Keep response under 200 words. You can use basic html tags for strong, em, lists, and links. You can use tailwind classes for basic styling for layout, spacing, etc. Don't provide a title for the summary or outro. Write each sentence in a p tag with mb-2 class.`
          }
        ]
      };
      
      // Fetch API response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalApiKey}`
        },
        body: JSON.stringify(prompt)
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        setAISummary(data.choices[0].message.content);
      } else {
        throw new Error('No response from OpenAI');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAISummary('Unable to generate summary. ' + (error instanceof Error ? error.message : 'Please try again later.'));
    } finally {
      setIsGeneratingAISummary(false);
      if (!isRegenerate) {
        setIsAISummaryPopupOpen(false);
      }
    }
  };

  // Function to fetch favicon
  const fetchFavicon = async (url: string, isEditing: boolean = false) => {
    if (!url) return;
    
    try {
      setIsFetchingFavicon(true);
      
      // Make sure URL has http/https prefix
      let processedUrl = url;
      if (!/^https?:\/\//i.test(processedUrl)) {
        processedUrl = 'https://' + processedUrl;
      }
      
      // Extract domain
      const domain = new URL(processedUrl).hostname;
      
      // Use Google's favicon service
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      
      if (isEditing && editingSubscription) {
        setEditingSubscription(prev => ({
          ...prev!,
          favicon: faviconUrl
        }));
      } else {
        setNewSubscription(prev => ({
          ...prev,
          favicon: faviconUrl
        }));
      }
    } catch (error) {
      console.error("Failed to fetch favicon:", error);
    } finally {
      setIsFetchingFavicon(false);
    }
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
            {costs.personalMonthlyCost}
            {costs.isOverBudget && (
              <span className="text-red-500 text-sm ml-2">
                (+{costs.budgetDifference})
              </span>
            )}
          </p>
          <div className="flex flex-col">
            <p className="text-sm text-gray-400 mt-2">across {subscriptions.length} subscriptions</p>
            {costs.businessMonthlyCost !== "$0.00" && (
              <p className="text-sm text-blue-400 mt-1">
                + Business expenses: {costs.businessMonthlyCost}/mo
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center mb-2">
            <FiCalendar className="mr-2 text-indigo-500" />
            <h2 className="text-xl font-semibold">Yearly Cost</h2>
          </div>
          <p className="text-3xl font-bold">{costs.personalYearlyCost}</p>
          <div className="flex flex-col">
            <p className="text-sm text-gray-400 mt-2">annual personal total</p>
            {costs.businessYearlyCost !== "$0.00" && (
              <p className="text-sm text-blue-400 mt-1">
                + {costs.businessYearlyCost}/yr
              </p>
            )}
          </div>
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
            onClick={() => setIsAISummaryPopupOpen(true)}
            className="btn-ghost"
            title="AI Summary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24">
              <g fill="none">
                <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/>
                <path fill="currentColor" d="M9.107 5.448c.598-1.75 3.016-1.803 3.725-.159l.06.16l.807 2.36a4 4 0 0 0 2.276 2.411l.217.081l2.36.806c1.75.598 1.803 3.016.16 3.725l-.16.06l-2.36.807a4 4 0 0 0-2.412 2.276l-.081.216l-.806 2.361c-.598 1.75-3.016 1.803-3.724.16l-.062-.16l-.806-2.36a4 4 0 0 0-2.276-2.412l-.216-.081l-2.36-.806c-1.751-.598-1.804-3.016-.16-3.724l.16-.062l2.36-.806A4 4 0 0 0 8.22 8.025l.081-.216zM19 2a1 1 0 0 1 .898.56l.048.117l.35 1.026l1.027.35a1 1 0 0 1 .118 1.845l-.118.048l-1.026.35l-.35 1.027a1 1 0 0 1-1.845.117l-.048-.117l-.35-1.026l-1.027-.35a1 1 0 0 1-.118-1.845l.118-.048l1.026-.35l.35-1.027A1 1 0 0 1 19 2"/>
              </g>
            </svg>
          </button>
          
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
      
      {/* AI Summary Section */}
      {aiSummary && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-start items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-indigo-400" viewBox="0 0 24 24">
                <g fill="none">
                  <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/>
                  <path fill="currentColor" d="M9.107 5.448c.598-1.75 3.016-1.803 3.725-.159l.06.16l.807 2.36a4 4 0 0 0 2.276 2.411l.217.081l2.36.806c1.75.598 1.803 3.016.16 3.725l-.16.06l-2.36.807a4 4 0 0 0-2.412 2.276l-.081.216l-.806 2.361c-.598 1.75-3.016 1.803-3.724.16l-.062-.16l-.806-2.36a4 4 0 0 0-2.276-2.412l-.216-.081l-2.36-.806c-1.751-.598-1.804-3.016-.16-3.724l.16-.062l2.36-.806A4 4 0 0 0 8.22 8.025l.081-.216zM19 2a1 1 0 0 1 .898.56l.048.117l.35 1.026l1.027.35a1 1 0 0 1 .118 1.845l-.118.048l-1.026.35l-.35 1.027a1 1 0 0 1-1.845.117l-.048-.117l-.35-1.026l-1.027-.35a1 1 0 0 1-.118-1.845l.118-.048l1.026-.35l.35-1.027A1 1 0 0 1 19 2"/>
                </g>
              </svg>
              AI Summary
            </h3>
            <div className="flex space-x-2 items-center">
              <button 
                onClick={() => setIsAISummaryExpanded(!isAISummaryExpanded)} 
                className="text-gray-400 hover:text-white"
                title={isAISummaryExpanded ? "Collapse" : "Expand"}
              >
                {isAISummaryExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
              </button>
              <button 
                onClick={() => generateAISummary(true)} 
                className="text-gray-400 hover:text-white"
                title="Regenerate Summary"
                disabled={isGeneratingAISummary}
              >
                {isGeneratingAISummary ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FiRefreshCw />
                )}
              </button>
            </div>
          </div>
          
          {isAISummaryExpanded && (
            <div className="bg-gray-700 p-3 rounded mt-2">
              {isGeneratingAISummary ? (
                <div className="flex justify-center items-center py-4">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating summary...</span>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: aiSummary }} className="text-gray-200 text-sm" />
              )}
            </div>
          )}
        </div>
      )}
      
      {/* AI Summary Popup */}
      {isAISummaryPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-indigo-400" viewBox="0 0 24 24">
                <g fill="none">
                  <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/>
                  <path fill="currentColor" d="M9.107 5.448c.598-1.75 3.016-1.803 3.725-.159l.06.16l.807 2.36a4 4 0 0 0 2.276 2.411l.217.081l2.36.806c1.75.598 1.803 3.016.16 3.725l-.16.06l-2.36.807a4 4 0 0 0-2.412 2.276l-.081.216l-.806 2.361c-.598 1.75-3.016 1.803-3.724.16l-.062-.16l-.806-2.36a4 4 0 0 0-2.276-2.412l-.216-.081l-2.36-.806c-1.751-.598-1.804-3.016-.16-3.724l.16-.062l2.36-.806A4 4 0 0 0 8.22 8.025l.081-.216zM19 2a1 1 0 0 1 .898.56l.048.117l.35 1.026l1.027.35a1 1 0 0 1 .118 1.845l-.118.048l-1.026.35l-.35 1.027a1 1 0 0 1-1.845.117l-.048-.117l-.35-1.026l-1.027-.35a1 1 0 0 1-.118-1.845l.118-.048l1.026-.35l.35-1.027A1 1 0 0 1 19 2"/>
                </g>
              </svg>
              AI Summary
            </h2>
            <p className="text-gray-400 mb-6">
              Generate an AI-powered summary of your subscription expenses, with insights on spending patterns and potential cost-saving opportunities.
            </p>
            
            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={() => setIsAISummaryPopupOpen(false)}
                className="btn-ghost"
              >
                <FiX className="mr-2" /> Cancel
              </button>
              <button
                onClick={() => generateAISummary(true)}
                className="btn-primary"
                disabled={isGeneratingAISummary || subscriptions.length === 0}
              >
                {isGeneratingAISummary ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>Generate Summary</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
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
                <div className="flex">
                  <input
                    type="text"
                    name="url"
                    value={newSubscription.url}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-l px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://example.com"
                  />
                  <button
                    onClick={() => fetchFavicon(newSubscription.url)}
                    disabled={isFetchingFavicon || !newSubscription.url}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-r flex items-center"
                    title="Fetch Favicon"
                  >
                    {isFetchingFavicon ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
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
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                    <FiLink className="mr-2" size={16} />
                    Linked Websites
                  </label>
                  <div className="bg-gray-700 p-3 rounded-md max-h-40 overflow-y-auto">
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
                <div className="flex">
                  <input
                    type="text"
                    name="url"
                    value={editingSubscription.url}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 rounded-l px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => fetchFavicon(editingSubscription.url, true)}
                    disabled={isFetchingFavicon || !editingSubscription.url}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-r flex items-center"
                    title="Fetch Favicon"
                  >
                    {isFetchingFavicon ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
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
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                    <FiLink className="mr-2" size={16} />
                    Linked Websites
                  </label>
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
                  <p className="text-xs text-gray-500 mt-1">Select websites powered by this subscription</p>
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
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 min-w-0 pr-3">
                        <h3 className="text-lg font-semibold flex items-center">
                          {sub.favicon && (
                            <img 
                              src={sub.favicon} 
                              alt="" 
                              className="w-5 h-5 mr-2 flex-shrink-0"
                              onError={(e) => {
                                // Hide broken favicon images
                                (e.target as HTMLImageElement).style.display = 'none';
                              }} 
                            />
                          )}
                          <span className="truncate">{sub.name}</span>
                        </h3>
                        {sub.url && (
                          <a 
                            href={sub.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-400 hover:underline text-sm truncate block"
                            onClick={(e) => e.stopPropagation()} // Prevent triggering the card's onClick
                          >
                            {sub.url.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        <div className="text-xs text-gray-500">
                          {sub.category}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="flex items-center">
                          <span className="font-bold text-lg">${sub.price}</span>
                          <span className="text-sm text-gray-400 ml-1">
                            /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          ${sub.billingCycle === 'monthly' 
                            ? (sub.price * 12).toFixed(2)
                            : (sub.price / 12).toFixed(2)}
                          /{sub.billingCycle === 'monthly' ? 'year' : 'month'}
                        </span>
                        {sub.isBusinessExpense && (
                          <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full mt-1">
                            Business Expense
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-3">
                      {sub.notes && (
                        <div className="text-sm bg-gray-700/50 p-2 rounded">
                          {sub.notes}
                        </div>
                      )}
                      
                      {renderWebsiteSection(sub)}
                      
                      <div className="text-xs text-gray-500 flex items-center pt-1">
                        <FiCalendar className="mr-1 text-gray-500" size={12} />
                        Started: {new Date(sub.startDate).toLocaleDateString()}
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