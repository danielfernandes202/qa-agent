
import {
  TestCaseSchema,
  DraftJiraBugInputSchema,
  InvestmentAdvisorInputSchema,
  LinkValidatorInputSchema,
  CulinarySuggestionOutputSchema,
  type Recipe,
} from '@/lib/schemas';
import { z } from 'zod';

describe('Zod Schemas', () => {
  describe('TestCaseSchema', () => {
    it('should validate a correct test case object', () => {
      const validTestCase = {
        testCaseId: 'PROJ-TEST-001',
        testCaseName: 'Test a valid login',
        description: 'Ensure a user can log in with correct credentials.',
        precondition: 'User is on the login page.',
        testSteps: ['Enter username', 'Enter password', 'Click login'],
        expectedResult: 'User is redirected to the dashboard.',
      };
      expect(() => TestCaseSchema.parse(validTestCase)).not.toThrow();
    });

    it('should throw an error for a test case with missing required fields', () => {
      const invalidTestCase = {
        testCaseName: 'Incomplete test case',
        description: 'This is missing required fields.',
      };
      // @ts-ignore
      expect(() => TestCaseSchema.parse(invalidTestCase)).toThrow();
    });
  });

  describe('DraftJiraBugInputSchema', () => {
    it('should validate a correct bug draft input', () => {
      const validInput = {
        rawDescription: 'The login button is broken.',
        projectKey: 'PROJ',
      };
      expect(() => DraftJiraBugInputSchema.parse(validInput)).not.toThrow();
    });

    it('should allow optional fields', () => {
      const validInputWithOptions = {
        rawDescription: 'The login button is broken on the QA server.',
        environmentHint: 'QA',
        attachmentFilename: 'screenshot.png',
        projectKey: 'PROJ',
      };
      expect(() =>
        DraftJiraBugInputSchema.parse(validInputWithOptions)
      ).not.toThrow();
    });
  });

  describe('InvestmentAdvisorInputSchema', () => {
    it('should validate correct investment advisor input', () => {
      const validInput = {
        age: 30,
        investmentAmount: 50000,
        riskTolerance: 'medium',
        timeHorizon: 'long-term',
        financialGoals: 'Retirement planning',
      };
      expect(() => InvestmentAdvisorInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject an age below 18', () => {
      const invalidInput = {
        age: 17,
        investmentAmount: 50000,
        riskTolerance: 'medium',
        timeHorizon: 'long-term',
        financialGoals: 'Retirement planning',
      };
      expect(() => InvestmentAdvisorInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject an investment amount below 1000', () => {
        const invalidInput = {
            age: 30,
            investmentAmount: 999,
            riskTolerance: 'medium',
            timeHorizon: 'long-term',
            financialGoals: 'Retirement planning',
        };
        expect(() => InvestmentAdvisorInputSchema.parse(invalidInput)).toThrow();
    });
  });

    describe('LinkValidatorInputSchema', () => {
        it('should validate a correct URL', () => {
            const validInput = { url: 'https://www.google.com' };
            expect(() => LinkValidatorInputSchema.parse(validInput)).not.toThrow();
        });

        it('should reject an invalid URL', () => {
            const invalidInput = { url: 'not-a-valid-url' };
            expect(() => LinkValidatorInputSchema.parse(invalidInput)).toThrow();
        });
    });
    
    describe('CulinarySuggestionOutputSchema', () => {
        it('should validate a text response', () => {
            const validTextResponse = {
                textResponse: 'You can make a salad!',
            };
            expect(() => CulinarySuggestionOutputSchema.parse(validTextResponse)).not.toThrow();
        });

        it('should validate a full recipe response', () => {
             const validRecipe: Recipe = {
                recipeName: "Classic Tomato Soup",
                description: "A simple and delicious tomato soup.",
                prepTime: "10 minutes",
                cookTime: "20 minutes",
                servings: "4",
                ingredients: ["Tomatoes", "Onion", "Garlic", "Vegetable Broth"],
                instructions: ["Sauté onions and garlic.", "Add tomatoes and broth.", "Simmer and blend."],
            };
            expect(() => CulinarySuggestionOutputSchema.parse(validRecipe)).not.toThrow();
        });

         it('should reject an object that fits neither schema', () => {
            const invalidObject = {
                someOtherField: 'some value',
            };
            expect(() => CulinarySuggestionOutputSchema.parse(invalidObject)).toThrow();
        });
    });
});
