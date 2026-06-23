
import { generateTestCases } from '../generate-test-cases';
import { ai } from '@/ai/core';
import { z } from 'zod';
import type { GenerateTestCasesOutput } from '@/lib/schemas';


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


describe('Generate Test Cases Flow', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (ai.definePrompt as jest.Mock).mockReturnValue(mockPrompt);
    mockPrompt.mockClear();
  });

  it('should generate test cases for a valid Jira ticket description', async () => {
    const mockTestCases: GenerateTestCasesOutput = [
      {
        testCaseId: 'PROJ-TEST-001',
        testCaseName: 'Verify successful login with valid credentials',
        description: 'Ensures a user can log in successfully.',
        precondition: 'User is on the login page.',
        testSteps: ['Enter valid email', 'Enter valid password', 'Click "Login" button'],
        expectedResult: 'User is redirected to the dashboard.',
      },
    ];
    mockPrompt.mockResolvedValue({ output: mockTestCases });

    const input = {
      description: 'As a user, I want to log in to my account.',
      acceptanceCriteria: 'The user is redirected to the dashboard upon successful login.',
      projectKey: 'PROJ',
    };

    const result = await generateTestCases(input);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(input, { model: 'googleai/gemini-3.1-flash-lite' });
    expect(result).toEqual(mockTestCases);
    expect(result.length).toBe(1);
  });

  it('should return an empty array if the AI provides no output', async () => {
    // Simulate the AI returning null
    mockPrompt.mockResolvedValue({ output: null });

    const input = {
      description: 'A vague description that generates no test cases.',
      acceptanceCriteria: '',
      projectKey: 'PROJ',
    };

    await expect(generateTestCases(input)).rejects.toThrow("All AI models failed to generate test cases or timed out. Please try again.");
  });

  it('should return an empty array if the AI model fails', async () => {
    const errorMessage = 'AI model failed';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

     const input = {
      description: 'This will cause an error.',
      acceptanceCriteria: '',
      projectKey: 'PROJ',
    };

    await expect(generateTestCases(input)).rejects.toThrow("All AI models failed to generate test cases or timed out. Please try again.");
  });
});
