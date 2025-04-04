import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AccountabilityProvider } from './contexts/AccountabilityContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AccountabilityProvider>
      <App />
    </AccountabilityProvider>
  </React.StrictMode>
); 