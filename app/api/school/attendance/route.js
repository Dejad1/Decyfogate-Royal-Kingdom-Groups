import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const backendUrl = process.env.EXPRESS_API_URL || 'http://127.0.0.1:3000';
    const response = await fetch(`${backendUrl}/api/school/attendance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'Unable to mark attendance.' }, { status: 502 });
  }
}
