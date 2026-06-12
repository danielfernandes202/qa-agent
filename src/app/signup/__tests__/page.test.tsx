
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupPage from '../page';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useLoader } from '@/context/loader-context';
import { AuthError } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/context/loader-context', () => ({
    useLoader: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockSignup = jest.fn();
const mockToast = jest.fn();
const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();

describe('Signup Page', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ signup: mockSignup });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useLoader as jest.Mock).mockReturnValue({ showLoader: mockShowLoader, hideLoader: mockHideLoader });
    mockSignup.mockClear();
    mockToast.mockClear();
    mockShowLoader.mockClear();
    mockHideLoader.mockClear();
  });

  it('renders the signup form correctly', () => {
    render(<SignupPage />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls signup function with credentials on form submission and shows success toast', async () => {
    mockSignup.mockResolvedValue(undefined); // Successful signup returns nothing
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockShowLoader).toHaveBeenCalledTimes(1);
      expect(mockSignup).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123');
    });
    
    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
            title: 'Account Created',
            description: 'Welcome to QAgent!',
        });
        expect(mockHideLoader).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error toast for an email already in use', async () => {
    const error = new AuthError('User already registered', 400, 'User already registered');
    mockSignup.mockRejectedValue(error);
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Email In Use',
        description: 'This email address is already associated with an account. Please log in.',
      });
      expect(mockHideLoader).toHaveBeenCalledTimes(1);
    });
  });

   it('shows an error toast for a weak password', async () => {
    const error = new AuthError('Password should be at least 6 characters.', 400, 'Password should be at least 6 characters.');
    mockSignup.mockRejectedValue(error);
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'The password should be at least 6 characters long.',
      });
    });
  });
  
  it('displays validation errors for invalid input', async () => {
    render(<SignupPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Name must be at least 2 characters.')).toBeInTheDocument();
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(await screen.findByText('Password must be at least 6 characters.')).toBeInTheDocument();
  });
});
