import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import VideoControls from './VideoControls';
import { FiVideo } from 'react-icons/fi';

interface MediaPlayerProps {
  sources: {
    type: 'video' | 'audio' | 'image';
    url: string;
    startTime: number;
    duration: number;
  }[];
  width?: number;
  height?: number;
  onTimeUpdate?: (time: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

// Define the methods we want to expose to parent components
export interface MediaPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
}

const MediaPlayer = forwardRef<MediaPlayerHandle, MediaPlayerProps>(({ 
  sources,
  width = 800,
  height = 450,
  onTimeUpdate,
  onPlayStateChange
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      handlePlay();
    },
    pause: () => {
      handlePause();
    },
    seek: (time: number) => {
      handleSeek(time);
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    isPlaying: () => isPlaying
  }));

  // Initialize video when sources change
  useEffect(() => {
    console.log('MediaPlayer: sources changed', sources);
    
    // Check if we have video sources
    const hasVideoSources = sources.some(source => source.type === 'video');
    console.log('Has video sources:', hasVideoSources);
    setHasVideo(hasVideoSources);
    
    // Reset player state when sources change
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (videoRef.current && sources.length > 0) {
      // For a real implementation, we would need to composite multiple sources
      // Here we're just using the first video source for simplicity
      const videoSource = sources.find(source => source.type === 'video');
      
      if (videoSource) {
        console.log('Setting video source to:', videoSource.url);
        videoRef.current.src = videoSource.url;
        videoRef.current.load();
        
        // Once metadata is loaded, we can get the duration
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            console.log('Video metadata loaded, duration:', videoRef.current.duration);
            setDuration(videoRef.current.duration);
          }
        };
      } else {
        console.warn('No video source found in sources');
      }
    }
  }, [sources]);

  // Update current time during playback
  useEffect(() => {
    const updateTime = () => {
      if (videoRef.current) {
        const newTime = videoRef.current.currentTime;
        setCurrentTime(newTime);
        if (onTimeUpdate) {
          onTimeUpdate(newTime);
        }
      }
    };
    
    const interval = setInterval(updateTime, 100);
    
    return () => {
      clearInterval(interval);
    };
  }, [onTimeUpdate]);

  // Play/pause controls
  const handlePlay = () => {
    console.log('MediaPlayer: handlePlay called');
    console.log('Video sources:', sources);
    console.log('Video reference exists:', !!videoRef.current);
    
    if (videoRef.current && sources.length > 0) {
      // Make sure the video has a valid source
      if (!videoRef.current.src && sources.length > 0) {
        const videoSource = sources.find(source => source.type === 'video');
        if (videoSource) {
          console.log('Setting video source to:', videoSource.url);
          videoRef.current.src = videoSource.url;
          videoRef.current.load();
        }
      }
      
      console.log('Attempting to play video...');
      const playPromise = videoRef.current.play();
      
      // Handle the play promise to catch any errors
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Play promise resolved successfully');
          setIsPlaying(true);
          if (onPlayStateChange) {
            onPlayStateChange(true);
          }
        }).catch(error => {
          console.error('Error playing video:', error);
          // Try to provide more helpful error info
          if (error.name === 'NotAllowedError') {
            console.log('Autoplay prevented by browser. User interaction required.');
          } else if (error.name === 'NotSupportedError') {
            console.log('Video format or MIME type not supported by browser.');
          }
        });
      }
    } else {
      console.warn('Cannot play: No video element or no sources available');
    }
  };
  
  const handlePause = () => {
    console.log('MediaPlayer: handlePause called');
    if (videoRef.current) {
      console.log('Pausing video');
      videoRef.current.pause();
      setIsPlaying(false);
      if (onPlayStateChange) {
        onPlayStateChange(false);
      }
    } else {
      console.warn('Cannot pause: No video element available');
    }
  };
  
  // Seek to a specific time
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }
    }
  };

  // Handle video element events
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (onPlayStateChange) {
      onPlayStateChange(false);
    }
  };

  const handleVideoPlaying = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      if (onPlayStateChange) {
        onPlayStateChange(true);
      }
    }
  };

  const handleVideoPaused = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (onPlayStateChange) {
        onPlayStateChange(false);
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-md overflow-hidden">
      <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full h-full bg-black"
          onEnded={handleVideoEnded}
          onPlay={handleVideoPlaying}
          onPause={handleVideoPaused}
        />
        
        {/* Placeholder when no video */}
        {!hasVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-900">
            <FiVideo size={48} className="mb-2" />
            <p>Add media to timeline to preview</p>
          </div>
        )}
      </div>
      
      {/* Video controls */}
      <VideoControls
        videoRef={videoRef}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration || 0}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
      />
    </div>
  );
});

export default MediaPlayer; 