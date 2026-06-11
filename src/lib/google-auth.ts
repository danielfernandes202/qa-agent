
'use server';

import { OAuth2Client } from 'google-auth-library';
import { cookies } from 'next/headers';

const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
];

export async function getGoogleOAuth2Client(): Promise<OAuth2Client> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
        throw new Error('Google client ID or secret is not configured in environment variables.');
    }

    return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export async function generateGoogleAuthUrl(client: OAuth2Client): Promise<string> {
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'consent', // Force consent screen to get a refresh token
    });
}

export async function getTokensFromCode(code: string) {
    const client = await getGoogleOAuth2Client();
    const { tokens } = await client.getToken(code);
    return tokens;
}

export async function setTokenCookie(tokens: any) {
    const cookieStore = await cookies();
    cookieStore.set('google_auth_tokens', JSON.stringify(tokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
    });
}

export async function getTokensFromCookie() {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('google_auth_tokens');
    if (tokenCookie) {
        try {
            return JSON.parse(tokenCookie.value);
        } catch (e) {
            return null;
        }
    }
    return null;
}

export async function clearTokenCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('google_auth_tokens');
}
