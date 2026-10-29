import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@fontsource-variable/inter';
import './styles.css';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Database from './pages/Database.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/db" element={<Database />} />
      </Routes>
    </BrowserRouter>
    <Toaster position="bottom-center" />
  </React.StrictMode>
);
