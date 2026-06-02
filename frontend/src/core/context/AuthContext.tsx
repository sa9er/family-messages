import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  familyId: string | null;
  memberId: string | null;
  setAuth: (token: string, familyId: string, memberId: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedFamilyId = localStorage.getItem('familyId');
    const storedMemberId = localStorage.getItem('memberId');
    if (storedToken && storedFamilyId && storedMemberId) {
      setToken(storedToken);
      setFamilyId(storedFamilyId);
      setMemberId(storedMemberId);
    }
  }, []);

  const setAuth = (newToken: string, newFamilyId: string, newMemberId: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('familyId', newFamilyId);
    localStorage.setItem('memberId', newMemberId);
    setToken(newToken);
    setFamilyId(newFamilyId);
    setMemberId(newMemberId);
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('familyId');
    localStorage.removeItem('memberId');
    setToken(null);
    setFamilyId(null);
    setMemberId(null);
  };

  return (
    <AuthContext.Provider value={{ token, familyId, memberId, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
