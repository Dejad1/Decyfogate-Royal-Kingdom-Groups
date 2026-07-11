import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const backendUrl = process.env.EXPRESS_API_URL || 'http://127.0.0.1:3000';
    const response = await fetch(`${backendUrl}/api/school/teacher/roster/${params.teacherId}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'Unable to load teacher roster.' }, { status: 502 });
  }
}
