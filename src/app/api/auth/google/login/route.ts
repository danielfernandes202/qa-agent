
import { getGoogleOAuth2Client, generateGoogleAuthUrl } from '@/lib/google-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const client = await getGoogleOAuth2Client();
        const authUrl = await generateGoogleAuthUrl(client);
        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        console.error('[GOOGLE_LOGIN_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
