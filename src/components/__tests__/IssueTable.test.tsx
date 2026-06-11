import React from 'react';
import { render, screen, fireEvent, waitFor, queryByRole } from '@testing-library/react';
import { IssueTable } from '@/components/IssueTable';
import { useAuth } from '@/context/auth-context';
import { fetchIssuesAction, type PaginatedIssuesResponse } from '@/app/actions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/app/actions', () => ({
  fetchIssuesAction: jest.fn(),
}));

const mockFetchIssuesAction = fetchIssuesAction as jest.Mock;
const mockOnActionClick = jest.fn();
const mockOnViewIssueClick = jest.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Don't retry failed queries in tests
    },
  },
});

// Helper to render with providers
const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

const mockIssuesPage1: PaginatedIssuesResponse = {
  issues: [
    { id: '1', key: 'PROJ-1', summary: 'First Issue', issueType: 'Story', status: 'To Do', project: { id: '10000', key: 'PROJ', name: 'Project' } },
    { id: '2', key: 'PROJ-2', summary: 'Second Issue', issueType: 'Bug', status: 'In Progress', project: { id: '10000', key: 'PROJ', name: 'Project' } },
  ],
  total: 2,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

describe('IssueTable Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ credentials: { jiraUrl: 'https://test.jira.com' } });
    mockFetchIssuesAction.mockClear();
    mockOnActionClick.mockClear();
    mockOnViewIssueClick.mockClear();
    queryClient.clear();
  });

  it('shows loading skeletons initially', () => {
    mockFetchIssuesAction.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" />);

    // Check for multiple skeleton items
    const rows = screen.getAllByRole('row');
    const skeletonCells = screen.getAllByRole('cell');
    // Expecting header row + skeleton rows
    expect(rows.length).toBeGreaterThan(1); 
    // All cells should contain skeletons.
    skeletonCells.forEach(cell => {
      expect(cell.querySelector('.animate-pulse')).toBeInTheDocument();
    })
  });

  it('displays an error message when fetching issues fails', async () => {
    mockFetchIssuesAction.mockRejectedValue(new Error('API Connection Failed'));
    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" />);

    expect(await screen.findByText('Error Fetching Issues')).toBeInTheDocument();
    expect(screen.getByText('API Connection Failed')).toBeInTheDocument();
  });

  it('displays a "No Issues Found" message when there are no issues', async () => {
    mockFetchIssuesAction.mockResolvedValue({ issues: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" />);

    expect(await screen.findByText('No Issues Found')).toBeInTheDocument();
  });

  it('renders a table of issues successfully', async () => {
    mockFetchIssuesAction.mockResolvedValue(mockIssuesPage1);
    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" onViewIssueClick={mockOnViewIssueClick} />);

    expect(await screen.findByText('PROJ-1')).toBeInTheDocument();
    expect(screen.getByText('First Issue')).toBeInTheDocument();
    expect(screen.getByText('PROJ-2')).toBeInTheDocument();
    expect(screen.getByText('Second Issue')).toBeInTheDocument();
  });

  it('calls onActionClick when the generate button is clicked', async () => {
    mockFetchIssuesAction.mockResolvedValue(mockIssuesPage1);
    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" onViewIssueClick={mockOnViewIssueClick} />);
    
    const generateButtons = await screen.findAllByRole('button', { name: /Generate Tests/i });
    fireEvent.click(generateButtons[0]);

    expect(mockOnActionClick).toHaveBeenCalledTimes(1);
    expect(mockOnActionClick).toHaveBeenCalledWith(mockIssuesPage1.issues[0]);
  });

  it('calls onViewIssueClick when the view button is clicked', async () => {
    mockFetchIssuesAction.mockResolvedValue(mockIssuesPage1);
    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" onViewIssueClick={mockOnViewIssueClick} />);
    
    const viewButtons = await screen.findAllByRole('button', { name: /View/i });
    fireEvent.click(viewButtons[0]);

    expect(mockOnViewIssueClick).toHaveBeenCalledTimes(1);
    expect(mockOnViewIssueClick).toHaveBeenCalledWith(mockIssuesPage1.issues[0]);
  });
  
  it('calls onViewIssueClick when the issue key is clicked', async () => {
    mockFetchIssuesAction.mockResolvedValue(mockIssuesPage1);
    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" onViewIssueClick={mockOnViewIssueClick} />);
    
    const keyButton = await screen.findByRole('button', { name: 'PROJ-1' });
    fireEvent.click(keyButton);

    expect(mockOnViewIssueClick).toHaveBeenCalledTimes(1);
    expect(mockOnViewIssueClick).toHaveBeenCalledWith(mockIssuesPage1.issues[0]);
  });

  it('handles pagination correctly', async () => {
    const mockMultiPageResponsePage1: PaginatedIssuesResponse = {
      issues: [...Array(10)].map((_, i) => ({ id: `${i}`, key: `PROJ-${i+1}`, summary: `Issue ${i+1}`, issueType: 'Task', status: 'To Do', project: { id: '10000', key: 'PROJ', name: 'Project' } })),
      total: 15,
      page: 1,
      pageSize: 10,
      totalPages: 2,
    };
     const mockMultiPageResponsePage2: PaginatedIssuesResponse = {
      issues: [...Array(5)].map((_, i) => ({ id: `${i+10}`, key: `PROJ-${i+11}`, summary: `Issue ${i+11}`, issueType: 'Task', status: 'To Do', project: { id: '10000', key: 'PROJ', name: 'Project' } })),
      total: 15,
      page: 2,
      pageSize: 10,
      totalPages: 2,
    };
    mockFetchIssuesAction.mockResolvedValueOnce(mockMultiPageResponsePage1);

    renderWithProviders(<IssueTable projectId="10000" onActionClick={mockOnActionClick} actionType="generateTests" />);

    expect(await screen.findByText('Page 1 of 2. Total issues: 15.')).toBeInTheDocument();
    
    const nextButton = screen.getByRole('button', { name: /go to next page/i });
    expect(nextButton).not.toBeDisabled();
    
    mockFetchIssuesAction.mockResolvedValueOnce(mockMultiPageResponsePage2);
    fireEvent.click(nextButton);

    await waitFor(() => {
        expect(mockFetchIssuesAction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ page: 2 }));
    });
    
    expect(await screen.findByText('Page 2 of 2. Total issues: 15.')).toBeInTheDocument();
  });
});
