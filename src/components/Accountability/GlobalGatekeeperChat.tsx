import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAccountability } from '../../contexts/AccountabilityContext';
import GatekeeperChat from './GatekeeperChat';

/**
 * Global wrapper for GatekeeperChat that uses a React Portal to render
 * directly to document.body, ensuring it's always visible regardless of
 * parent component styling or positioning.
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

  // Reference to the portal div
  const portalRootRef = useRef<HTMLDivElement | null>(null);
  // Track whether portal has been created
  const [portalCreated, setPortalCreated] = useState(false);

  // Create the portal div on component mount
  useEffect(() => {
    console.log("GlobalGatekeeperChat: Component mounting, creating portal div");
    
    // Remove any existing portal first to avoid duplicates
    const existingPortal = document.getElementById('gatekeeper-portal-root');
    if (existingPortal) {
      console.log("GlobalGatekeeperChat: Removing existing portal div");
      existingPortal.parentNode?.removeChild(existingPortal);
    }
    
    // Create a new portal div
    const portalRoot = document.createElement('div');
    portalRoot.id = 'gatekeeper-portal-root';
    // Make sure it has proper z-index and positioning
    portalRoot.style.position = 'fixed';
    portalRoot.style.zIndex = '999999';
    portalRoot.style.top = '0';
    portalRoot.style.left = '0';
    portalRoot.style.width = '100%';
    portalRoot.style.height = '100%';
    portalRoot.style.pointerEvents = 'none'; // Allow clicks to pass through when empty
    portalRoot.style.display = 'none'; // Hide initially
    
    // Append to body
    document.body.appendChild(portalRoot);
    console.log('Created new portal root for GatekeeperChat');
    
    // Store reference
    portalRootRef.current = portalRoot;
    setPortalCreated(true);
    
    return () => {
      // Clean up on unmount
      console.log("GlobalGatekeeperChat: Component unmounting, removing portal div");
      if (portalRoot.parentNode) {
        portalRoot.parentNode.removeChild(portalRoot);
      }
    };
  }, []);

  // Debug logging for visibility state
  useEffect(() => {
    console.log(`GlobalGatekeeperChat: STATE UPDATE - showGatekeeperChat: ${showGatekeeperChat}, activeGoal: ${activeGoal?.title || 'null'}, portalCreated: ${portalCreated}`);
    
    // If we should be showing the chat, make sure the portal div is visible
    if (showGatekeeperChat && activeGoal && portalRootRef.current) {
      console.log(`GlobalGatekeeperChat: Making portal visible for goal "${activeGoal.title}"`);
      portalRootRef.current.style.display = 'block';
      portalRootRef.current.style.pointerEvents = 'auto';
    } else if (portalRootRef.current) {
      console.log(`GlobalGatekeeperChat: Hiding portal`);
      portalRootRef.current.style.display = 'none';
      portalRootRef.current.style.pointerEvents = 'none';
    }
  }, [showGatekeeperChat, activeGoal, portalCreated]);

  // Expose a debug function to check the portal DOM element
  useEffect(() => {
    (window as any).debugCheckGatekeeperPortal = () => {
      const portalElement = document.getElementById('gatekeeper-portal-root');
      console.log("GlobalGatekeeperChat DEBUG: Portal element exists:", !!portalElement);
      if (portalElement) {
        console.log("GlobalGatekeeperChat DEBUG: Portal style:", {
          display: portalElement.style.display,
          zIndex: portalElement.style.zIndex,
          pointerEvents: portalElement.style.pointerEvents,
          children: portalElement.childNodes.length
        });
      }
      return !!portalElement;
    };
  }, []);

  // If no active goal or shouldn't show chat, return empty div (but still render the component)
  if (!showGatekeeperChat || !activeGoal || !portalCreated || !portalRootRef.current) {
    // Log why it's not rendering
    console.log(`GlobalGatekeeperChat: NOT RENDERING PORTAL CONTENT. Reason: showGatekeeperChat=${showGatekeeperChat}, activeGoal=${!!activeGoal}, portalCreated=${portalCreated}, portalRootRef=${!!portalRootRef.current}`);
    return <div id="gatekeeper-placeholder" style={{ display: 'none' }} />;
  }

  // Log that we're rendering
  console.log(`GlobalGatekeeperChat: RENDERING PORTAL CONTENT for goal: ${activeGoal.title}`);

  // Get API key from localStorage if not in context
  const workingApiKey = apiKey || localStorage.getItem('openai_api_key') || '';
  
  if (!workingApiKey) {
    console.error("GlobalGatekeeperChat: No API key available, cannot show gatekeeper chat");
    return null;
  }

  // Use createPortal to render chat to our portal div
  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        // Close when clicking overlay (but not the chat itself)
        if (e.target === e.currentTarget) {
          closeGatekeeperChat();
        }
      }}
    >
      <GatekeeperChat
        goal={activeGoal}
        onClose={closeGatekeeperChat}
        onUpdateGoal={updateGoal}
        apiKey={workingApiKey}
        selectedModel={selectedModel}
        projects={projects}
        userContext={userContext}
      />
    </div>,
    portalRootRef.current
  );
};

export default GlobalGatekeeperChat; 