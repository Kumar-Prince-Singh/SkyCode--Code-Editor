import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
import { API_BASE_URL } from '../config';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    // Increased timeout to 20s to handle heavy Docker build load
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const checkUser = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
            signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUser(data.user);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.error('Auth check timed out after 20s');
        } else {
          console.error('Auth check failed');
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    checkUser();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const login = (userData: any) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { credentials: 'include' });
    } catch (err) {
      console.error('Logout request failed');
    }
    setUser(null);
    toast.success('Logged out successfully');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
