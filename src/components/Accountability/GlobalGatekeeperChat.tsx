import React, { useEffect } from 'react';
import { useAccountability } from '../../contexts/AccountabilityContext';
import GatekeeperChat from './GatekeeperChat';

/**
 * Global wrapper for GatekeeperChat that can be rendered at the top level
 * of the application to provide goal accountability reminders that work
 * across all screens.
 */
const GlobalGatekeeperChat: React.FC = () => {
  const { 
    showGatekeeperChat, 
    activeGoal, 
    closeGatekeeperChat, 
    updateGoal,
    apiKey,
    selectedModel,
    projects,
    userContext
  } = useAccountability();

  // Debug logging for API key
  useEffect(() => {
    const contextKey = apiKey ? `${apiKey.substring(0, 5)}...` : "not set";
    
    // Also check localStorage directly
    const localStorageKey = localStorage.getItem('openai_api_key');
    const localKey = localStorageKey ? `${localStorageKey.substring(0, 5)}...` : "not in localStorage";
    
    console.log(`GlobalGatekeeperChat: API key - context: ${contextKey}, localStorage: ${localKey}`);
  }, [apiKey]);

  // Only render when there's a goal to check and the modal should be shown
  if (!showGatekeeperChat || !activeGoal) return null;

  // Get API key from localStorage if not in context
  const workingApiKey = apiKey || localStorage.getItem('openai_api_key') || '';

  return (
    <GatekeeperChat
      goal={activeGoal}
      onClose={closeGatekeeperChat}
      onUpdateGoal={updateGoal}
      apiKey={workingApiKey}
      selectedModel={selectedModel}
      projects={projects}
      userContext={userContext}
    />
  );
};

export default GlobalGatekeeperChat; 