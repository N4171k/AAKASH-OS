export type PistonResult = {
  stdout: string
  stderr: string
  code: number
  output?: string
}

export async function runCodeWithPiston(language: string, source: string, stdin = ''): Promise<PistonResult> {
  const pistonUrl = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute'

  const payload: any = {
    language,
    files: [
      {
        name: language === 'c' ? 'main.c' : 'main.py',
        content: source,
      },
    ],
    stdin,
  }

  const res = await fetch(pistonUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Piston API error: ${res.status} ${text}`)
  }

  const data = await res.json()

  // Piston responses vary by instance; normalize common fields
  return {
    stdout: data.run?.stdout ?? data.stdout ?? '',
    stderr: data.run?.stderr ?? data.stderr ?? '',
    code: data.run?.code ?? data.code ?? 0,
    output: data.run?.output ?? data.output ?? '',
  }
}
