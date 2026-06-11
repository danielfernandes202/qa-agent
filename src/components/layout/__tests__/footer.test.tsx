
import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../footer';

describe('Footer Component', () => {

  const companyLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const productLinks = [
    { name: 'QAgent', href: '/qa-test-assistant' },
    { name: 'AI Health Planner', href: '/ai-health' },
    { name: 'AI Investment Advisor', href: '/investment-advisor' },
    { name: 'Cybersecurity Analyzer', href: '/cybersecurity-analyzer' },
    { name: 'QA Test Assistant', href: '/qa-test-assistant' },
    { name: 'Interview Cracker', href: '/interview-cracker' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy-policy' },
  ];

  it('renders all company links correctly', () => {
    render(<Footer />);
    companyLinks.forEach(link => {
      const linkElement = screen.getByRole('link', { name: link.name });
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', link.href);
    });
  });

  it('renders all product links correctly', () => {
    render(<Footer />);
    productLinks.forEach(link => {
      const linkElements = screen.getAllByRole('link', { name: link.name });
      const linkElement = linkElements.find(el => el.closest('ul')?.previousElementSibling?.textContent === 'Products');
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', link.href);
    });
  });

  it('renders all legal links correctly', () => {
    render(<Footer />);
    legalLinks.forEach(link => {
      const linkElement = screen.getByRole('link', { name: link.name });
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', link.href);
    });
  });

  it('renders the copyright notice with the current year', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    const copyrightNotice = screen.getByText(`© ${currentYear} Francis Legacy. All Rights Reserved.`);
    expect(copyrightNotice).toBeInTheDocument();
  });
});
