import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

function getFirebaseConfig() {
	const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
	const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
	const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
	const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
	const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID

	if (!apiKey || !authDomain || !projectId || !appId || !messagingSenderId) {
		throw new Error('Firebase client environment variables are missing')
	}

	return {
		apiKey,
		authDomain,
		projectId,
		appId,
		messagingSenderId,
	}
}

export function getFirebaseApp() {
	if (getApps().length) {
		return getApp()
	}

	return initializeApp(getFirebaseConfig())
}

export function getFirebaseAuth() {
	return getAuth(getFirebaseApp())
}