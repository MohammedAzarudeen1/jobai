import { PDFDocument } from 'pdf-lib'
import { getResumeUrl } from './storage'
import { uploadToCloudinary, fetchFromCloudinary } from './cloudinary'

export async function enhanceResumePDF(
  jobDescription: string
): Promise<{ url: string; publicId: string }> {
  const originalResumeUrl = await getResumeUrl()

  if (!originalResumeUrl) {
    throw new Error('Resume not found. Please upload a resume first.')
  }

  // Fetch the original PDF from Cloudinary
  const originalPdfBytes = await fetchFromCloudinary(originalResumeUrl)
  const pdfDoc = await PDFDocument.load(originalPdfBytes)

  // Set metadata
  pdfDoc.setTitle('Enhanced Resume')
  pdfDoc.setSubject(`Resume tailored for: ${jobDescription.substring(0, 50)}...`)

  // Generate enhanced PDF
  const enhancedBytes = await pdfDoc.save()
  const buffer = Buffer.from(enhancedBytes)

  // Upload enhanced PDF to Cloudinary
  const result = await uploadToCloudinary(buffer, 'jobai-enhanced-resumes')
  return result
}

// @ts-ignore
let PDFParser: any;
try {
  PDFParser = require('pdf2json');
} catch (e) {
  console.error('Failed to load pdf2json module:', e);
}

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  console.log('📄 extractTextFromPDF (pdf2json) called for:', pdfUrl.substring(0, 50) + '...')

  if (!PDFParser) {
    console.error('❌ pdf2json module is not loaded.')
    return ''
  }

  return new Promise(async (resolve, reject) => {
    try {
      let buffer: Buffer | null = null;
      // 1. Get Buffer
      if (pdfUrl.startsWith('data:')) {
        console.log('📄 Processing Base64 PDF...')
        const base64Data = pdfUrl.split(',')[1]
        buffer = Buffer.from(base64Data, 'base64')
      } else if (pdfUrl.startsWith('http')) {
        console.log('📄 Fetching PDF from URL...')
        const response = await fetch(pdfUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      } else {
        console.warn('Unsupported PDF URL format')
        return resolve('')
      }
      // 2. Parse Buffer
      if (buffer) {
        console.log('📄 Parsing PDF buffer with pdf2json...')
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", (errData: any) => {
          console.error("❌ PDF Parser Error:", errData.parserError);
          resolve("");
        });
        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
          const text = pdfParser.getRawTextContent();
          console.log(`✅ Extracted ${text.length} characters.`);
          resolve(text);
        });
        pdfParser.parseBuffer(buffer);
      } else {
        resolve("")
      }
    } catch (error) {
      console.error('Error extracting PDF text:', error)
      resolve('')
    }
  })
}
