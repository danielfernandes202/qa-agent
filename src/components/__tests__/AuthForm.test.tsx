
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { fetchProjectsAction } from '@/app/actions';

// Mock dependencies
jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/app/actions', () => ({
  fetchProjectsAction: jest.fn(),
}));

const mockSetCredentials = jest.fn();
const mockLogout = jest.fn();
const mockToast = jest.fn();

describe('AuthForm Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      setCredentials: mockSetCredentials,
      logout: mockLogout,
    });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (fetchProjectsAction as jest.Mock).mockClear();
    mockSetCredentials.mockClear();
    mockLogout.mockClear();
    mockToast.mockClear();
  });

  it('renders all form fields and the connect button', () => {
    render(<AuthForm />);
    expect(screen.getByLabelText(/Jira URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Jira Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/API Token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields on submit', async () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByRole('button', { name: /Connect/i }));

    expect(await screen.findByText(/Enter your full Jira instance URL/i)).toBeInTheDocument();
    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/API Token cannot be empty/i)).toBeInTheDocument();
  });

  it('calls fetchProjectsAction and setCredentials on successful connection', async () => {
    (fetchProjectsAction as jest.Mock).mockResolvedValue([]); // Simulate successful API call
    render(<AuthForm />);

    fireEvent.change(screen.getByLabelText(/Jira URL/i), { target: { value: 'https://test.jira.com' } });
    fireEvent.change(screen.getByLabelText(/Jira Email Address/i), { target: { value: 'test@user.com' } });
    fireEvent.change(screen.getByLabelText(/API Token/i), { target: { value: 'my-token' } });
    fireEvent.click(screen.getByRole('button', { name: /Connect/i }));

    await waitFor(() => {
      expect(fetchProjectsAction).toHaveBeenCalledWith({
        jiraUrl: 'https://test.jira.com',
        email: 'test@user.com',
        apiToken: 'my-token',
      });
    });

    await waitFor(() => {
      expect(mockSetCredentials).toHaveBeenCalledWith({
        jiraUrl: 'https://test.jira.com',
        email: 'test@user.com',
        apiToken: 'my-token',
      });
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Success",
        description: "Successfully connected to Jira.",
      }));
    });
  });

  it('shows an error toast and calls logout on failed connection', async () => {
    const errorMessage = 'Authentication failed: Invalid email or API token.';
    (fetchProjectsAction as jest.Mock).mockRejectedValue(new Error(errorMessage));
    render(<AuthForm />);

    fireEvent.change(screen.getByLabelText(/Jira URL/i), { target: { value: 'https://test.jira.com' } });
    fireEvent.change(screen.getByLabelText(/Jira Email Address/i), { target: { value: 'test@user.com' } });
    fireEvent.change(screen.getByLabelText(/API Token/i), { target: { value: 'wrong-token' } });
    fireEvent.click(screen.getByRole('button', { name: /Connect/i }));

    await waitFor(() => {
      expect(fetchProjectsAction).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockSetCredentials).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Connection Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000,
      });
    });
  });
  
  it('toggles API token visibility', () => {
    render(<AuthForm />);
    const passwordInput = screen.getByLabelText(/API Token/i);
    const toggleButton = screen.getByLabelText(/Show API token/i);

    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
