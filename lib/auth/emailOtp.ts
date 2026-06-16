import crypto from 'crypto'

export const EMAIL_OTP_TTL_MINUTES = 10
export const EMAIL_OTP_COOLDOWN_SECONDS = 60

/**
 * Validates that an email address:
 * 1. Has a valid overall format.
 * 2. Does not contain "+" alias addressing.
 * 3. Does not belong to a temporary/disposable email provider.
 */
export function validateStrictEmail(email: string): { isValid: boolean; error?: string } {
	const trimmed = email.trim().toLowerCase()
	
	// Basic RFC 5322 email validation regex (excluding '+' constraint which is handled next)
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
	if (!emailRegex.test(trimmed)) {
		return { isValid: false, error: 'Invalid email address format' }
	}

	const parts = trimmed.split('@')
	if (parts.length !== 2) {
		return { isValid: false, error: 'Invalid email address structure' }
	}

	const [localPart, domainPart] = parts

	// Reject '+' email aliases
	if (localPart.includes('+')) {
		return { isValid: false, error: 'Email aliases containing "+" are not allowed' }
	}

	// Reject temporary/disposable email domains
	const tempDomains = new Set([
		'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'tempmail.com', 
		'10minutemail.com', 'trashmail.com', 'sharklasers.com', 'dispostable.com', 
		'getairmail.com', 'maildrop.cc', 'mailnesia.com', 'mintemail.com', 
		'temp-mail.org', 'generator.email', 'throwawaymail.com', 'tempmailaddress.com', 
		'crazymailing.com', 'fakeinbox.com', 'boun.cr', 'mailcatch.com', 'burnermail.io',
		'guerrillamailblock.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
		'grr.la', 'guerrillamail.de', 'pokemail.net', 'tempmail.net', 'temp-mail.ru',
		'temp-mail.de', 'temp-mail.ua', 'disposable.com', 'disposablemail.com', 'dispostable.org',
		'mailcatch.org', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.org',
		'trashmail.net', 'trashmail.at', 'trashmail.de', 'trashmail.me', 'tempmail.co',
		'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
		'10minutemail.co.za', '10minutemail.net', '10minutemail.org', '10minutemail.us'
	])

	if (tempDomains.has(domainPart)) {
		return { isValid: false, error: 'Disposable or temporary email addresses are not allowed' }
	}

	return { isValid: true }
}

export function generateEmailOtpCode() {
	return String(Math.floor(100000 + Math.random() * 900000))
}

export function hashEmailOtpCode(code: string) {
	return crypto.createHash('sha256').update(code.trim()).digest('hex')
}

export function isOtpExpired(expiresAt: string | null | undefined) {
	if (!expiresAt) return true
	return new Date(expiresAt).getTime() <= Date.now()
}
