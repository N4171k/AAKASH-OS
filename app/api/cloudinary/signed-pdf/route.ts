import { NextResponse } from 'next/server'
import cloudinary from '../../../../lib/cloudinary'

export async function GET(request: Request) {
  try {
    const urlObj = new URL(request.url)
    const publicId = String(urlObj.searchParams.get('public_id') || '').trim()
    const resourceType = String(urlObj.searchParams.get('resource_type') || 'image').trim() || 'image'
    if (!publicId) {
      return NextResponse.json({ error: 'public_id query parameter is required' }, { status: 400 })
    }

    // Expire signed URL in 10 minutes
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 10

    // Use Cloudinary utility to create a private, signed download URL for PDF resources
    // `publicId` should be the Cloudinary public id (without folder prefixes if not needed)
    // Example: ilm3gzuwc8ksvonlaytn (omit .pdf extension)
    const signedUrl = (cloudinary as any).utils.private_download_url(publicId, 'pdf', {
      resource_type: resourceType,
      type: 'upload',
      expires_at: expiresAt,
    })

    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error('Error generating signed Cloudinary URL', error)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
