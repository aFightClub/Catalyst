import React, { useState, useRef, useEffect } from 'react';
import { FiDownload, FiCopy, FiImage, FiExternalLink, FiType, FiMove, FiEdit, FiLayers, FiVideo } from 'react-icons/fi';

interface ImageTemplate {
  id: string;
  name: string;
  platform: SocialPlatform;
  width: number;
  height: number;
  description: string;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  isDragging: boolean;
}

type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'pinterest' | 'youtube';

const TEMPLATES: ImageTemplate[] = [
  // Facebook
  {
    id: 'fb-profile',
    name: 'Profile Picture',
    platform: 'facebook',
    width: 170,
    height: 170,
    description: 'Facebook profile picture (displays at 170x170 px)'
  },
  {
    id: 'fb-cover',
    name: 'Cover Photo',
    platform: 'facebook',
    width: 820,
    height: 312,
    description: 'Facebook cover photo (820x312 px)'
  },
  {
    id: 'fb-post',
    name: 'Post Image',
    platform: 'facebook',
    width: 1200,
    height: 630,
    description: 'Recommended size for Facebook posts (1200x630 px)'
  },
  {
    id: 'fb-event',
    name: 'Event Cover',
    platform: 'facebook',
    width: 1920,
    height: 1005,
    description: 'Facebook event cover image (1920x1005 px)'
  },

  // Instagram
  {
    id: 'ig-post',
    name: 'Post (Square)',
    platform: 'instagram',
    width: 1080,
    height: 1080,
    description: 'Square post for Instagram feed (1080x1080 px)'
  },
  {
    id: 'ig-portrait',
    name: 'Post (Portrait)',
    platform: 'instagram',
    width: 1080,
    height: 1350,
    description: 'Portrait post for Instagram feed (1080x1350 px)'
  },
  {
    id: 'ig-landscape',
    name: 'Post (Landscape)',
    platform: 'instagram',
    width: 1080,
    height: 608,
    description: 'Landscape post for Instagram feed (1080x608 px)'
  },
  {
    id: 'ig-story',
    name: 'Story',
    platform: 'instagram',
    width: 1080,
    height: 1920,
    description: 'Instagram story image (1080x1920 px)'
  },
  {
    id: 'ig-carousel',
    name: 'Carousel',
    platform: 'instagram',
    width: 1080,
    height: 1080,
    description: 'Instagram carousel (1080x1080 px, multiple images)'
  },

  // Twitter
  {
    id: 'tw-post',
    name: 'Single Image',
    platform: 'twitter',
    width: 1200,
    height: 675,
    description: 'Twitter single image post (1200x675 px)'
  },
  {
    id: 'tw-profile',
    name: 'Profile Image',
    platform: 'twitter',
    width: 400,
    height: 400,
    description: 'Twitter profile picture (400x400 px)'
  },
  {
    id: 'tw-header',
    name: 'Header Image',
    platform: 'twitter',
    width: 1500,
    height: 500,
    description: 'Twitter header/banner image (1500x500 px)'
  },

  // LinkedIn
  {
    id: 'li-post',
    name: 'Post Image',
    platform: 'linkedin',
    width: 1200,
    height: 627,
    description: 'LinkedIn post image (1200x627 px)'
  },
  {
    id: 'li-profile',
    name: 'Profile Image',
    platform: 'linkedin',
    width: 400,
    height: 400,
    description: 'LinkedIn profile image (400x400 px)'
  },
  {
    id: 'li-cover',
    name: 'Cover Image',
    platform: 'linkedin',
    width: 1584,
    height: 396,
    description: 'LinkedIn cover/banner image (1584x396 px)'
  },

  // Pinterest
  {
    id: 'pin-standard',
    name: 'Standard Pin',
    platform: 'pinterest',
    width: 1000,
    height: 1500,
    description: 'Standard Pinterest pin (1000x1500 px, 2:3 ratio)'
  },
  {
    id: 'pin-square',
    name: 'Square Pin',
    platform: 'pinterest',
    width: 1000,
    height: 1000,
    description: 'Square Pinterest pin (1000x1000 px)'
  },

  // YouTube
  {
    id: 'yt-thumbnail',
    name: 'Video Thumbnail',
    platform: 'youtube',
    width: 1280,
    height: 720,
    description: 'YouTube video thumbnail (1280x720 px)'
  },
  {
    id: 'yt-channel',
    name: 'Channel Art',
    platform: 'youtube',
    width: 2560,
    height: 1440,
    description: 'YouTube channel art/banner (2560x1440 px)'
  },
  {
    id: 'yt-profile',
    name: 'Channel Profile',
    platform: 'youtube',
    width: 800,
    height: 800,
    description: 'YouTube channel profile picture (800x800 px)'
  }
];

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  facebook: '#1877F2',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  pinterest: '#E60023',
  youtube: '#FF0000'
};

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
];

