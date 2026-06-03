import { NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/supabase/auth'
import { listFilesForUser, uploadUserFile } from '../../../services/fileService'

export async function GET(request: Request) {
  const user = (await getUserFromRequest(request)) as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const files = await listFilesForUser(user.id)
  return NextResponse.json({ files })
}

export async function POST(request: Request) {
  const user = (await getUserFromRequest(request)) as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as any
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Read file into base64
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mime = file.type || 'application/octet-stream'
  const dataUri = `data:${mime};base64,${base64}`

  const saved = await uploadUserFile(user.id, dataUri, file.name, mime)
  return NextResponse.json({ file: saved })
}
