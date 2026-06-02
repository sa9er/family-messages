import { createContext, useContext, useState, useEffect } from 'react';
import { FamilyData } from '../types';

interface AuthContextType extends Partial<FamilyData> {
  setAuth: (data: FamilyData) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [familyId, setFamilyId] = useState<string>();
  const [memberId, setMemberId] = useState<string>();
  const [token, setToken] = useState<string>();

  useEffect(() => {
    setFamilyId(localStorage.getItem('familyId') || undefined);
    setMemberId(localStorage.getItem('memberId') || undefined);
    setToken(localStorage.getItem('token') || undefined);
  }, []);

  const setAuth = (data: FamilyData) => {
    localStorage.setItem('familyId', data.familyId);
    localStorage.setItem('memberId', data.memberId);
    localStorage.setItem('token', data.token);
    setFamilyId(data.familyId);
    setMemberId(data.memberId);
    setToken(data.token);
  };

  const clearAuth = () => {
    localStorage.clear();
    setFamilyId(undefined);
    setMemberId(undefined);
    setToken(undefined);
  };

  return (
    <AuthContext.Provider value={{ familyId, memberId, token, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
