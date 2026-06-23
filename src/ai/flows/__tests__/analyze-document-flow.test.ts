
import { analyzeDocument } from '../analyze-document-flow';
import { ai } from '@/ai/core';
import type { AnalyzeDocumentOutput } from '@/lib/schemas';

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

  it('should return an empty array if the AI model fails', async () => {
    const errorMessage = 'AI model failed';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

     const input = {
      documentDataUri: 'data:application/pdf;base64,dGVzdA==',
      projectKey: 'PROJ',
      projectName: 'Test Project',
    };

    const result = await analyzeDocument(input);
    expect(result).toEqual([]);
  });
});
