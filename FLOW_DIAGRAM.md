# JobAI Combined Generation Flow

## High-Level Flow

```
USER REQUEST
     ↓
[PREVIEW ENDPOINT] /api/preview-job
     ↓
1️⃣ VALIDATE INPUT (job description required)
     ↓
2️⃣ LOAD USER SETTINGS (email config, resume URL)
     ↓
3️⃣ EXTRACT RESUME TEXT
     ├─ Attempt: Gemini Vision AI (parseResumeWithGemini)
     └─ Fallback: Local PDF parser (extractTextFromPDF)
     ↓
4️⃣ SINGLE AI CALL ⭐ (generateCoverLetterAndSubject)
     └─ Groq → Google Gemini → Template
     ↓
5️⃣ PARSE AI RESPONSE
     ├─ Extract: Email Subject
     └─ Extract: Cover Letter
     ↓
RETURN JSON RESPONSE
     ├─ coverLetter (professional text)
     ├─ emailSubject (concise line)
     └─ resumeTextLength (debug info)
```

---

## Detailed Step-by-Step Breakdown

### Step 1️⃣: Validate Input
```
Frontend sends POST request:
{
  "jobDescription": "Senior React Developer...",
  "subject": null  // optional override
}
     ↓
Check: jobDescription exists?
  YES → Continue
  NO → Return 400 Error
```

### Step 2️⃣: Load User Settings
```
Query MongoDB:
settings = await getSettings()
     ↓
Check: Email config (smtpHost, smtpPort, etc.)?
  NO → Return 400 Error
     ↓
Check: Resume uploaded (resumeUrl)?
  NO → Return 400 Error
  YES → Continue with resumeUrl
```

### Step 3️⃣: Extract Resume Text (Hybrid Strategy)

```
┌─────────────────────────────────────────────────┐
│ RESUME TEXT EXTRACTION (TWO-TIER)              │
└─────────────────────────────────────────────────┘

TIER 1: Gemini Vision AI (Preferred)
┌─────────────────────────┐
│ if GOOGLE_API_KEY exists│
│         ↓               │
│  parseResumeWithGemini()│ ← Converts PDF → Image → Gemini Vision
│         ↓               │
│  resumeText (high acc)  │
└─────────────────────────┘
         ↓
    [Success? Length > 50 chars?]
        ↙         ↘
       YES         NO
        ↓           ↓
     CONTINUE    TIER 2
        ↓
        ↓
TIER 2: Local PDF Parser (Fallback)
┌────────────────────────────┐
│  extractTextFromPDF()      │ ← Uses pdf-parse library
│         ↓                  │
│  resumeText (text-only)    │
└────────────────────────────┘
        ↓
  [Continue with text]
```

**Example Output:**
```
resumeText = "
  John Doe
  Senior Software Engineer
  
  Skills: React, Node.js, TypeScript, MongoDB...
  Experience: 5 years at Tech Company
  Education: BS Computer Science...
"
```

### Step 4️⃣: Single AI Call (The Optimization) ⭐

