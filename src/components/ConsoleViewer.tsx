import React, { useState, useEffect } from 'react';

interface ConsoleLog {
  tabId: string;
  message: string;
  level: number; // 0: log, 1: warning, 2: error, 3: debug
  timestamp: Date;
  source?: string;
  line?: number;
}

interface ConsoleViewerProps {
  activeTabId: string;
  webviewRefs: React.MutableRefObject<{ [key: string]: Electron.WebviewTag }>;
}

const ConsoleViewer: React.FC<ConsoleViewerProps> = ({ activeTabId, webviewRefs }) => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  // Clear logs when switching tabs
  useEffect(() => {
    setLogs([]);
  }, [activeTabId]);

  // Set up console listener for the active tab
  useEffect(() => {
    const webview = webviewRefs.current[activeTabId];
    if (!webview) return;

    const handleConsoleMessage = (event: any) => {
      setLogs(prev => [...prev, {
        tabId: activeTabId,
        message: event.message,
        level: event.level,
        timestamp: new Date(),
        source: event.sourceId,
        line: event.line
      }]);
    };

    webview.addEventListener('console-message', handleConsoleMessage);

    return () => {
      webview.removeEventListener('console-message', handleConsoleMessage);
    };
  }, [activeTabId, webviewRefs]);

  if (!showConsole) {
    return (
      <button 
        className="fixed bottom-5 left-4 bg-gray-800 text-white p-1 rounded z-50"
        onClick={() => setShowConsole(true)}
        style={{

          left: '280px'
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 4h13a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3m0 1a2 2 0 0 0-2 2h17a2 2 0 0 0-2-2zM3 18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V8H3zm14 0h-5v-1h5zM6 10.5l.71-.71l4.2 4.21l-4.2 4.21L6 17.5L9.5 14z"/></svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/3 bg-gray-900 border-t border-gray-700 z-50 overflow-auto">
      <div className="flex justify-between items-center p-2 border-b border-gray-700">
        <h3 className="text-white">Console Logs</h3>
        <button onClick={() => setShowConsole(false)} className="text-white">Close</button>
      </div>
      <div className="p-2">
        {logs.length === 0 ? (
          <p className="text-gray-400">No console logs captured yet.</p>
        ) : (
          logs.map((log, index) => (
            <div 
              key={index} 
              className={`my-1 p-1 font-mono text-sm ${
                log.level === 2 ? 'text-red-400' : 
                log.level === 1 ? 'text-yellow-400' : 'text-white'
              }`}
            >
              <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}]</span> {log.message}
              {log.source && (
                <span className="text-gray-500 text-xs ml-2">
                  {log.source}:{log.line}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsoleViewer; 