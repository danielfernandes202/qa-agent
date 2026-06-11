
import { GET } from '../route';
import { generateGoogleAuthUrl, getGoogleOAuth2Client } from '@/lib/google-auth';
import { NextResponse } from 'next/server';

jest.mock('@/lib/google-auth', () => ({
  getGoogleOAuth2Client: jest.fn(),
  generateGoogleAuthUrl: jest.fn(),
}));

const mockGenerateGoogleAuthUrl = generateGoogleAuthUrl as jest.Mock;
const mockGetGoogleOAuth2Client = getGoogleOAuth2Client as jest.Mock;

describe('API Route: /api/auth/google/login', () => {

  it('should redirect to the Google auth URL on success', async () => {
    const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...';
    mockGetGoogleOAuth2Client.mockResolvedValue({}); // mock client
    mockGenerateGoogleAuthUrl.mockResolvedValue(mockAuthUrl);

    const response = await GET();

    expect(response.status).toBe(307); // NextResponse.redirect defaults to 307
    expect(response.headers.get('Location')).toBe(mockAuthUrl);
  });

  it('should return a 500 error if URL generation fails', async () => {
    mockGetGoogleOAuth2Client.mockRejectedValue(new Error('Client error'));
    
    const response = await GET();
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toBe('Internal Error');
  });

});
