import { NextResponse } from 'next/server'
import { getSessionTokenFromRequest, hashSessionToken, SESSION_COOKIE_NAME } from '../../../../lib/auth/session'
import { getSupabaseAdminClient } from '../../../../lib/supabase/admin'

export async function POST(request: Request) {
	try {
		const token = getSessionTokenFromRequest(request)
		if (token) {
			const supabase = getSupabaseAdminClient()
			await supabase.from('auth_sessions').delete().eq('session_token_hash', hashSessionToken(token))
		}

		const response = NextResponse.json({ ok: true })
		response.cookies.set(SESSION_COOKIE_NAME, '', {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: 0,
		})
		return response
	} catch (error) {
		console.error('Logout error', error)
		return NextResponse.json({ error: 'Failed to log out' }, { status: 500 })
	}
}