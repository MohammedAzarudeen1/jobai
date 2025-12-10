// This script runs on LinkedIn pages

function extractFromSearchResults() {
    // Find all post containers on search results page
    const posts = document.querySelectorAll('.feed-shared-update-v2, .update-components-actor');
    const jobs = [];

    // Get visible post text
    const allText = document.body.innerText;

    // Find all emails in the page
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = allText.match(emailRegex) || [];

    // Get the main content area text
    const mainContent = document.querySelector('.search-results-container, .scaffold-finite-scroll__content');
    const description = mainContent?.innerText || allText.substring(0, 5000);

    return {
        type: 'SEARCH_RESULTS',
        description: description,
        emails: [...new Set(emails)], // Unique emails
        postCount: posts.length,
        url: window.location.href
    };
}

function extractFromJobPage() {
    const jobTitle = document.querySelector('.job-details-jobs-unified-top-card__job-title, .top-card-layout__title, .jobs-unified-top-card__job-title')?.innerText || '';
    const company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link, .jobs-unified-top-card__company-name')?.innerText || '';
    const description = document.querySelector('#job-details, .show-more-less-html__markup, .description__text, .jobs-description__content')?.innerText || '';

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = description.match(emailRegex) || [];

    return {
        type: 'JOB_PAGE',
        jobTitle,
        company,
        description,
        recruiterEmail: emails[0] || '',
        emails: emails,
        url: window.location.href
    };
}

function extractJobDetails() {
    const currentUrl = window.location.href;

    // Check if we're on a search results page (posts/content)
    if (currentUrl.includes('/search/results/')) {
        return extractFromSearchResults();
    }

    // Check if we're on a job page
    if (currentUrl.includes('/jobs/')) {
        return extractFromJobPage();
    }

    // Try to get any visible content
    const allText = document.body.innerText;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = allText.match(emailRegex) || [];

    return {
        type: 'OTHER',
        description: allText.substring(0, 3000),
        emails: emails,
        url: currentUrl
    };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract') {
        const data = extractJobDetails();
        sendResponse(data);
    }
});
