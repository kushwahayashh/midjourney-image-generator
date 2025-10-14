/**
 * Credits display and refresh functionality
 */

let isRefreshing = false;

/**
 * Fetch and display credits from the API
 */
async function fetchAndDisplayCredits() {
    if (isRefreshing) return;
    
    const creditsElement = document.getElementById('creditsDisplay');
    if (!creditsElement) return;
    
    try {
        isRefreshing = true;
        creditsElement.classList.add('refreshing');
        
        const response = await fetch('/api/credits');
        const data = await response.json();
        
        if (data.success) {
            creditsElement.textContent = data.creditsExtra || 0;
            creditsElement.setAttribute('title', `Extra Credits: ${data.creditsExtra}\nTotal Credits: ${data.credits}\nQuota: ${data.creditsQuota}\nPlan: ${data.type}`);
        } else {
            creditsElement.textContent = '0';
            console.error('Failed to fetch credits:', data.error);
        }
    } catch (error) {
        console.error('Error fetching credits:', error);
        creditsElement.textContent = '0';
    } finally {
        isRefreshing = false;
        creditsElement.classList.remove('refreshing');
    }
}

/**
 * Handle credits click to refresh
 */
function handleCreditsClick() {
    if (!isRefreshing) {
        fetchAndDisplayCredits();
    }
}

/**
 * Initialize credits display on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayCredits();
});
