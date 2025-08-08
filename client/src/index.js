import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: Add performance monitoring later if needed
const reportWebVitals = () => {
  // Add performance monitoring code here when needed
};

export default reportWebVitals;
