// In-memory cache for OCR analysis results
// Use global to persist across hot reloads in development
const globalForCache = global as unknown as { analysisCache: Map<string, any> }

export const analysisCache = globalForCache.analysisCache || new Map<string, any>()

if (process.env.NODE_ENV !== 'production') globalForCache.analysisCache = analysisCache

