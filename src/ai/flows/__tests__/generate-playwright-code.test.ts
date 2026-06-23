
import { generatePlaywrightCode } from '../generate-playwright-code';
import { ai } from '@/ai/core';
import type { GenerateTestCasesOutput, PlaywrightSetup } from '@/lib/schemas';

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

describe('Generate Playwright Code Flow', () => {
  const mockTestCases: GenerateTestCasesOutput = [
    {
      testCaseId: 'PROJ-TEST-001',
      testCaseName: 'Verify successful login',
      description: 'User should be able to log in with valid credentials.',
      precondition: 'User is on the login page.',
      testSteps: ['Enter username "testuser"', 'Enter password "password123"', 'Click "Login" button'],
      expectedResult: 'User is redirected to the dashboard.',
      actualResult: '',
      status: 'To Do',
    },
  ];

  const mockPlaywrightSetup: PlaywrightSetup = {
    baseUrl: 'http://localhost:3000',
    authFlow: 'Navigate to /login, use credentials.',
    commonSelectors: "loginButton: '[data-testid=\"login-button\"]'",
    boilerplate: "import { test, expect } from '@playwright/test';"
  };

  beforeEach(() => {
    // Reset mocks before each test
    (ai.definePrompt as jest.Mock).mockReturnValue(mockPrompt);
    mockPrompt.mockClear();
  });

  it('should generate Playwright code from valid test cases', async () => {
    const mockPlaywrightCode = `
import { test, expect, type Page } from '@playwright/test';

class LoginPage {
  // ... page object model implementation ...
}

test.describe('Test Project - Feature Tests', () => {
  test('Verify successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('testuser', 'password123');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
    `;
    mockPrompt.mockResolvedValue({ text: mockPlaywrightCode });

    const input = {
      testCases: mockTestCases,
      playwrightSetup: mockPlaywrightSetup,
      projectName: 'Test Project',
    };

    const result = await generatePlaywrightCode(input);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(input, { model: 'googleai/gemini-3.1-flash-lite' });
    expect(result.playwrightCode).toContain('Test Project - Feature Tests');
    expect(result.playwrightCode).toContain('Verify successful login');
  });

  it('should throw an error when all fallback models provide no output', async () => {
    mockPrompt.mockResolvedValue({ text: null });

    const input = {
      testCases: mockTestCases,
      playwrightSetup: mockPlaywrightSetup,
      projectName: 'Test Project',
    };

    await expect(generatePlaywrightCode(input)).rejects.toThrow('All AI models failed to generate content or timed out. Please try again.');
  });

  it('should throw an error when all fallback models fail', async () => {
    const errorMessage = 'AI model service unavailable';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

    const input = {
      testCases: mockTestCases,
      playwrightSetup: mockPlaywrightSetup,
      projectName: 'Test Project',
    };

    await expect(generatePlaywrightCode(input)).rejects.toThrow('All AI models failed to generate content or timed out. Please try again.');
  });
});
