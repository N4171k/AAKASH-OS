import twilio from 'twilio'

let twilioClient: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (twilioClient) return twilioClient

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Twilio environment variables are missing')
  }

  twilioClient = twilio(accountSid, authToken)
  return twilioClient
}

export function getTwilioVerifyServiceSid() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
  if (!serviceSid) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID is missing')
  }
  return serviceSid
}

export function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}
