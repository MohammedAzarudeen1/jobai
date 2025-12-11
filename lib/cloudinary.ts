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
        type: 'upload', // Ensure public upload type
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          // Use secure_url for public delivery
          const url = result.secure_url || result.url
          console.log(`✅ Uploaded to Cloudinary: ${url}`)
          resolve({
            url,
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

export async function fetchFromCloudinary(url: string): Promise<Buffer> {
  console.log(`📥 Fetching from Cloudinary: ${url.substring(0, 80)}...`)
  try {
    // Remove any transformation flags from the URL for fetching (transformations don't apply to raw fetches)
    let cleanUrl = url.replace(/\/fl_[^\/]+/g, '')
    
    // Try fetching without auth first
    let response = await fetch(cleanUrl)
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer())
    }
    
    // If 401/403, try with Cloudinary API auth
    if (response.status === 401 || response.status === 403) {
      console.log('⚠️ URL requires auth, attempting with Cloudinary credentials...')
      const apiUrl = cleanUrl.includes('?') ? `${cleanUrl}&_a=${Date.now()}` : `${cleanUrl}?_a=${Date.now()}`
      response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64')}`,
        },
      })
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Cloudinary: ${response.status} ${response.statusText}`)
    }
    
    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    console.error('❌ Error fetching from Cloudinary:', error)
    throw error
  }
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

