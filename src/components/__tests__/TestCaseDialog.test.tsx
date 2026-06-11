
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseDialog } from '@/components/TestCaseDialog';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  generateTestCasesAction,
  attachTestCasesToJiraAction,
  convertTestCasesToExcel,
  type JiraIssue
} from '@/app/actions';

// Mock dependencies
jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));
jest.mock('@/app/actions', () => ({
  generateTestCasesAction: jest.fn(),
  attachTestCasesToJiraAction: jest.fn(),
  convertTestCasesToExcel: jest.fn(),
}));

const mockToast = jest.fn();
const mockGenerateTestCasesAction = generateTestCasesAction as jest.Mock;
const mockAttachTestCasesToJiraAction = attachTestCasesToJiraAction as jest.Mock;
const mockConvertTestCasesToExcel = convertTestCasesToExcel as jest.Mock;

const mockIssue: JiraIssue = {
  id: '10001',
  key: 'PROJ-1',
  summary: 'Test issue summary',
  description: 'A detailed description of the test issue.',
  acceptanceCriteria: 'AC for the issue.',
  issueType: 'Story',
  status: 'To Do',
  project: { id: '10000', key: 'PROJ', name: 'Project' },
  attachments: [],
};

const mockTestCases = [
  {
    testCaseId: 'PROJ-TEST-001',
    testCaseName: 'Valid Login',
    description: 'User can log in.',
    precondition: 'User is on login page.',
    testSteps: ['Enter username', 'Enter password', 'Click login'],
    expectedResult: 'Redirected to dashboard.',
  },
];

describe('TestCaseDialog Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ credentials: { jiraUrl: 'https://test.atlassian.net' } });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    jest.clearAllMocks();
  });

  it('shows a loading state initially', async () => {
    mockGenerateTestCasesAction.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<TestCaseDialog issue={mockIssue} isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText('AI is crafting test cases...')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an error message if test case generation fails', async () => {
    const errorMessage = 'AI model timed out.';
    mockGenerateTestCasesAction.mockRejectedValue(new Error(errorMessage));
    render(<TestCaseDialog issue={mockIssue} isOpen={true} onClose={jest.fn()} />);

    expect(await screen.findByText('Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error Generating Test Cases',
      description: errorMessage,
      variant: 'destructive',
    });
  });

  it('shows a message if no test cases are generated', async () => {
    mockGenerateTestCasesAction.mockResolvedValue([]);
    render(<TestCaseDialog issue={mockIssue} isOpen={true} onClose={jest.fn()} />);

    expect(await screen.findByText('No Test Cases Generated')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'No Test Cases Generated',
      description: "The AI couldn't generate test cases. Try adding more detail to the issue description or acceptance criteria.",
      variant: 'default',
    });
  });

  it('displays generated test cases successfully and enables action buttons', async () => {
    mockGenerateTestCasesAction.mockResolvedValue(mockTestCases);
    render(<TestCaseDialog issue={mockIssue} isOpen={true} onClose={jest.fn()} />);

    expect(await screen.findByText('PROJ-TEST-001')).toBeInTheDocument();
    expect(screen.getByText('Valid Login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download as Excel/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Attach as Excel File/i })).not.toBeDisabled();
  });

  it('calls attachTestCasesToJiraAction when attach button is clicked', async () => {
    mockGenerateTestCasesAction.mockResolvedValue(mockTestCases);
    mockAttachTestCasesToJiraAction.mockResolvedValue({ success: true, message: 'Attached!' });
    
    const handleClose = jest.fn();
    render(<TestCaseDialog issue={mockIssue} isOpen={true} onClose={handleClose} />);

    const attachButton = await screen.findByRole('button', { name: /Attach as Excel File/i });
    fireEvent.click(attachButton);

    expect(await screen.findByText('Attaching...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockAttachTestCasesToJiraAction).toHaveBeenCalledWith(
        expect.anything(), // credentials
        {
          issueKey: 'PROJ-1',
          testCases: mockTestCases,
          projectId: '10000',
        }
      );
    });

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
        expect(handleClose).toHaveBeenCalled();
    });
  });
  
  it('calls convertTestCasesToExcel when download button is clicked', async () => {
    // This test is a bit simplified. In a real scenario with JSDOM, you can't test the actual download.
    // We'll just verify the action is called.
    mockGenerateTestCasesAction.mockResolvedValue(mockTestCases);
    mockConvertTestCasesToExcel.mockResolvedValue(Buffer.from("excel data"));
    
    // Mock URL.createObjectURL and the anchor element's click method
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
    const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
            return mockAnchor as any;
        }
        return document.createElement(tag);
    });
    jest.spyOn(document.body, 'appendChild');
    jest.spyOn(document.body, 'removeChild');

    render(<TestCaseDialog issue={mockIssue} isOpen={true} onClose={jest.fn()} />);

    const downloadButton = await screen.findByRole('button', { name: /Download as Excel/i });
    fireEvent.click(downloadButton);

    expect(await screen.findByText('Downloading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockConvertTestCasesToExcel).toHaveBeenCalledWith(mockTestCases);
    });

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
            title: "Download Started",
            description: "Your test cases Excel file is downloading.",
        });
        expect(mockAnchor.click).toHaveBeenCalled();
    });
  });
});
