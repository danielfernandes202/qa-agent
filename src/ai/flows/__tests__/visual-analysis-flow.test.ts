
import { analyzeVisuals } from '../visual-analysis-flow';
import { ai } from '@/ai/genkit';
import type { VisualAnalysisOutput } from '@/lib/schemas';

// Mock the AI module
jest.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: jest.fn(),
  },
}));

// A mock prompt function
const mockPrompt = jest.fn();

describe('Visual Analysis Flow', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (ai.definePrompt as jest.Mock).mockReturnValue(mockPrompt);
    mockPrompt.mockClear();
  });

  const mockInput = {
    pageUrl: 'https://example.com',
    screenshotDataUri: 'data:image/png;base64,mock-screenshot-data',
  };

  it('should return an array of visual issues for a valid analysis', async () => {
    const mockApiResponse: VisualAnalysisOutput = [
      {
        id: 'issue-1',
        type: 'accessibility',
        severity: 'high',
        title: 'Low Contrast Text',
        description: 'The text in the footer has low contrast against the background, making it hard to read.',
        element: 'footer > p',
        suggestions: ['Increase the text color brightness or darken the background color.'],
      },
    ];
    mockPrompt.mockResolvedValue({ output: mockApiResponse });

    const result = await analyzeVisuals(mockInput);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(mockInput);
    expect(result).toEqual(mockApiResponse);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('accessibility');
  });

  it('should return an empty array when no issues are found', async () => {
    const mockApiResponse: VisualAnalysisOutput = [];
    mockPrompt.mockResolvedValue({ output: mockApiResponse });

    const result = await analyzeVisuals(mockInput);

    expect(mockPrompt).toHaveBeenCalledWith(mockInput);
    expect(result).toEqual([]);
  });
  
  it('should return an empty array if the AI provides no output', async () => {
    mockPrompt.mockResolvedValue({ output: null });

    const result = await analyzeVisuals(mockInput);
    
    expect(mockPrompt).toHaveBeenCalledWith(mockInput);
    expect(result).toEqual([]);
  });

  it('should propagate errors from the AI prompt function', async () => {
    const errorMessage = 'AI service failed to respond';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

    await expect(analyzeVisuals(mockInput)).rejects.toThrow(errorMessage);
  });
});
