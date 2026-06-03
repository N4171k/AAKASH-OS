import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const email = String(body?.email || '').trim().toLowerCase()
		const username = String(body?.username || '').trim()
		const backupCodes = Array.isArray(body?.backupCodes) ? body.backupCodes.map((value: unknown) => String(value)) : []

		if (!email || backupCodes.length === 0) {
			return NextResponse.json({ error: 'email and backupCodes are required' }, { status: 400 })
		}

		const smtpHost = process.env.SMTP_HOST
		const smtpPort = process.env.SMTP_PORT
		const smtpUser = process.env.SMTP_USER
		const smtpPass = process.env.SMTP_PASS
		const smtpFrom = process.env.SMTP_FROM || smtpUser

		if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
			const subject = encodeURIComponent('AAKASH OS recovery codes')
			const bodyText = encodeURIComponent(`Hello ${username || ''},\n\nYour AAKASH OS recovery codes:\n${backupCodes.join('\n')}\n\nKeep these codes safe. Each code can be used once.`)
			return NextResponse.json({ ok: false, fallbackMailto: `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${bodyText}` }, { status: 200 })
		}

		const transport = nodemailer.createTransport({
			host: smtpHost,
			port: Number(smtpPort),
			secure: Number(smtpPort) === 465,
			auth: {
				user: smtpUser,
				pass: smtpPass,
			},
		})

		await transport.sendMail({
			from: smtpFrom,
			to: email,
			subject: 'AAKASH OS recovery codes',
			text: `Hello ${username || ''},\n\nYour AAKASH OS recovery codes:\n${backupCodes.join('\n')}\n\nKeep these codes safe. Each code can be used once.`,
		})

		return NextResponse.json({ ok: true })
	} catch (error) {
		console.error('Backup code email error', error)
		const message = error instanceof Error ? error.message : 'Failed to email backup codes'
		return NextResponse.json({ error: message }, { status: 500 })
	}
}