import { NextResponse } from 'next/server';

async function loadOverview() {
  const backendUrl = process.env.EXPRESS_API_URL || 'http://127.0.0.1:3000';
  const response = await fetch(`${backendUrl}/api/school/admin/overview/20`);
  return response.json();
}

export async function GET() {
  try {
    const data = await loadOverview();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'Unable to load school overview.' }, { status: 502 });
  }
}
