export function deriveUsername(name: string, email: string) {
	const emailPrefix = email.trim().toLowerCase().split('@')[0] || ''
	const normalizedEmailPrefix = emailPrefix.replace(/[^a-z0-9]+/g, '')
	if (normalizedEmailPrefix) {
		return normalizedEmailPrefix
	}

	const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
	return normalizedName
}