import { NextResponse } from 'next/server'
import { calculateMatchedStep, decryptSecret, hashRecoveryCode, verifyTotpToken } from '../../../../lib/auth/totp'
import { createSessionToken, hashSessionToken } from '../../../../lib/auth/session'
import { getSupabaseAdminClient } from '../../../../lib/supabase/admin'

function normalizeUsername(username: string) {
	return username.trim().toLowerCase()
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const username = normalizeUsername(String(body?.username || ''))
		const token = String(body?.token || '').trim()
		const recoveryCode = String(body?.recoveryCode || '').trim()

		if (!username || (!token && !recoveryCode)) {
			return NextResponse.json({ error: 'username and token are required' }, { status: 400 })
		}

		const supabase = getSupabaseAdminClient()
		const { data: profileResult, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('username', username)
			.maybeSingle()

		if (error || !profileResult) {
			return NextResponse.json({ error: 'Account not found' }, { status: 404 })
		}

		const profile = profileResult as any
		const profilesTable = supabase.from('profiles') as any
		let matchedStep: number | null = null

		if (recoveryCode) {
			const recoveryHash = hashRecoveryCode(recoveryCode)
			const storedHashes = Array.isArray(profile.recovery_code_hashes) ? profile.recovery_code_hashes : []
			if (!storedHashes.includes(recoveryHash)) {
				return NextResponse.json({ error: 'Invalid recovery code' }, { status: 400 })
			}

			const remainingHashes = storedHashes.filter((value: string) => value !== recoveryHash)
			const { error: updateError } = await profilesTable
				.update({
					recovery_code_hashes: remainingHashes,
					last_login_at: new Date().toISOString(),
				})
				.eq('id', profile.id)

			if (updateError) {
				throw updateError
			}
		} else {
			if (!profile.totp_enabled || !profile.totp_secret_encrypted) {
				return NextResponse.json({ error: 'TOTP is not enabled for this account' }, { status: 400 })
			}

			const secret = decryptSecret(profile.totp_secret_encrypted)
			const verification = verifyTotpToken(secret, token)
			if (!verification.valid) {
				return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 })
			}

			matchedStep = calculateMatchedStep(verification.delta)
			if (matchedStep === null) {
				return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 })
			}

			const lastUsedStep = profile.totp_last_used_step === null || profile.totp_last_used_step === undefined
				? null
				: Number(profile.totp_last_used_step)

			if (lastUsedStep !== null && lastUsedStep >= matchedStep) {
				return NextResponse.json({ error: 'This TOTP code was already used' }, { status: 400 })
			}

			const { error: updateError } = await profilesTable
				.update({
					totp_last_used_step: matchedStep,
					last_login_at: new Date().toISOString(),
				})
				.eq('id', profile.id)

			if (updateError) {
				throw updateError
			}
		}

		const sessionToken = createSessionToken()
		const sessionHash = hashSessionToken(sessionToken)
		const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
		const sessionsTable = supabase.from('auth_sessions') as any

		const { error: sessionError } = await sessionsTable.insert([{ 
			user_id: profile.id,
			session_token_hash: sessionHash,
			expires_at: expiresAt,
		}])

		if (sessionError) {
			throw sessionError
		}

		const response = NextResponse.json({ ok: true, username: profile.username })
		response.cookies.set('aakash_session', sessionToken, {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: 60 * 60 * 24 * 7,
		})

		return response
	} catch (error) {
		console.error('Login error', error)
		const message = error instanceof Error ? error.message : 'Failed to log in'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
