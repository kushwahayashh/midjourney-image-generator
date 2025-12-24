// Skeleton Loading Utilities

/**
 * Adds loading state to an image element
 * @param {HTMLElement} imageCard - The image card element
 */
function addImageLoadingState(imageCard) {
    if (imageCard) {
        imageCard.classList.add('loading');
    }
}

/**
 * Removes loading state from an image element
 * @param {HTMLElement} imageCard - The image card element
 */
function removeImageLoadingState(imageCard) {
    if (imageCard) {
        imageCard.classList.remove('loading');
        imageCard.classList.add('fade-in');
    }
}

/**
 * Wraps image loading with skeleton state
 * @param {HTMLImageElement} img - The image element
 * @param {HTMLElement} container - The container element
 */
function loadImageWithSkeleton(img, container) {
    addImageLoadingState(container);
    
    // Set a timeout to remove loading state if image takes too long
    const timeout = setTimeout(() => {
        removeImageLoadingState(container);
    }, 10000); // 10 second timeout
    
    img.onload = function() {
        clearTimeout(timeout);
        removeImageLoadingState(container);
    };
    
    img.onerror = function() {
        clearTimeout(timeout);
        removeImageLoadingState(container);
        console.error('Failed to load image:', img.src);
    };
}

// Export functions for use in other scripts
window.SkeletonLoader = {
    addImageLoadingState,
    removeImageLoadingState,
    loadImageWithSkeleton
};
