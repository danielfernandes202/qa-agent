
import { getTokensFromCode, setTokenCookie } from '@/lib/google-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');

    if (!code) {
        return new NextResponse('Authorization code not found.', { status: 400 });
    }

    try {
        const tokens = await getTokensFromCode(code);
        await setTokenCookie(tokens);

        // Redirect user back to the Gmail Analyzer page
        return NextResponse.redirect(new URL('/cybersecurity-analyzer', req.url));
    } catch (error: any) {
        console.error('[GOOGLE_CALLBACK_ERROR]', error);
        return new NextResponse('Failed to exchange authorization code for tokens.', { status: 500 });
    }
}
