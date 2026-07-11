import { NextResponse } from 'next/server';

export async function POST(request) {
  const body = await request.formData();

  const payload = new URLSearchParams({
    email: body.get('email') || '',
    password: body.get('password') || '',
    sectorType: body.get('sectorType') || 'SCHOOL',
    portalType: body.get('portalType') || 'ADMIN'
  });

  const backendBaseUrl = process.env.EXPRESS_API_URL || 'http://127.0.0.1:3000';
  const backendUrl = `${backendBaseUrl}/auth/login`;

  try {
    const upstream = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'text/html,application/json'
      },
      body: payload.toString(),
      redirect: 'manual'
    });

    const text = await upstream.text();
    const location = upstream.headers.get('location');

    if (upstream.status === 302 && location) {
      const nextTarget = body.get('portalType') === 'TEACHER' ? '/dashboard/classroom' : '/dashboard';
      return NextResponse.json({ ok: true, redirectTo: nextTarget });
    }

    if (upstream.status >= 400) {
      return NextResponse.json({ ok: false, message: text || 'Authentication failed.' }, { status: upstream.status });
    }

    return NextResponse.json({ ok: true, redirectTo: '/dashboard' });
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'Unable to reach the DecyfoGate backend on port 3000.' }, { status: 502 });
  }
}
