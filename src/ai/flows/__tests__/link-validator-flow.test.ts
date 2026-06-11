
import { validateLinksOnPage } from '../link-validator-flow';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Link Validator Flow', () => {

  beforeEach(() => {
    mockedAxios.get.mockClear();
    mockedAxios.head.mockClear();
  });

  it('should find and validate all links on a page successfully', async () => {
    const targetUrl = 'https://example.com';
    const mockHtml = `
      <html><body>
        <a href="/about">About</a>
        <a href="https://google.com">Google</a>
        <a href="#section">Internal Link</a>
        <a href="mailto:test@test.com">Email</a>
      </body></html>
    `;

    // Mock the initial page fetch
    mockedAxios.get.mockResolvedValue({ data: mockHtml });

    // Mock the HEAD requests for the found links
    mockedAxios.head
      .mockResolvedValueOnce({ status: 200, statusText: 'OK' }) // for https://example.com/about
      .mockResolvedValueOnce({ status: 200, statusText: 'OK' }); // for https://google.com

    const result = await validateLinksOnPage({ url: targetUrl });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data).toContainEqual({ url: 'https://example.com/about', status: 200, statusText: 'OK' });
    expect(result.data).toContainEqual({ url: 'https://google.com/', status: 200, statusText: 'OK' });
    expect(mockedAxios.get).toHaveBeenCalledWith(targetUrl, expect.any(Object));
    expect(mockedAxios.head).toHaveBeenCalledTimes(2);
  });

  it('should report an error if the initial page fetch fails', async () => {
    const targetUrl = 'https://unreachable.com';
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));

    const result = await validateLinksOnPage({ url: targetUrl });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain(`Failed to retrieve content from ${targetUrl}`);
    expect(mockedAxios.head).not.toHaveBeenCalled();
  });

  it('should correctly report broken links', async () => {
    const targetUrl = 'https://example.com';
    const mockHtml = `
      <html><body>
        <a href="/good-link">Good</a>
        <a href="/bad-link">Bad</a>
        <a href="/server-error">Error</a>
      </body></html>
    `;

    mockedAxios.get.mockResolvedValue({ data: mockHtml });

    mockedAxios.head
      .mockResolvedValueOnce({ status: 200, statusText: 'OK' }) // good-link
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404, statusText: 'Not Found' } }) // bad-link
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, statusText: 'Internal Server Error' } }); // server-error

    const result = await validateLinksOnPage({ url: targetUrl });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data).toContainEqual({ url: 'https://example.com/good-link', status: 200, statusText: 'OK' });
    expect(result.data).toContainEqual({ url: 'https://example.com/bad-link', status: 404, statusText: 'Not Found' });
    expect(result.data).toContainEqual({ url: 'https://example.com/server-error', status: 500, statusText: 'Internal Server Error' });
  });
  
  it('should return an empty array if no links are found on the page', async () => {
      const targetUrl = 'https://example.com';
      const mockHtml = `<html><body><p>No links here.</p></body></html>`;
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await validateLinksOnPage({ url: targetUrl });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockedAxios.head).not.toHaveBeenCalled();
  });

  it('should throw validation error for invalid URL input', async () => {
      const result = await validateLinksOnPage({ url: 'invalid-url' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Please enter a valid URL.');
  });
});
