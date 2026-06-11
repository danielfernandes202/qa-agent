
'use server';
/**
 * @fileOverview A flow to validate all links on a given webpage.
 */
import axios from 'axios';
import {
  LinkValidatorInputSchema,
  type LinkValidatorInput,
  type LinkCheckResult,
} from '@/lib/schemas';


// This is a standard async function, not an AI tool. This is more reliable for this task.
async function crawlAndCheckLinks({ url }: LinkValidatorInput): Promise<LinkCheckResult[]> {
    console.log(`Starting crawl for: ${url}`);
    let links = new Set<string>();

    // 1. Fetch the HTML of the page
    try {
        const response = await axios.get(url, { 
            timeout: 15000, // Increased timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
        });
        const html = response.data;

        // 2. Extract all anchor tags using a more robust regular expression
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                try {
                    const absoluteUrl = new URL(href, url).toString();
                    links.add(absoluteUrl);
                } catch (e) {
                    console.warn(`Ignoring invalid URL found on page: ${href}`);
                }
            }
        }
    } catch (error: any) {
        console.error(`Failed to fetch the initial URL ${url}:`, error.message);
        // Throw a user-friendly error if the initial page fetch fails.
        throw new Error(`Failed to retrieve content from ${url}. The site may be down or blocking requests.`);
    }

    if (links.size === 0) {
        return []; // No links found on the page.
    }

    console.log(`Found ${links.size} unique links. Now checking statuses...`);

    // 3. Check the status of each link concurrently
    const linkCheckPromises = Array.from(links).map(
        async (link): Promise<LinkCheckResult> => {
            try {
                const response = await axios.head(link, {
                    timeout: 8000,
                    maxRedirects: 5,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                    },
                });
                return { url: link, status: response.status, statusText: response.statusText || 'OK' };
            } catch (error: any) {
                if (axios.isAxiosError(error) && error.response) {
                    return { url: link, status: error.response.status, statusText: error.response.statusText || 'Error' };
                }
                return { url: link, status: 0, statusText: error.code || 'Network Error' };
            }
        }
    );

    return Promise.all(linkCheckPromises);
}


// Export a server action to be called from the client
export async function validateLinksOnPage(
  input: LinkValidatorInput
): Promise<{ success: boolean; data?: LinkCheckResult[]; error?: string }> {
  try {
    const validatedInput = LinkValidatorInputSchema.parse(input);
    const result = await crawlAndCheckLinks(validatedInput);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error in validateLinksOnPage server action:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during link validation.' };
  }
}