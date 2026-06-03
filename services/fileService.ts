import { uploadToCloudinary } from '../lib/cloudinary'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

interface StoredFile {
  id: string
  user_id: string
  name: string
  cloudinary_url: string
  cloudinary_public_id: string
  file_size: number
  mime_type: string
  created_at: string
}

const storageDir = path.join(process.cwd(), '.data')
const storageFile = path.join(storageDir, 'cloud-drive-files.json')

async function readStoredFiles() {
  try {
    const raw = await readFile(storageFile, 'utf8')
    return JSON.parse(raw) as StoredFile[]
  } catch {
    return []
  }
}

async function writeStoredFiles(files: StoredFile[]) {
  await mkdir(storageDir, { recursive: true })
  await writeFile(storageFile, JSON.stringify(files, null, 2), 'utf8')
}

export async function listFilesForUser(userId: string) {
  const files = await readStoredFiles()
  return files
    .filter((file) => file.user_id === userId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
}

export async function uploadUserFile(userId: string, filePathOrBase64: string, name: string, mimeType = 'application/octet-stream') {
  try {
    const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.toLowerCase().endsWith('.docx')
    const resourceType = isDocx ? 'raw' : 'auto'
    const uploadRes = await uploadToCloudinary(filePathOrBase64, { resource_type: resourceType })

    const { public_id, secure_url, bytes } = uploadRes as any

    const currentFiles = await readStoredFiles()
    const savedFile: StoredFile = {
      id: public_id,
      user_id: userId,
      name,
      mime_type: mimeType,
      cloudinary_public_id: public_id,
      cloudinary_url: secure_url,
      file_size: Number(bytes || 0),
      created_at: new Date().toISOString(),
    }

    currentFiles.unshift(savedFile)
    await writeStoredFiles(currentFiles)

    return savedFile
  } catch (err: any) {
    console.error('uploadUserFile error', {
      name,
      mimeType,
      message: err?.message,
      stack: err?.stack,
      // avoid serializing full error objects with secrets
    })
    throw err
  }
}
