
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useLoader } from '@/context/loader-context';

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

const mockLogin = jest.fn();
const mockToast = jest.fn();
const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();

describe('Login Page', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ login: mockLogin });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useLoader as jest.Mock).mockReturnValue({ showLoader: mockShowLoader, hideLoader: mockHideLoader });
    mockLogin.mockClear();
    mockToast.mockClear();
    mockShowLoader.mockClear();
    mockHideLoader.mockClear();
  });

  it('renders the login form correctly', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('allows user to enter email and password', () => {
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls login function with credentials on form submission and shows success toast', async () => {
    mockLogin.mockResolvedValue(true);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockShowLoader).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
    
    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
            title: 'Login Successful',
            description: 'Welcome back!',
        });
        expect(mockHideLoader).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error toast on failed login', async () => {
    mockLogin.mockResolvedValue(false);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('wrong@example.com', 'wrongpassword');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
      expect(mockHideLoader).toHaveBeenCalledTimes(1);
    });
  });
  
  it('displays validation errors for empty fields', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(await screen.findByText('Password is required.')).toBeInTheDocument();
  });
});