```
┌──────────────────────────────────────────────────────────────┐
│         generateCoverLetterAndSubject()                      │
│                                                              │
│  Input:                                                      │
│  • jobDescription: "Senior React Developer..."              │
│  • resumeText: "John Doe, React Engineer..."                │
│                                                              │
│  Combined Prompt:                                            │
│  ┌────────────────────────────────────────────────┐         │
│  │ "Generate BOTH:                                │         │
│  │ 1. Professional email subject (< 60 chars)    │         │
│  │ 2. Professional cover letter                  │         │
│  │                                                │         │
│  │ Output format:                                 │         │
│  │ ---SUBJECT---                                  │         │
│  │ [subject here]                                 │         │
│  │ ---LETTER---                                   │         │
│  │ [cover letter here]                            │         │
│  │                                                │         │
│  │ Rules:                                         │         │
│  │ - Only claim skills from resume               │         │
│  │ - Don't mention missing skills                │         │
│  │ - Be positive, professional                   │         │
│  │ - Don't hallucinate experience"               │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Provider Selection (Fallback Chain):                       │
│  ┌──────────────────────────────────────────┐              │
│  │ if GROQ_API_KEY                          │              │
│  │   ✅ Use: groq('llama-3.3-70b-versatile')│ ← FASTEST   │
│  │   └─ generateText() call                 │              │
│  │                                          │              │
│  │ else if GOOGLE_API_KEY                   │              │
│  │   ✅ Use: Google Gemini models           │ ← SMART     │
│  │   ├─ Try: gemini-2.5-flash              │              │
│  │   ├─ Try: gemini-2.5-pro                │              │
│  │   ├─ Try: gemini-1.5-flash-latest       │              │
│  │   └─ Try: gemini-1.5-flash              │              │
│  │   └─ Skip on 404, continue to next      │              │
│  │                                          │              │
│  │ else                                      │              │
│  │   ✅ Use: Template fallback              │ ← FALLBACK  │
│  │   └─ generateTemplateBased()             │              │
│  └──────────────────────────────────────────┘              │
│                                                              │
│  Output:                                                     │
│  {                                                           │
│    coverLetter: "Dear Hiring Manager...",                   │
│    subject: "Senior React Developer Application"            │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

### Step 5️⃣: Parse AI Response

```
Raw AI Response:
───────────────────────────────────────────
---SUBJECT---
Senior React Developer Application - 5+ Years Experience
---LETTER---
Dear Hiring Manager,

I am excited to apply for the Senior React Developer position...

[Full cover letter text]

Sincerely,
[Name]
───────────────────────────────────────────
         ↓
    REGEX PARSING
         ↓
Extract via: /---SUBJECT---([\s\S]*?)---LETTER---/
     ↓
subject = "Senior React Developer Application - 5+ Years Experience"

Extract via: /---LETTER---([\s\S]*?)$/
     ↓
coverLetter = "Dear Hiring Manager,\n\nI am excited..."
```

### Step 6️⃣: Return JSON Response

```json
{
  "success": true,
  "coverLetter": "Dear Hiring Manager,\n\nI am excited...",
  "emailSubject": "Senior React Developer Application",
  "resumeTextLength": 1024
}
```

---

## API Endpoint Flow

### REQUEST
```
POST /api/preview-job
Content-Type: application/json

{
  "jobDescription": "We are hiring a Senior React Developer...",
  "subject": null  // optional override
}
```

### RESPONSE (Success)
```json
HTTP 200 OK
{
  "success": true,
  "coverLetter": "Dear Hiring Manager,\n\nI am thrilled to apply...",
  "emailSubject": "Senior React Developer Application",
  "resumeTextLength": 2048
}
```

### RESPONSE (Error Examples)
```json
// Missing job description
HTTP 400 Bad Request
{ "success": false, "error": "Job description is required" }

// No email settings
HTTP 400 Bad Request
{ "success": false, "error": "Email settings not configured" }

// Resume not uploaded
HTTP 400 Bad Request
{ "success": false, "error": "Resume not found. Please upload a resume first." }

// Server error
HTTP 500 Internal Server Error
{ "success": false, "error": "Failed to generate preview" }
```

---

## Apply Job Flow (After Preview)

```
USER CLICKS "APPLY"
     ↓
[APPLY ENDPOINT] /api/apply-job
     ↓
1️⃣ VALIDATE INPUT (job desc, recruiter email)
     ↓
2️⃣ CHECK IF PREVIEW VALUES PROVIDED
     ├─ coverLetter from preview?
     ├─ emailSubject from preview?
     └─ enhancedResumeUrl from preview?
     ↓
3️⃣ FILL IN MISSING VALUES (if not from preview)
     ├─ if !coverLetter:
     │   └─ SINGLE AI CALL: generateCoverLetterAndSubject()
     │
     └─ if !emailSubject:
         └─ (already generated in same call)
     ↓
