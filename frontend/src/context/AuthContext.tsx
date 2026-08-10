import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA: boolean }>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ─── Check persisted auth on mount ────────────────────────────────────────
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authApi.me();
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<{ requires2FA: boolean }> => {
    const response = await authApi.login(email, password);
    const data = response.data;

    if (!data.requires2FA && data.token) {
      localStorage.setItem('token', data.token);
      const userResponse = await authApi.me();
      setUser(userResponse.data);
      setIsAuthenticated(true);
      return { requires2FA: false };
    }

    return { requires2FA: true };
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const response = await authApi.verifyLogin(email, token);
      const { token: jwtToken } = response.data;

      if (!jwtToken) {
        throw new Error('No JWT token received from server');
      }

      localStorage.setItem('token', jwtToken);

      const userResponse = await authApi.me();
      setUser(userResponse.data);
      setIsAuthenticated(true);
    } catch (error: any) {
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);

      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      if (errorMessage?.includes('expired')) {
        throw new Error('Your verification token has expired. Please request a new one.');
      } else if (errorMessage?.includes('Invalid token')) {
        throw new Error('The verification token is invalid. Please check and try again.');
      } else if (errorMessage?.includes('does not match')) {
        throw new Error("The token doesn't match the email address used. Please try again.");
      } else {
        throw new Error(errorMessage || 'Failed to verify token. Please try again.');
      }
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await authApi.register(username, email, password);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data || error.message;
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout, verifyOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};