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

export interface Workspace {
  id: string;
  name: string;
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
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  fetchWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentialsState] = useState<JiraCredentials | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
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

  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .order('created_at', { ascending: true });
        
      if (error) {
        console.warn("Failed to fetch workspaces (did you run the migration?):", error.message || JSON.stringify(error));
      } else if (data && data.length > 0) {
        setWorkspaces(data);
        setActiveWorkspace(current => {
          if (!current || !data.find(w => w.id === current.id)) {
            return data[0];
          }
          return current;
        });
      } else {
        // No workspaces found (migration ran but user had no previous scripts). Create a default one.
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
           const newWorkspaceId = crypto.randomUUID();
           const { error: insertError } = await supabase
             .from('workspaces')
             .insert([{ id: newWorkspaceId, name: 'My Workspace' }]);
             
           if (!insertError) {
             await supabase.from('workspace_members').insert([{
               workspace_id: newWorkspaceId,
               user_id: authData.user.id,
               role: 'owner'
             }]);
             const newWs = { id: newWorkspaceId, name: 'My Workspace' };
             setWorkspaces([newWs]);
             setActiveWorkspace(newWs);
             return;
           }
        }

        setWorkspaces([]);
        setActiveWorkspace(null);
      }
    } catch (err) {
      console.error("Exception fetching workspaces:", err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            setUser({
              uid: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email || 'User',
              email: session.user.email!
            });
            await Promise.all([fetchJiraCredentials(), fetchWorkspaces()]);
          } else {
            setUser(null);
            setCredentialsState(null);
            setWorkspaces([]);
            setActiveWorkspace(null);
            setIsInitialized(true);
          }
        } catch (err) {
          console.error("Error in onAuthStateChange processing:", err);
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Initial session fetch
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        try {
          if (session?.user) {
            setUser({
              uid: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email || 'User',
              email: session.user.email!
            });
            await Promise.all([fetchJiraCredentials(), fetchWorkspaces()]);
          } else {
            setIsInitialized(true);
          }
        } catch (err) {
          console.error("Error in getSession processing:", err);
        } finally {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("getSession failed:", err);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);
  
  const setCredentials = async (newCredentials: JiraCredentials | null) => {
    setCredentialsState(newCredentials);
    setIsInitialized(true); // Ensure that after setting credentials, it's considered initialized
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
    setWorkspaces([]);
    setActiveWorkspace(null);
    router.push('/');
  };
  
  const isAuthenticated = isInitialized ? !!credentials : false;

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, credentials, setCredentials, isAuthenticated, workspaces, activeWorkspace, setActiveWorkspace, fetchWorkspaces }}>
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
