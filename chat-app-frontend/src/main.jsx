import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';


import { SnackbarProvider } from 'notistack';




ReactDOM.createRoot(document.getElementById('root')).render(

  <SnackbarProvider autoHideDuration={3000}>

    <App />

  </SnackbarProvider>

);
