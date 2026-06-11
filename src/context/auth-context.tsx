'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
} from 'firebase/auth';

interface User {
  uid: string;
  name: string;
  email: string;
}

export interface JiraCredentials {
  jiraUrl: string;
  email: string;
  apiToken: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (name: string, email: string, pass:string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  credentials: JiraCredentials | null;
  setCredentials: (credentials: JiraCredentials | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentialsState] = useState<JiraCredentials | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load Jira credentials from localStorage on mount
    try {
      const storedCredentials = localStorage.getItem('jiraCredentials');
      if (storedCredentials) {
        setCredentialsState(JSON.parse(storedCredentials));
      }
    } catch (error) {
      console.error("Failed to parse credentials from localStorage", error);
      localStorage.removeItem('jiraCredentials');
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || 'User',
            email: firebaseUser.email!
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const setCredentials = (newCredentials: JiraCredentials | null) => {
    setCredentialsState(newCredentials);
    if (newCredentials) {
      localStorage.setItem('jiraCredentials', JSON.stringify(newCredentials));
    } else {
      localStorage.removeItem('jiraCredentials');
    }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, pass: string): Promise<void> => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: name });
      
      setUser({ uid: firebaseUser.uid, name, email });
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setCredentials(null); // Clear Jira credentials on logout as well
    router.push('/');
  };
  
  const isAuthenticated = isInitialized ? !!credentials : false;

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, credentials, setCredentials, isAuthenticated }}>
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
