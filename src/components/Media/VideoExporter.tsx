import React, { useState } from 'react';
import { FiDownload, FiSettings } from 'react-icons/fi';

interface VideoExporterProps {
  videoTracks: any[];
  audioTracks: any[];
  mediaAssets: any[];
  resolution: { width: number; height: number };
  onExport: () => void;
}

const VideoExporter: React.FC<VideoExporterProps> = ({
  videoTracks,
  audioTracks,
  mediaAssets,
  resolution,
  onExport
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('mp4');
  const [exportQuality, setExportQuality] = useState('high');

  // Helper to get the total duration of the project
  const getTotalDuration = () => {
    let maxDuration = 0;
    
    // Check video tracks
    videoTracks.forEach(track => {
      track.assets.forEach((asset: any) => {
        const endTime = asset.startTime + asset.duration;
        if (endTime > maxDuration) maxDuration = endTime;
      });
    });
    
    // Check audio tracks
    audioTracks.forEach(track => {
      track.assets.forEach((asset: any) => {
        const endTime = asset.startTime + asset.duration;
        if (endTime > maxDuration) maxDuration = endTime;
      });
    });
    
    return maxDuration;
  };

  // Mock file save dialog (would use Electron's dialog in a real app)
  const mockSaveDialog = async (): Promise<string | null> => {
    // In a real app with Electron, we would use:
    // -----------
    // import { dialog } from '@electron/remote';
    // 
    // const result = await dialog.showSaveDialog({
    //   title: 'Export Video',
    //   defaultPath: `MyVideo.${exportFormat}`,
    //   buttonLabel: 'Export',
    //   filters: [
    //     { name: 'Video Files', extensions: [exportFormat] },
    //     { name: 'All Files', extensions: ['*'] }
    //   ],
    //   properties: ['createDirectory', 'showOverwriteConfirmation']
    // });
    //
    // if (result.canceled) {
    //   return null;
    // }
    //
    // return result.filePath;
    // -----------
    
    // For demo purposes, we'll use a custom prompt dialog to simulate file saving
    const userPath = `/Users/${navigator.platform.includes('Mac') ? 'user' : 'username'}/Videos`;
    const defaultFileName = `My_Video_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
    
    // Show confirmation with default path
    const saveConfirm = window.confirm(`Save video as "${defaultFileName}" to ${userPath}?`);
    
    if (!saveConfirm) {
      return null;
    }
    
    // Let user customize the path if they want
    const customPath = window.prompt(
      "Enter a custom path or filename (leave empty to use default):", 
      `${userPath}/${defaultFileName}`
    );
    
    if (customPath === null) {
      return null; // User cancelled the prompt
    }
    
    // If user entered a custom path, use it, otherwise use the default
    const finalPath = customPath.trim() === '' ? `${userPath}/${defaultFileName}` : customPath;
    
    // Make sure the path has the correct extension
    if (!finalPath.endsWith(`.${exportFormat}`)) {
      return `${finalPath}.${exportFormat}`;
    }
    
    return finalPath;
  };

  // In a real implementation, this function would handle the actual FFmpeg export
  const processVideoExport = async (outputPath: string) => {
    // Status updates for the UI
    const statusUpdates = [
      "Preparing media files...",
      "Combining video tracks...",
      "Adding audio tracks...",
      "Applying transitions...",
      "Rendering final video...",
      "Saving to disk..."
    ];
    
    // Create a fake progress indicator
    for (let i = 0; i < statusUpdates.length; i++) {
      console.log(statusUpdates[i]);
      // In a real app, we would update a progress state here
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // In a real application with Electron, we would:
    // 1. Create temporary directories for assets
    // 2. Write a temporary FFmpeg script
    // 3. Execute FFmpeg via Node.js child_process
    // 4. Monitor progress and update UI
    // 5. Clean up temporary files
    
    // Return success
    return true;
  };

  // Start the export process
  const startExport = async () => {
    if (videoTracks.length === 0 && audioTracks.length === 0) {
      alert('No media to export. Please add some video or audio to your timeline.');
      return;
    }

    setIsExporting(true);
    
    try {
      // Open file save dialog (this would use Electron's dialog API in a real app)
      const outputPath = await mockSaveDialog();
      
      if (outputPath) {
        // Process the export
        await processVideoExport(outputPath);
        
        // Show success message
        alert(`Video export complete!\nSaved to: ${outputPath}`);
        onExport();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-medium mb-3 flex items-center">
        <FiDownload className="mr-2" />
        Export Video
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-gray-300 text-sm mb-1">Format</label>
          <select 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded"
          >
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP9)</option>
            <option value="mov">MOV (QuickTime)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-300 text-sm mb-1">Quality</label>
          <select 
            value={exportQuality}
            onChange={(e) => setExportQuality(e.target.value)}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded"
          >
            <option value="high">High (1080p)</option>
            <option value="medium">Medium (720p)</option>
            <option value="low">Low (480p)</option>
          </select>
        </div>
      </div>
      
      <div className="bg-gray-700 p-3 rounded-md mb-4">
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span>Resolution</span>
          <span>{resolution.width} × {resolution.height}</span>
        </div>
        
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span>Duration</span>
          <span>{Math.round(getTotalDuration())} seconds</span>
        </div>
        
        <div className="flex justify-between text-sm text-gray-300">
          <span>Tracks</span>
          <span>{videoTracks.length} video, {audioTracks.length} audio</span>
        </div>
      </div>
      
      <button
        onClick={startExport}
        disabled={isExporting}
        className={`w-full px-4 py-2 rounded-md flex items-center justify-center ${
          isExporting 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isExporting ? (
          <>
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Exporting...
          </>
        ) : (
          <>
            <FiDownload className="mr-2" />
            Export Video
          </>
        )}
      </button>
      
      <div className="mt-3 text-xs text-gray-400 text-center">
        <p>Video will be saved as an MP4 file to your chosen location</p>
      </div>
    </div>
  );
};

export default VideoExporter; 