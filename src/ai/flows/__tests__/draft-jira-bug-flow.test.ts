
import { draftJiraBug } from '../draft-jira-bug-flow';
import { ai } from '@/ai/core';
import type { DraftJiraBugOutput } from '@/lib/schemas';

// Mock the AI module
jest.mock('@/ai/core', () => {
  const mockPrompt = jest.fn();
  return {
    ai: {
      definePrompt: jest.fn(() => mockPrompt),
      defineFlow: jest.fn((config, fn) => fn),
    },
    executeWithFallback: jest.fn(async (promptFn, input) => {
      const res = await promptFn(input);
      if (res && res.output !== undefined && res.output !== null) {
        return res.output;
      }
      throw new Error('All AI models failed to generate content or timed out. Please try again.');
    }),
  };
});

const mockPrompt = ai.definePrompt({} as any) as jest.Mock;

describe('Draft Jira Bug Flow', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (ai.definePrompt as jest.Mock).mockReturnValue(mockPrompt);
    mockPrompt.mockClear();
  });

  it('should generate a structured bug report from a valid description', async () => {
    const mockBugDraft: DraftJiraBugOutput = {
      summary: 'Bug: Login button unresponsive on Safari',
      descriptionMarkdown: '## Environment\nEnvironment: QA\n\n## Issue Description\nThe login button does not respond to clicks on Safari.\n\n## Steps to Reproduce\n1. Open the application in Safari.\n2. Navigate to the login page.\n3. Click the login button.\n\n## Expected Result\nThe user should be logged in or an error message should appear.\n\n## Actual Result\nNothing happens when the login button is clicked.',
      identifiedEnvironment: 'QA',
    };
    mockPrompt.mockResolvedValue({ output: mockBugDraft });

    const input = {
      rawDescription: 'The login button is broken on Safari. When I click it nothing happens.',
      projectKey: 'PROJ',
      environmentHint: 'QA',
    };

    const result = await draftJiraBug(input);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockBugDraft);
  });

  it('should return a default error object if the AI provides no output', async () => {
    // Simulate the AI returning null
    mockPrompt.mockResolvedValue({ output: null });

    const input = {
      rawDescription: 'A vague description that generates no output.',
      projectKey: 'PROJ',
      environmentHint: 'QA',
    };

    const result = await draftJiraBug(input);

    const expectedErrorResult = {
      summary: 'Error: AI failed to draft bug report',
      descriptionMarkdown: '## Environment\nQA\n\n## Issue Description\nCould not process the bug description.\n\n## Steps to Reproduce\n1. Unknown\n\n## Expected Result\nCould not process the bug description.\n\n## Actual Result\nCould not process the bug description.',
      identifiedEnvironment: 'QA',
    };
    
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(expectedErrorResult);
  });

  it('should propagate errors from the AI prompt function', async () => {
    const errorMessage = 'AI model failed';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

     const input = {
      rawDescription: 'This will cause an error.',
      projectKey: 'PROJ',
    };

    const result = await draftJiraBug(input);
    expect(result.summary).toBe('Error: AI failed to draft bug report');
  });

  it('should correctly handle an attachment filename', async () => {
     const mockBugDraftWithAttachment: DraftJiraBugOutput = {
      summary: 'Bug: Image upload fails',
      descriptionMarkdown: '## Environment\nEnvironment: Staging\n\n## Issue Description\nImage upload fails with a 500 error.\n\n## Steps to Reproduce\n1. Go to upload page\n2. Select image\n3. Click upload\n\n## Expected Result\nImage uploads successfully.\n\n## Actual Result\nServer returns 500 error.\n\n## Attachment(s)\n- error_log.txt',
      identifiedEnvironment: 'Staging',
      attachmentName: 'error_log.txt',
    };
    mockPrompt.mockResolvedValue({ output: mockBugDraftWithAttachment });

    const input = {
      rawDescription: 'Image upload is failing with a 500 error.',
      projectKey: 'PROJ',
      environmentHint: 'Staging',
      attachmentFilename: 'error_log.txt',
    };

    const result = await draftJiraBug(input);
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result.attachmentName).toBe('error_log.txt');
    expect(result.descriptionMarkdown).toContain('## Attachment(s)\n- error_log.txt');
  });

});
