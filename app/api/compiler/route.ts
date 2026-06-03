import { NextResponse } from 'next/server'

// Map your frontend languages to JDoodle's specific API requirements
const JDOODLE_CONFIG: Record<string, { language: string; versionIndex: string }> = {
  'c': { language: 'c', versionIndex: '5' },           // GCC 11.1.0
  'python': { language: 'python3', versionIndex: '4' }, // Python 3.9.9
  'python3': { language: 'python3', versionIndex: '4' }
}

export async function POST(req: Request) {
  try {
    const { language, source } = await req.json()

    const clientId = process.env.JDOODLE_CLIENT_ID
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET

    // Safety check for .env file
    if (!clientId || !clientSecret) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Server configuration error: Missing Compiler API keys.' 
      }, { status: 500 })
    }

    // Look up the correct language code and version for JDoodle
    const compilerSettings = JDOODLE_CONFIG[language.toLowerCase()]

    // Safety check for unsupported languages
    if (!compilerSettings) {
      return NextResponse.json({ 
        ok: false, 
        error: `Unsupported language requested: ${language}` 
      }, { status: 400 })
    }

    // Call the JDoodle Execution API
    const response = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: source,
        language: compilerSettings.language,
        versionIndex: compilerSettings.versionIndex,
        clientId: clientId,
        clientSecret: clientSecret
      }),
    })

    const data = await response.json()

    // Catch JDoodle-specific errors (e.g., daily limit reached)
    if (data.error) {
      return NextResponse.json({ ok: false, error: data.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      result: {
        stdout: data.output,
        stderr: null, 
      }
    })

  } catch (error) {
    console.error("Compiler API Error:", error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}