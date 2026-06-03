import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
})

export async function uploadToCloudinary(pathOrBase64: string, options = {}) {
  return cloudinary.uploader.upload(pathOrBase64, options)
}

export default cloudinary
