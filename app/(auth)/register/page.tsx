import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from '../../../lib/auth/session'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
	const cookieStore = await cookies()
	if (cookieStore.get(SESSION_COOKIE_NAME)?.value) {
		redirect('/desktop')
	}

	return <RegisterClient />
}