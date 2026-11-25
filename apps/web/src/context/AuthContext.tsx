import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  emailVerified?: boolean;
  isSuperAdmin?: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  brands: any[];
  activeBrand: any | null;
  setActiveBrand: (brand: any) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    agencyName: string;
    agencySlug: string;
  }) => Promise<any>;
  sendSignupOtp: (payload: { email: string; agencySlug?: string }) => Promise<{ success: boolean; message: string; expiresInSeconds: number; devOtp?: string }>;
  verifyOtpAndRegister: (payload: {
    email: string;
    otp: string;
    fullName: string;
    password: string;
    agencyName: string;
    agencySlug: string;
  }) => Promise<any>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; devResetToken?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  loading: boolean;
  refreshBrands: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [activeBrand, setActiveBrand] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const initSession = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setTenant(data.tenant);
      setBrands(data.brands);
      if (data.brands.length > 0) {
        setActiveBrand(data.brands[0]);
      }
    } catch (err) {
      console.warn('Session init failed or unauthenticated:', err);
      api.clearToken();
      setUser(null);
      setTenant(null);
      setBrands([]);
      setActiveBrand(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    if (data.tokens?.accessToken) {
      api.setToken(data.tokens.accessToken);
    }
    if (data.tokens?.refreshToken) {
      api.setRefreshToken(data.tokens.refreshToken);
    }
    await initSession();
  };

  const register = async (payload: {
    email: string;
    password: string;
    fullName: string;
    agencyName: string;
    agencySlug: string;
  }) => {
    const data = await api.auth.register(payload);
    if (data.tokens?.accessToken) {
      api.setToken(data.tokens.accessToken);
    }
    if (data.tokens?.refreshToken) {
      api.setRefreshToken(data.tokens.refreshToken);
    }
    await initSession();
    return data;
  };

  const sendSignupOtp = async (payload: { email: string; agencySlug?: string }) => {
    return api.auth.sendSignupOtp(payload);
  };

  const verifyOtpAndRegister = async (payload: {
    email: string;
    otp: string;
    fullName: string;
    password: string;
    agencyName: string;
    agencySlug: string;
  }) => {
    const res = await api.auth.verifyOtpAndRegister(payload);
    const tokens = res.data?.tokens;
    if (tokens?.accessToken) {
      api.setToken(tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      api.setRefreshToken(tokens.refreshToken);
    }
    await initSession();
    return res;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Server logout notice:', err);
    } finally {
      api.clearToken();
      setUser(null);
      setTenant(null);
      setBrands([]);
      setActiveBrand(null);
    }
  };

  const forgotPassword = async (email: string) => {
    return api.auth.forgotPassword(email);
  };

  const resetPassword = async (token: string, password: string) => {
    await api.auth.resetPassword({ token, password });
  };

  const verifyEmail = async (token: string) => {
    await api.auth.verifyEmail(token);
    if (user) {
      setUser({ ...user, emailVerified: true });
    }
  };

  const resendVerification = async (email: string) => {
    await api.auth.resendVerification(email);
  };

  const refreshBrands = async () => {
    try {
      const updated = await api.brands.list();
      setBrands(updated);
      if (!activeBrand && updated.length > 0) {
        setActiveBrand(updated[0]);
      }
    } catch (err) {
      console.error('Failed to refresh brands:', err);
    }
  };

  const refreshTenant = async () => {
    try {
      const data = await api.auth.me();
      setTenant(data.tenant);
    } catch (err) {
      console.error('Failed to refresh tenant:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        brands,
        activeBrand,
        setActiveBrand,
        login,
        register,
        sendSignupOtp,
        verifyOtpAndRegister,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
        loading,
        refreshBrands,
        refreshTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
