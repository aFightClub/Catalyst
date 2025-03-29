import React, { useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward } from 'react-icons/fi';

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  videoRef,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek
}) => {
  const progressRef = useRef<HTMLDivElement>(null);

  // Format time to MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle click on progress bar
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const seekTime = position * duration;
    onSeek(seekTime);
  };

  // Skip forward/backward by 5 seconds
  const skipBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, currentTime - 5);
      onSeek(newTime);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      const newTime = Math.min(duration, currentTime + 5);
      onSeek(newTime);
    }
  };

  return (
    <div className="bg-gray-900 py-2 px-4 rounded-b-md">
      {/* Progress bar */}
      <div 
        ref={progressRef}
        className="h-2 bg-gray-700 rounded-full mb-2 cursor-pointer relative"
        onClick={handleProgressClick}
      >
        <div 
          className="absolute h-full bg-blue-600 rounded-full"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between">
        {/* Playback controls */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={skipBackward}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-300"
          >
            <FiSkipBack />
          </button>
          
          <button 
            onClick={isPlaying ? onPause : onPlay}
            className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 text-white"
          >
            {isPlaying ? <FiPause /> : <FiPlay />}
          </button>
          
          <button 
            onClick={skipForward}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-300"
          >
            <FiSkipForward />
          </button>
        </div>
        
        {/* Time display */}
        <div className="text-gray-300 text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default VideoControls; 