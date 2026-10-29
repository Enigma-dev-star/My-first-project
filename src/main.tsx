import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import App from './App.tsx';
import './index.css';

import { Vault } from './services/vault';

// Only register service worker for web browser PWA, never inside native Capacitor Android app
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

async function bootstrap() {
  try {
    await Vault.init();
  } catch (err) {
    console.error('Vault initialization failed', err);
  }
  createRoot(document.getElementById('root')!).render(<App />);
}

bootstrap();
