import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Production-ready initialization with error handling
console.log('[Stock-X] Initializing application...');

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('[Stock-X] Fatal: Root element not found');
  document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;"><h1>Failed to load application</h1></div>';
} else {
  try {
    // Clear any loading placeholder
    rootElement.innerHTML = '';
    
    createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('[Stock-X] Application mounted successfully');
  } catch (error) {
    console.error('[Stock-X] Failed to mount application:', error);
    rootElement.innerHTML = '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui;gap:1rem;"><h1>Something went wrong</h1><button onclick="location.reload()" style="padding:0.5rem 1rem;cursor:pointer;">Reload</button></div>';
  }
}
