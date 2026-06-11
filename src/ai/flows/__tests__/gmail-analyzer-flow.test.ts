
import { analyzeGmail } from '../gmail-analyzer-flow';
import { getTokensFromCookie } from '@/lib/google-auth';
import { google } from 'googleapis';
import { analyzeForThreats } from '../cybersecurity-threat-analyzer-flow';
import type { GmailAnalyzerFlowOutput } from '@/lib/schemas';

// Mock dependencies
jest.mock('@/lib/google-auth', () => ({
  getTokensFromCookie: jest.fn(),
  getGoogleOAuth2Client: jest.fn().mockResolvedValue({
    setCredentials: jest.fn(),
    refreshAccessToken: jest.fn().mockResolvedValue({
        credentials: { access_token: 'refreshed-fake-token' }
    })
  }),
}));

jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn(),
  },
}));

jest.mock('../cybersecurity-threat-analyzer-flow', () => ({
  analyzeForThreats: jest.fn(),
}));

const mockGetTokensFromCookie = getTokensFromCookie as jest.Mock;
const mockGmail = google.gmail as jest.Mock;
const mockAnalyzeForThreats = analyzeForThreats as jest.Mock;

describe('Gmail Analyzer Flow', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if the user is not authenticated', async () => {
    mockGetTokensFromCookie.mockResolvedValue(null);

    const result = await analyzeGmail();

    expect(result).toEqual({
      results: [],
      error: 'Could not fetch emails. Please connect your Gmail account to see a real analysis.',
    });
    expect(mockGmail).not.toHaveBeenCalled();
  });

  it('should return an empty message if no emails are found', async () => {
    mockGetTokensFromCookie.mockResolvedValue({ access_token: 'fake-token' });
    const mockGmailClient = {
      users: {
        messages: {
          list: jest.fn().mockResolvedValue({ data: { messages: [] } }),
        },
      },
    };
    mockGmail.mockReturnValue(mockGmailClient);

    const result = await analyzeGmail();

    expect(result).toEqual({ results: [], error: 'No recent emails found in your inbox.' });
    expect(mockGmailClient.users.messages.list).toHaveBeenCalledWith({
      userId: 'me',
      maxResults: 5,
      q: 'in:inbox',
    });
  });

  it('should fetch emails and analyze them for threats', async () => {
    mockGetTokensFromCookie.mockResolvedValue({ access_token: 'fake-token' });

    const mockEmailsList = { data: { messages: [{ id: '1' }, { id: '2' }] } };
    const mockEmailMessage1 = {
      data: {
        id: '1',
        payload: {
          headers: [
            { name: 'From', value: 'safe@example.com' },
            { name: 'Subject', value: 'Hello' },
          ],
          parts: [{ mimeType: 'text/plain', body: { data: Buffer.from('This is a safe email.').toString('base64') } }],
        },
      },
    };
    const mockEmailMessage2 = {
       data: {
        id: '2',
        payload: {
          headers: [
            { name: 'From', value: 'danger@example.com' },
            { name: 'Subject', value: 'Urgent Action Required' },
          ],
          body: { data: Buffer.from('Click this link now! http://phishing.com').toString('base64') },
        },
      },
    };
    
    const mockGmailClient = {
      users: {
        messages: {
          list: jest.fn().mockResolvedValue(mockEmailsList),
          get: jest.fn()
            .mockResolvedValueOnce(mockEmailMessage1)
            .mockResolvedValueOnce(mockEmailMessage2),
        },
      },
    };
    mockGmail.mockReturnValue(mockGmailClient);

    const mockAnalysisResult1 = {
        threatLevel: 'None',
        summary: 'Safe',
        recommendations: [],
        indicatorsOfCompromise: [],
    };
    const mockAnalysisResult2 = {
        threatLevel: 'High',
        summary: 'Phishing attempt',
        recommendations: ['Delete this email'],
        indicatorsOfCompromise: [{ type: 'URL', value: 'http://phishing.com', context: 'Phishing link' }],
    };
    mockAnalyzeForThreats
        .mockResolvedValueOnce(mockAnalysisResult1)
        .mockResolvedValueOnce(mockAnalysisResult2);

    const result = await analyzeGmail();

    expect(mockGmailClient.users.messages.list).toHaveBeenCalledTimes(1);
    expect(mockGmailClient.users.messages.get).toHaveBeenCalledTimes(2);
    expect(mockAnalyzeForThreats).toHaveBeenCalledTimes(2);
    
    expect(mockAnalyzeForThreats).toHaveBeenCalledWith({ text: 'From: safe@example.com\nSubject: Hello\n\nThis is a safe email.' });
    expect(mockAnalyzeForThreats).toHaveBeenCalledWith({ text: 'From: danger@example.com\nSubject: Urgent Action Required\n\nClick this link now! http://phishing.com' });
    
    expect(result.results.length).toBe(2);
    expect(result.results[0].analysis.threatLevel).toBe('None');
    expect(result.results[1].analysis.threatLevel).toBe('High');
    expect(result.error).toBeUndefined();
  });
  
  it('should handle errors from the Gmail API gracefully', async () => {
    mockGetTokensFromCookie.mockResolvedValue({ access_token: 'fake-token' });
    const mockGmailClient = {
      users: {
        messages: {
          list: jest.fn().mockRejectedValue(new Error('Gmail API is down')),
        },
      },
    };
    mockGmail.mockReturnValue(mockGmailClient);

    const result = await analyzeGmail();

    expect(result.results).toEqual([]);
    expect(result.error).toBe('No recent emails found in your inbox.'); // The flow currently catches this and returns a user-friendly message
  });

});
