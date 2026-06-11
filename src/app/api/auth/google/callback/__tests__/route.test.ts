
import { GET } from '../route';
import { getTokensFromCode, setTokenCookie } from '@/lib/google-auth';
import { NextRequest } from 'next/server';

jest.mock('@/lib/google-auth', () => ({
  getTokensFromCode: jest.fn(),
  setTokenCookie: jest.fn(),
}));

const mockGetTokensFromCode = getTokensFromCode as jest.Mock;
const mockSetTokenCookie = setTokenCookie as jest.Mock;

describe('API Route: /api/auth/google/callback', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if no code is provided', async () => {
    const req = new NextRequest('http://localhost/api/auth/google/callback');
    const response = await GET(req);
    
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Authorization code not found.');
  });

  it('should exchange code for tokens, set cookie, and redirect on success', async () => {
    const mockCode = 'test-code';
    const mockTokens = { access_token: 'test-access-token', refresh_token: 'test-refresh-token' };
    
    mockGetTokensFromCode.mockResolvedValue(mockTokens);
    mockSetTokenCookie.mockResolvedValue(undefined);

    const req = new NextRequest(`http://localhost/api/auth/google/callback?code=${mockCode}`);
    const response = await GET(req);

    expect(mockGetTokensFromCode).toHaveBeenCalledWith(mockCode);
    expect(mockSetTokenCookie).toHaveBeenCalledWith(mockTokens);
    expect(response.status).toBe(307); // NextResponse.redirect
    expect(response.headers.get('Location')).toBe('http://localhost/cybersecurity-analyzer');
  });

  it('should return 500 if exchanging tokens fails', async () => {
    mockGetTokensFromCode.mockRejectedValue(new Error('Token exchange failed'));

    const req = new NextRequest('http://localhost/api/auth/google/callback?code=some-code');
    const response = await GET(req);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Failed to exchange authorization code for tokens.');
  });

});
