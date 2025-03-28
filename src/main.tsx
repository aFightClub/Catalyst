import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { storeService } from './services/storeService'

// Check if running in Electron context
const isElectron = () => {
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object') {
    return true;
  }
  
  // Main process
  if (typeof process !== 'undefined' && process.versions && !!process.versions.electron) {
    return true;
  }
  
  return false;
};

// Log environment
console.log('Running in', isElectron() ? 'Electron' : 'Browser', 'environment');

// Initialize store and then render the app
const initApp = async () => {
  try {
    // Wait for store to be ready
    await storeService.waitForReady();
    
    // Migrate data from old localStorage if needed
    await storeService.migrateFromLocalStorage();
    
    // Render the app
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Render the app anyway in case of initialization error
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
};

// Start initialization
initApp(); 