import React, { useState } from 'react';
import { FiDownload, FiCopy, FiImage, FiExternalLink } from 'react-icons/fi';

interface ImageTemplate {
  id: string;
  name: string;
  platform: SocialPlatform;
  width: number;
  height: number;
  description: string;
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

const Images: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);

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
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = selectedTemplate.width;
    canvas.height = selectedTemplate.height;
    
    // Get the canvas context and fill with background color
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add platform name as text overlay
    ctx.fillStyle = '#333333';
    ctx.font = `${Math.floor(canvas.height / 20)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const platformText = `${selectedTemplate.platform.toUpperCase()} - ${selectedTemplate.name}`;
    ctx.fillText(platformText, canvas.width / 2, canvas.height / 2);
    
    // Add dimensions as smaller text
    ctx.font = `${Math.floor(canvas.height / 30)}px Arial`;
    ctx.fillText(`${selectedTemplate.width} x ${selectedTemplate.height} px`, canvas.width / 2, canvas.height / 2 + Math.floor(canvas.height / 15));
    
    // Convert canvas to data URL and trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${selectedTemplate.platform}-${selectedTemplate.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const copyDimensions = () => {
    if (!selectedTemplate) return;
    navigator.clipboard.writeText(`${selectedTemplate.width}x${selectedTemplate.height}`);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Social Media Templates</h2>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
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
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedTemplate && showTemplateDetails ? (
            // Template details view
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b border-gray-700">
                  <h3 className="text-white font-medium text-lg">
                    {selectedTemplate.name}
                  </h3>
                  <button
                    onClick={() => setShowTemplateDetails(false)}
                    className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    Back to Templates
                  </button>
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
        </div>
      </div>
    </div>
  );
};

// Greatest common divisor function to calculate aspect ratio
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default Images; 