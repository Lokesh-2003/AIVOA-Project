import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // This was likely pointing to './frontend' before
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
