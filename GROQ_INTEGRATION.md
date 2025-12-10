# Groq AI Integration

The app now uses the **Vercel AI SDK** with the **Groq provider** for AI-powered cover letter generation. This is the recommended approach for Next.js applications.

## Implementation

- **Package**: `@ai-sdk/groq` (v1.2.9) + `ai` (v4.3.19)
- **Documentation**: https://ai-sdk.dev/providers/ai-sdk-providers/groq
- **Groq Models**: https://console.groq.com/docs/models

## Current Model

The app uses `llama-3.3-70b-versatile` by default, which is:
- Latest Llama 3.3 model (replaces decommissioned llama-3.1-70b-versatile)
- Fast and free
- Great for general text generation
- Well-suited for cover letter generation

## Available Groq Models

You can change the model in `lib/ai.ts` by updating the model ID. Here are some popular options:

### Fast & Free Models
- `llama-3.3-70b-versatile` (current) - Latest Llama 3.3 model, fast and versatile
- `llama-3.1-8b-versatile` - Smaller, faster Llama 3.1 model
- `gemma2-9b-it` - Google's Gemma 2, smaller but fast
- `gemma2-9b-it` - Google's Gemma 2, smaller but fast
- `mixtral-8x7b-32768` - Mixtral model with large context window

### Reasoning Models (Advanced)
- `qwen/qwen3-32b` - Reasoning model with `reasoningFormat` support
- `qwen-qwq-32b` - Qwen reasoning model
- `deepseek-r1-distill-llama-70b` - DeepSeek reasoning model

### High-Performance Models
- `openai/gpt-oss-20b` - OpenAI's open-source model
- `openai/gpt-oss-120b` - Larger OpenAI open-source model (supports browser search)

## Usage Example

```typescript
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'

const result = await generateText({
  model: groq('llama-3.1-70b-versatile'),
  system: 'You are a professional career advisor...',
  prompt: 'Write a cover letter...',
  temperature: 0.7,
  maxTokens: 800,
})
```

## Advanced Features

### Reasoning Models
For models like `qwen/qwen3-32b`, you can use reasoning:

```typescript
const result = await generateText({
  model: groq('qwen/qwen3-32b'),
  providerOptions: {
    groq: {
      reasoningFormat: 'parsed', // 'parsed', 'raw', or 'hidden'
      reasoningEffort: 'default', // 'low', 'medium', 'high', 'default'
    },
  },
  prompt: '...',
})
```

### Service Tiers
For higher throughput, you can use the flex tier:

```typescript
const result = await generateText({
  model: groq('llama-3.1-70b-versatile'),
  providerOptions: {
    groq: {
      serviceTier: 'flex', // 'on_demand', 'flex', or 'auto'
    },
  },
  prompt: '...',
})
```

## Environment Variable

Make sure your `.env.local` includes:

```env
GROQ_API_KEY=your_groq_api_key
```

Get your API key from: https://console.groq.com/

## Benefits of Vercel AI SDK

1. **Unified API**: Same interface across different AI providers
2. **Type Safety**: Full TypeScript support
3. **Streaming**: Built-in support for streaming responses
4. **Next.js Optimized**: Designed specifically for Next.js
5. **Active Development**: Maintained by Vercel

## Model Selection Guide

- **Cover Letters**: `llama-3.1-70b-versatile` or `llama-3.3-70b-versatile`
- **Fast Responses**: `gemma2-9b-it`
- **Complex Reasoning**: `qwen/qwen3-32b` with reasoning enabled
- **Large Context**: `mixtral-8x7b-32768` (32K tokens)

## Testing

To test the integration:

1. Ensure `GROQ_API_KEY` is set in `.env.local`
2. Go to Dashboard → Apply to Job
3. Enter a job description and recruiter email
4. Click "Generate & Send Application"
5. The cover letter will be generated using Groq AI

If the API key is missing, the app will fall back to template-based generation.

