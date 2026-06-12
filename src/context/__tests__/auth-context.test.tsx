import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, JiraCredentials } from '../auth-context';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => {
  const onAuthStateChangeMock = jest.fn();
  const unsubscribeMock = jest.fn();
  
  return {
    supabase: {
      auth: {
        onAuthStateChange: onAuthStateChangeMock.mockReturnValue({
          data: { subscription: { unsubscribe: unsubscribeMock } },
        }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      },
      rpc: jest.fn(),
    },
  };
});

// Mock Next router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const TestComponent = () => {
  const { credentials, setCredentials, isAuthenticated } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="jira-url">{credentials?.jiraUrl || 'None'}</div>
      <button 
        onClick={() => setCredentials({ jiraUrl: 'https://test.jira.com', email: 'test@test.com', apiToken: 'token123' })}
        data-testid="set-creds-btn"
      >
        Set Creds
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches credentials from Supabase on load if user is logged in', async () => {
    // Setup initial session
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'user-123', email: 'user@test.com', user_metadata: { full_name: 'Test User' } }
        }
      }
    });

    // Mock RPC to return existing credentials
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [{ jira_url: 'https://existing.jira.com', email: 'existing@test.com', api_token: 'existing_token' }],
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_jira_credentials');
      expect(screen.getByTestId('jira-url').textContent).toBe('https://existing.jira.com');
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });
  });

  it('stores credentials securely in Supabase when setCredentials is called', async () => {
    // Setup initial session to be null
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null }
    });

    // Mock RPC for storing credentials
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('jira-url').textContent).toBe('None');
    });

    // Click button to set credentials
    act(() => {
      screen.getByTestId('set-creds-btn').click();
    });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('store_jira_credentials', {
        p_jira_url: 'https://test.jira.com',
        p_email: 'test@test.com',
        p_api_token: 'token123'
      });
      expect(screen.getByTestId('jira-url').textContent).toBe('https://test.jira.com');
    });
  });
});
