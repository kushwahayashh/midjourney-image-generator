/**
 * Credits display and refresh functionality
 */

let isRefreshing = false;
const CREDITS_CACHE_KEY = 'vibe_credits_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached credits if available and not expired
 */
function getCachedCredits() {
    try {
        const cached = localStorage.getItem(CREDITS_CACHE_KEY);
        if (!cached) return null;
        
        const { credits, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
            return credits;
        }
        
        // Cache expired
        localStorage.removeItem(CREDITS_CACHE_KEY);
        return null;
    } catch (error) {
        console.error('Error reading credits cache:', error);
        return null;
    }
}

/**
 * Cache credits value
 */
function setCachedCredits(credits) {
    try {
        const cacheData = {
            credits: credits,
            timestamp: Date.now()
        };
        localStorage.setItem(CREDITS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error caching credits:', error);
    }
}

/**
 * Fetch and display credits from the API
 */
async function fetchAndDisplayCredits(forceRefresh = false) {
    if (isRefreshing) return;
    
    const creditsElement = document.getElementById('creditsDisplay');
    if (!creditsElement) return;
    
    // Try to use cached credits first (unless force refresh)
    if (!forceRefresh) {
        const cachedCredits = getCachedCredits();
        if (cachedCredits !== null) {
            creditsElement.textContent = cachedCredits;
            return;
        }
    }
    
    try {
        isRefreshing = true;
        creditsElement.classList.add('refreshing');
        
        const response = await fetch('/api/credits');
        const data = await response.json();
        
        if (data.success) {
            // Display total available credits (subscription credits + extra credits)
            const totalCredits = (data.credits || 0) + (data.creditsExtra || 0);
            creditsElement.textContent = totalCredits;
            setCachedCredits(totalCredits);
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
        fetchAndDisplayCredits(true); // Force refresh on click
    }
}

/**
 * Initialize credits display on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayCredits(false); // Use cache if available
});
