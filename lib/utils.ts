export function extractEmails(text: string): string[] {
    // Simple regex to find email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const matches = text.match(emailRegex) || []
    return Array.from(new Set(matches))
}
