import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiRefreshCw, FiEdit, FiDollarSign, FiGlobe, FiClock } from 'react-icons/fi';
import { storeService } from '../../services/storeService';

// Card types
enum CardType {
  TEXT = 'text',
  STAT = 'stat'
}

interface Card {
  id: string;
  type: CardType;
  title: string;
  content: string;
  fetchUrl?: string;
  fetchApiKey?: string;
  fetchData?: any;
  lastFetched?: number;
}

interface Subscription {
  id: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  category: string;
}

interface Website {
  id: string;
  status: 'active' | 'idea' | 'archived';
}

const Dashboard: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardType, setNewCardType] = useState<CardType>(CardType.TEXT);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardFetchUrl, setNewCardFetchUrl] = useState('');
  const [newCardApiKey, setNewCardApiKey] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);

  // Update current date and time every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Load data from storeService
  useEffect(() => {
    const loadData = async () => {
      try {
        // We'll use localStorage for dashboard cards since there's no specific method for them
        const savedCards = localStorage.getItem('dashboard_cards');
        if (savedCards) {
          try {
            const parsedCards = JSON.parse(savedCards);
            setCards(parsedCards);
          } catch (e) {
            console.error('Failed to parse saved cards:', e);
            initializeDefaultCards();
          }
        } else {
          initializeDefaultCards();
        }
        
        // Load stats data
        const storedSubscriptions = await storeService.getSubscriptions();
        if (storedSubscriptions && Array.isArray(storedSubscriptions)) {
          setSubscriptions(storedSubscriptions);
        }
        
        const storedWebsites = await storeService.getWebsites();
        if (storedWebsites && Array.isArray(storedWebsites)) {
          setWebsites(storedWebsites);
        }
      } catch (e) {
        console.error('Failed to load data:', e);
        initializeDefaultCards();
      }
    };
    
    loadData();
  }, []);
  
  // Initialize default cards
  const initializeDefaultCards = () => {
    const defaultCards: Card[] = [
      {
        id: '1',
        type: CardType.TEXT,
        title: 'Welcome to Your Dashboard',
        content: 'Add cards to track your metrics and keep important notes. Click the + button to add a new card.'
      }
    ];
    setCards(defaultCards);
  };

  // Save cards to localStorage whenever they change
  useEffect(() => {
    const saveCards = async () => {
      try {
        // Save to localStorage
        localStorage.setItem('dashboard_cards', JSON.stringify(cards));
      } catch (e) {
        console.error('Failed to save cards:', e);
      }
    };
    
    if (cards.length > 0) {
      saveCards();
    }
  }, [cards]);

  // Fetch data for stat cards
  useEffect(() => {
    const fetchStatsData = async () => {
      const currentTime = Date.now();
      const oneHourMs = 60 * 60 * 1000;
      
      // Find stat cards that need updating (haven't been fetched in the last hour)
      const cardsToUpdate = cards.filter(
        card => card.type === CardType.STAT && 
        card.fetchUrl && 
        (!card.lastFetched || (currentTime - card.lastFetched) > oneHourMs)
      );
      
      if (cardsToUpdate.length === 0) return;
      
      // Update each card that needs it
      const updatedCards = [...cards];
      
      for (const card of cardsToUpdate) {
        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json'
          };
          
          if (card.fetchApiKey) {
            headers['Authorization'] = `Bearer ${card.fetchApiKey}`;
          }
          
          // We're guaranteed card.fetchUrl exists here because of the filter above
          const fetchUrl = card.fetchUrl as string;
          
          const response = await fetch(fetchUrl, {
            method: 'GET',
            headers
          });
          
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Update the card with new data
          const cardIndex = updatedCards.findIndex(c => c.id === card.id);
          if (cardIndex !== -1) {
            updatedCards[cardIndex] = {
              ...updatedCards[cardIndex],
              fetchData: data,
              lastFetched: currentTime
            };
          }
        } catch (error) {
          console.error(`Failed to fetch data for card ${card.id}:`, error);
        }
      }
      
      setCards(updatedCards);
    };
    
    fetchStatsData();
    
    // Set up interval to check for updates every 15 minutes
    const intervalId = setInterval(fetchStatsData, 15 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [cards]);

  // Calculate subscription costs
  const calculateSubscriptionCosts = () => {
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
      monthlyCost,
      yearlyCost,
      total: subscriptions.length
    };
  };
  
  // Get website stats
  const getWebsiteStats = () => {
    const activeCount = websites.filter(site => site.status === 'active').length;
    const ideaCount = websites.filter(site => site.status === 'idea').length;
    const archivedCount = websites.filter(site => site.status === 'archived').length;
    
    return {
      active: activeCount,
      ideas: ideaCount,
      archived: archivedCount,
      total: websites.length
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

  const addCard = () => {
    if (!newCardTitle) return;
    
    const newCard: Card = {
      id: Date.now().toString(),
      type: newCardType,
      title: newCardTitle,
      content: newCardContent,
      ...(newCardType === CardType.STAT && newCardFetchUrl ? {
        fetchUrl: newCardFetchUrl,
        fetchApiKey: newCardApiKey,
        lastFetched: 0 // Force fetch on next cycle
      } : {})
    };
    
    setCards([...cards, newCard]);
    resetCardForm();
  };

  const updateCard = () => {
    if (!editingCardId || !newCardTitle) return;
    
    setCards(cards.map(card => {
      if (card.id === editingCardId) {
        return {
          ...card,
          title: newCardTitle,
          content: newCardContent,
          ...(card.type === CardType.STAT ? {
            fetchUrl: newCardFetchUrl,
            fetchApiKey: newCardApiKey,
            lastFetched: newCardFetchUrl !== card.fetchUrl ? 0 : card.lastFetched // Force fetch if URL changed
          } : {})
        };
      }
      return card;
    }));
    
    resetCardForm();
  };

  const editCard = (card: Card) => {
    setEditingCardId(card.id);
    setNewCardType(card.type);
    setNewCardTitle(card.title);
    setNewCardContent(card.content);
    setNewCardFetchUrl(card.fetchUrl || '');
    setNewCardApiKey(card.fetchApiKey || '');
    setShowAddCardModal(true);
  };

  const deleteCard = (cardId: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      setCards(cards.filter(card => card.id !== cardId));
    }
  };

  const resetCardForm = () => {
    setShowAddCardModal(false);
    setEditingCardId(null);
    setNewCardType(CardType.TEXT);
    setNewCardTitle('');
    setNewCardContent('');
    setNewCardFetchUrl('');
    setNewCardApiKey('');
  };

  const refreshCardData = async (card: Card) => {
    if (card.type !== CardType.STAT || !card.fetchUrl) return;
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (card.fetchApiKey) {
        headers['Authorization'] = `Bearer ${card.fetchApiKey}`;
      }
      
      // We know card.fetchUrl exists because of the check in the if statement above
      const fetchUrl = card.fetchUrl;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update the card with new data
      setCards(cards.map(c => {
        if (c.id === card.id) {
          return {
            ...c,
            fetchData: data,
            lastFetched: Date.now()
          };
        }
        return c;
      }));
    } catch (error) {
      console.error(`Failed to fetch data for card ${card.id}:`, error);
      alert(`Error refreshing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatStatValue = (data: any, content: string): string => {
    try {
      // Allow basic path notation like "data.count" or "results[0].total"
      const path = content.trim();
      
      // If no path specified, just stringify the data
      if (!path) return JSON.stringify(data);
      
      // Parse the path and extract the value
      const parts = path.split('.');
      let value = data;
      
      for (const part of parts) {
        const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
        
        if (arrayMatch) {
          // Handle array notation like results[0]
          const [_, propName, index] = arrayMatch;
          value = value[propName][parseInt(index)];
        } else {
          value = value[part];
        }
        
        if (value === undefined) {
          return `Invalid path: ${path}`;
        }
      }
      
      // Format numbers nicely
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      
      return String(value);
    } catch (error) {
      console.error('Error formatting stat value:', error);
      return 'Error parsing data';
    }
  };

  const handleContentEdit = (card: Card, newContent: string) => {
    setCards(cards.map(c => {
      if (c.id === card.id) {
        return {
          ...c,
          content: newContent
        };
      }
      return c;
    }));
  };

  const { monthlyCost, yearlyCost, total: totalSubscriptions } = calculateSubscriptionCosts();
  const websiteStats = getWebsiteStats();

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-auto">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold text-white">
          {currentDateTime.toLocaleDateString('en-US', { weekday: 'long' })} ({currentDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}) - {currentDateTime.toLocaleDateString('en-US', { month: 'long' })}, {currentDateTime.getFullYear()}
        </h2>
        <button
          onClick={() => {
            setEditingCardId(null);
            resetCardForm();
            setShowAddCardModal(true);
          }}
          className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          title="Add New Card"
        >
          <FiPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Overview Section */}
      <div className="px-4 pt-6 ">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Subscription Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FiDollarSign className="text-green-500 mr-2" />
              <h3 className="text-white font-medium">Subscriptions</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Monthly</p>
                <p className="text-white text-xl font-bold">{formatCurrency(monthlyCost)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Yearly</p>
                <p className="text-white text-xl font-bold">{formatCurrency(yearlyCost)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 text-sm">Total Subscriptions</p>
                <p className="text-white text-xl font-bold">{totalSubscriptions}</p>
              </div>
            </div>
          </div>
          
          {/* Website Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FiGlobe className="text-blue-500 mr-2" />
              <h3 className="text-white font-medium">Websites</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-white text-xl font-bold">{websiteStats.active}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Ideas</p>
                <p className="text-white text-xl font-bold">{websiteStats.ideas}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 text-sm">Total Websites</p>
                <p className="text-white text-xl font-bold">{websiteStats.total}</p>
              </div>
            </div>
          </div>
          
          {/* Time Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FiClock className="text-purple-500 mr-2" />
              <h3 className="text-white font-medium">Time Tracker</h3>
            </div>
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-lg">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div 
              key={card.id}
              className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-700 flex justify-between items-center">
                <h3 className="font-medium text-white">{card.title}</h3>
                <div className="flex space-x-1">
                  {card.type === CardType.STAT && (
                    <button
                      onClick={() => refreshCardData(card)}
                      className="p-1 rounded hover:bg-gray-600 text-gray-300 hover:text-white"
                      title="Refresh Data"
                    >
                      <FiRefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => editCard(card)}
                    className="p-1 rounded hover:bg-gray-600 text-gray-300 hover:text-white"
                    title="Edit Card"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCard(card.id)}
                    className="p-1 rounded hover:bg-red-600 text-gray-300 hover:text-white"
                    title="Delete Card"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                {card.type === CardType.TEXT ? (
                  <div
                    contentEditable
                    className="text-gray-300 focus:outline-none min-h-[100px]"
                    dangerouslySetInnerHTML={{ __html: card.content }}
                    onBlur={(e) => handleContentEdit(card, e.currentTarget.innerHTML)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[120px]">
                    {card.fetchData ? (
                      <>
                        <div className="text-4xl font-bold text-blue-500 mb-2">
                          {formatStatValue(card.fetchData, card.content)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last updated: {card.lastFetched ? new Date(card.lastFetched).toLocaleString() : 'Never'}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">
                        {card.fetchUrl ? 'Loading data...' : 'No data source configured'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 max-w-lg w-full">
            <h3 className="text-lg font-medium text-white mb-4">
              {editingCardId ? 'Edit Card' : 'Add New Card'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Card Type</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setNewCardType(CardType.TEXT)}
                  className={`px-4 py-2 rounded ${
                    newCardType === CardType.TEXT
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setNewCardType(CardType.STAT)}
                  className={`px-4 py-2 rounded ${
                    newCardType === CardType.STAT
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Stat
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="Card Title"
              />
            </div>
            
            {newCardType === CardType.TEXT ? (
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Content</label>
                <textarea
                  value={newCardContent}
                  onChange={(e) => setNewCardContent(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white h-32"
                  placeholder="Card Content"
                />
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1">API Endpoint URL</label>
                  <input
                    type="text"
                    value={newCardFetchUrl}
                    onChange={(e) => setNewCardFetchUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder="https://api.example.com/stats"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1">API Key (Optional)</label>
                  <input
                    type="password"
                    value={newCardApiKey}
                    onChange={(e) => setNewCardApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder="Your API Key"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-300 mb-1">Data Path</label>
                  <input
                    type="text"
                    value={newCardContent}
                    onChange={(e) => setNewCardContent(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder="data.stats.total"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the path to the data you want to display (e.g., "data.count" or "results[0].total")
                  </p>
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={resetCardForm}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={editingCardId ? updateCard : addCard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!newCardTitle}
              >
                {editingCardId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
