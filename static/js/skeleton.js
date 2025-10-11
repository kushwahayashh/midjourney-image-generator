// Skeleton Loading Utilities

/**
 * Creates skeleton cards for image loading
 * @param {number} count - Number of skeleton cards to create
 * @returns {string} HTML string of skeleton cards
 */
function createSkeletonCards(count = 4) {
    // No longer using skeleton cards - images will show loading state directly
    return '';
}

/**
 * Creates a skeleton generation item for gallery
 * @returns {string} HTML string of skeleton generation item
 */
function createSkeletonGeneration() {
    return `
        <div class="skeleton-generation">
            <div class="skeleton-generation-header">
                <div class="skeleton-text short"></div>
                <div class="skeleton-text long"></div>
            </div>
            <div class="skeleton-generation-grid">
                ${createSkeletonCards(4)}
            </div>
        </div>
    `;
}

/**
 * Shows skeleton loading in the images section
 * @param {number} count - Number of skeleton cards to show
 */
function showImagesSkeleton(count = 4) {
    // Skeleton loading now handled by image-card.loading class
    // No need to pre-populate grid
}

/**
 * Shows skeleton loading in the gallery section
 * @param {number} count - Number of skeleton generation items to show
 */
function showGallerySkeleton(count = 3) {
    const gallerySection = document.getElementById('gallerySection');
    
    if (gallerySection) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += createSkeletonGeneration();
        }
        gallerySection.innerHTML = html;
    }
}

/**
 * Hides skeleton loading from images section
 */
function hideImagesSkeleton() {
    // Skeleton loading now handled by image-card.loading class
    // Grid will be cleared when displayImages() is called
}

/**
 * Hides skeleton loading from gallery section
 */
function hideGallerySkeleton() {
    const gallerySection = document.getElementById('gallerySection');
    if (gallerySection) {
        gallerySection.innerHTML = '';
    }
}

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
    createSkeletonCards,
    createSkeletonGeneration,
    showImagesSkeleton,
    showGallerySkeleton,
    hideImagesSkeleton,
    hideGallerySkeleton,
    addImageLoadingState,
    removeImageLoadingState,
    loadImageWithSkeleton
};
