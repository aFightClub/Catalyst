import React, { useState, useRef, useEffect } from 'react';
import { FiDownload, FiCopy, FiImage, FiExternalLink, FiType, FiMove, FiEdit, FiLayers, FiVideo, FiMusic, FiPlusCircle, FiTrash, FiVolume2 } from 'react-icons/fi';
import MediaPlayer, { MediaPlayerHandle } from './MediaPlayer';
import VideoExporter from './VideoExporter';

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

// New interfaces for video editor
interface MediaAsset {
  id: string;
  type: 'video' | 'image' | 'audio';
  name: string;
  path: string;
  url: string; // Data URL for preview
  duration?: number;
}

interface VideoTrack {
  id: string;
  type: 'video' | 'image';
  assets: TrackAsset[];
}

interface AudioTrack {
  id: string;
  type: 'audio';
  assets: TrackAsset[];
}

interface TrackAsset {
  id: string;
  assetId: string;
  startTime: number;
  duration: number;
  volume?: number;
}

type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'pinterest' | 'youtube';

// Template definitions
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
  // More templates here...
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
  // State for image editor
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'imageBuilder' | 'videoEditor'>('templates');
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // Video editor state
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([
    { id: 'video-1', type: 'video', assets: [] }
  ]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([
    { id: 'audio-1', type: 'audio', assets: [] }
  ]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(60); // Default 60 seconds timeline
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoResolution, setVideoResolution] = useState({ width: 1280, height: 720 });
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaPlayerRef = useRef<MediaPlayerHandle>(null);

  // Add state for video preview sources
  const [previewSources, setPreviewSources] = useState<{ type: 'video' | 'audio' | 'image'; url: string; startTime: number; duration: number }[]>([]);

  // Filtered templates based on active platform
  const filteredTemplates = activePlatform === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(template => template.platform === activePlatform);

  // Platforms list
  const platforms: { id: SocialPlatform, name: string }[] = [
    { id: 'facebook', name: 'Facebook' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'twitter', name: 'Twitter' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'pinterest', name: 'Pinterest' },
    { id: 'youtube', name: 'YouTube' }
  ];

  // Image download handler
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

  // Text element manipulation functions
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
  
  // Background image functions
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

  const copyDimensions = () => {
    if (!selectedTemplate) return;
    navigator.clipboard.writeText(`${selectedTemplate.width}x${selectedTemplate.height}`);
  };

  // Video editor functions
  const handleMediaUpload = (type: 'video' | 'image' | 'audio') => {
    const inputRef = type === 'video' 
      ? videoFileInputRef 
      : type === 'audio' 
        ? audioFileInputRef 
        : imageFileInputRef;
        
    if (inputRef.current) {
      inputRef.current.click();
      console.log(`Opening file dialog for ${type}`);
    }
  };
  
  const processMediaFile = (file: File, type: 'video' | 'image' | 'audio') => {
    console.log(`Processing ${type} file:`, file.name);
    const reader = new FileReader();
    
    // Add error handler for file reading
    reader.onerror = (error) => {
      console.error(`Error reading file ${file.name}:`, error);
      alert(`Failed to read file ${file.name}. Please try another file.`);
    };
    
    reader.onload = (event) => {
      try {
        const url = event.target?.result as string;
        console.log(`File loaded: ${file.name} (${type})`);
        
        // Create new media asset
        const newAsset: MediaAsset = {
          id: `${type}-${Date.now()}`,
          type,
          name: file.name,
          path: file.name,
          url,
          duration: type === 'image' ? 5 : undefined
        };
        
        // For videos and audio, we need to get the duration
        if (type === 'video' || type === 'audio') {
          const element = document.createElement(type);
          
          // Add error handler for media loading
          element.onerror = () => {
            console.error(`Error loading ${type} element for ${file.name}`);
            alert(`The ${type} file "${file.name}" could not be loaded. It may be corrupted or in an unsupported format.`);
          };
          
          element.src = url;
          
          element.onloadedmetadata = () => {
            console.log(`Loaded ${type} metadata:`, element.duration);
            setMediaAssets(prev => prev.map(asset => 
              asset.id === newAsset.id 
                ? { ...asset, duration: element.duration } 
                : asset
            ));
          };
        }
        
        setMediaAssets(prev => [...prev, newAsset]);
        
        // Update UI with feedback
        showNotification(`Added ${file.name} to media library`, 'success');
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        showNotification(`Failed to process ${file.name}`, 'error');
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image' | 'audio') => {
    console.log(`File input change for ${type}`, e.target.files);
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      console.log(`No ${type} files selected`);
      return;
    }
    
    console.log(`Selected ${files.length} ${type} files`);
    
    try {
      Array.from(files).forEach(file => {
        processMediaFile(file, type);
      });
    } catch (error) {
      console.error('Error processing files:', error);
      showNotification('Error adding media files', 'error');
    }
    
    // Reset the input
    e.target.value = '';
  };
  
  const addAssetToTrack = (assetId: string, trackId: string) => {
    const asset = mediaAssets.find(a => a.id === assetId);
    if (!asset) return;
    
    const trackType = asset.type === 'audio' ? 'audio' : 'video';
    const tracks = trackType === 'audio' ? audioTracks : videoTracks;
    const track = tracks.find(t => t.id === trackId);
    
    if (!track) return;
    
    // Calculate where to place the new asset on the timeline
    // Here we place it at the end of the last asset, or at 0 if no assets
    const lastAsset = track.assets.length > 0 
      ? track.assets.reduce((latest, current) => {
          const latestEndTime = latest.startTime + latest.duration;
          const currentEndTime = current.startTime + current.duration;
          return latestEndTime > currentEndTime ? latest : current;
        })
      : null;
    
    const startTime = lastAsset 
      ? lastAsset.startTime + lastAsset.duration 
      : 0;
    
    const newTrackAsset: TrackAsset = {
      id: `track-asset-${Date.now()}`,
      assetId,
      startTime,
      duration: asset.duration || 5,
      volume: asset.type === 'audio' ? 1 : undefined
    };
    
    if (trackType === 'audio') {
      setAudioTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { ...t, assets: [...t.assets, newTrackAsset] } 
          : t
      ));
    } else {
      setVideoTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { ...t, assets: [...t.assets, newTrackAsset] } 
          : t
      ));
    }
    
    // Update the total duration if needed
    const newEndTime = startTime + (asset.duration || 5);
    if (newEndTime > totalDuration) {
      setTotalDuration(newEndTime);
    }
    
    // Update preview sources after adding new asset
    updatePreviewSources();
  };
  
  const removeAssetFromTrack = (trackType: 'video' | 'audio', trackId: string, assetId: string) => {
    if (trackType === 'audio') {
      setAudioTracks(prev => prev.map(track => 
        track.id === trackId 
          ? { ...track, assets: track.assets.filter(asset => asset.id !== assetId) } 
          : track
      ));
    } else {
      setVideoTracks(prev => prev.map(track => 
        track.id === trackId 
          ? { ...track, assets: track.assets.filter(asset => asset.id !== assetId) } 
          : track
      ));
    }
    
    // Update preview sources after removing asset
    updatePreviewSources();
  };
  
  const addNewTrack = (type: 'video' | 'audio') => {
    const newTrack = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      assets: []
    };
    
    if (type === 'audio') {
      setAudioTracks(prev => [...prev, newTrack as AudioTrack]);
    } else {
      setVideoTracks(prev => [...prev, newTrack as VideoTrack]);
    }
  };
  
  // FFmpeg Integration for Video Editing:
  // --------------------------------------
  // In a production application, FFmpeg would be integrated to handle all video editing operations:
  //
  // 1. For combining video tracks:
  //    - Use the 'concat' filter to combine video clips in sequence
  //    - For overlapping videos, use the 'overlay' filter to combine them
  //    - Example: ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[outv]" -map "[outv]" output.mp4
  //
  // 2. For audio tracks:
  //    - Use 'amix' filter to mix multiple audio tracks together
  //    - Adjust volume using the 'volume' filter
  //    - Example: ffmpeg -i video.mp4 -i audio1.mp3 -i audio2.mp3 -filter_complex "[1:a][2:a]amix=inputs=2[a]" -map 0:v -map "[a]" -c:v copy output.mp4
  //
  // 3. For adding images to video:
  //    - Convert static images to video segments with 'loop' filter
  //    - Example: ffmpeg -loop 1 -i image.jpg -c:v libx264 -t 5 -pix_fmt yuv420p image_video.mp4
  //
  // 4. For text overlays:
  //    - Use the 'drawtext' filter to add dynamic text to videos
  //    - Example: ffmpeg -i input.mp4 -vf "drawtext=text='Hello World':fontcolor=white:fontsize=24:x=10:y=10" output.mp4
  //
  // 5. For transitions between clips:
  //    - Use filters like 'fade', 'dissolve', or 'xfade' for smooth transitions
  //    - Example: ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex "[0:v]fade=t=out:st=4:d=1[v0];[1:v]fade=t=in:st=0:d=1[v1];[v0][v1]concat=n=2:v=1:a=0[v]" -map "[v]" output.mp4
  //
  // Implementation approaches:
  // 1. Server-side: Send editing instructions to a backend that processes media using FFmpeg
  // 2. Web-based: Use ffmpeg.wasm to run FFmpeg directly in the browser (with performance limitations)
  // 3. Desktop app: In Electron, use Node.js FFmpeg modules for better performance
  
  // Notification for FFmpeg operations
  const [notification, setNotification] = useState<{message: string, type: 'info' | 'success' | 'error'} | null>(null);
  
  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  // Modified export function to use new VideoExporter component
  const handleExport = () => {
    showNotification('Starting video export...', 'info');
    
    // In a real implementation, this would trigger the FFmpeg process
    setTimeout(() => {
      showNotification('Video exported successfully!', 'success');
    }, 2000);
  };

  // Helper function to get sources for video preview
  const updatePreviewSources = () => {
    const sources: { type: 'video' | 'audio' | 'image'; url: string; startTime: number; duration: number }[] = [];
    
    // Add video and image sources
    videoTracks.forEach(track => {
      track.assets.forEach(asset => {
        const mediaAsset = mediaAssets.find(m => m.id === asset.assetId);
        if (mediaAsset && (mediaAsset.type === 'video' || mediaAsset.type === 'image')) {
          sources.push({
            type: mediaAsset.type,
            url: mediaAsset.url,
            startTime: asset.startTime,
            duration: asset.duration
          });
        }
      });
    });
    
    // Sort sources by start time
    sources.sort((a, b) => a.startTime - b.startTime);
    
    setPreviewSources(sources);
  };

  // Handle timeline scrubbing
  const handleTimelineSeek = (time: number) => {
    setCurrentTime(time);
    
    // Use the MediaPlayer ref to seek
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.seek(time);
    }
  };

  // Play/pause the preview from timeline
  const togglePlayback = () => {
    console.log('Toggle playback called, current state:', isPlaying);
    if (mediaPlayerRef.current) {
      if (isPlaying) {
        console.log('Pausing playback');
        mediaPlayerRef.current.pause();
      } else {
        console.log('Starting playback');
        mediaPlayerRef.current.play();
      }
    } else {
      console.warn('MediaPlayer reference is not available');
    }
  };

  // Handle media player time updates
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  // Handle media player play state changes
  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  // Update preview sources when tracks or assets change
  useEffect(() => {
    updatePreviewSources();
  }, [videoTracks, audioTracks, mediaAssets]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Media Tools</h2>
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
            onClick={() => setActiveTab('videoEditor')}
            className={`px-3 py-1 rounded ${activeTab === 'videoEditor' ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
          >
            Video Editor
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'videoEditor' && (
          <div className="flex flex-col w-full h-full">
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Media Library */}
              <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-gray-700">
                  <h3 className="text-white font-medium mb-3">Media Library</h3>
                  
                  <div className="flex space-x-2 mb-3">
                    <button 
                      onClick={() => handleMediaUpload('video')}
                      className="flex-1 px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center justify-center"
                    >
                      <FiVideo className="mr-1" size={14} />
                      Video
                    </button>
                    <button 
                      onClick={() => handleMediaUpload('audio')}
                      className="flex-1 px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center justify-center"
                    >
                      <FiMusic className="mr-1" size={14} />
                      Audio
                    </button>
                    <button 
                      onClick={() => handleMediaUpload('image')}
                      className="flex-1 px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm flex items-center justify-center"
                    >
                      <FiImage className="mr-1" size={14} />
                      Image
                    </button>
                  </div>
                  
                  <input
                    type="file"
                    ref={videoFileInputRef}
                    onChange={(e) => handleFileInputChange(e, 'video')}
                    accept="video/*"
                    className="hidden"
                    multiple
                  />
                  <input
                    type="file"
                    ref={audioFileInputRef}
                    onChange={(e) => handleFileInputChange(e, 'audio')}
                    accept="audio/*"
                    className="hidden"
                    multiple
                  />
                  <input
                    type="file"
                    ref={imageFileInputRef}
                    onChange={(e) => handleFileInputChange(e, 'image')}
                    accept="image/*"
                    className="hidden"
                    multiple
                  />
                  
                  {mediaAssets.length === 0 ? (
                    <div className="text-gray-400 text-sm bg-gray-700 p-3 rounded-md">
                      No media files added. Use the buttons above to add videos, audio, or images.
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-96">
                      {mediaAssets.map(asset => (
                        <div 
                          key={asset.id}
                          className="p-2 bg-gray-700 rounded-md flex items-center cursor-pointer hover:bg-gray-600"
                          onClick={() => setSelectedAssetId(asset.id)}
                          onDoubleClick={() => {
                            // Add to first matching track
                            if (asset.type === 'audio') {
                              addAssetToTrack(asset.id, audioTracks[0].id);
                            } else {
                              addAssetToTrack(asset.id, videoTracks[0].id);
                            }
                          }}
                        >
                          {asset.type === 'video' && <FiVideo className="text-blue-400 mr-2" />}
                          {asset.type === 'audio' && <FiMusic className="text-purple-400 mr-2" />}
                          {asset.type === 'image' && <FiImage className="text-green-400 mr-2" />}
                          <div className="flex-1 overflow-hidden">
                            <div className="text-white text-sm truncate">{asset.name}</div>
                            <div className="text-gray-400 text-xs">
                              {asset.duration 
                                ? `${Math.floor(asset.duration / 60)}:${Math.floor(asset.duration % 60).toString().padStart(2, '0')}` 
                                : 'Unknown duration'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-3 overflow-auto">
                  {/* Add the VideoExporter component */}
                  <VideoExporter 
                    videoTracks={videoTracks}
                    audioTracks={audioTracks}
                    mediaAssets={mediaAssets}
                    resolution={videoResolution}
                    onExport={handleExport}
                  />
                </div>
              </div>
              
              {/* Main Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Video Preview */}
                <div className="p-4 flex justify-center bg-black">
                  {previewSources.length > 0 ? (
                    <MediaPlayer 
                      ref={mediaPlayerRef}
                      sources={previewSources}
                      width={videoResolution.width > 800 ? 800 : videoResolution.width}
                      height={videoResolution.height > 450 ? 450 : videoResolution.height}
                      onTimeUpdate={handleTimeUpdate}
                      onPlayStateChange={handlePlayStateChange}
                    />
                  ) : (
                    <div 
                      className="bg-gray-800 rounded-md overflow-hidden flex items-center justify-center"
                      style={{ width: '800px', height: '450px' }}
                    >
                      <div className="text-center text-gray-400">
                        <FiVideo size={48} className="mx-auto mb-4" />
                        <p className="mb-4">No media in timeline</p>
                        <p className="text-sm">Drag media from the library to the timeline below</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Timeline */}
                <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
                  <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center">
                    <div className="flex space-x-2">
                      <button 
                        className="p-2 rounded-md bg-gray-700 text-white"
                        onClick={togglePlayback}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                          {isPlaying ? (
                            <>
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </>
                          ) : (
                            <polygon points="5 3 19 12 5 21 5 3" />
                          )}
                        </svg>
                      </button>
                    </div>
                    
                    <div className="ml-4 text-white text-sm">
                      {`${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`}
                      <span className="mx-1">/</span>
                      {`${Math.floor(totalDuration / 60)}:${Math.floor(totalDuration % 60).toString().padStart(2, '0')}`}
                    </div>
                    
                    <div className="mx-4 flex-1">
                      <div 
                        className="h-2 bg-gray-700 rounded-full cursor-pointer relative"
                        onClick={(e) => {
                          if (!timelineRef.current) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickPosition = (e.clientX - rect.left) / rect.width;
                          const newTime = clickPosition * totalDuration;
                          handleTimelineSeek(newTime);
                        }}
                      >
                        <div 
                          className="absolute h-full bg-blue-600 rounded-full"
                          style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="ml-auto flex space-x-2">
                      <button
                        onClick={() => addNewTrack('video')}
                        className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center"
                      >
                        <FiPlusCircle className="mr-1" size={14} />
                        Video Track
                      </button>
                      <button
                        onClick={() => addNewTrack('audio')}
                        className="p-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white flex items-center"
                      >
                        <FiPlusCircle className="mr-1" size={14} />
                        Audio Track
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-3">
                    <div ref={timelineRef} className="relative">
                      {/* Time markers */}
                      <div className="h-6 border-b border-gray-700 flex">
                        {Array.from({ length: Math.ceil(totalDuration) }).map((_, i) => (
                          <div key={i} className="relative" style={{ width: '50px' }}>
                            <div className="absolute h-2 border-l border-gray-500" style={{ left: '0' }}></div>
                            <div className="absolute text-xs text-gray-400" style={{ left: '4px' }}>
                              {`${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}`}
                            </div>
                          </div>
                        ))}
                        
                        {/* Current time indicator */}
                        <div 
                          className="absolute h-full border-l-2 border-red-500 z-10" 
                          style={{ 
                            left: `${(currentTime / totalDuration) * 100}%`,
                            transform: 'translateX(-1px)'
                          }}
                        ></div>
                      </div>
                      
                      {/* Video Tracks */}
                      {videoTracks.map(track => (
                        <div key={track.id} className="h-16 border-b border-gray-700 flex items-center mb-2">
                          <div className="w-24 flex-shrink-0 px-2 flex items-center">
                            <FiVideo className="text-blue-400 mr-2" />
                            <span className="text-white text-sm">Video</span>
                          </div>
                          
                          <div className="flex-1 relative h-full py-2">
                            {track.assets.map(asset => {
                              const mediaAsset = mediaAssets.find(m => m.id === asset.assetId);
                              if (!mediaAsset) return null;
                              
                              return (
                                <div
                                  key={asset.id}
                                  className="absolute h-10 bg-blue-600 rounded-md flex items-center px-2 cursor-move"
                                  style={{
                                    left: `${(asset.startTime / totalDuration) * 100}%`,
                                    width: `${(asset.duration / totalDuration) * 100}%`,
                                  }}
                                  // Add click handler to select asset for editing
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssetId(asset.assetId);
                                  }}
                                >
                                  <div className="text-white text-xs truncate max-w-full">
                                    {mediaAsset.name}
                                  </div>
                                  <button
                                    className="ml-auto text-white opacity-50 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeAssetFromTrack('video', track.id, asset.id);
                                    }}
                                  >
                                    <FiTrash size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      
                      {/* Audio Tracks */}
                      {audioTracks.map(track => (
                        <div key={track.id} className="h-16 border-b border-gray-700 flex items-center mb-2">
                          <div className="w-24 flex-shrink-0 px-2 flex items-center">
                            <FiMusic className="text-purple-400 mr-2" />
                            <span className="text-white text-sm">Audio</span>
                          </div>
                          
                          <div className="flex-1 relative h-full py-2">
                            {track.assets.map(asset => {
                              const mediaAsset = mediaAssets.find(m => m.id === asset.assetId);
                              if (!mediaAsset) return null;
                              
                              return (
                                <div
                                  key={asset.id}
                                  className="absolute h-10 bg-purple-600 rounded-md flex items-center px-2 cursor-move"
                                  style={{
                                    left: `${(asset.startTime / totalDuration) * 100}%`,
                                    width: `${(asset.duration / totalDuration) * 100}%`,
                                  }}
                                  // Add click handler to select asset for editing
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAssetId(asset.assetId);
                                  }}
                                >
                                  <div className="text-white text-xs truncate max-w-xs">
                                    {mediaAsset.name}
                                  </div>
                                  <div className="ml-1 flex items-center">
                                    <FiVolume2 size={12} className="text-white opacity-50" />
                                  </div>
                                  <button
                                    className="ml-auto text-white opacity-50 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeAssetFromTrack('audio', track.id, asset.id);
                                    }}
                                  >
                                    <FiTrash size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white max-w-md`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

// Greatest common divisor function to calculate aspect ratio
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default Media;
