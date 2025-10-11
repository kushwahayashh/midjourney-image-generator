// Application state
const AppState = {
    currentMessageId: null,
    currentPrompt: '',
    pollInterval: null
};

// Configuration
const CONFIG = {
    POLL_INTERVAL: 3000,
    ERROR_DISPLAY_TIME: 5000
};

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) return;
    
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
    setTimeout(() => {
        errorDiv.classList.remove('active');
    }, CONFIG.ERROR_DISPLAY_TIME);
}

async function loadGenerations() {
    const gallerySection = document.getElementById('gallerySection');
    if (!gallerySection) return;
    
    try {
        const response = await fetch('/api/generations');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Smoothly fade out before updating
        gallerySection.style.opacity = '0';
        gallerySection.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            gallerySection.innerHTML = '';
            
            if (!data.generations || data.generations.length === 0) {
                gallerySection.innerHTML = '<div class="gallery-empty">No generations yet. Create your first image!</div>';
            } else {
                data.generations.forEach(gen => {
                    const genItem = createGenerationItem(gen);
                    gallerySection.appendChild(genItem);
                });
            }
            
            // Fade back in
            gallerySection.style.opacity = '1';
        }, 300);
    } catch (error) {
        console.error('Error loading generations:', error);
        gallerySection.innerHTML = '<div class="gallery-empty">Failed to load gallery. Please refresh the page.</div>';
        gallerySection.style.opacity = '1';
    }
}

function createGenerationItem(gen) {
    const genItem = document.createElement('div');
    genItem.className = 'generation-item';
    
    // Format timestamp
    const timestamp = new Date(gen.timestamp.replace(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
    const timeStr = timestamp.toLocaleString();
    
    // Create timestamp div
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'generation-timestamp';
    timestampDiv.textContent = timeStr;
    
    // Create prompt section
    const promptDiv = document.createElement('div');
    promptDiv.className = 'generation-prompt';
    promptDiv.textContent = gen.prompt;
    
    // Create images grid
    const imagesGrid = document.createElement('div');
    imagesGrid.className = 'images-grid';
    
    gen.images.forEach((imageUrl, index) => {
        const card = createImageCard(imageUrl, index);
        imagesGrid.appendChild(card);
    });
    
    genItem.appendChild(timestampDiv);
    genItem.appendChild(promptDiv);
    genItem.appendChild(imagesGrid);
    
    return genItem;
}

function createImageCard(imageUrl, index) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.onclick = () => openModal(imageUrl);
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Generated image ${index + 1}`;
    
    // Add skeleton loading for images
    if (window.SkeletonLoader) {
        window.SkeletonLoader.loadImageWithSkeleton(img, card);
    }
    
    card.appendChild(img);
    return card;
}

// Removed old status and images section functions - now using gallery only

async function generateImage() {
    const promptInput = document.getElementById('promptInput');
    if (!promptInput) return;
    
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        showError('Please enter a prompt!');
        return;
    }

    // Show skeleton at the top of gallery
    showSkeletonInGallery(prompt, 4);
    
    // Clear textarea after submission
    promptInput.value = '';
    promptInput.style.height = 'auto';
    
    // Collapse input section if it was expanded
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
        inputSection.classList.remove('expanded');
    }

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate image');
        }

        AppState.currentMessageId = data.message_id;
        AppState.currentPrompt = data.prompt;
        
        // Start polling for status
        pollStatus();

    } catch (error) {
        showError(error.message);
        removeSkeletonFromGallery();
    }
}

// Removed updateStatusText - no longer needed

async function pollStatus() {
    if (!AppState.currentMessageId) return;

    try {
        const response = await fetch(`/status/${AppState.currentMessageId}?prompt=${encodeURIComponent(AppState.currentPrompt)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch status');
        }

        // Update progress on skeleton images
        updateSkeletonProgress(data.progress);

        // Check if done
        if (data.status === 'DONE') {
            handleGenerationComplete(data);
        } else if (data.status === 'FAILED' || data.status === 'ERROR') {
            handleGenerationFailed(data.progress);
        } else {
            // Continue polling
            setTimeout(pollStatus, CONFIG.POLL_INTERVAL);
        }

    } catch (error) {
        showError(error.message);
        resetGenerationState();
    }
}

function handleGenerationComplete(data) {
    // Replace skeleton in gallery with actual images
    replaceGallerySkeletonWithImages(data.images, data.raw_data);
    
    AppState.currentMessageId = null;
}

function handleGenerationFailed(progress) {
    showError(`Generation failed: ${progress}`);
    removeSkeletonFromGallery();
    AppState.currentMessageId = null;
    AppState.currentPrompt = '';
}

function resetGenerationState() {
    removeSkeletonFromGallery();
    AppState.currentMessageId = null;
    AppState.currentPrompt = '';
}

// Removed displayImages - now using gallery-based functions

function extractImagesFromRawData(rawData) {
    const possibleUrls = [];
    
    if (rawData?.data) {
        if (rawData.data.images) {
            possibleUrls.push(...rawData.data.images);
        }
        if (rawData.data.url) {
            possibleUrls.push(rawData.data.url);
        }
        if (rawData.data.imageUrl) {
            possibleUrls.push(rawData.data.imageUrl);
        }
    }
    
    if (rawData?.images) {
        possibleUrls.push(...rawData.images);
    }
    if (rawData?.url) {
        possibleUrls.push(rawData.url);
    }
    if (rawData?.imageUrl) {
        possibleUrls.push(rawData.imageUrl);
    }

    return possibleUrls;
}

