
import { generateTestCases } from '../generate-test-cases';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { GenerateTestCasesOutput } from '@/lib/schemas';

// Mock the AI module
jest.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: jest.fn(),
  },
}));

// A mock prompt function
const mockPrompt = jest.fn();

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
    expect(mockPrompt).toHaveBeenCalledWith(input);
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

    const result = await generateTestCases(input);

    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual([]);
  });

  it('should propagate errors from the AI prompt function', async () => {
    const errorMessage = 'AI model failed';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

     const input = {
      description: 'This will cause an error.',
      acceptanceCriteria: '',
      projectKey: 'PROJ',
    };

    await expect(generateTestCases(input)).rejects.toThrow(errorMessage);
  });
});
