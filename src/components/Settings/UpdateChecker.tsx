import React, { useState, useEffect } from 'react';

const UpdateChecker: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloaded' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentVersion = (window as any).electron?.appInfo?.version || '1.0.0';

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.updater) return;

    // Listen for update events
    electron.updater.onUpdateAvailable((info: any) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
      setChecking(false);
    });

    electron.updater.onUpdateNotAvailable(() => {
      setUpdateStatus('not-available');
      setChecking(false);
    });

    electron.updater.onUpdateDownloaded((info: any) => {
      setUpdateStatus('downloaded');
      setUpdateInfo(info);
      setChecking(false);
    });

    electron.updater.onUpdateError((error: any) => {
      setUpdateStatus('error');
      setErrorMessage(error.message || 'Unknown error');
      setChecking(false);
    });

    // Cleanup
    return () => {
      // Cleanup listeners if needed
    };
  }, []);

  const checkForUpdates = async () => {
    const electron = (window as any).electron;
    if (!electron?.updater) {
      setErrorMessage('Update functionality not available');
      return;
    }

    setChecking(true);
    setUpdateStatus('checking');
    try {
      await electron.updater.checkForUpdates();
      // Status will be updated by the listeners
    } catch (error) {
      setUpdateStatus('error');
      setErrorMessage((error as Error).message || 'Failed to check for updates');
      setChecking(false);
    }
  };

  const installUpdate = () => {
    const electron = (window as any).electron;
    if (electron?.updater) {
      electron.updater.installUpdate();
    }
  };

  return (
    <div className="p-4 bg-gray-700 rounded-lg">
      <h2 className="text-lg font-medium text-white mb-2">Software Updates</h2>
      <p className="text-gray-300 mb-4">Current Version: {currentVersion}</p>
      
      {updateStatus === 'idle' && (
        <button
          onClick={checkForUpdates}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          disabled={checking}
        >
          Check for Updates
        </button>
      )}
      
      {updateStatus === 'checking' && (
        <div className="text-gray-300">
          <svg className="animate-spin h-5 w-5 mr-3 inline" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" cy="12" r="10" 
              stroke="currentColor" 
              strokeWidth="4"
              fill="none"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Checking for updates...
        </div>
      )}
      
      {updateStatus === 'not-available' && (
        <div>
          <p className="text-green-400 mb-2">You have the latest version!</p>
          <button
            onClick={checkForUpdates}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            disabled={checking}
          >
            Check Again
          </button>
        </div>
      )}
      
      {updateStatus === 'available' && (
        <div>
          <p className="text-yellow-400 mb-2">
            Update available: v{updateInfo?.version || 'newer version'}
          </p>
          <p className="text-gray-300 mb-4">Update is downloading automatically...</p>
        </div>
      )}
      
      {updateStatus === 'downloaded' && (
        <div>
          <p className="text-green-400 mb-2">
            Update downloaded: v{updateInfo?.version || 'newer version'}
          </p>
          <button
            onClick={installUpdate}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            Restart and Install
          </button>
        </div>
      )}
      
      {updateStatus === 'error' && (
        <div>
          <p className="text-red-400 mb-2">Error checking for updates:</p>
          <p className="text-gray-300 mb-4">{errorMessage}</p>
          <button
            onClick={checkForUpdates}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdateChecker; 