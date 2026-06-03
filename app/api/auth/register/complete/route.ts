import { NextResponse } from 'next/server'
import { buildOtpauthUri, buildQrDataUrl, encryptSecret, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode } from '../../../../../lib/auth/totp'
import { getSupabaseAdminClient } from '../../../../../lib/supabase/admin'

function normalizeUsername(username: string) {
	return username.trim().toLowerCase()
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const username = normalizeUsername(String(body?.username || ''))

		if (!username) {
			return NextResponse.json({ error: 'username is required' }, { status: 400 })
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

		if (!account.phone_verified) {
			return NextResponse.json({ error: 'Phone verification is required first' }, { status: 400 })
		}

		if (!account.totp_secret_encrypted) {
			const generatedSecret = generateTotpSecret()
			const generatedEncryptedSecret = encryptSecret(generatedSecret)
			const generatedRecoveryCodes = generateRecoveryCodes(8)
			const generatedRecoveryCodeHashes = generatedRecoveryCodes.map((code) => hashRecoveryCode(code))
			const generatedOtpauthUri = buildOtpauthUri(account.username, generatedSecret)
			const generatedQrDataUrl = await buildQrDataUrl(generatedOtpauthUri)

			const { error: updateError } = await profilesTable
				.update({
					totp_secret_encrypted: generatedEncryptedSecret,
					recovery_code_hashes: generatedRecoveryCodeHashes,
					backup_codes_disclosed_at: new Date().toISOString(),
					enrollment_status: 'totp_pending',
				})
				.eq('id', account.id)

			if (updateError) {
				throw updateError
			}

			return NextResponse.json({
				ok: true,
				username: account.username,
				secret: generatedSecret,
				otpauthUri: generatedOtpauthUri,
				qrDataUrl: generatedQrDataUrl,
				backupCodes: generatedRecoveryCodes,
			})
		}

		return NextResponse.json({
			ok: true,
			username: account.username,
			secret: null,
			otpauthUri: null,
			qrDataUrl: null,
			backupCodes: [],
		})
	} catch (error) {
		console.error('Registration complete error', error)
		const message = error instanceof Error ? error.message : 'Failed to generate TOTP setup'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}