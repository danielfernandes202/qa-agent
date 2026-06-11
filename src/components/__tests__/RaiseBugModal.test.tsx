
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RaiseBugModal } from '@/components/RaiseBugModal';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { draftJiraBugAction, createJiraBugInJiraAction } from '@/app/actions';

// Mock dependencies
jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));
jest.mock('@/app/actions', () => ({
  draftJiraBugAction: jest.fn(),
  createJiraBugInJiraAction: jest.fn(),
}));

const mockToast = jest.fn();
const mockDraftJiraBugAction = draftJiraBugAction as jest.Mock;
const mockCreateJiraBugInJiraAction = createJiraBugInJiraAction as jest.Mock;
const mockOnClose = jest.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  projectId: '10000',
  projectKey: 'PROJ',
  projectName: 'Test Project',
};

describe('RaiseBugModal Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ credentials: { jiraUrl: 'https://test.atlassian.net', email: 'test@user.com', apiToken: 'token' } });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    jest.clearAllMocks();
  });

  it('renders the modal with initial form state', () => {
    render(<RaiseBugModal {...defaultProps} />);
    expect(screen.getByText('Raise Bug for Test Project (PROJ)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Bug Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Environment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preview Bug with AI/i })).toBeInTheDocument();
  });

  it('shows an error if bug description is empty when trying to preview', async () => {
    render(<RaiseBugModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Preview Bug with AI/i }));
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Input Required",
        description: "Please provide a description for the bug.",
        variant: "destructive",
      });
    });
    expect(mockDraftJiraBugAction).not.toHaveBeenCalled();
  });

  it('calls draftJiraBugAction and displays the preview on valid input', async () => {
    const mockDraft = {
      summary: 'AI Drafted Summary',
      descriptionMarkdown: '## Steps to Reproduce\n1. Do this',
      identifiedEnvironment: 'QA',
    };
    mockDraftJiraBugAction.mockResolvedValue(mockDraft);

    render(<RaiseBugModal {...defaultProps} />);
    
    fireEvent.change(screen.getByLabelText(/Bug Description/i), { target: { value: 'My detailed bug report' } });
    fireEvent.click(screen.getByRole('button', { name: /Preview Bug with AI/i }));

    expect(await screen.findByText('Drafting...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockDraftJiraBugAction).toHaveBeenCalledWith({
        rawDescription: 'My detailed bug report',
        environmentHint: 'QA',
        attachmentFilename: undefined,
        projectKey: 'PROJ',
      });
    });

    expect(await screen.findByText('AI Drafted Bug Preview')).toBeInTheDocument();
    expect(screen.getByText(mockDraft.summary)).toBeInTheDocument();
    expect(screen.getByText('Do this')).toBeInTheDocument();
  });
  
  it('calls createJiraBugInJiraAction when confirm is clicked after drafting', async () => {
    const mockDraft = {
      summary: 'Final Summary',
      descriptionMarkdown: '## Final Description',
      identifiedEnvironment: 'PROD',
    };
    mockDraftJiraBugAction.mockResolvedValue(mockDraft);
    mockCreateJiraBugInJiraAction.mockResolvedValue({ success: true, message: 'Bug PROJ-123 created.', ticketKey: 'PROJ-123', ticketUrl: 'http://test.com/PROJ-123' });

    render(<RaiseBugModal {...defaultProps} />);
    
    // First, draft the bug
    fireEvent.change(screen.getByLabelText(/Bug Description/i), { target: { value: 'A bug to be created' } });
    fireEvent.click(screen.getByRole('button', { name: /Preview Bug with AI/i }));
    
    // Wait for draft to appear
    expect(await screen.findByText('AI Drafted Bug Preview')).toBeInTheDocument();

    // Now, create the bug
    const createButton = screen.getByRole('button', { name: /Confirm & Create Bug/i });
    fireEvent.click(createButton);
    
    expect(await screen.findByText('Creating in Jira...')).toBeInTheDocument();

    await waitFor(() => {
        expect(mockCreateJiraBugInJiraAction).toHaveBeenCalledWith(
            expect.anything(), // credentials
            {
                projectId: '10000',
                summary: 'Final Summary',
                descriptionMarkdown: '## Final Description',
                identifiedEnvironment: 'PROD',
            },
            undefined,
            undefined
        );
    });

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Bug Created!',
        }));
        expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
