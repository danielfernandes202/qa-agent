'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
  setCredentials: (credentials: JiraCredentials | null) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentialsState] = useState<JiraCredentials | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  const fetchJiraCredentials = async () => {
    try {
      const { data, error } = await supabase.rpc('get_jira_credentials');
      if (error) {
        console.error("Failed to fetch credentials from Supabase:", error);
      } else if (data && data.length > 0) {
        const record = data[0];
        setCredentialsState({
          jiraUrl: record.jira_url,
          email: record.email,
          apiToken: record.api_token,
        });
      } else {
        setCredentialsState(null);
      }
    } catch (err) {
      console.error("Exception fetching credentials:", err);
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            uid: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email || 'User',
            email: session.user.email!
          });
          await fetchJiraCredentials();
        } else {
          setUser(null);
          setCredentialsState(null);
          setIsInitialized(true);
        }
        setIsLoading(false);
      }
    );

    // Initial session fetch
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser({
          uid: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email || 'User',
          email: session.user.email!
        });
        await fetchJiraCredentials();
      } else {
        setIsInitialized(true);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const setCredentials = async (newCredentials: JiraCredentials | null) => {
    setCredentialsState(newCredentials);
    if (newCredentials) {
      const { error } = await supabase.rpc('store_jira_credentials', {
        p_jira_url: newCredentials.jiraUrl,
        p_email: newCredentials.email,
        p_api_token: newCredentials.apiToken,
      });
      if (error) {
        console.error("Failed to store credentials securely:", error);
        throw new Error("Failed to securely store credentials in Supabase.");
      }
    } else {
      if (user) {
        const { error } = await supabase.from('user_jira_credentials').delete().eq('user_id', user.uid);
        if (error) {
          console.error("Failed to delete credentials from Supabase:", error);
        }
      }
    }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
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
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: {
          data: {
            full_name: name
          }
        }
      });
      if (error) throw error;
      
      if (data.user) {
        setUser({ uid: data.user.id, name, email });
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
