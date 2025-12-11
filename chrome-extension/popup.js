document.getElementById('extractBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.innerText = 'Extracting...';
    statusEl.style.color = '#666';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'extract' }, async (response) => {
        if (!response) {
            statusEl.innerText = '❌ Could not extract. Refresh the page and try again.';
            statusEl.style.color = 'red';
            return;
        }

        // Handle search results page (multiple posts)
        if (response.type === 'SEARCH_RESULTS') {
            const emailCount = response.emails?.length || 0;

            if (emailCount === 0) {
                statusEl.innerText = '⚠️ No emails found on this page. Scroll to load more posts.';
                statusEl.style.color = 'orange';
                return;
            }

            statusEl.innerText = `Found ${emailCount} email(s)! Opening JobAI...`;
            statusEl.style.color = 'green';

            // Send all content to JobAI
            const params = new URLSearchParams({
                desc: response.description.substring(0, 10000),
                email: response.emails[0] || '',
                subject: 'Application from LinkedIn Search'
            });

            const url = `http://localhost:3000/dashboard?${params.toString()}`;
            chrome.tabs.create({ url });
            return;
        }

        // Handle individual job page
        if (response.type === 'JOB_PAGE') {
            statusEl.innerText = 'Sending to JobAI...';
            statusEl.style.color = 'green';

            const params = new URLSearchParams({
                desc: response.description,
                email: response.recruiterEmail || '',
                subject: `Application for ${response.jobTitle} at ${response.company}`
            });

            const url = `http://localhost:3000/dashboard?${params.toString()}`;
            chrome.tabs.create({ url });

            statusEl.innerText = '✅ Opened in JobAI!';
            return;
        }

        // Handle other pages
        if (response.emails?.length > 0) {
            const params = new URLSearchParams({
                desc: response.description,
                email: response.emails[0],
                subject: 'Application from LinkedIn'
            });

            const url = `http://localhost:3000/dashboard?${params.toString()}`;
            chrome.tabs.create({ url });

            statusEl.innerText = `✅ Found ${response.emails.length} email(s)!`;
            statusEl.style.color = 'green';
        } else {
            statusEl.innerText = '⚠️ No emails found on this page.';
            statusEl.style.color = 'orange';
        }
    });
});

document.getElementById('screenshotBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.innerText = 'Capturing Screenshot...';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Capture visible tab
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 });

        statusEl.innerText = 'Processing Image...';

        // Base64 is too long for URL params. We need to pass it differently.
        // Option 1: Copy to clipboard? No.
        // Option 2: Post to local server endpoint directly from here.

        statusEl.innerText = 'Sending to JobAI Server...';

        const response = await fetch('http://localhost:3000/api/analyze-screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl })
        });

        if (!response.ok) {
            throw new Error('Server error');
        }

        const result = await response.json();

        // Open dashboard with the Result ID (not the full text)
        const url = `http://localhost:3000/dashboard?analysisId=${result.id}`;
        chrome.tabs.create({ url });

        statusEl.innerText = '✅ Done! Check Dashboard.';

    } catch (err) {
        console.error(err);
        statusEl.innerText = '❌ Error: ' + err.message;
        statusEl.style.color = 'red';
    }
});

