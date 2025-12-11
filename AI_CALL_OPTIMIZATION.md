# AI API Call Optimization - Combined Generation

## Summary
Optimized the JobAI application to generate both cover letters and email subjects in a **single AI call** instead of two separate calls. This reduces API usage by 50% per preview/application.

## Changes Made

### 1. New Combined Function (`lib/ai.ts`)
Added `generateCoverLetterAndSubject()` function that:
- Generates both cover letter and email subject in one AI request
- Parses AI response using delimiter pattern: `---SUBJECT---` and `---LETTER---`
- Uses same provider fallback strategy (Groq → Google → Template)
- Returns structured output: `{ coverLetter, subject }`

```typescript
export async function generateCoverLetterAndSubject(
  jobDescription: string,
  resumeText?: string
): Promise<{ coverLetter: string; subject: string }>
```

### 2. Preview Route Optimization (`app/api/preview-job/route.ts`)
**Before:** Two separate AI calls
```typescript
const coverLetter = await generateCoverLetter(jobDescription, resumeText)
const generatedSubject = await generateEmailSubject(jobDescription)
```

**After:** Single combined call
```typescript
const { coverLetter, subject: generatedSubject } = await generateCoverLetterAndSubject(jobDescription, resumeText)
```

### 3. Apply Route Optimization (`app/api/apply-job/route.ts`)
**Before:** Two separate AI calls if either was missing
```typescript
if (!finalCoverLetter) {
  finalCoverLetter = await generateCoverLetter(jobDescription)
}
if (!emailSubject) {
  emailSubject = await generateEmailSubject(jobDescription)
}
```

**After:** Single combined call if either is missing
```typescript
if (!finalCoverLetter || !emailSubject) {
  const { coverLetter: generatedLetter, subject: generatedSubject } = await generateCoverLetterAndSubject(jobDescription)
  if (!finalCoverLetter) finalCoverLetter = generatedLetter
  if (!emailSubject) emailSubject = generatedSubject
}
```

## Benefits

### Cost Reduction
- **50% fewer API calls** per preview generation
- **50% fewer API calls** per application (if not using preview)
- Significant savings on Groq and Google API usage

### Performance
- Faster preview generation (single request instead of two sequential requests)
- Reduced latency for end users
- Less load on AI provider APIs

### Code Quality
- Cleaner, more efficient code
- Single prompt optimization for both outputs
- Consistent error handling with template fallback

## Implementation Details

### Prompt Structure
The combined prompt requests AI to format output with delimiters:
```
---SUBJECT---
[subject line here]
---LETTER---
[cover letter here]
```

### Fallback Strategy
1. **Groq (Primary):** Fast, cost-effective
2. **Google Gemini (Fallback):** Tries 4 model candidates on 404 errors
3. **Template (Last Resort):** Generic cover letter if no API keys available

### Error Handling
- Gracefully handles missing `resumeText`
- Falls back to template generation on AI failure
- Parses response even if format is slightly incorrect

## Provider Support

### Groq (llama-3.3-70b-versatile)
- Fastest combined generation
- Returns both outputs sequentially

### Google Generative AI
- Fallback with model candidates:
  - gemini-2.5-flash (preferred)
  - gemini-2.5-pro
  - gemini-1.5-flash-latest
  - gemini-1.5-flash

### Template (Fallback)
- Generic, professional cover letter template
- Fallback subject: `"Application for Position - [Date]"`

## Testing

### TypeScript Compilation
✅ No errors: `npx tsc --noEmit`

### Routes Updated
- ✅ `app/api/preview-job/route.ts` - Uses combined function
- ✅ `app/api/apply-job/route.ts` - Uses combined function with smart fallback

### Backward Compatibility
- Existing `generateCoverLetter()` and `generateEmailSubject()` functions preserved
- Can still be used individually if needed
- No breaking changes to API contracts

## Future Enhancements

1. **Caching:** Store generated subjects and letters to reduce calls further
2. **Streaming:** Stream both outputs for better UX
3. **A/B Testing:** Compare combined vs. separate calls for quality/cost metrics
4. **Configuration:** Make delimiters configurable via environment variables
5. **Telemetry:** Track which models succeed most often for optimization

## Related Files
- `lib/ai.ts` - Contains all AI generation logic
- `app/api/preview-job/route.ts` - Preview generation endpoint
- `app/api/apply-job/route.ts` - Application submission endpoint
- `lib/storage.ts` - User settings and storage
