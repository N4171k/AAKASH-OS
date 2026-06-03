import admin from 'firebase-admin'

let firebaseAdminApp: admin.app.App | null = null

function getFirebaseAdminConfig() {
	const projectId = process.env.FIREBASE_PROJECT_ID
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
	const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

	if (!projectId || !clientEmail || !privateKey) {
		throw new Error('Firebase admin environment variables are missing')
	}

	return {
		projectId,
		clientEmail,
		privateKey,
	}
}

export function getFirebaseAdminApp() {
	if (firebaseAdminApp) return firebaseAdminApp

	const config = getFirebaseAdminConfig()
	firebaseAdminApp = admin.apps.length
		? admin.app()
		: admin.initializeApp({
			credential: admin.credential.cert(config),
		})

	return firebaseAdminApp
}

export async function verifyFirebaseIdToken(idToken: string) {
	const app = getFirebaseAdminApp()
	return admin.auth(app).verifyIdToken(idToken)
}