const Media: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'imageBuilder'>('templates');
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = activePlatform === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(template => template.platform === activePlatform);

  const platforms: { id: SocialPlatform, name: string }[] = [
    { id: 'facebook', name: 'Facebook' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'twitter', name: 'Twitter' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'pinterest', name: 'Pinterest' },
    { id: 'youtube', name: 'YouTube' }
  ];

  const handleDownload = () => {
    if (!selectedTemplate) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = selectedTemplate.width;
    canvas.height = selectedTemplate.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background image if exists
    if (backgroundImage) {
      const img = new Image();
      img.src = backgroundImage;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw text elements
    textElements.forEach(element => {
      ctx.fillStyle = element.color;
      ctx.font = `${element.fontSize}px ${element.fontFamily}`;
      ctx.fillText(element.text, element.x, element.y);
    });
    
    // Convert canvas to data URL and trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${selectedTemplate.platform}-${selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const addNewText = () => {
    if (!selectedTemplate) return;
    
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      text: 'Double click to edit',
      x: selectedTemplate.width / 2 - 100,
      y: selectedTemplate.height / 2,
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#000000',
      isDragging: false,
    };
    
    setTextElements([...textElements, newText]);
    setSelectedTextId(newText.id);
  };
  
  const handleTextDragStart = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    setTextElements(prev => prev.map(item => 
      item.id === id ? { ...item, isDragging: true } : item
    ));
    
    setSelectedTextId(id);
  };
  
  const handleTextDragEnd = () => {
    setTextElements(prev => prev.map(item => 
      item.isDragging ? { ...item, isDragging: false } : item
    ));
  };
  
  const handleTextDragMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    setTextElements(prev => prev.map(item => {
      if (item.isDragging) {
        // Calculate position within the canvas, accounting for scaling
        const scaleX = selectedTemplate?.width ? selectedTemplate.width / canvasRect.width : 1;
        const scaleY = selectedTemplate?.height ? selectedTemplate.height / canvasRect.height : 1;
        
        const x = (e.clientX - canvasRect.left) * scaleX;
        const y = (e.clientY - canvasRect.top) * scaleY;
        
        return { ...item, x, y };
      }
      return item;
    }));
  };
  
  const handleTextDoubleClick = (id: string) => {
    const textElement = textElements.find(item => item.id === id);
    if (!textElement) return;
    
    const newText = prompt('Edit text:', textElement.text);
    if (newText !== null) {
      setTextElements(prev => prev.map(item => 
        item.id === id ? { ...item, text: newText } : item
      ));
    }
  };
  
  const updateTextProperty = (id: string, property: keyof TextElement, value: any) => {
    setTextElements(prev => prev.map(item => 
      item.id === id ? { ...item, [property]: value } : item
    ));
  };
  
  const deleteSelectedText = () => {
    if (!selectedTextId) return;
    
    setTextElements(prev => prev.filter(item => item.id !== selectedTextId));
    setSelectedTextId(null);
  };
  
  const uploadBackgroundImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const navigateToVideoBuilder = () => {
    // Dispatch a custom event to inform App.tsx to switch to the Media component
    // This approach ensures compatibility with the existing app architecture
    window.dispatchEvent(new CustomEvent('show-media-component'));
  };

  const copyDimensions = () => {
    if (!selectedTemplate) return;
    navigator.clipboard.writeText(`${selectedTemplate.width}x${selectedTemplate.height}`);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Media</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1 rounded ${activeTab === 'templates' ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
          >
            Templates
          </button>
          <button 
            onClick={() => setActiveTab('imageBuilder')}
            className={`px-3 py-1 rounded ${activeTab === 'imageBuilder' ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
          >
            Image Builder
          </button>
          <button 
            onClick={navigateToVideoBuilder}
            className="px-3 py-1 rounded bg-gray-700 text-white"
          >
            Video Builder
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - only shown when not in videoBuilder */}
        {activeTab !== 'videoBuilder' && (
          <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
            {activeTab === 'templates' && (
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-white font-medium mb-2">Platforms</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActivePlatform('all')}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      activePlatform === 'all' ? 'bg-blue-600' : 'hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-white">All Platforms</span>
                  </button>
                  
                  {platforms.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => setActivePlatform(platform.id)}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                        activePlatform === platform.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: PLATFORM_COLORS[platform.id] }}
                      ></div>
                      <span className="text-white">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'imageBuilder' && selectedTemplate && (
              <div className="p-3 flex flex-col overflow-auto h-full">
                <h3 className="text-white font-medium mb-3">Image Editor</h3>
                
                <div className="mb-4">
                  <h4 className="text-gray-300 text-sm mb-2">Template</h4>
                  <div className="bg-gray-700 rounded p-2 mb-2">
                    <div className="text-white">{selectedTemplate.name}</div>
                    <div className="text-gray-400 text-sm">{selectedTemplate.width} x {selectedTemplate.height}</div>
                  </div>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="w-full px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm"
                  >
                    Change Template
                  </button>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-gray-300 text-sm mb-2">Background</h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Color</label>
                      <div className="flex items-center">
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-6 h-6 rounded mr-1"
                        />
                        <input
                          type="text"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-full px-2 py-1 bg-gray-700 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Image</label>
                      <button
                        onClick={uploadBackgroundImage}
                        className="w-full px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm"
                      >
                        Upload
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>
                  {backgroundImage && (
                    <button
                      onClick={() => setBackgroundImage(null)}
                      className="w-full px-2 py-1 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-gray-300 text-sm">Text Elements</h4>
                    <button
                      onClick={addNewText}
                      className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center"
                    >
                      <FiType className="mr-1" size={14} />
                      Add Text
                    </button>
                  </div>
                  
                  {textElements.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {textElements.map(text => (
                        <div 
                          key={text.id}
                          className={`px-3 py-2 rounded-md cursor-pointer ${selectedTextId === text.id ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                          onClick={() => setSelectedTextId(text.id)}
                        >
                          <div className="text-white text-sm truncate">{text.text}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm p-2">No text elements. Click "Add Text" to create one.</div>
                  )}
                </div>
                
                {selectedTextId && (
                  <div className="mb-4">
                    <h4 className="text-gray-300 text-sm mb-2">Text Properties</h4>
                    {textElements.filter(t => t.id === selectedTextId).map(text => (
                      <div key={text.id} className="space-y-2">
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Text Content</label>
                          <input
                            type="text"
                            value={text.text}
                            onChange={(e) => updateTextProperty(text.id, 'text', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-700 rounded text-white text-sm"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-gray-400 text-xs mb-1">Color</label>
                            <div className="flex items-center">
                              <input
                                type="color"
                                value={text.color}
                                onChange={(e) => updateTextProperty(text.id, 'color', e.target.value)}
                                className="w-6 h-6 rounded mr-1"
                              />
                              <input
                                type="text"
                                value={text.color}
                                onChange={(e) => updateTextProperty(text.id, 'color', e.target.value)}
                                className="w-full px-2 py-1 bg-gray-700 rounded text-white text-sm"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-gray-400 text-xs mb-1">Size</label>
                            <input
                              type="number"
                              value={text.fontSize}
                              onChange={(e) => updateTextProperty(text.id, 'fontSize', parseInt(e.target.value) || 12)}
                              className="w-full px-2 py-1 bg-gray-700 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Font</label>
                          <select
                            value={text.fontFamily}
                            onChange={(e) => updateTextProperty(text.id, 'fontFamily', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-700 rounded text-white text-sm"
                          >
                            {FONT_FAMILIES.map(font => (
                              <option key={font} value={font}>{font}</option>
                            ))}
                          </select>
                        </div>
                        
                        <button
                          onClick={deleteSelectedText}
                          className="w-full px-2 py-1 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm mt-2"
                        >
                          Delete Text
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-auto">
                  <button
                    onClick={handleDownload}
                    className="w-full px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                  >
                    <FiDownload className="mr-2" />
                    Export Image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 overflow-hidden flex flex-col ${activeTab === 'videoBuilder' ? 'w-full' : ''}`}>
          {activeTab === 'templates' && (
            <>
              {selectedTemplate && showTemplateDetails ? (
                // Template details view
                <div className="flex-1 overflow-auto p-4">
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="p-4 flex justify-between items-center border-b border-gray-700">
                      <h3 className="text-white font-medium text-lg">
                        {selectedTemplate.name}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setActiveTab('imageBuilder');
                            setTextElements([]);
                            setBackgroundImage(null);
                          }}
                          className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Edit in Builder
                        </button>
                        <button
                          onClick={() => setShowTemplateDetails(false)}
                          className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
                        >
                          Back to Templates
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Template Preview */}
                      <div className="flex flex-col">
                        <div className="bg-white rounded-md overflow-hidden shadow-lg mb-4">
                          <div 
                            style={{ 
                              backgroundColor, 
                              aspectRatio: `${selectedTemplate.width} / ${selectedTemplate.height}`,
                              maxHeight: '400px',
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'column',
                              color: '#333',
                              fontFamily: 'Arial'
                            }}
                          >
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                              {selectedTemplate.platform.toUpperCase()} - {selectedTemplate.name}
                            </div>
                            <div style={{ fontSize: '14px', marginTop: '8px' }}>
                              {selectedTemplate.width} x {selectedTemplate.height} px
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-gray-300 mb-1">Background Color</label>
                          <div className="flex items-center">
                            <input
                              type="color"
                              value={backgroundColor}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="w-8 h-8 rounded mr-2 bg-transparent"
                            />
                            <input
                              type="text"
                              value={backgroundColor}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="px-3 py-1 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={handleDownload}
                            className="flex-1 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                          >
                            <FiDownload className="mr-2" />
                            Download
                          </button>
                          <button
                            onClick={copyDimensions}
                            className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
                            title="Copy Dimensions"
                          >
                            <FiCopy />
                          </button>
                        </div>
                      </div>
                      
                      {/* Template Details */}
                      <div>
                        <div className="bg-gray-700 rounded-md p-4 mb-4">
                          <h4 className="text-white font-medium mb-2">Template Details</h4>
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-400">Platform:</span>
                              <span className="text-white ml-2">
                                {selectedTemplate.platform.charAt(0).toUpperCase() + selectedTemplate.platform.slice(1)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Dimensions:</span>
                              <span className="text-white ml-2">
                                {selectedTemplate.width} x {selectedTemplate.height} pixels
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Aspect Ratio:</span>
                              <span className="text-white ml-2">
                                {selectedTemplate.width / gcd(selectedTemplate.width, selectedTemplate.height)}:
                                {selectedTemplate.height / gcd(selectedTemplate.width, selectedTemplate.height)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 rounded-md p-4">
                          <h4 className="text-white font-medium mb-2">Description</h4>
                          <p className="text-gray-300">{selectedTemplate.description}</p>
                          
                          <h4 className="text-white font-medium mt-4 mb-2">Usage Tips</h4>
                          <ul className="text-gray-300 list-disc pl-5 space-y-1">
                            <li>Keep important content away from the edges</li>
                            <li>Use high-resolution images for best quality</li>
                            <li>Text should be readable and contrasted with background</li>
                            <li>Follow platform-specific guidelines for best results</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Template selection grid
                <div className="flex-1 overflow-y-auto p-4">
                  <h3 className="text-white font-medium mb-4">
                    {activePlatform === 'all' 
                      ? 'All Templates' 
                      : `${platforms.find(p => p.id === activePlatform)?.name} Templates`}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(template => (
                      <div
                        key={template.id}
                        className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowTemplateDetails(true);
                        }}
                      >
                        <div 
                          className="bg-white relative"
                          style={{ 
                            paddingTop: `${(template.height / template.width) * 100}%`,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <div className="text-center text-gray-800">
                              <div className="text-sm font-medium">
                                {template.width} x {template.height}
                              </div>
                            </div>
                          </div>
                          <div 
                            className="absolute top-0 left-0 w-full h-full opacity-75 flex items-center justify-center text-white"
                            style={{ 
                              background: `linear-gradient(135deg, ${PLATFORM_COLORS[template.platform]}88, ${PLATFORM_COLORS[template.platform]}44)`,
                            }}
                          >
                            <FiImage className="w-10 h-10 opacity-50" />
                          </div>
                        </div>
                        
                        <div className="p-3">
                          <div className="flex items-center mb-1">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: PLATFORM_COLORS[template.platform] }}
                            ></div>
                            <span className="text-gray-300 text-sm">
                              {template.platform.charAt(0).toUpperCase() + template.platform.slice(1)}
                            </span>
                          </div>
                          <h4 className="text-white font-medium">{template.name}</h4>
                          <p className="text-gray-400 text-sm mt-1">{template.width} x {template.height} px</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'imageBuilder' && selectedTemplate && (
            <div 
              className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-900"
              onMouseMove={e => handleTextDragMove(e)}
              onMouseUp={handleTextDragEnd}
            >
              <div 
                ref={canvasRef}
                className="bg-white rounded-lg shadow-lg relative mx-auto"
                style={{ 
                  width: '100%',
                  maxWidth: '900px',
                  height: '100%',
                  maxHeight: '80vh',
                  aspectRatio: `${selectedTemplate.width} / ${selectedTemplate.height}`,
                  backgroundColor,
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                }}
              >
                {textElements.map(text => (
                  <div
                    key={text.id}
                    className={`absolute cursor-move ${selectedTextId === text.id ? 'ring-2 ring-blue-500' : ''}`}
                    style={{
                      left: text.x,
                      top: text.y,
                      color: text.color,
                      fontSize: `${text.fontSize}px`,
                      fontFamily: text.fontFamily,
                      transform: 'translate(-50%, -50%)',
                      userSelect: 'none',
                    }}
                    onMouseDown={(e) => handleTextDragStart(text.id, e)}
                    onDoubleClick={() => handleTextDoubleClick(text.id)}
                    onClick={() => setSelectedTextId(text.id)}
                  >
                    {text.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Greatest common divisor function to calculate aspect ratio
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default Media; 