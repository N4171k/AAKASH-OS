import crypto from 'crypto'
import { getSupabaseAdminClient } from '../supabase/admin'

export const SESSION_COOKIE_NAME = 'aakash_session'

export function createSessionToken() {
	return crypto.randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex')
}

export function parseCookieHeader(cookieHeader: string | null) {
	if (!cookieHeader) return new Map<string, string>()

	return new Map(
		cookieHeader
			.split(';')
			.map((entry) => entry.trim())
			.filter(Boolean)
			.map((entry) => {
				const separatorIndex = entry.indexOf('=')
				if (separatorIndex < 0) return [entry, '']
				return [entry.slice(0, separatorIndex), decodeURIComponent(entry.slice(separatorIndex + 1))]
			}),
	)
}

export function getSessionTokenFromRequest(request: Request) {
	const cookieHeader = request.headers.get('cookie')
	const cookies = parseCookieHeader(cookieHeader)
	const cookieToken = cookies.get(SESSION_COOKIE_NAME)
	if (cookieToken) return cookieToken

	const authHeader = request.headers.get('authorization')
	if (!authHeader) return ''

	return authHeader.replace(/^Bearer\s+/i, '')
}

export async function getProfileFromSessionToken(token: string) {
	if (!token) return null

	const supabase = getSupabaseAdminClient()
	const tokenHash = hashSessionToken(token)
	const now = new Date().toISOString()

	const { data: session, error } = await supabase
		.from('auth_sessions')
		.select('user_id, expires_at')
		.eq('session_token_hash', tokenHash)
		.gt('expires_at', now)
		.maybeSingle()

	if (error || !session) return null; const sessionData = session as any;

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', sessionData.user_id)
		.maybeSingle()

	if (profileError || !profile) return null

	return profile
}

export async function getProfileFromRequest(request: Request) {
	return getProfileFromSessionToken(getSessionTokenFromRequest(request))
}

