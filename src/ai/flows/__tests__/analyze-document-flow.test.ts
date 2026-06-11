
import { analyzeDocument } from '../analyze-document-flow';
import { ai } from '@/ai/genkit';
import type { AnalyzeDocumentOutput } from '@/lib/schemas';

// Mock the AI module
jest.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: jest.fn(),
  },
}));

// A mock prompt function
const mockPrompt = jest.fn();

describe('Analyze Document Flow', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (ai.definePrompt as jest.Mock).mockReturnValue(mockPrompt);
    mockPrompt.mockClear();
  });

  it('should generate a hierarchical ticket structure from a valid document', async () => {
    const mockApiResponse: AnalyzeDocumentOutput = [
      {
        type: 'Epic',
        summary: 'Epic: User Authentication',
        description: 'Implement a full user authentication system.',
        children: [
          {
            type: 'Story',
            summary: 'Story: User Signup',
            description: 'As a new user, I want to be able to sign up for an account.\n\n## Acceptance Criteria\n1. User can enter email and password.\n2. Account is created successfully.',
            children: [
              {
                type: 'Sub-task',
                summary: 'FE: Build signup form UI',
                description: 'Create the frontend components for the signup form.',
              },
            ],
          },
        ],
      },
    ];
    mockPrompt.mockResolvedValue({ output: mockApiResponse });

    const input = {
      documentDataUri: 'data:application/pdf;base64,dGVzdA==', // Mock PDF data
      projectKey: 'PROJ',
      projectName: 'Test Project',
    };

    const result = await analyzeDocument(input);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockApiResponse);
    expect(result.length).toBe(1);
    expect(result[0].children?.[0].type).toBe('Story');
  });

  it('should return an empty array if the AI provides no output', async () => {
    // Simulate the AI returning null
    mockPrompt.mockResolvedValue({ output: null });

    const input = {
      documentDataUri: 'data:application/pdf;base64,dGVzdA==',
      projectKey: 'PROJ',
      projectName: 'Test Project',
    };

    const result = await analyzeDocument(input);

    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual([]);
  });

  it('should propagate errors from the AI prompt function', async () => {
    const errorMessage = 'AI model failed';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

     const input = {
      documentDataUri: 'data:application/pdf;base64,dGVzdA==',
      projectKey: 'PROJ',
      projectName: 'Test Project',
    };

    await expect(analyzeDocument(input)).rejects.toThrow(errorMessage);
  });
});
