import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Undo "Airlift" offline optimizations: disable Service Worker + clear caches.
// Reason: the SW caches API responses and can cause intermittent auth/role fetch timeouts on refresh.
const disableServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    // Prevent any future SW registrations (index.html registers on window load)
    const swAny = (navigator as any).serviceWorker as any;
    if (swAny && typeof swAny.register === 'function') {
      swAny.register = (..._args: any[]) => {
        console.log('[Stock-X] SW disabled');
        return Promise.reject(new Error('Service worker disabled'));
      };
    }
  } catch (e) {
    // No-op: if the environment prevents patching, we still attempt to unregister below.
    console.warn('[Stock-X] Unable to patch serviceWorker.register', e);
  }

  const cleanup = async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith('stock-x-'))
            .map((k) => caches.delete(k))
        );
      }

      console.log('[Stock-X] SW unregistered + caches cleared');
    } catch (err) {
      console.warn('[Stock-X] SW cleanup failed', err);
    }
  };

  // Run immediately and also after window load (to beat any late registrations).
  cleanup();
  window.addEventListener('load', () => void cleanup(), { once: true });
};

// Production-ready initialization with error handling
console.log('[Stock-X] Initializing application...');

disableServiceWorker();

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
