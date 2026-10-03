import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/cloudinary/sign
 * 
 * Server-side Cloudinary upload signature generator.
 * The mobile app calls this endpoint to get a signature for uploading
 * directly to Cloudinary, keeping the API secret safe on the server.
 *
 * Body: { folder: string, timestamp?: number }
 * Returns: { signature, timestamp, api_key, cloud_name, folder }
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'cka7ipqa';
const API_KEY = process.env.CLOUDINARY_API_KEY || '681795949986728';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request) {
  try {
    if (!API_SECRET || API_SECRET === '****') {
      return NextResponse.json(
        { error: 'Cloudinary API secret is not configured on the server.' },
        { status: 503, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const folder = typeof body.folder === 'string' ? body.folder : '';
    if (!/^rimt-academic-trust\/[A-Z0-9_-]{1,32}$/.test(folder)) {
      return NextResponse.json(
        { error: 'A valid student upload folder is required.' },
        { status: 400, headers: corsHeaders }
      );
    }
    const timestamp = body.timestamp || Math.floor(Date.now() / 1000);

    // Cloudinary signature: sorted params joined by '&' + api_secret
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    return NextResponse.json({
      signature,
      timestamp,
      api_key: API_KEY,
      cloud_name: CLOUD_NAME,
      folder,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[cloudinary/sign] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload signature.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
