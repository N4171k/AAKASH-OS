import { uploadToCloudinary } from '../lib/cloudinary'
import { getSupabaseAdminClient } from '../lib/supabase/admin'

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

export async function listFilesForUser(userId: string): Promise<StoredFile[]> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return (files || []).map((file: any) => ({
      id: file.id,
      user_id: file.user_id,
      name: file.name,
      cloudinary_url: file.cloudinary_url || '',
      cloudinary_public_id: file.cloudinary_public_id || '',
      file_size: Number(file.file_size || 0),
      mime_type: file.mime_type || 'application/octet-stream',
      created_at: file.created_at,
    }))
  } catch (err) {
    console.error('listFilesForUser error', err)
    return []
  }
}

export async function uploadUserFile(userId: string, filePathOrBase64: string, name: string, mimeType = 'application/octet-stream'): Promise<StoredFile> {
  try {
    const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.toLowerCase().endsWith('.docx')
    const resourceType = isDocx ? 'raw' : 'auto'
    const uploadRes = await uploadToCloudinary(filePathOrBase64, { resource_type: resourceType })

    const { public_id, secure_url, bytes } = uploadRes as any

    const supabase = getSupabaseAdminClient()
    const filesTable = supabase.from('files') as any
    
    const { data: saved, error } = await filesTable
      .insert([{
        user_id: userId,
        name,
        file_type: isDocx ? 'document' : (mimeType.startsWith('image/') ? 'image' : 'document'),
        mime_type: mimeType,
        cloudinary_public_id: public_id,
        cloudinary_url: secure_url,
        file_size: Number(bytes || 0),
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      id: saved.id,
      user_id: saved.user_id,
      name: saved.name,
      cloudinary_url: saved.cloudinary_url || '',
      cloudinary_public_id: saved.cloudinary_public_id || '',
      file_size: Number(saved.file_size || 0),
      mime_type: saved.mime_type || 'application/octet-stream',
      created_at: saved.created_at,
    }
  } catch (err: any) {
    console.error('uploadUserFile error', {
      name,
      mimeType,
      message: err?.message,
      stack: err?.stack,
    })
    throw err
  }
}

