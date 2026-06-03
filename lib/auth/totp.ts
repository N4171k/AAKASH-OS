import crypto from 'crypto'
import QRCode from 'qrcode'
import * as speakeasy from 'speakeasy'

const ISSUER = 'AAKASH OS'
const STEP_SECONDS = 30

function getEncryptionKey() {
	const secret = process.env.TOTP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
	if (!secret) {
		throw new Error('TOTP_ENCRYPTION_KEY is missing')
	}

	return crypto.createHash('sha256').update(secret).digest()
}

export function generateTotpSecret() {
	return speakeasy.generateSecret({ length: 20 }).base32
}

export function buildOtpauthUri(accountName: string, secret: string) {
	return speakeasy.otpauthURL({
		secret,
		label: accountName,
		issuer: ISSUER,
		encoding: 'base32',
	})
}

export async function buildQrDataUrl(otpauthUri: string) {
	return QRCode.toDataURL(otpauthUri, {
		margin: 1,
		scale: 8,
		color: {
			dark: '#2e95ff',
			light: '#ffffff',
		},
	})
}

export function encryptSecret(secret: string) {
	const iv = crypto.randomBytes(12)
	const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
	const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
	const tag = cipher.getAuthTag()

	return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptSecret(payload: string) {
	const [ivValue, tagValue, encryptedValue] = payload.split('.')
	if (!ivValue || !tagValue || !encryptedValue) {
		throw new Error('Invalid encrypted TOTP secret')
	}

	const decipher = crypto.createDecipheriv(
		'aes-256-gcm',
		getEncryptionKey(),
		Buffer.from(ivValue, 'base64url'),
	)
	decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
	return Buffer.concat([
		decipher.update(Buffer.from(encryptedValue, 'base64url')),
		decipher.final(),
	]).toString('utf8')
}

export function hashRecoveryCode(code: string) {
	return crypto.createHash('sha256').update(code.trim()).digest('hex')
}

export function generateRecoveryCodes(count = 8) {
	return Array.from({ length: count }, () => {
		const segments = Array.from({ length: 4 }, () => crypto.randomBytes(2).toString('hex').toUpperCase())
		return segments.join('-')
	})
}

export function getTotpStep(date = new Date()) {
	return Math.floor(date.getTime() / 1000 / STEP_SECONDS)
}

export function verifyTotpToken(secret: string, token: string) {
	const normalizedToken = token.replace(/\s+/g, '').trim()
	if (!/^\d{6}$/.test(normalizedToken)) {
		return { valid: false, delta: null as number | null }
	}

	const verification = speakeasy.totp.verifyDelta({
		secret,
		encoding: 'base32',
		token: normalizedToken,
		step: STEP_SECONDS,
		window: 1,
	})
	const delta = verification?.delta ?? null
	return {
		valid: delta !== null,
		delta,
	}
}

export function calculateMatchedStep(delta: number | null, date = new Date()) {
	if (delta === null) return null
	return getTotpStep(date) + delta
}
