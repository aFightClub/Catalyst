import React, { useState, useEffect, useRef } from 'react';
import { FiPlus, FiTrash2, FiRefreshCw, FiEdit, FiDollarSign, FiGlobe, FiClock, FiCalendar, FiChevronLeft, FiChevronRight, FiFolder, FiExternalLink } from 'react-icons/fi';
import { storeService } from '../../services/storeService';
import { Channel } from '../../types';

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
  isBusinessExpense?: boolean;
}

interface Website {
  id: string;
  status: 'active' | 'idea' | 'domains' | 'archived';
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  time?: string; // Time in HH:MM format
  type: 'event' | 'milestone';
  projectId?: string; // For milestones
  color: string;
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly';
  recurrenceEndDate?: string; // ISO string, optional end date for recurring events
}

interface ContentReminder {
  planId: string;
  planName: string;
  channelId: string;
  channelName: string;
  channelType: string;
  publishDate: string;
  documentTitle?: string;
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
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  
  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<'event' | 'milestone'>('event');
  const [newEventColor, setNewEventColor] = useState('#3B82F6'); // Default blue
  const [newEventProjectId, setNewEventProjectId] = useState<string>('');
  const [availableProjects, setAvailableProjects] = useState<{id: string, name: string}[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Content reminders state
  const [contentReminders, setContentReminders] = useState<ContentReminder[]>([]);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderType, setNewReminderType] = useState<string>('other');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newReminderNotes, setNewReminderNotes] = useState('');

  // New event time and recurrence state
  const [newEventTime, setNewEventTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

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
          // Ensure status exists for older data if needed
          const updatedWebsites = storedWebsites.map(site => ({
            ...site,
            status: site.status || 'active' // Default to active if status is missing
          }));
          setWebsites(updatedWebsites);
        }
        
        // Load budget
        const storedBudget = await storeService.getBudget();
        if (storedBudget && !isNaN(parseFloat(storedBudget))) {
          setMonthlyBudget(parseFloat(storedBudget));
        }
        
        // Load calendar events
        const storedEvents = localStorage.getItem('calendar_events');
        if (storedEvents) {
          try {
            const parsedEvents = JSON.parse(storedEvents);
            setCalendarEvents(parsedEvents);
          } catch (e) {
            console.error('Failed to parse saved events:', e);
            setCalendarEvents([]);
          }
        }
        
        // Load projects for milestone selection
        const storedProjects = await storeService.getProjects();
        if (storedProjects && Array.isArray(storedProjects)) {
          setAvailableProjects(storedProjects.map(p => ({ id: p.id, name: p.name })));
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
  
  // Save calendar events whenever they change
  useEffect(() => {
    const saveEvents = async () => {
      try {
        localStorage.setItem('calendar_events', JSON.stringify(calendarEvents));
      } catch (e) {
        console.error('Failed to save calendar events:', e);
      }
    };
    
    if (calendarEvents.length > 0) {
      saveEvents();
    }
  }, [calendarEvents]);

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
    let personalMonthlyCost = 0;
    let personalYearlyCost = 0;
    let businessMonthlyCost = 0;
    let businessYearlyCost = 0;
    let totalCost = 0;

    subscriptions.forEach(sub => {
      const price = parseFloat(sub.price.toString());
      let currentMonthlyCost = 0;
      let currentYearlyCost = 0;

      if (sub.billingCycle === 'monthly') {
        currentMonthlyCost = price;
        currentYearlyCost = price * 12;
      } else {
        currentMonthlyCost = price / 12;
        currentYearlyCost = price;
      }
      
      totalCost += currentMonthlyCost; // Total including business

      if (sub.isBusinessExpense) {
        businessMonthlyCost += currentMonthlyCost;
        businessYearlyCost += currentYearlyCost;
      } else {
        personalMonthlyCost += currentMonthlyCost;
        personalYearlyCost += currentYearlyCost;
      }
    });
    
    const isOverBudget = monthlyBudget > 0 && personalMonthlyCost > monthlyBudget;
    
    return {
      personalMonthlyCost,
      personalYearlyCost,
      businessMonthlyCost,
      businessYearlyCost,
      totalSubscriptions: subscriptions.length,
      isOverBudget,
      budgetDifference: isOverBudget ? personalMonthlyCost - monthlyBudget : 0,
    };
  };
  
  // Get website stats
  const getWebsiteStats = () => {
    const activeCount = websites.filter(site => site.status === 'active').length;
    const ideaCount = websites.filter(site => site.status === 'idea').length;
    const domainCount = websites.filter(site => site.status === 'domains').length;
    const archivedCount = websites.filter(site => site.status === 'archived').length;
    
    return {
      active: activeCount,
      ideas: ideaCount,
      domains: domainCount,
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
  
  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    const daysArray = [];
    
    // Add days from previous month to fill first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      daysArray.push(prevDate);
    }
    
    // Add all days in current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      daysArray.push(new Date(year, month, i));
    }
    
    // Add days from next month to complete grid (6 rows x 7 days = 42 total cells)
    const remainingCells = 42 - daysArray.length;
    for (let i = 1; i <= remainingCells; i++) {
      daysArray.push(new Date(year, month + 1, i));
    }
    
    return daysArray;
  };
  
  const calendarDays = getDaysInMonth(currentCalendarDate);
  
  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentCalendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentCalendarDate(newDate);
  };
  
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    
    return calendarEvents.filter(event => {
      // Check for direct date match
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      if (eventDate === dateString) return true;
      
      // Check for recurring events
      if (event.isRecurring) {
        const eventOriginalDate = new Date(event.date);
        const targetDate = new Date(date);
        
        // Check if target date is after the original date
        if (targetDate >= eventOriginalDate) {
          // Check if target date is before recurrence end date (if set)
          if (event.recurrenceEndDate) {
            const endDate = new Date(event.recurrenceEndDate);
            if (targetDate > endDate) return false;
          }
          
          // Calculate based on recurrence type
          if (event.recurrenceType === 'daily') {
            return true;
          } else if (event.recurrenceType === 'weekly') {
            // Same day of week
            return targetDate.getDay() === eventOriginalDate.getDay();
          } else if (event.recurrenceType === 'monthly') {
            // Same day of month
            return targetDate.getDate() === eventOriginalDate.getDate();
          }
        }
      }
      
      return false;
    });
  };
  
  const addEvent = () => {
    if (!newEventTitle || !newEventDate) return;
    
    if (editingEventId) {
      // Update existing event
      setCalendarEvents(calendarEvents.map(event => {
        if (event.id === editingEventId) {
          return {
            ...event,
            title: newEventTitle,
            date: new Date(newEventDate).toISOString(),
            time: newEventTime,
            type: newEventType,
            color: newEventColor,
            isRecurring: isRecurring,
            recurrenceType: isRecurring ? recurrenceType : undefined,
            recurrenceEndDate: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
            ...(newEventType === 'milestone' ? { projectId: newEventProjectId } : { projectId: undefined })
          };
        }
        return event;
      }));
    } else {
      // Add new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: newEventTitle,
        date: new Date(newEventDate).toISOString(),
        time: newEventTime,
        type: newEventType,
        color: newEventColor,
        isRecurring: isRecurring,
        recurrenceType: isRecurring ? recurrenceType : undefined,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined,
        ...(newEventType === 'milestone' && newEventProjectId ? { projectId: newEventProjectId } : {})
      };
    
      setCalendarEvents([...calendarEvents, newEvent]);
    }
    
    resetEventForm();
  };
  
  const editEvent = (eventId: string) => {
    const event = calendarEvents.find(e => e.id === eventId);
    if (!event) return;
    
    setEditingEventId(eventId);
    setNewEventTitle(event.title);
    setNewEventDate(event.date.split('T')[0]);
    setNewEventTime(event.time || '');
    setNewEventType(event.type);
    setNewEventColor(event.color);
    setNewEventProjectId(event.projectId || '');
    setIsRecurring(event.isRecurring || false);
    setRecurrenceType(event.recurrenceType || 'weekly');
    setRecurrenceEndDate(event.recurrenceEndDate ? event.recurrenceEndDate.split('T')[0] : '');
    setShowAddEventModal(true);
  };
  
  const deleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      setCalendarEvents(calendarEvents.filter(event => event.id !== eventId));
    }
  };
  
  const resetEventForm = () => {
    setShowAddEventModal(false);
    setEditingEventId(null);
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventTime('');
    setNewEventType('event');
    setNewEventColor('#3B82F6');
    setNewEventProjectId('');
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setRecurrenceEndDate('');
  };

  const handleEventMouseEnter = (event: CalendarEvent, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = calendarRef.current?.getBoundingClientRect();
    // Get the target element (the dot)
    const target = e.currentTarget;
    const targetRect = target.getBoundingClientRect();
    
    if (rect) {
      // Position directly adjacent to the dot
      const top = targetRect.top - rect.top - 5;
      const left = targetRect.left - rect.left + targetRect.width + 5;
      
      setTooltipPosition({ top, left });
      setHoveredEvent(event.id);
    }
  };

  const handleEventMouseLeave = () => {
    setHoveredEvent(null);
  };

  const { 
    personalMonthlyCost, 
    personalYearlyCost, 
    businessMonthlyCost, 
    businessYearlyCost, 
    totalSubscriptions,
    isOverBudget,
    budgetDifference 
  } = calculateSubscriptionCosts();
  const websiteStats = getWebsiteStats();

  // Load content reminders
  useEffect(() => {
    const loadContentReminders = async () => {
      try {
        // Load all content plans for reminders
        const plans = await storeService.getContentPlans();
        
        if (!Array.isArray(plans) || plans.length === 0) return;
        
        // Extract scheduled channels with upcoming dates
        const now = new Date();
        const twoWeeksFromNow = new Date(now);
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        
        const upcoming: ContentReminder[] = [];
        
        plans.forEach(plan => {
          const scheduledChannels = plan.channels.filter((channel: Channel) => {
            if (channel.status !== 'scheduled' || !channel.publishDate) return false;
            
            const publishDate = new Date(channel.publishDate);
            return publishDate >= now && publishDate <= twoWeeksFromNow;
          });
          
          scheduledChannels.forEach((channel: Channel) => {
            upcoming.push({
              planId: plan.id,
              planName: plan.name,
              channelId: channel.id,
              channelName: channel.name,
              channelType: channel.type,
              publishDate: channel.publishDate!,
              documentTitle: channel.document?.title
            });
          });
        });
        
        // Also load any manually created reminders
        try {
          const storedReminders = await storeService.getPlanReminders();
          if (Array.isArray(storedReminders) && storedReminders.length > 0) {
            // Filter for reminders that are upcoming and not expired
            const validReminders = storedReminders.filter(reminder => {
              const reminderDate = new Date(reminder.publishDate);
              return reminderDate >= now && reminderDate <= twoWeeksFromNow;
            });
            
            // Add manual reminders to the list
            upcoming.push(...validReminders);
          }
        } catch (err) {
          console.error('Failed to load manual reminders:', err);
        }
        
        // Sort by date (closest first)
        upcoming.sort((a, b) => {
          return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
        });
        
        setContentReminders(upcoming);
      } catch (err) {
        console.error('Failed to load content reminders:', err);
      }
    };
    
    loadContentReminders();
  }, []);

  // Function to format the publish date
  const formatPublishDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // Otherwise show full date
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Function to add a new reminder manually
  const addReminder = async () => {
    if (!newReminderTitle || !newReminderDate) return;
    
    try {
      // Create a new reminder
      const newReminder: ContentReminder = {
        planId: 'manual-' + Date.now().toString(),
        planName: 'Manual Reminder',
        channelId: Date.now().toString(),
        channelName: newReminderTitle,
        channelType: newReminderType,
        publishDate: new Date(`${newReminderDate}T${newReminderTime || '12:00:00'}`).toISOString(),
        documentTitle: newReminderNotes || undefined
      };
      
      // Add to existing reminders
      const updatedReminders = [...contentReminders, newReminder];
      
      // Sort by date
      updatedReminders.sort((a, b) => {
        return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
      });
      
      // Update state
      setContentReminders(updatedReminders);
      
      // Try to save to planReminders in localStorage for persistence
      try {
        const existingReminders = await storeService.getPlanReminders();
        await storeService.savePlanReminders([...existingReminders, newReminder]);
      } catch (err) {
        console.error('Failed to save reminder to storage:', err);
      }
      
      // Schedule notification if possible
      if ((window as any).electron?.notifications?.schedule) {
        await (window as any).electron.notifications.schedule({
          title: `Reminder: ${newReminderTitle}`,
          body: newReminderNotes || `Your ${newReminderType} reminder is due.`,
          timestamp: new Date(newReminder.publishDate).getTime()
        });
      }
      
      // Reset form
      resetReminderForm();
    } catch (err) {
      console.error('Failed to add reminder:', err);
      alert('Failed to add reminder. Please try again.');
    }
  };
  
  // Reset reminder form
  const resetReminderForm = () => {
    setShowAddReminderModal(false);
    setNewReminderTitle('');
    setNewReminderType('other');
    setNewReminderDate('');
    setNewReminderTime('');
    setNewReminderNotes('');
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Subscription Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FiDollarSign className="text-green-500 mr-2" />
              <h3 className="text-white font-medium">Subscriptions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-400 text-sm">Monthly</p>
                <p className={`text-white text-lg font-bold ${isOverBudget ? 'text-red-500' : ''}`}>
                  {formatCurrency(personalMonthlyCost)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Yearly</p>
                <p className="text-white text-lg font-bold">{formatCurrency(personalYearlyCost)}</p>
              </div>
            </div>
             <div className="mt-2 pt-2 border-t border-gray-700 text-sm">
               {monthlyBudget > 0 && (
                 <p className={`text-gray-400 ${isOverBudget ? 'text-red-500' : ''}`}>
                   Budget: {formatCurrency(monthlyBudget)}/mo
                   {isOverBudget && (
                     <span className="text-xs text-red-400 ml-1">
                       (+{formatCurrency(budgetDifference)})
                     </span>
                   )}
                 </p>
               )}
               {businessMonthlyCost > 0 && (
                  <p className={`text-blue-400 ${monthlyBudget > 0 ? 'mt-1' : ''}`}>
                    + Business: {formatCurrency(businessMonthlyCost)}/mo
                  </p>
               )}
               <p className={`text-gray-400 ${monthlyBudget > 0 || businessMonthlyCost > 0 ? 'mt-1' : ''}`}>Total: {totalSubscriptions} subscriptions</p>
             </div>
          </div>
          
          {/* Website Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FiGlobe className="text-blue-500 mr-2" />
              <h3 className="text-white font-medium">Websites</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-400 text-sm">Active</p>
                <p className="text-white text-xl font-bold">{websiteStats.active}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Side Ideas</p>
                <p className="text-white text-xl font-bold">{websiteStats.ideas}</p>
              </div>
              <div>
                 <p className="text-gray-400 text-sm">Domains</p>
                 <p className="text-white text-xl font-bold">{websiteStats.domains}</p>
              </div>
              <div>
                 <p className="text-gray-400 text-sm">Graveyard</p>
                 <p className="text-white text-xl font-bold">{websiteStats.archived}</p>
              </div>
            </div>
             <p className="text-gray-400 text-sm mt-2 pt-2 border-t border-gray-700">Total Websites: {websiteStats.total}</p>
          </div>
          
          {/* Time Stats */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FiClock className="text-purple-500 mr-2" />
              <h3 className="text-white font-medium">Content Reminders</h3>
              <button
                onClick={() => setShowAddReminderModal(true)}
                className="ml-2 p-1 rounded bg-blue-600 hover:bg-blue-700 flex items-center text-xs"
                title="Add Reminder"
              >
                <FiPlus className="w-3 h-3" />
              </button>
            </div>
            
            {contentReminders.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {contentReminders.slice(0, 3).map((reminder) => (
                  <div 
                    key={`${reminder.planId}-${reminder.channelId}`} 
                    className="flex items-center text-sm text-gray-300 py-1 border-b border-gray-700"
                  >
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: reminder.channelType === 'facebook' ? '#3B82F6' : 
                                                                    reminder.channelType === 'twitter' ? '#1DA1F2' : 
                                                                    reminder.channelType === 'linkedin' ? '#0A66C2' : '#8B5CF6' }} />
                    <div className="flex-1 truncate">
                      {reminder.channelName}
                    </div>
                    <div className="ml-2 text-xs text-gray-400">
                      {formatPublishDate(reminder.publishDate)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-20">
                <p className="text-gray-400 text-sm">No upcoming reminders</p>
              </div>
            )}
            
            {contentReminders.length > 3 && (
              <div className="mt-2 text-xs text-right">
                <button className="text-blue-400 hover:text-blue-300 flex items-center justify-end ml-auto" 
                        onClick={() => {
                          // Trigger the Plan page navigation through the App component
                          const setShowPlanFn = (window as any).setShowPlan;
                          if (typeof setShowPlanFn === 'function') {
                            setShowPlanFn(true);
                            // Also need to hide the dashboard
                            const setShowDashboardFn = (window as any).setShowDashboard;
                            if (typeof setShowDashboardFn === 'function') {
                              setShowDashboardFn(false);
                            }
                          } else {
                            console.error("setShowPlan function not available");
                            alert('Navigate to Plan page');
                          }
                        }}>
                  <span>View all {contentReminders.length}</span>
                  <FiExternalLink className="ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Calendar Widget */}
        <div className="bg-gray-800 rounded-lg p-4 mb-2" ref={calendarRef}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <FiCalendar className="text-indigo-500 mr-2" />
              <h3 className="text-white font-medium">Calendar</h3>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateCalendar('prev')}
                className="p-1 rounded hover:bg-gray-700"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white">
                {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => navigateCalendar('next')}
                className="p-1 rounded hover:bg-gray-700"
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditingEventId(null);
                  resetEventForm();
                  setShowAddEventModal(true);
                }}
                className="ml-2 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 flex items-center"
              >
                <FiPlus className="w-4 h-4" />
                <span className="ml-1 text-sm">Event</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 relative">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={`header-${index}`} className="text-center text-xs text-gray-400 mb-1">
                {day}
              </div>
            ))}
            
            {calendarDays.map((date, index) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const isCurrentMonth = date.getMonth() === currentCalendarDate.getMonth();
              const events = getEventsForDate(date);
              
              return (
                <div 
                  key={`day-${index}`}
                  className={`h-9 p-1 rounded border ${
                    isToday 
                      ? 'border-blue-500 bg-blue-900 bg-opacity-20' 
                      : isCurrentMonth 
                        ? 'border-gray-700 bg-gray-700' 
                        : 'border-gray-800 bg-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between h-full">
                    <span className={`text-xs ${
                      isToday ? 'text-blue-400 font-bold' : isCurrentMonth ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {date.getDate()}
                    </span>
                    
                    {events.length > 0 && (
                      <div className="flex items-center space-x-1">
                        {events.map(event => (
                          <div 
                            key={event.id}
                            className="w-2 h-2 rounded-full cursor-pointer"
                            style={{ backgroundColor: event.color }}
                            onClick={() => editEvent(event.id)}
                            onMouseEnter={(e) => handleEventMouseEnter(event, e)}
                            onMouseLeave={handleEventMouseLeave}
                            title={`${event.title} (${event.type})`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Event Tooltip */}
            {hoveredEvent && (() => {
              const event = calendarEvents.find(e => e.id === hoveredEvent);
              if (!event) return null;
              
              // Find project name if it's a milestone
              const projectName = event.type === 'milestone' && event.projectId 
                ? availableProjects.find(p => p.id === event.projectId)?.name || 'Unknown Project'
                : null;
              
              // Format date for display
              const eventDate = new Date(event.date);
              const formattedDate = eventDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              });
              
              // Format recurrence info
              let recurrenceInfo = '';
              if (event.isRecurring) {
                recurrenceInfo = `Repeats ${event.recurrenceType}`;
                if (event.recurrenceEndDate) {
                  const endDate = new Date(event.recurrenceEndDate);
                  recurrenceInfo += ` until ${endDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}`;
                }
              }
              
              return (
                <div 
                  className="absolute z-10 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 text-white w-64 transition-opacity duration-200 cursor-help"
                  style={{ 
                    top: `${tooltipPosition.top - 30}px`, 
                    left: `${tooltipPosition.left - 40}px`,
                  }}
                >
                  <div className="flex items-center mb-2">
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: event.color }}
                    />
                    <span className="font-semibold text-base">{event.title}</span>
                  </div>
                  <div className="text-gray-400 ml-6 mb-2 text-sm">
                    {event.type === 'milestone' ? 'Milestone' : 'Event'}
                  </div>
                  <div className="flex items-center text-gray-300 mt-3 text-sm">
                    <FiCalendar className="mr-2 text-gray-500 flex-shrink-0" size={16} />
                    <div className="flex flex-col">
                      <span>{formattedDate}</span>
                      {event.time && <span className="text-gray-400">{event.time}</span>}
                      {event.isRecurring && <span className="text-gray-400 italic">{recurrenceInfo}</span>}
                    </div>
                  </div>
                  {projectName && (
                    <div className="flex items-center text-gray-300 mt-2 text-sm">
                      <FiFolder className="mr-2 text-gray-500 flex-shrink-0" size={16} />
                      {projectName}
                    </div>
                  )}
                </div>
              );
            })()}
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
      
      {/* Add/Edit Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 max-w-md w-full">
            <h3 className="text-lg font-medium text-white mb-4">
              {editingEventId ? 'Edit Calendar Event' : 'Add New Calendar Event'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Event Title</label>
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="Event Title"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Time (optional)</label>
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Event Type</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setNewEventType('event')}
                  className={`px-4 py-2 rounded ${
                    newEventType === 'event'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Event
                </button>
                <button
                  onClick={() => setNewEventType('milestone')}
                  className={`px-4 py-2 rounded ${
                    newEventType === 'milestone'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Milestone
                </button>
              </div>
            </div>
            
            {newEventType === 'milestone' && (
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Project</label>
                <select
                  value={newEventProjectId}
                  onChange={(e) => setNewEventProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="">Select a project</option>
                  {availableProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring-checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="recurring-checkbox" className="text-gray-300">
                  Recurring Event
                </label>
              </div>
            </div>
            
            {isRecurring && (
              <div className="bg-gray-700 p-3 rounded mb-4">
                <div className="mb-3">
                  <label className="block text-gray-300 mb-1">Repeat</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setRecurrenceType('daily')}
                      className={`px-3 py-1 rounded text-sm ${
                        recurrenceType === 'daily'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setRecurrenceType('weekly')}
                      className={`px-3 py-1 rounded text-sm ${
                        recurrenceType === 'weekly'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setRecurrenceType('monthly')}
                      className={`px-3 py-1 rounded text-sm ${
                        recurrenceType === 'monthly'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    min={newEventDate} // Can't end before start date
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty for no end date</p>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Color</label>
              <div className="flex space-x-2">
                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                  <div
                    key={color}
                    className={`w-8 h-8 rounded-full cursor-pointer ${
                      newEventColor === color ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewEventColor(color)}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              {editingEventId && (
                <button
                  onClick={() => deleteEvent(editingEventId)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              <button
                onClick={resetEventForm}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={addEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!newEventTitle || !newEventDate || (newEventType === 'milestone' && !newEventProjectId)}
              >
                {editingEventId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 max-w-md w-full">
            <h3 className="text-lg font-medium text-white mb-4">
              Add New Reminder
            </h3>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="Reminder Title"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Time</label>
                <input
                  type="time"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Type</label>
              <select
                value={newReminderType}
                onChange={(e) => setNewReminderType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="blog">Blog</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Notes (Optional)</label>
              <textarea
                value={newReminderNotes}
                onChange={(e) => setNewReminderNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                rows={3}
                placeholder="Add additional details here..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={resetReminderForm}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={addReminder}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!newReminderTitle || !newReminderDate}
              >
                Add Reminder
              </button>
            </div>
          </div>
        </div>
      )}
     
    </div>
  );
};

export default Dashboard;
