import { NextResponse } from 'next/server'
import { calculateMatchedStep, decryptSecret, verifyTotpToken } from '../../../../../lib/auth/totp'
import { getSupabaseAdminClient } from '../../../../../lib/supabase/admin'

function normalizeUsername(username: string) {
	return username.trim().toLowerCase()
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const username = normalizeUsername(String(body?.username || ''))
		const token = String(body?.token || '').trim()

		if (!username || !token) {
			return NextResponse.json({ error: 'username and token are required' }, { status: 400 })
		}

		const supabase = getSupabaseAdminClient()
		const { data: profile, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('username', username)
			.maybeSingle()

		if (error || !profile) {
			return NextResponse.json({ error: 'Account not found' }, { status: 404 })
		}

		const account = profile as any
		const profilesTable = supabase.from('profiles') as any

		if (!account.totp_secret_encrypted) {
			return NextResponse.json({ error: 'TOTP secret has not been generated yet' }, { status: 400 })
		}

		const secret = decryptSecret(account.totp_secret_encrypted)
		const verification = verifyTotpToken(secret, token)
		if (!verification.valid) {
			return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 })
		}

		const matchedStep = calculateMatchedStep(verification.delta)
		if (matchedStep === null) {
			return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 })
		}

		const lastUsedStep = account.totp_last_used_step === null || account.totp_last_used_step === undefined ? null : Number(account.totp_last_used_step)
		if (lastUsedStep !== null && lastUsedStep >= matchedStep) {
			return NextResponse.json({ error: 'This TOTP code was already used' }, { status: 400 })
		}

		const { error: updateError } = await profilesTable
			.update({
				totp_enabled: true,
				enrollment_status: 'active',
				totp_last_used_step: matchedStep,
			})
			.eq('id', account.id)

		if (updateError) {
			throw updateError
		}

		return NextResponse.json({ ok: true })
	} catch (error) {
		console.error('TOTP confirmation error', error)
		const message = error instanceof Error ? error.message : 'Failed to confirm TOTP'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}