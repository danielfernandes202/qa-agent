
import { generatePlaywrightCode } from '../generate-playwright-code';
import { ai } from '@/ai/genkit';
import type { GenerateTestCasesOutput, PlaywrightSetup } from '@/lib/schemas';

// Mock the AI module
jest.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: jest.fn(),
  },
}));

// A mock prompt function
const mockPrompt = jest.fn();

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
    mockPrompt.mockResolvedValue({ output: { playwrightCode: mockPlaywrightCode } });

    const input = {
      testCases: mockTestCases,
      playwrightSetup: mockPlaywrightSetup,
      projectName: 'Test Project',
    };

    const result = await generatePlaywrightCode(input);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result.playwrightCode).toContain('Test Project - Feature Tests');
    expect(result.playwrightCode).toContain('Verify successful login');
  });

  it('should return a comment if the AI provides no output', async () => {
    mockPrompt.mockResolvedValue({ output: null });

    const input = {
      testCases: mockTestCases,
      playwrightSetup: mockPlaywrightSetup,
      projectName: 'Test Project',
    };

    const result = await generatePlaywrightCode(input);

    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result.playwrightCode).toBe("// AI failed to generate Playwright code. Please check the input and try again.");
  });

  it('should propagate errors from the AI prompt function', async () => {
    const errorMessage = 'AI model service unavailable';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

    const input = {
      testCases: mockTestCases,
      playwrightSetup: mockPlaywrightSetup,
      projectName: 'Test Project',
    };

    await expect(generatePlaywrightCode(input)).rejects.toThrow(errorMessage);
  });
});
