import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { setToken as storeSetToken, clearToken } from '../api/tokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyToken = (token) => {
    // Write to the module-scoped tokenStore — never window or localStorage
    storeSetToken(token);
  };

  const login = async (email, password) => {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, { email, password }, { withCredentials: true });
    applyToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch {}
    clearToken();
    setUser(null);
  };

  // On mount: try to refresh token via httpOnly cookie
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
        applyToken(res.data.accessToken);
        setUser(res.data.user);
      } catch {
        // No valid session — user needs to log in
      } finally {
        setLoading(false);
      }
    };
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
