import { createClient } from '@supabase/supabase-js'

let supabaseAdminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdminClient() {
	if (supabaseAdminClient) return supabaseAdminClient

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error('Supabase admin environment variables are missing')
	}

	supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	})

	return supabaseAdminClient
}