function showSkeletonInGallery(prompt, count = 4) {
    const gallerySection = document.getElementById('gallerySection');
    if (!gallerySection) return;
    
    // Create a new generation item for the loading state
    const genItem = document.createElement('div');
    genItem.className = 'generation-item generation-loading';
    genItem.id = 'currentGenerationSkeleton';
    
    // Create timestamp (empty during generation)
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'generation-timestamp';
    timestampDiv.textContent = '';
    
    // Create prompt section
    const promptDiv = document.createElement('div');
    promptDiv.className = 'generation-prompt';
    promptDiv.textContent = prompt;
    
    // Create images grid with skeleton cards
    const imagesGrid = document.createElement('div');
    imagesGrid.className = 'images-grid';
    
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'image-card loading';
        card.dataset.skeletonIndex = i;
        
        // Add progress overlay
        const progressOverlay = document.createElement('div');
        progressOverlay.className = 'progress-overlay';
        
        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        progressText.textContent = '0%';
        
        progressOverlay.appendChild(progressText);
        card.appendChild(progressOverlay);
        
        imagesGrid.appendChild(card);
    }
    
    genItem.appendChild(timestampDiv);
    genItem.appendChild(promptDiv);
    genItem.appendChild(imagesGrid);
    
    // Insert at the top of gallery
    gallerySection.insertBefore(genItem, gallerySection.firstChild);
}

function updateSkeletonProgress(progress) {
    const skeletonItem = document.getElementById('currentGenerationSkeleton');
    if (!skeletonItem) return;
    
    const skeletonCards = skeletonItem.querySelectorAll('.image-card.loading .progress-text');
    
    // Parse progress - it could be a percentage string or number
    let progressValue = '0%';
    
    if (typeof progress === 'string') {
        progressValue = progress;
    } else if (typeof progress === 'number') {
        progressValue = `${Math.round(progress)}%`;
    }
    
    // Update all skeleton cards with the same progress
    skeletonCards.forEach(progressText => {
        progressText.textContent = progressValue;
    });
}

function replaceGallerySkeletonWithImages(images, rawData) {
    const skeletonItem = document.getElementById('currentGenerationSkeleton');
    if (!skeletonItem) return;
    
    // If no images in the expected format, try to extract from raw data
    if (!images || images.length === 0) {
        console.log('Raw data:', rawData);
        images = extractImagesFromRawData(rawData);
    }

    if (!images || images.length === 0) {
        const grid = skeletonItem.querySelector('.images-grid');
        if (grid) {
            grid.innerHTML = '<p style="color: #666;">No images found in response. Check console for raw data.</p>';
        }
        return;
    }

    // Update timestamp to show completion
    const timestamp = skeletonItem.querySelector('.generation-timestamp');
    if (timestamp) {
        const now = new Date();
        timestamp.textContent = now.toLocaleString();
    }

    // Get all skeleton cards in this generation item
    const grid = skeletonItem.querySelector('.images-grid');
    if (!grid) return;
    
    const skeletonCards = grid.querySelectorAll('.image-card.loading');
    
    images.forEach((imageUrl, index) => {
        if (index < skeletonCards.length) {
            // Replace skeleton with actual image
            const card = skeletonCards[index];
            
            // Fade out the progress overlay first
            const progressOverlay = card.querySelector('.progress-overlay');
            if (progressOverlay) {
                progressOverlay.style.transition = 'opacity 0.3s ease';
                progressOverlay.style.opacity = '0';
                
                setTimeout(() => {
                    progressOverlay.remove();
                }, 300);
            }
            
            // Add the actual image (hidden initially)
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = `Generated image ${index + 1}`;
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.5s ease';
            card.appendChild(img);
            
            // When image loads, fade it in and remove skeleton
            img.onload = () => {
                setTimeout(() => {
                    card.classList.remove('loading');
                    img.style.opacity = '1';
                }, 100);
            };
            
            // Make it clickable
            card.onclick = () => openModal(imageUrl);
        } else {
            // If we have more images than skeletons, create new cards
            const card = createImageCard(imageUrl, index);
            grid.appendChild(card);
        }
    });
    
    // Remove any extra skeleton cards if we have fewer images
    for (let i = images.length; i < skeletonCards.length; i++) {
        skeletonCards[i].remove();
    }
    
    // Remove the loading class from the generation item
    skeletonItem.classList.remove('generation-loading');
    skeletonItem.removeAttribute('id');
}

function removeSkeletonFromGallery() {
    const skeletonItem = document.getElementById('currentGenerationSkeleton');
    if (skeletonItem) {
        skeletonItem.style.transition = 'opacity 0.3s ease';
        skeletonItem.style.opacity = '0';
        setTimeout(() => {
            skeletonItem.remove();
        }, 300);
    }
}

// Modal functions
function openModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    if (!modal || !modalImg) return;
    
    modal.classList.add('active');
    modalImg.src = imageUrl;
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Load past generations on page load
    loadGenerations();
    
    // Setup event listeners
    setupModalListeners();
    setupTextareaListeners();
}

function setupModalListeners() {
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function setupTextareaListeners() {
    const textarea = document.getElementById('promptInput');
    const inputSection = document.querySelector('.input-section');
    
    if (!textarea || !inputSection) return;
    
    // Expand on focus
    textarea.addEventListener('focus', function() {
        inputSection.classList.add('expanded');
    });
    
    // Collapse on blur if empty
    textarea.addEventListener('blur', function() {
        if (!this.value.trim()) {
            inputSection.classList.remove('expanded');
            this.style.height = 'auto';
        }
    });
    
    // Auto-resize textarea
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    // Allow Enter key to submit (with Shift+Enter for new line)
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateImage();
        }
    });
}
