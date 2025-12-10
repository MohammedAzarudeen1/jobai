import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string = 'jobai-resumes'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          })
        } else {
          reject(new Error('Upload failed'))
        }
      }
    )

    const readableStream = new Readable()
    readableStream.push(fileBuffer)
    readableStream.push(null)
    readableStream.pipe(uploadStream)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    })
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error)
  }
}

export async function getCloudinaryUrl(publicId: string): Promise<string> {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: 'raw',
  })
}

