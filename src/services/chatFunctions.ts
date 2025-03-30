import { storeService } from "./storeService";

// Helper function to generate readable IDs
const generateReadableId = (prefix: string, length: number = 8): string => {
  // Generate readable ID with prefix, timestamp, and random characters
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random()
    .toString(36)
    .substring(2, 2 + length);
  return `${prefix}_${timestamp}_${randomStr}`;
};

// Helper types to match the existing app structure
interface ContentPlan {
  id: string;
  name: string;
  description?: string;
  channels: Channel[];
  createdAt: string;
  updatedAt: string;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  status: "draft" | "scheduled" | "published";
  description?: string;
  audience?: string;
  publishDate?: string;
  document?: {
    title: string;
    content: string;
  };
}

interface Website {
  id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  createdAt: string;
  status: "active" | "idea" | "archived";
}

interface Subscription {
  id: string;
  name: string;
  url: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  startDate: string;
  category: string;
  notes?: string;
  linkedWebsites?: string[];
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  time?: string; // Time in HH:MM format
  type: "event" | "milestone";
  projectId?: string; // For milestones
  color: string;
  isRecurring?: boolean;
  recurrenceType?: "daily" | "weekly" | "monthly";
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

// Content Plan Functions
export const planFunctions = {
  /**
   * Get all content plans or a specific plan by ID
   */
  async getPlans(planId?: string): Promise<any> {
    try {
      const plans = await storeService.getContentPlans();

      if (planId) {
        const plan = plans.find((p: ContentPlan) => p.id === planId);
        if (!plan) {
          return {
            success: false,
            message: `Plan with ID ${planId} not found`,
          };
        }
        return { success: true, data: plan };
      }

      return { success: true, data: plans };
    } catch (error) {
      console.error("Error getting plans:", error);
      return {
        success: false,
        message: `Error retrieving plans: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Create a new content plan
   */
  async createPlan(name: string, description?: string): Promise<any> {
    try {
      if (!name.trim()) {
        return { success: false, message: "Plan name is required" };
      }

      const plans = (await storeService.getContentPlans()) || [];

      const newPlan: ContentPlan = {
        id: generateReadableId("plan"),
        name: name.trim(),
        description: description?.trim(),
        channels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedPlans = [...plans, newPlan];
      await storeService.saveContentPlans(updatedPlans);

      return { success: true, data: newPlan };
    } catch (error) {
      console.error("Error creating plan:", error);
      return {
        success: false,
        message: `Error creating plan: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Update an existing content plan
   */
  async updatePlan(
    planId: string,
    updates: Partial<ContentPlan>
  ): Promise<any> {
    try {
      const plans = (await storeService.getContentPlans()) || [];
      const planIndex = plans.findIndex((p: ContentPlan) => p.id === planId);

      if (planIndex === -1) {
        return { success: false, message: `Plan with ID ${planId} not found` };
      }

      // Update the plan with new values, keeping existing ones if not provided
      plans[planIndex] = {
        ...plans[planIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await storeService.saveContentPlans(plans);

      return { success: true, data: plans[planIndex] };
    } catch (error) {
      console.error("Error updating plan:", error);
      return {
        success: false,
        message: `Error updating plan: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Delete a content plan
   */
  async deletePlan(planId: string): Promise<any> {
    try {
      const plans = (await storeService.getContentPlans()) || [];
      const filteredPlans = plans.filter((p: ContentPlan) => p.id !== planId);

      if (filteredPlans.length === plans.length) {
        return { success: false, message: `Plan with ID ${planId} not found` };
      }

      await storeService.saveContentPlans(filteredPlans);

      return { success: true, message: "Plan deleted successfully" };
    } catch (error) {
      console.error("Error deleting plan:", error);
      return {
        success: false,
        message: `Error deleting plan: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Add a channel to a content plan
   */
  async addChannel(
    planId: string,
    channelData: Partial<Channel>
  ): Promise<any> {
    try {
      if (!channelData.name || !channelData.type) {
        return {
          success: false,
          message: "Channel name and type are required",
        };
      }

      const plans = (await storeService.getContentPlans()) || [];
      const planIndex = plans.findIndex((p: ContentPlan) => p.id === planId);

      if (planIndex === -1) {
        return { success: false, message: `Plan with ID ${planId} not found` };
      }

      const newChannel: Channel = {
        id: generateReadableId("channel"),
        name: channelData.name,
        type: channelData.type,
        status: channelData.status || "draft",
        description: channelData.description,
        audience: channelData.audience,
        publishDate: channelData.publishDate,
        document: channelData.document,
      };

      plans[planIndex].channels.push(newChannel);
      plans[planIndex].updatedAt = new Date().toISOString();

      await storeService.saveContentPlans(plans);

      return { success: true, data: newChannel };
    } catch (error) {
      console.error("Error adding channel:", error);
      return {
        success: false,
        message: `Error adding channel: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Update a channel in a content plan
   */
  async updateChannel(
    planId: string,
    channelId: string,
    updates: Partial<Channel>
  ): Promise<any> {
    try {
      const plans = (await storeService.getContentPlans()) || [];
      const planIndex = plans.findIndex((p: ContentPlan) => p.id === planId);

      if (planIndex === -1) {
        return { success: false, message: `Plan with ID ${planId} not found` };
      }

      const channelIndex = plans[planIndex].channels.findIndex(
        (c: Channel) => c.id === channelId
      );

      if (channelIndex === -1) {
        return {
          success: false,
          message: `Channel with ID ${channelId} not found in plan`,
        };
      }

      // Update the channel with new values, keeping existing ones if not provided
      plans[planIndex].channels[channelIndex] = {
        ...plans[planIndex].channels[channelIndex],
        ...updates,
      };

      plans[planIndex].updatedAt = new Date().toISOString();

      await storeService.saveContentPlans(plans);

      return { success: true, data: plans[planIndex].channels[channelIndex] };
    } catch (error) {
      console.error("Error updating channel:", error);
      return {
        success: false,
        message: `Error updating channel: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Delete a channel from a content plan
   */
  async deleteChannel(planId: string, channelId: string): Promise<any> {
    try {
      const plans = (await storeService.getContentPlans()) || [];
      const planIndex = plans.findIndex((p: ContentPlan) => p.id === planId);

      if (planIndex === -1) {
        return { success: false, message: `Plan with ID ${planId} not found` };
      }

      const originalLength = plans[planIndex].channels.length;
      plans[planIndex].channels = plans[planIndex].channels.filter(
        (c: Channel) => c.id !== channelId
      );

      if (plans[planIndex].channels.length === originalLength) {
        return {
          success: false,
          message: `Channel with ID ${channelId} not found in plan`,
        };
      }

      plans[planIndex].updatedAt = new Date().toISOString();

      await storeService.saveContentPlans(plans);

      return { success: true, message: "Channel deleted successfully" };
    } catch (error) {
      console.error("Error deleting channel:", error);
      return {
        success: false,
        message: `Error deleting channel: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Add or update a document in a channel
   */
  async updateChannelDocument(
    planId: string,
    channelId: string,
    documentTitle: string,
    documentContent: string
  ): Promise<any> {
    try {
      if (!documentTitle.trim() || !documentContent.trim()) {
        return {
          success: false,
          message: "Document title and content are required",
        };
      }

      const plans = (await storeService.getContentPlans()) || [];
      const planIndex = plans.findIndex((p: ContentPlan) => p.id === planId);

      if (planIndex === -1) {
        return { success: false, message: `Plan with ID ${planId} not found` };
      }

      const channelIndex = plans[planIndex].channels.findIndex(
        (c: Channel) => c.id === channelId
      );

      if (channelIndex === -1) {
        return {
          success: false,
          message: `Channel with ID ${channelId} not found in plan`,
        };
      }

      plans[planIndex].channels[channelIndex].document = {
        title: documentTitle.trim(),
        content: documentContent.trim(),
      };

      plans[planIndex].updatedAt = new Date().toISOString();

      await storeService.saveContentPlans(plans);

      return {
        success: true,
        data: plans[planIndex].channels[channelIndex].document,
      };
    } catch (error) {
      console.error("Error updating channel document:", error);
      return {
        success: false,
        message: `Error updating channel document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Search for plans by name or description
   */
  async searchPlans(query: string): Promise<any> {
    try {
      if (!query.trim()) {
        return { success: false, message: "Search query is required" };
      }

      const plans = (await storeService.getContentPlans()) || [];
      const searchTerm = query.toLowerCase().trim();

      const results = plans.filter((plan: ContentPlan) => {
        return (
          plan.name.toLowerCase().includes(searchTerm) ||
          (plan.description &&
            plan.description.toLowerCase().includes(searchTerm))
        );
      });

      return { success: true, data: results };
    } catch (error) {
      console.error("Error searching plans:", error);
      return {
        success: false,
        message: `Error searching plans: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Search for channels by name, type, or document content
   */
  async searchChannels(query: string, planId?: string): Promise<any> {
    try {
      if (!query.trim()) {
        return { success: false, message: "Search query is required" };
      }

      const plans = (await storeService.getContentPlans()) || [];
      const searchTerm = query.toLowerCase().trim();

      // We'll return matches with their plan context
      const results: Array<{ plan: ContentPlan; channel: Channel }> = [];

      plans.forEach((plan: ContentPlan) => {
        // Skip if we're filtering by planId and this isn't the right plan
        if (planId && plan.id !== planId) return;

        plan.channels.forEach((channel: Channel) => {
          if (
            channel.name.toLowerCase().includes(searchTerm) ||
            channel.type.toLowerCase().includes(searchTerm) ||
            (channel.description &&
              channel.description.toLowerCase().includes(searchTerm)) ||
            (channel.document &&
              channel.document.title.toLowerCase().includes(searchTerm)) ||
            (channel.document &&
              channel.document.content.toLowerCase().includes(searchTerm))
          ) {
            results.push({ plan, channel });
          }
        });
      });

      return { success: true, data: results };
    } catch (error) {
      console.error("Error searching channels:", error);
      return {
        success: false,
        message: `Error searching channels: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};

// Website Functions
export const websiteFunctions = {
  /**
   * Get all websites or a specific website by ID
   */
  async getWebsites(websiteId?: string): Promise<any> {
    try {
      const websites = (await storeService.getWebsites()) || [];

      if (websiteId) {
        const website = websites.find((w: Website) => w.id === websiteId);
        if (!website) {
          return {
            success: false,
            message: `Website with ID ${websiteId} not found`,
          };
        }
        return { success: true, data: website };
      }

      return { success: true, data: websites };
    } catch (error) {
      console.error("Error getting websites:", error);
      return {
        success: false,
        message: `Error retrieving websites: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Create a new website
   */
  async createWebsite(websiteData: Partial<Website>): Promise<any> {
    try {
      if (!websiteData.name || !websiteData.url) {
        return { success: false, message: "Website name and URL are required" };
      }

      // Add http:// if missing
      let url = websiteData.url;
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }

      const websites = (await storeService.getWebsites()) || [];

      const newWebsite: Website = {
        id: generateReadableId("website"),
        name: websiteData.name.trim(),
        url: url,
        category: websiteData.category || "Other",
        description: websiteData.description?.trim(),
        createdAt: new Date().toISOString(),
        status: websiteData.status || "active",
      };

      const updatedWebsites = [...websites, newWebsite];
      await storeService.saveWebsites(updatedWebsites);

      return { success: true, data: newWebsite };
    } catch (error) {
      console.error("Error creating website:", error);
      return {
        success: false,
        message: `Error creating website: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Update an existing website
   */
  async updateWebsite(
    websiteId: string,
    updates: Partial<Website>
  ): Promise<any> {
    try {
      const websites = (await storeService.getWebsites()) || [];
      const websiteIndex = websites.findIndex(
        (w: Website) => w.id === websiteId
      );

      if (websiteIndex === -1) {
        return {
          success: false,
          message: `Website with ID ${websiteId} not found`,
        };
      }

      // If URL is provided, ensure it has http:// prefix
      if (updates.url && !/^https?:\/\//i.test(updates.url)) {
        updates.url = "https://" + updates.url;
      }

      // Update the website with new values, keeping existing ones if not provided
      websites[websiteIndex] = {
        ...websites[websiteIndex],
        ...updates,
      };

      await storeService.saveWebsites(websites);

      return { success: true, data: websites[websiteIndex] };
    } catch (error) {
      console.error("Error updating website:", error);
      return {
        success: false,
        message: `Error updating website: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Delete a website
   */
  async deleteWebsite(websiteId: string): Promise<any> {
    try {
      const websites = (await storeService.getWebsites()) || [];
      const filteredWebsites = websites.filter(
        (w: Website) => w.id !== websiteId
      );

      if (filteredWebsites.length === websites.length) {
        return {
          success: false,
          message: `Website with ID ${websiteId} not found`,
        };
      }

      await storeService.saveWebsites(filteredWebsites);

      return { success: true, message: "Website deleted successfully" };
    } catch (error) {
      console.error("Error deleting website:", error);
      return {
        success: false,
        message: `Error deleting website: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Get all website categories
   */
  async getWebsiteCategories(): Promise<any> {
    try {
      const categories = (await storeService.getWebsiteCategories()) || [];
      return { success: true, data: categories };
    } catch (error) {
      console.error("Error getting website categories:", error);
      return {
        success: false,
        message: `Error retrieving website categories: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Search for websites by name, url, or description
   */
  async searchWebsites(
    query: string,
    status?: "active" | "idea" | "archived"
  ): Promise<any> {
    try {
      if (!query.trim()) {
        return { success: false, message: "Search query is required" };
      }

      const websites = (await storeService.getWebsites()) || [];
      const searchTerm = query.toLowerCase().trim();

      // Filter websites by search term and optionally by status
      const results = websites.filter((website: Website) => {
        // First check if status matches if provided
        if (status && website.status !== status) return false;

        // Then check if any fields match the search query
        return (
          website.name.toLowerCase().includes(searchTerm) ||
          website.url.toLowerCase().includes(searchTerm) ||
          website.category.toLowerCase().includes(searchTerm) ||
          (website.description &&
            website.description.toLowerCase().includes(searchTerm))
        );
      });

      return { success: true, data: results };
    } catch (error) {
      console.error("Error searching websites:", error);
      return {
        success: false,
        message: `Error searching websites: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};

// Subscription Functions
export const subscriptionFunctions = {
  /**
   * Get all subscriptions or a specific subscription by ID
   */
  async getSubscriptions(subscriptionId?: string): Promise<any> {
    try {
      const subscriptions = (await storeService.getSubscriptions()) || [];

      if (subscriptionId) {
        const subscription = subscriptions.find(
          (s: Subscription) => s.id === subscriptionId
        );
        if (!subscription) {
          return {
            success: false,
            message: `Subscription with ID ${subscriptionId} not found`,
          };
        }
        return { success: true, data: subscription };
      }

      return { success: true, data: subscriptions };
    } catch (error) {
      console.error("Error getting subscriptions:", error);
      return {
        success: false,
        message: `Error retrieving subscriptions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Create a new subscription
   */
  async createSubscription(
    subscriptionData: Partial<Subscription>
  ): Promise<any> {
    try {
      if (
        !subscriptionData.name ||
        typeof subscriptionData.price !== "number"
      ) {
        return {
          success: false,
          message: "Subscription name and price are required",
        };
      }

      // Add http:// to URL if provided but missing
      let url = subscriptionData.url || "";
      if (url && !/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }

      const subscriptions = (await storeService.getSubscriptions()) || [];

      const newSubscription: Subscription = {
        id: generateReadableId("subscription"),
        name: subscriptionData.name.trim(),
        url: url,
        price: subscriptionData.price,
        billingCycle: subscriptionData.billingCycle || "monthly",
        startDate:
          subscriptionData.startDate || new Date().toISOString().split("T")[0],
        category: subscriptionData.category || "Other",
        notes: subscriptionData.notes?.trim(),
        linkedWebsites: subscriptionData.linkedWebsites || [],
      };

      const updatedSubscriptions = [...subscriptions, newSubscription];
      await storeService.saveSubscriptions(updatedSubscriptions);

      return { success: true, data: newSubscription };
    } catch (error) {
      console.error("Error creating subscription:", error);
      return {
        success: false,
        message: `Error creating subscription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<any> {
    try {
      const subscriptions = (await storeService.getSubscriptions()) || [];
      const subscriptionIndex = subscriptions.findIndex(
        (s: Subscription) => s.id === subscriptionId
      );

      if (subscriptionIndex === -1) {
        return {
          success: false,
          message: `Subscription with ID ${subscriptionId} not found`,
        };
      }

      // If URL is provided, ensure it has http:// prefix
      if (updates.url && !/^https?:\/\//i.test(updates.url)) {
        updates.url = "https://" + updates.url;
      }

      // Update the subscription with new values, keeping existing ones if not provided
      subscriptions[subscriptionIndex] = {
        ...subscriptions[subscriptionIndex],
        ...updates,
      };

      await storeService.saveSubscriptions(subscriptions);

      return { success: true, data: subscriptions[subscriptionIndex] };
    } catch (error) {
      console.error("Error updating subscription:", error);
      return {
        success: false,
        message: `Error updating subscription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Delete a subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<any> {
    try {
      const subscriptions = (await storeService.getSubscriptions()) || [];
      const filteredSubscriptions = subscriptions.filter(
        (s: Subscription) => s.id !== subscriptionId
      );

      if (filteredSubscriptions.length === subscriptions.length) {
        return {
          success: false,
          message: `Subscription with ID ${subscriptionId} not found`,
        };
      }

      await storeService.saveSubscriptions(filteredSubscriptions);

      return { success: true, message: "Subscription deleted successfully" };
    } catch (error) {
      console.error("Error deleting subscription:", error);
      return {
        success: false,
        message: `Error deleting subscription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Get all subscription categories
   */
  async getSubscriptionCategories(): Promise<any> {
    try {
      const categories = (await storeService.getSubscriptionCategories()) || [];
      return { success: true, data: categories };
    } catch (error) {
      console.error("Error getting subscription categories:", error);
      return {
        success: false,
        message: `Error retrieving subscription categories: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Search for subscriptions by name, category, or notes
   */
  async searchSubscriptions(query: string): Promise<any> {
    try {
      if (!query.trim()) {
        return { success: false, message: "Search query is required" };
      }

      const subscriptions = (await storeService.getSubscriptions()) || [];
      const searchTerm = query.toLowerCase().trim();

      const results = subscriptions.filter((subscription: Subscription) => {
        return (
          subscription.name.toLowerCase().includes(searchTerm) ||
          subscription.category.toLowerCase().includes(searchTerm) ||
          (subscription.notes &&
            subscription.notes.toLowerCase().includes(searchTerm)) ||
          subscription.url.toLowerCase().includes(searchTerm)
        );
      });

      return { success: true, data: results };
    } catch (error) {
      console.error("Error searching subscriptions:", error);
      return {
        success: false,
        message: `Error searching subscriptions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};

// Calendar Functions
export const calendarFunctions = {
  /**
   * Get all calendar events or events for a specific date range
   */
  async getCalendarEvents(startDate?: string, endDate?: string): Promise<any> {
    try {
      // Calendar events are stored in localStorage
      const eventsJson = localStorage.getItem("calendar_events");
      const events = eventsJson ? JSON.parse(eventsJson) : [];

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const filteredEvents = events.filter((event: CalendarEvent) => {
          const eventDate = new Date(event.date);
          return eventDate >= start && eventDate <= end;
        });

        return { success: true, data: filteredEvents };
      }

      return { success: true, data: events };
    } catch (error) {
      console.error("Error getting calendar events:", error);
      return {
        success: false,
        message: `Error retrieving calendar events: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Create a new calendar event
   */
  async createCalendarEvent(eventData: Partial<CalendarEvent>): Promise<any> {
    try {
      if (!eventData.title || !eventData.date) {
        return { success: false, message: "Event title and date are required" };
      }

      // Parse events from localStorage
      const eventsJson = localStorage.getItem("calendar_events");
      const events = eventsJson ? JSON.parse(eventsJson) : [];

      const newEvent: CalendarEvent = {
        id: generateReadableId("event"),
        title: eventData.title.trim(),
        date: new Date(eventData.date).toISOString(),
        time: eventData.time,
        type: eventData.type || "event",
        color: eventData.color || "#3B82F6", // Default blue color
        isRecurring: eventData.isRecurring || false,
        ...(eventData.isRecurring && {
          recurrenceType: eventData.recurrenceType || "weekly",
          ...(eventData.recurrenceEndDate && {
            recurrenceEndDate: new Date(
              eventData.recurrenceEndDate
            ).toISOString(),
          }),
        }),
        ...(eventData.type === "milestone" &&
          eventData.projectId && {
            projectId: eventData.projectId,
          }),
      };

      const updatedEvents = [...events, newEvent];
      localStorage.setItem("calendar_events", JSON.stringify(updatedEvents));

      return { success: true, data: newEvent };
    } catch (error) {
      console.error("Error creating calendar event:", error);
      return {
        success: false,
        message: `Error creating calendar event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Update an existing calendar event
   */
  async updateCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<any> {
    try {
      // Parse events from localStorage
      const eventsJson = localStorage.getItem("calendar_events");
      const events = eventsJson ? JSON.parse(eventsJson) : [];

      const eventIndex = events.findIndex(
        (e: CalendarEvent) => e.id === eventId
      );

      if (eventIndex === -1) {
        return {
          success: false,
          message: `Event with ID ${eventId} not found`,
        };
      }

      // If the date is provided, convert it to ISO string
      if (updates.date) {
        updates.date = new Date(updates.date).toISOString();
      }

      // If the recurrence end date is provided, convert it to ISO string
      if (updates.recurrenceEndDate) {
        updates.recurrenceEndDate = new Date(
          updates.recurrenceEndDate
        ).toISOString();
      }

      // Update the event with new values, keeping existing ones if not provided
      events[eventIndex] = {
        ...events[eventIndex],
        ...updates,
      };

      localStorage.setItem("calendar_events", JSON.stringify(events));

      return { success: true, data: events[eventIndex] };
    } catch (error) {
      console.error("Error updating calendar event:", error);
      return {
        success: false,
        message: `Error updating calendar event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(eventId: string): Promise<any> {
    try {
      // Parse events from localStorage
      const eventsJson = localStorage.getItem("calendar_events");
      const events = eventsJson ? JSON.parse(eventsJson) : [];

      const filteredEvents = events.filter(
        (e: CalendarEvent) => e.id !== eventId
      );

      if (filteredEvents.length === events.length) {
        return {
          success: false,
          message: `Event with ID ${eventId} not found`,
        };
      }

      localStorage.setItem("calendar_events", JSON.stringify(filteredEvents));

      return { success: true, message: "Event deleted successfully" };
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      return {
        success: false,
        message: `Error deleting calendar event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Get available projects for milestone events
   */
  async getProjects(): Promise<any> {
    try {
      const projects = (await storeService.getProjects()) || [];
      return {
        success: true,
        data: projects.map((p: any) => ({ id: p.id, name: p.name })),
      };
    } catch (error) {
      console.error("Error getting projects:", error);
      return {
        success: false,
        message: `Error retrieving projects: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Search for calendar events by title
   */
  async searchCalendarEvents(query: string): Promise<any> {
    try {
      if (!query.trim()) {
        return { success: false, message: "Search query is required" };
      }

      // Calendar events are stored in localStorage
      const eventsJson = localStorage.getItem("calendar_events");
      const events = eventsJson ? JSON.parse(eventsJson) : [];
      const searchTerm = query.toLowerCase().trim();

      const results = events.filter((event: CalendarEvent) => {
        return event.title.toLowerCase().includes(searchTerm);
      });

      return { success: true, data: results };
    } catch (error) {
      console.error("Error searching calendar events:", error);
      return {
        success: false,
        message: `Error searching calendar events: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};

// Reminder Functions
export const reminderFunctions = {
  /**
   * Get all content reminders
   */
  async getReminders(): Promise<any> {
    try {
      // Get reminders from planned content
      const plans = (await storeService.getContentPlans()) || [];
      const now = new Date();

      // Extract scheduled channels with upcoming dates
      const contentReminders: ContentReminder[] = [];

      plans.forEach((plan: ContentPlan) => {
        const scheduledChannels = plan.channels.filter((channel: Channel) => {
          if (channel.status !== "scheduled" || !channel.publishDate)
            return false;

          const publishDate = new Date(channel.publishDate);
          return publishDate >= now;
        });

        scheduledChannels.forEach((channel: Channel) => {
          contentReminders.push({
            planId: plan.id,
            planName: plan.name,
            channelId: channel.id,
            channelName: channel.name,
            channelType: channel.type,
            publishDate: channel.publishDate!,
            documentTitle: channel.document?.title,
          });
        });
      });

      // Get manual reminders
      const manualReminders = (await storeService.getPlanReminders()) || [];

      // Combine and sort by date
      const allReminders = [...contentReminders, ...manualReminders];
      allReminders.sort(
        (a, b) =>
          new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
      );

      return { success: true, data: allReminders };
    } catch (error) {
      console.error("Error getting reminders:", error);
      return {
        success: false,
        message: `Error retrieving reminders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Create a new manual reminder
   */
  async createReminder(
    title: string,
    type: string,
    publishDate: string,
    time?: string,
    notes?: string
  ): Promise<any> {
    try {
      if (!title.trim() || !publishDate) {
        return {
          success: false,
          message: "Reminder title and date are required",
        };
      }

      const existingReminders = (await storeService.getPlanReminders()) || [];

      const reminderDate = time
        ? new Date(`${publishDate}T${time}:00`)
        : new Date(`${publishDate}T12:00:00`);

      const reminderId = generateReadableId("reminder");

      const newReminder: ContentReminder = {
        planId: "manual-" + reminderId,
        planName: "Manual Reminder",
        channelId: reminderId,
        channelName: title.trim(),
        channelType: type || "other",
        publishDate: reminderDate.toISOString(),
        documentTitle: notes,
      };

      const updatedReminders = [...existingReminders, newReminder];
      await storeService.savePlanReminders(updatedReminders);

      return { success: true, data: newReminder };
    } catch (error) {
      console.error("Error creating reminder:", error);
      return {
        success: false,
        message: `Error creating reminder: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Delete a manual reminder
   */
  async deleteReminder(reminderId: string): Promise<any> {
    try {
      // Only manual reminders can be deleted directly
      if (!reminderId.includes("manual-")) {
        return {
          success: false,
          message:
            "Only manual reminders can be deleted directly. To remove content-based reminders, update the content plan.",
        };
      }

      const reminders = (await storeService.getPlanReminders()) || [];
      const filteredReminders = reminders.filter(
        (r: ContentReminder) => r.planId !== reminderId
      );

      if (filteredReminders.length === reminders.length) {
        return {
          success: false,
          message: `Reminder with ID ${reminderId} not found`,
        };
      }

      await storeService.savePlanReminders(filteredReminders);

      return { success: true, message: "Reminder deleted successfully" };
    } catch (error) {
      console.error("Error deleting reminder:", error);
      return {
        success: false,
        message: `Error deleting reminder: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },

  /**
   * Search for reminders by title or notes
   */
  async searchReminders(query: string): Promise<any> {
    try {
      if (!query.trim()) {
        return { success: false, message: "Search query is required" };
      }

      // Get all reminders (both content-based and manual)
      const allReminders = await this.getReminders();
      if (!allReminders.success) return allReminders;

      const searchTerm = query.toLowerCase().trim();

      const results = allReminders.data.filter((reminder: ContentReminder) => {
        return (
          reminder.channelName.toLowerCase().includes(searchTerm) ||
          (reminder.documentTitle &&
            reminder.documentTitle.toLowerCase().includes(searchTerm))
        );
      });

      return { success: true, data: results };
    } catch (error) {
      console.error("Error searching reminders:", error);
      return {
        success: false,
        message: `Error searching reminders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};

// Map of all chat function handlers
export const chatFunctions = {
  ...planFunctions,
  ...websiteFunctions,
  ...subscriptionFunctions,
  ...calendarFunctions,
  ...reminderFunctions,
};

// Export a helper function to generate a system prompt that describes all capabilities
export const getCapabilitiesSystemPrompt = (): string => {
  return `You are a helpful assistant with the ability to manage data in the application.

You can perform the following operations:

1. Content Plans and Channels:
- Get all content plans or details of a specific plan
- Create new content plans
- Update existing content plans
- Delete content plans
- Add channels to content plans (Facebook, Twitter, Instagram, Blog, Email, etc.)
- Update channels in content plans
- Delete channels from content plans
- Create or update documents for channels

2. Websites:
- Get all websites or details of a specific website
- Create new websites
- Update existing websites
- Delete websites
- Get all website categories

3. Subscriptions:
- Get all subscriptions or details of a specific subscription
- Create new subscriptions
- Update existing subscriptions
- Delete subscriptions
- Get all subscription categories

4. Calendar Events:
- Get all calendar events or events in a specific date range
- Create new calendar events or milestones
- Update existing calendar events
- Delete calendar events
- Get all projects for milestone creation

5. Reminders:
- Get all content reminders
- Create new manual reminders
- Delete manual reminders

When users ask you to perform these operations, you will use your function calling capabilities to execute them. Always ask for confirmation before making destructive changes (updates or deletions).

You should help users maintain their content plans, track their websites and subscriptions, manage their calendar events, and stay on top of their reminders.
`;
};

export default chatFunctions;
