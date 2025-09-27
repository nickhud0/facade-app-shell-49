import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Minimal initialization

// Inicializar app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

// Render with proper React structure
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// App initialized
