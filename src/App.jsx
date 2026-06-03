import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/login-page/LoginPage';
import RegisterPage from './pages/register-page/RegisterPage'
import './App.css';
import MainPage from './pages/main-page/MainPage';
import Profile from './pages/profile-page/ProfilePage'
import EditProfilePage  from './pages/editprofile-page/EditProfilePage';
import UserPage from './pages/user-page/UserPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/main" element={<PrivateRoute><MainPage /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path='/edit' element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
            <Route path="/user/:id" element={<PrivateRoute><UserPage /></PrivateRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}


