export function normalizeE164PhoneNumber(phone: string) {
	const trimmed = phone.trim()
	if (!trimmed) return ''
	if (trimmed.startsWith('+')) return trimmed

	const digits = trimmed.replace(/\D/g, '')
	if (digits.length === 10) return `+91${digits}`
	return digits ? `+${digits}` : ''
}