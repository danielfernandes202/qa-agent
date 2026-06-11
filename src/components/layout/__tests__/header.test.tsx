
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../header';
import { useAuth } from '@/context/auth-context';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock useAuth hook
jest.mock('@/context/auth-context');
const mockUseAuth = useAuth as jest.Mock;

describe('Header Component', () => {

  describe('When user is not logged in', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: jest.fn(),
      });
    });

    it('renders the main navigation links', () => {
      render(<Header />);
      expect(screen.getByRole('link', { name: /AI Products/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /About/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Contact/i })).toBeInTheDocument();
    });

    it('renders Login and Sign Up buttons', () => {
      render(<Header />);
      expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Sign Up/i })).toBeInTheDocument();
    });

    it('does not render the user menu', () => {
      render(<Header />);
      expect(screen.queryByRole('button', { name: /User Menu/i })).not.toBeInTheDocument();
    });
  });

  describe('When user is logged in', () => {
    const mockLogout = jest.fn();
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { name: 'John Doe', email: 'john@doe.com', uid: '123' },
        logout: mockLogout,
      });
    });

    it('does not render Login and Sign Up buttons', () => {
      render(<Header />);
      expect(screen.queryByRole('link', { name: /Login/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Sign Up/i })).not.toBeInTheDocument();
    });

    it('renders the user menu with user name', async () => {
      render(<Header />);
      const userMenuButton = screen.getByRole('button', { name: /User Menu/i });
      fireEvent.click(userMenuButton);
      
      expect(await screen.findByText('Hi, John Doe!')).toBeInTheDocument();
    });

    it('calls logout when logout item is clicked', async () => {
        render(<Header />);
        const userMenuButton = screen.getByRole('button', { name: /User Menu/i });
        fireEvent.click(userMenuButton);
        
        const logoutButton = await screen.findByText(/Logout/i);
        fireEvent.click(logoutButton);
        
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('renders dropdowns for AI Assistants and QA Test Assistant', () => {
      mockUseAuth.mockReturnValue({ user: { name: 'test' }});
      render(<Header />);
      expect(screen.getByRole('button', { name: /AI Assistants/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /QA Test Assistant/i })).toBeInTheDocument();
  });
});