4️⃣ ENHANCE RESUME (if not already done)
     ├─ enhanceResumePDF(jobDescription)
     ├─ Upload to Cloudinary
     └─ Get public URL
     ↓
5️⃣ SEND EMAIL
     ├─ From: User's email
     ├─ To: Recruiter email
     ├─ Subject: emailSubject
     ├─ Body: coverLetter
     └─ Attachment: resume.pdf (from Cloudinary URL)
     ↓
6️⃣ CLEANUP (optional)
     └─ Delete enhanced resume from Cloudinary
     ↓
RETURN SUCCESS RESPONSE
```

---

## Performance Comparison

### Before Optimization (2 API Calls)
```
Preview Request Timeline:
├─ Extract Resume: 1-2 seconds
├─ AI Call 1: generateCoverLetter()         → 3-5 seconds
├─ AI Call 2: generateEmailSubject()        → 2-3 seconds
│
└─ TOTAL: 6-10 seconds
   (2 sequential API requests)
```

### After Optimization (1 API Call) ⚡
```
Preview Request Timeline:
├─ Extract Resume: 1-2 seconds
├─ AI Call: generateCoverLetterAndSubject() → 3-5 seconds
│  (Single request, both outputs)
│
└─ TOTAL: 4-7 seconds
   (1 API request)
   SAVED: ~2-3 seconds per preview
```

---

## Error Handling & Fallbacks

### Resume Extraction Failure
```
Gemini Vision fails
     ↓
Fall back to Local PDF Parser
     ↓
If both fail:
└─ Continue with empty resumeText = ""
   AI still generates cover letter (generic but professional)
```

### AI Generation Failure
```
Groq fails (API down, rate limit, etc.)
     ↓
Try Google Gemini (4 model candidates)
     ↓
First Google model fails with 404
     ↓
Try next model candidate
     ↓
All fail
     ↓
Use Template Fallback
└─ Return generic professional letter
```

### Email Sending Failure
```
Cloudinary URL returns 401 (auth error)
     ↓
Retry with API credentials (Basic Auth)
     ↓
If still fails:
└─ Return error to user (ask to re-apply)
```

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **API Calls per Preview** | 1 (down from 2) |
| **Time Saved** | ~2-3 seconds |
| **Cost Reduction** | 50% |
| **Provider Support** | Groq, Google, Template |
| **Response Format** | JSON with delimiters |
| **Error Handling** | 4-tier fallback |

---

## Code Path Summary

```
Request Entry:
  ├─ /api/preview-job/route.ts (POST handler)
  │
  ├─ Dependencies:
  │  ├─ getSettings() → /lib/storage.ts
  │  ├─ parseResumeWithGemini() → /lib/ai.ts
  │  ├─ extractTextFromPDF() → /lib/pdf.ts
  │  └─ generateCoverLetterAndSubject() → /lib/ai.ts ⭐
  │
  └─ Response: { success, coverLetter, emailSubject, resumeTextLength }

generateCoverLetterAndSubject():
  ├─ Input: jobDescription, resumeText
  │
  ├─ Provider Chain:
  │  ├─ getGoogleProvider() → env vars + lazy init
  │  ├─ groq() → @ai-sdk/groq
  │  └─ tryGenerateWithGoogleModels() → 4-model fallback
  │
  ├─ Prompt: Combined dual-output request
  │
  ├─ Response Parse: Regex delimiter extraction
  │
  └─ Output: { coverLetter, subject }
```

---

## Summary

The flow works by:

1. **Validating** user input and settings
2. **Extracting** resume text using Gemini Vision (with local PDF fallback)
3. **Making ONE AI call** asking for both cover letter AND subject simultaneously
4. **Parsing** the AI response using delimiter-based regex extraction
5. **Returning** both outputs in a single JSON response
6. **Saving** ~50% on API calls compared to sequential requests

The key optimization is **combining the prompt** so the AI generates both outputs in one request, reducing latency and cost while maintaining professional quality.
