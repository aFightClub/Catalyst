import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit, FiGlobe, FiSave, FiX, FiLink, FiExternalLink } from 'react-icons/fi';
import { storeService } from '../../services/storeService';

interface Website {
  id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  createdAt: string;
}

const DEFAULT_CATEGORIES = [
  'Personal',
  'Business',
  'Blog',
  'E-commerce',
  'Portfolio',
  'Social Media',
  'Education',
  'Other'
];

const Websites: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [newWebsite, setNewWebsite] = useState<Website>({
    id: '',
    name: '',
    url: '',
    category: 'Other',
    description: '',
    createdAt: new Date().toISOString()
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load websites from store
  useEffect(() => {
    const loadWebsites = async () => {
      setIsLoading(true);
      try {
        const storedWebsites = await storeService.getWebsites();
        if (Array.isArray(storedWebsites)) {
          setWebsites(storedWebsites);
        } else {
          console.warn("Websites data is not an array, using empty array", storedWebsites);
          setWebsites([]);
        }
      } catch (error) {
        console.error("Failed to load websites:", error);
        setWebsites([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWebsites();
  }, []);

  // Save websites when they change
  useEffect(() => {
    const saveWebsites = async () => {
      if (isLoading) return; // Don't save during initial load
      
      try {
        await storeService.saveWebsites(websites);
      } catch (error) {
        console.error("Failed to save websites:", error);
      }
    };
    
    saveWebsites();
  }, [websites, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (editingWebsiteId) {
      setWebsites(sites => 
        sites.map(site => 
          site.id === editingWebsiteId 
            ? { ...site, [name]: value } 
            : site
        )
      );
    } else {
      setNewWebsite(prev => ({ 
        ...prev, 
        [name]: value 
      }));
    }
  };

  const addWebsite = () => {
    if (!newWebsite.name.trim() || !newWebsite.url.trim()) return;
    
    // Add http:// if missing
    let url = newWebsite.url;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    const website: Website = {
      ...newWebsite,
      url,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    setWebsites([...websites, website]);
    setNewWebsite({
      id: '',
      name: '',
      url: '',
      category: 'Other',
      description: '',
      createdAt: new Date().toISOString()
    });
    setIsAddingNew(false);
  };

  const startEditing = (id: string) => {
    setEditingWebsiteId(id);
  };

  const cancelEditing = () => {
    setEditingWebsiteId(null);
  };

  const deleteWebsite = (id: string) => {
    if (confirm('Are you sure you want to delete this website?')) {
      setWebsites(websites.filter(site => site.id !== id));
      if (editingWebsiteId === id) {
        setEditingWebsiteId(null);
      }
    }
  };

  const getCategories = () => {
    const existingCategories = new Set(websites.map(site => site.category));
    const allCategories = new Set([...DEFAULT_CATEGORIES, ...existingCategories]);
    return Array.from(allCategories);
  };

  // Filter websites by category
  const filteredWebsites = selectedCategory 
    ? websites.filter(site => site.category === selectedCategory) 
    : websites;

  // Open website in the default system browser or a new browser tab as fallback
  const openWebsite = (url: string) => {
    try {
      // Open in a new browser tab with security attributes
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open URL:', error);
      // Simple fallback
      window.open(url, '_blank');
    }
  };

  // Format the date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex justify-center items-center h-full">
          <p className="text-gray-400">Loading websites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">My Websites</h1>
      
      {/* Stats overview */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <div className="flex items-center mb-2">
          <FiGlobe className="mr-2 text-blue-500" />
          <h2 className="text-xl font-semibold">Website Overview</h2>
        </div>
        <p className="text-3xl font-bold">{websites.length}</p>
        <p className="text-sm text-gray-400 mt-2">websites registered</p>
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
      
      {/* Add new website button */}
      {!isAddingNew && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center mb-6 hover:bg-blue-700"
        >
          <FiPlus className="mr-2" />
          Add Website
        </button>
      )}
      
      {/* Add new website form */}
      {isAddingNew && (
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Website</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={newWebsite.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Website"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
              <input
                type="text"
                name="url"
                value={newWebsite.url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                name="category"
                value={newWebsite.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description (optional)</label>
              <input
                type="text"
                name="description"
                value={newWebsite.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={addWebsite}
              disabled={!newWebsite.name.trim() || !newWebsite.url.trim()}
              className={`px-4 py-2 rounded ${
                !newWebsite.name.trim() || !newWebsite.url.trim()
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Add Website
            </button>
          </div>
        </div>
      )}
      
      {/* Websites list */}
      {filteredWebsites.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <FiGlobe className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">No websites yet</h3>
          <p className="text-gray-400 mb-4">Add your first website to get started</p>
          {!isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              <FiPlus className="inline mr-2" />
              Add Website
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWebsites.map(website => (
            <div key={website.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              {editingWebsiteId === website.id ? (
                // Edit mode
                <div className="p-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={website.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
                    <input
                      type="text"
                      name="url"
                      value={website.url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                    <select
                      name="category"
                      value={website.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {getCategories().map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                    <input
                      type="text"
                      name="description"
                      value={website.description}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      <FiX className="inline mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={() => setEditingWebsiteId(null)}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      <FiSave className="inline mr-1" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold mb-1">{website.name}</h3>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEditing(website.id)}
                          className="p-1 rounded hover:bg-gray-700"
                          title="Edit"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteWebsite(website.id)}
                          className="p-1 rounded hover:bg-gray-700"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-2 text-sm text-gray-400">
                      <FiLink className="mr-1" />
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          openWebsite(website.url);
                        }}
                        className="text-blue-400 hover:text-blue-300 truncate"
                      >
                        {website.url.replace(/^https?:\/\//i, '')}
                      </a>
                    </div>
                    
                    {website.description && (
                      <p className="text-sm text-gray-300 mb-3">{website.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center mt-4">
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-700">
                        {website.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        Added {formatDate(website.createdAt)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Websites; 