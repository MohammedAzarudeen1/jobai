# How to Use JobAI Automation

## 1. Install the Chrome Extension
The extension is located in your project folder, but not "packaged" yet. You load it in "Developer Mode".

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (toggle in top right).
3.  Click **Load unpacked**.
4.  Select the directory: `c:\New folder\jobai\chrome-extension`.
5.  You should see **"JobAI - LinkedIn Assistant"** in your list!

## 2. Using the Automation
1.  Make sure your JobAI app is running (`npm run dev`) at `http://localhost:3000`.
2.  **Navigate to LinkedIn** and find a job post.
3.  Open the JobAI extension.
4.  **Option A: Analyze Text** (Extracts text/emails directly).
5.  **Option B: 📸 Screenshot & Analyze** (New!)
    - Captures the visible screen (useful if scraping is blocked).
    - Uses OCR to read the text and auto-fills the JobAI form.
6.  The app will open with your Data Pre-filled!

**IMPORTANT:** If you update the code, go to `chrome://extensions` and click the **Refresh (Circular Arrow)** icon on JobAI to apply changes.


## 3. NEW: ⚡ Fully Automated Auto-Apply (No Extension Needed)
This feature allows you to search, analyze, and apply to multiple jobs directly from the dashboard without using LinkedIn or the extension manually.

1.  **Configure API Key**:
    - Add `RAPIDAPI_KEY=your_key_here` to `.env.local`. (Get a key from RapidAPI: LinkedIn Data API).
    - Without a key, it runs in **Demo Mode**.

2.  **Go to Dashboard**: `http://localhost:3000/dashboard`
3.  Click the **"⚡ Auto-Apply"** tab.
4.  **Step 1: Search**:
    - Enter keywords (e.g., "React Developer") and Location.
    - Click **"Search Jobs"**. The system will fetch real live jobs from LinkedIn via API.
5.  **Step 2: Analysis & Apply**:
    - Click **"🧠 Analyze Matches"** to let AI read your resume and match it against all found jobs!
    - Click **"⚡ Auto-Apply to X Jobs"** to automatically generate cover letters and send emails to all matched recruiters.

## 4. Alternative: Manual Extension Workflow
1.  Go to `http://localhost:3000/dashboard`.
2.  Click the **"Find Jobs"** tab.
3.  Click **"Search LinkedIn Jobs"** to open a Google Search for jobs.
4.  Pick a result, then use the Extension as described above!

## Troubleshooting
- **Search returns 404/Error?** Check your `RAPIDAPI_KEY` and ensure you are subscribed to the correct API on RapidAPI (LinkedIn Data API).
- **No emails found?** The API searches the job description for emails. Many posts don't include them. Use the Extension for deeper scraping if needed.
- **Data not appearing?** Ensure port 3000 is active.
