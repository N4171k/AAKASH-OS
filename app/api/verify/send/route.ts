import { NextResponse } from 'next/server'
export async function POST(request: Request) {
  return NextResponse.json({
    error: 'Firebase Authentication handles SMS verification in the browser. This endpoint is deprecated.',
  }, { status: 410 })
}
