import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testFirestoreConnection } from './lib/firebase';

// Case A Google Maps Quota & Auth Failure Defense
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

window.gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (args.some((a) => typeof a === 'string' && a.includes('OverQuotaMapError'))) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
  origConsoleError.apply(console, args);
};

testFirestoreConnection().catch(() => {
  // Handled internally inside testFirestoreConnection
});

createRoot(document.getElementById('root')!).render(<App />);
