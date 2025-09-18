import { useContext, createContext } from 'react';
import type { User } from '../types';

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (credentials: LoginForm) => Promise<void>
  register: (userData: RegisterForm) => Promise<void>
  logout: () => void
  updateBalance: (newBalance: number, source?: 'optimistic' | 'socket' | 'manual') => void
  rollbackBalance: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};