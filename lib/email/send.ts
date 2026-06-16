import nodemailer from 'nodemailer'

/**
 * Sends an OTP email to the user.
 * If SMTP credentials are not configured in .env.local, it logs the email to the console
 * to allow local testing and development.
 */
export async function sendOtpEmail(to: string, username: string, otp: string) {
	const host = process.env.SMTP_HOST
	const port = parseInt(process.env.SMTP_PORT || '587', 10)
	const user = process.env.SMTP_USER
	const pass = process.env.SMTP_PASS
	const from = process.env.SMTP_FROM || 'no-reply@aakash-os.com'

	const isConfigured = host && host !== 'your-smtp-host' && user && user !== 'your-smtp-username'

	const subject = `Verify your AAKASH OS Account`
	const html = `
		<div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fbff; border-radius: 24px; border: 1px solid #dceeff;">
			<div style="text-align: center; margin-bottom: 30px;">
				<h1 style="color: #2e95ff; font-size: 32px; font-weight: 800; margin: 0;">AAKASH OS</h1>
				<p style="color: #608eb9; font-size: 16px; margin-top: 5px;">Security Verification</p>
			</div>
			
			<div style="background-color: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 16px rgba(46,149,255,0.06); border: 1px solid #eef6ff;">
				<p style="color: #3b5a75; font-size: 16px; line-height: 1.5; margin-top: 0;">Hello <strong>@${username}</strong>,</p>
				<p style="color: #5d87ae; font-size: 15px; line-height: 1.5;">Thank you for registering on AAKASH OS. Please use the following One-Time Password (OTP) to verify your email address. This code is valid for 10 minutes.</p>
				
				<div style="text-align: center; margin: 30px 0;">
					<span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #2e95ff; background-color: #edf4ff; padding: 12px 30px; border-radius: 12px; border: 2px dashed #b5d7ff; font-family: monospace;">${otp}</span>
				</div>
				
				<p style="color: #8fa6bc; font-size: 13px; line-height: 1.4; margin-bottom: 0;">If you did not request this, please ignore this email.</p>
			</div>
			
			<div style="text-align: center; margin-top: 30px; color: #a2b9d0; font-size: 12px;">
				© 2026 AAKASH OS. All rights reserved.
			</div>
		</div>
	`

	if (!isConfigured) {
		console.log('\n==================================================')
		console.log(`[MOCK EMAIL SENT]`)
		console.log(`To: ${to}`)
		console.log(`Username: @${username}`)
		console.log(`Subject: ${subject}`)
		console.log(`OTP Code: ${otp}`)
		console.log('==================================================\n')
		return { success: true, mock: true }
	}

	const transporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: {
			user,
			pass,
		},
	})

	await transporter.sendMail({
		from: `"AAKASH OS" <${from}>`,
		to,
		subject,
		html,
	})

	return { success: true, mock: false }
}
