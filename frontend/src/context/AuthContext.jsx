import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tcp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('tcp_token'));
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      const data = res.data;
      const userData = {
        id: data.userId,
        username: data.username,
        displayName: data.displayName,
        role: data.role,
        permittedZoneIds: data.permittedZoneIds || [],
      };

      localStorage.setItem('tcp_token', data.token);
      localStorage.setItem('tcp_user', JSON.stringify(userData));
      setToken(data.token);
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (type) => {
    if (type === 'admin') {
      return login('admin', 'admin1234');
    } else if (type === 'toilet1') {
      return login('toilet1', 'toilet1234');
    } else if (type === 'toilet2') {
      return login('toilet2', 'toilet1234');
    }
  };

  const logout = () => {
    localStorage.removeItem('tcp_token');
    localStorage.removeItem('tcp_user');
    setToken(null);
    setUser(null);
  };

  const refreshUserData = async () => {
    if (!token) return;
    try {
      const res = await authApi.getMyZones();
      const zones = res.data;
      if (user) {
        const updated = {
          ...user,
          permittedZoneIds: zones.map((z) => z.id),
        };
        setUser(updated);
        localStorage.setItem('tcp_user', JSON.stringify(updated));
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLogin,
        logout,
        refreshUserData,
        isAdmin: user?.role === 'ADMIN',
        isZoneManager: user?.role === 'ZONE_MANAGER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
