
import { POST } from '../route';
import { NextRequest } from 'next/server';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const createMockRequest = (body: any) => {
  return {
    json: async () => body,
  } as NextRequest;
};

describe('API Route: /api/check-url', () => {

  beforeEach(() => {
    mockedAxios.head.mockClear();
  });

  it('should return a 400 error if URL is not provided', async () => {
    const req = createMockRequest({});
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('URL is required');
  });

  it('should return canBeFramed: true for a URL with no restrictive headers', async () => {
    mockedAxios.head.mockResolvedValue({ headers: {} });
    
    const req = createMockRequest({ url: 'https://example.com' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.canBeFramed).toBe(true);
  });

  it('should return canBeFramed: false for X-Frame-Options: DENY', async () => {
    mockedAxios.head.mockResolvedValue({ headers: { 'x-frame-options': 'DENY' } });
    
    const req = createMockRequest({ url: 'https://deny.com' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.canBeFramed).toBe(false);
  });
  
  it('should return canBeFramed: false for CSP frame-ancestors none', async () => {
    mockedAxios.head.mockResolvedValue({ headers: { 'content-security-policy': "frame-ancestors 'none'" } });
    
    const req = createMockRequest({ url: 'https://csp.com' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.canBeFramed).toBe(false);
  });
  
  it('should return canBeFramed: false if axios request fails', async () => {
    mockedAxios.head.mockRejectedValue(new Error('Network error'));
    
    const req = createMockRequest({ url: 'https://unreachable.com' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200); // The route itself should handle the error and return a 200
    expect(body.canBeFramed).toBe(false);
  });

});
