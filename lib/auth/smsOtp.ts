import crypto from 'crypto'

export const SMS_OTP_TTL_MINUTES = 10

export function generateSmsOtpCode() {
	return String(Math.floor(100000 + Math.random() * 900000))
}

export function hashSmsOtpCode(code: string) {
	return crypto.createHash('sha256').update(code.trim()).digest('hex')
}

export function isOtpExpired(expiresAt: string | null | undefined) {
	if (!expiresAt) return true
	return new Date(expiresAt).getTime() <= Date.now()
}