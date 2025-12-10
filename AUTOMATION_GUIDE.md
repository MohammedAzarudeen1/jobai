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
2.  Go to **LinkedIn** and find a job post you like (e.g., search for "Software Engineer").
3.  Open the JobAI extension popup (Puzzle piece icon -> JobAI Assistant).
4.  Click **"Analyze Job"**.
    *   The extension will scrape the Job Title, Company, Description, and any hidden emails.
    *   It will open a NEW tab to `localhost:3000` with all the data pre-filled!
5.  Review the data in JobAI and click **"Preview Application"**.

## 3. Alternative: Search via Dashboard
1.  Go to `http://localhost:3000/dashboard`.
2.  Click the **"Find Jobs"** tab.
3.  Click **"Search LinkedIn Jobs"** to open a Google Search for jobs.
4.  Pick a result, then use the Extension as described above!

## Troubleshooting
- **Extension doesn't extract?** Make sure you are on a specific Job page (URL usually looks like `linkedin.com/jobs/view/...`).
- **Data not appearing in JobAI?** Ensure the app is running on port 3000.
