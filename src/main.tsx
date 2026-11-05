// Ensure crypto.randomUUID is available on HTTP (non-HTTPS) static IP / LAN deployments
if (typeof window !== 'undefined') {
  const gCrypto = (window.crypto || (window as any).msCrypto || {}) as any;
  if (typeof gCrypto.randomUUID !== 'function') {
    const fallbackRandomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16;
        if (typeof gCrypto.getRandomValues === 'function') {
          const buf = new Uint8Array(1);
          gCrypto.getRandomValues(buf);
          r = buf[0] % 16;
        }
        const v = c === 'x' ? r | 0 : (r & 0x3) | 0x8;
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    };
    try {
      gCrypto.randomUUID = fallbackRandomUUID;
      if (!window.crypto) {
        (window as any).crypto = gCrypto;
      }
    } catch (_e) {}
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Automatic reload if a new version deployment changes chunk asset filenames
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = Number(sessionStorage.getItem('bjl_last_preload_reload') || '0');
  const now = Date.now();
  if (now - lastReload > 15000) {
    sessionStorage.setItem('bjl_last_preload_reload', String(now));
    window.location.reload();
  }
});

// Globally disable Up/Down arrow keys and mouse wheel stepping on all number inputs
window.addEventListener(
  'keydown',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      target.tagName === 'INPUT' &&
      (target as HTMLInputElement).type === 'number' &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      event.preventDefault();
    }
  },
  true
);

window.addEventListener(
  'wheel',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      target.tagName === 'INPUT' &&
      (target as HTMLInputElement).type === 'number' &&
      document.activeElement === target
    ) {
      (target as HTMLInputElement).blur();
    }
  },
  { passive: true, capture: true }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

