import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@fontsource-variable/inter';
import './styles.css';
import Login from './pages/Login.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/account" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
    <Toaster position="bottom-center" />
  </React.StrictMode>
);
