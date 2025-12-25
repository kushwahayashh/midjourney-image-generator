// Application state - now supports multiple concurrent generations with WebSocket
const AppState = {
    activeGenerations: new Map(), // Map of messageId -> { prompt, skeletonId }
    modalState: {
        currentImages: [],
        currentIndex: 0
    },
    lazyLoadObserver: null,
    socket: null
};

// Configuration
const CONFIG = {
    ERROR_DISPLAY_TIME: 5000
};

// Initialize WebSocket connection
function initializeSocket() {
    // Connect to Socket.io server
    AppState.socket = io();
    
    // Handle connection events
    AppState.socket.on('connect', () => {
        console.log('Connected to server via WebSocket');
    });
    
    AppState.socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    // Handle generation started confirmation
    AppState.socket.on('generation_started', (data) => {
        const { messageId, skeletonId, prompt } = data;
        console.log(`Generation started: ${messageId}`);
        
        // Track this generation
        AppState.activeGenerations.set(messageId, {
            prompt,
            skeletonId
        });

        // Ensure skeleton exists (if started from another tab)
        if (!document.getElementById(skeletonId)) {
            showSkeletonInGallery(prompt, 4, skeletonId);
        }
    });

    // Handle sync of all active jobs on connection
    AppState.socket.on('active_jobs', (jobs) => {
        console.log('Syncing active jobs:', jobs);
        jobs.forEach(job => {
            const { messageId, skeletonId, prompt, progress, status } = job;
            
            // Track globally
            AppState.activeGenerations.set(messageId, { prompt, skeletonId });
            
            // Restore UI if missing
            if (!document.getElementById(skeletonId)) {
                showSkeletonInGallery(prompt, 4, skeletonId);
            }
            
            // Update progress immediately
            if (progress) {
                updateSkeletonProgress(progress, skeletonId);
            }
        });
    });
    
    // Handle real-time progress updates
    AppState.socket.on('progress', (data) => {
        const { messageId, skeletonId, progress, status } = data;
        console.log(`Progress for ${messageId}: ${progress} (${status})`);
        
        // Update skeleton progress display
        updateSkeletonProgress(progress, skeletonId);
        // Ensure UI exists (active sync might have missed it or race condition)
        if (!document.getElementById(skeletonId)) {
            const generation = AppState.activeGenerations.get(messageId);
            if (generation) {
                showSkeletonInGallery(generation.prompt, 4, skeletonId);
            }
        }
        
        // Update skeleton progress display
        updateSkeletonProgress(progress, skeletonId);
    });
    
    // Handle generation complete
    AppState.socket.on('generation_complete', (data) => {
        const { messageId, skeletonId, images, raw_data } = data;
        console.log(`Generation complete: ${messageId}`);
        
        // Replace skeleton with actual images
        replaceGallerySkeletonWithImages(images, raw_data, skeletonId);
        
        // Update credits after generation completes
        if (typeof fetchAndDisplayCredits === 'function') {
            fetchAndDisplayCredits(true);
        }
        
        // Clean up
        AppState.activeGenerations.delete(messageId);
        
        // Show success notification
        if (window.toast) {
            window.toast.success('Generation complete!', 'Your images are ready');
        }
    });
    
    // Handle generation failed
    AppState.socket.on('generation_failed', (data) => {
        const { messageId, skeletonId, progress, status } = data;
        console.log(`Generation failed: ${messageId}`);
        
        if (window.toast) {
            window.toast.error('Generation failed', progress || status);
        }
        
        removeSkeletonFromGallery(skeletonId);
        AppState.activeGenerations.delete(messageId);
    });
    
    // Handle errors
    AppState.socket.on('error', (data) => {
        const { skeletonId, message } = data;
        console.error('WebSocket error:', message);
        
        if (window.toast) {
            window.toast.error('Error', message);
        }
        
        if (skeletonId) {
            removeSkeletonFromGallery(skeletonId);
        }
    });
}

function showError(message) {
    // Legacy function - now uses toast notifications
    if (window.toast) {
        window.toast.error(message);
    }
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
    genItem.dataset.messageId = gen.message_id || '';
    
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
        const card = createImageCard(imageUrl, index, gen.images);
        imagesGrid.appendChild(card);
    });
    
    genItem.appendChild(timestampDiv);
    genItem.appendChild(promptDiv);
    genItem.appendChild(imagesGrid);
    
    return genItem;
}

function createImageCard(imageUrl, index, allImages = []) {
    const card = document.createElement('div');
    card.className = 'image-card loading';
    
    // Store the batch images and index on the card for later use
    const batchImages = allImages.length > 0 ? allImages : [imageUrl];
    const imageIndex = index;
    
    card.onclick = () => openModal(imageUrl, batchImages, imageIndex);
    
    const img = document.createElement('img');
    img.alt = `Generated image ${index + 1}`;
    img.loading = 'lazy'; // Native lazy loading as fallback
    
    // Use lazy loading with Intersection Observer
    img.dataset.src = imageUrl;
    img.classList.add('lazy-load');
    
    card.appendChild(img);
    
    // Observe this image for lazy loading
    if (AppState.lazyLoadObserver) {
        AppState.lazyLoadObserver.observe(img);
    } else {
        // Fallback: load immediately if observer not ready
        img.src = imageUrl;
        img.onload = () => {
            card.classList.remove('loading');
            card.classList.add('fade-in');
        };
    }
    
    return card;
}

// Generate image using WebSocket for real-time updates
async function generateImage() {
    const promptInput = document.getElementById('promptInput');
    if (!promptInput) return;
    
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        if (window.toast) {
            window.toast.warning('Empty prompt', 'Please enter a prompt to generate images');
        }
        return;
    }

    // Generate a unique skeleton ID for this request
    const skeletonId = `generation-skeleton-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Show skeleton at the top of gallery IMMEDIATELY for instant feedback
    showSkeletonInGallery(prompt, 4, skeletonId);
    
    // Clear textarea after submission
    promptInput.value = '';
    promptInput.style.height = 'auto';
    
    // Collapse input section if it was expanded
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
        inputSection.classList.remove('expanded');
    }

    // Use WebSocket if connected, otherwise fall back to REST API
    if (AppState.socket && AppState.socket.connected) {
        // Emit generation request via WebSocket
        AppState.socket.emit('generate', { prompt, skeletonId });
    } else {
        // Fallback to REST API + polling
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

            const messageId = data.message_id;
            
            // Track this generation in our state
            AppState.activeGenerations.set(messageId, {
                prompt: data.prompt,
                skeletonId: skeletonId
            });
            
            // Start polling for this specific message (fallback mode)
            pollStatus(messageId);

        } catch (error) {
            if (window.toast) {
                window.toast.error('Generation failed', error.message);
            }
            removeSkeletonFromGallery(skeletonId);
        }
    }
}

// Fallback polling function (used when WebSocket is not available)
async function pollStatus(messageId) {
    const generation = AppState.activeGenerations.get(messageId);
    if (!generation) return;

    try {
        const response = await fetch(`/status/${messageId}?prompt=${encodeURIComponent(generation.prompt)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch status');
        }

        // Update progress on skeleton images for this specific generation
        updateSkeletonProgress(data.progress, generation.skeletonId);

        // Check if done
        if (data.status === 'DONE') {
            handleGenerationComplete(data, messageId);
        } else if (data.status === 'FAILED' || data.status === 'ERROR') {
            handleGenerationFailed(data.progress, messageId);
        } else {
            // Continue polling for this specific message
            setTimeout(() => pollStatus(messageId), 3000);
        }

    } catch (error) {
        if (window.toast) {
            window.toast.error('Status check failed', error.message);
        }
        resetGenerationState(messageId);
    }
}

function handleGenerationComplete(data, messageId) {
    const generation = AppState.activeGenerations.get(messageId);
    if (!generation) return;
    
    // Replace skeleton in gallery with actual images
    replaceGallerySkeletonWithImages(data.images, data.raw_data, generation.skeletonId);
    
    // Update credits after generation completes
    if (typeof fetchAndDisplayCredits === 'function') {
        fetchAndDisplayCredits(true);
    }
    
    // Clean up
    AppState.activeGenerations.delete(messageId);
}

function handleGenerationFailed(progress, messageId) {
    const generation = AppState.activeGenerations.get(messageId);
    if (!generation) return;
    
    if (window.toast) {
        window.toast.error('Generation failed', progress);
    }
    removeSkeletonFromGallery(generation.skeletonId);
    
    // Clean up
    AppState.activeGenerations.delete(messageId);
}

function resetGenerationState(messageId) {
    const generation = AppState.activeGenerations.get(messageId);
    if (!generation) return;
    
    removeSkeletonFromGallery(generation.skeletonId);
    AppState.activeGenerations.delete(messageId);
}

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

function showSkeletonInGallery(prompt, count = 4, skeletonId) {
    const gallerySection = document.getElementById('gallerySection');
    if (!gallerySection) return;
    
    // Create a new generation item for the loading state
    const genItem = document.createElement('div');
    genItem.className = 'generation-item generation-loading';
    genItem.id = skeletonId;
    
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

function updateSkeletonProgress(progress, skeletonId) {
    const skeletonItem = document.getElementById(skeletonId);
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

function replaceGallerySkeletonWithImages(images, rawData, skeletonId) {
    const skeletonItem = document.getElementById(skeletonId);
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
            img.alt = `Generated image ${index + 1}`;
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.5s ease';
            
            card.appendChild(img);
            
            // Load immediately (not lazy) since these are newly generated images at the top
            img.src = imageUrl;
            
            // When image loads, fade it in and remove skeleton
            img.onload = () => {
                setTimeout(() => {
                    card.classList.remove('loading');
                    img.style.opacity = '1';
                }, 100);
            };
            
            img.onerror = () => {
                console.error('Failed to load image:', imageUrl);
                card.classList.remove('loading');
            };
        } else {
            // If we have more images than skeletons, create new cards
            const card = createImageCard(imageUrl, index, images);
            grid.appendChild(card);
        }
    });
    
    // After all images are added, set up click handlers with proper batch context
    const allCards = grid.querySelectorAll('.image-card');
    allCards.forEach((card, idx) => {
        card.onclick = () => openModal(images[idx], images, idx);
    });
    
    // Remove any extra skeleton cards if we have fewer images
    for (let i = images.length; i < skeletonCards.length; i++) {
        skeletonCards[i].remove();
    }
    skeletonItem.classList.remove('generation-loading');
    skeletonItem.removeAttribute('id');
}

function removeSkeletonFromGallery(skeletonId) {
    const skeletonItem = document.getElementById(skeletonId);
    if (skeletonItem) {
        skeletonItem.style.transition = 'opacity 0.3s ease';
        skeletonItem.style.opacity = '0';
        setTimeout(() => {
            skeletonItem.remove();
        }, 300);
    }
}

// Modal functions
function openModal(imageUrl, allImages = [imageUrl], currentIndex = 0) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    if (!modal || !modalImg) return;
    
    // Store modal state
    AppState.modalState.currentImages = allImages;
    AppState.modalState.currentIndex = currentIndex;
    
    // Ensure previous closing state is cleared before showing
    modal.classList.remove('closing');
    modalImg.classList.remove('closing');

    modal.classList.add('active');
    modalImg.src = imageUrl;
    
    // Update navigation buttons
    updateModalNavigation();
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Re-initialize Lucide icons for the modal buttons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;

    // If not open or already closing, do nothing
    if (!modal.classList.contains('active') || modal.classList.contains('closing')) {
        return;
    }

    const modalImg = document.getElementById('modalImage');

    // Add closing classes to trigger CSS ease-out animations
    modal.classList.add('closing');
    if (modalImg) modalImg.classList.add('closing');

    // Track if cleanup has already been called to prevent double execution
    let cleanedUp = false;

    const cleanup = () => {
        // Prevent double execution from both animationend and timeout
        if (cleanedUp) return;
        cleanedUp = true;

        // Remove active and closing states after animation ends
        modal.classList.remove('active');
        modal.classList.remove('closing');
        if (modalImg) modalImg.classList.remove('closing');

        document.body.style.overflow = 'auto';

        // Clear modal state
        AppState.modalState.currentImages = [];
        AppState.modalState.currentIndex = 0;
    };

    const onAnimEnd = (e) => {
        // Only clean up when the modal's own fadeOut animation finishes
        if (e.target === modal) {
            cleanup();
        }
    };

    // Listen for animation end; provide a timeout fallback
    modal.addEventListener('animationend', onAnimEnd, { once: true });
    setTimeout(cleanup, 300); // Fallback in case animationend doesn't fire
}

function navigateModal(direction) {
    const { currentImages, currentIndex } = AppState.modalState;
    
    if (currentImages.length === 0) return;
    
    // Calculate new index
    let newIndex = currentIndex + direction;
    
    // Wrap around
    if (newIndex < 0) {
        newIndex = currentImages.length - 1;
    } else if (newIndex >= currentImages.length) {
        newIndex = 0;
    }
    
    // Update state
    AppState.modalState.currentIndex = newIndex;
    
    // Update image
    const modalImg = document.getElementById('modalImage');
    if (modalImg) {
        modalImg.src = currentImages[newIndex];
    }
    
    // Update navigation buttons
    updateModalNavigation();
}

function updateModalNavigation() {
    const prevBtn = document.querySelector('.modal-nav-prev');
    const nextBtn = document.querySelector('.modal-nav-next');
    const { currentImages } = AppState.modalState;
    
    if (!prevBtn || !nextBtn) return;
    
    // Show/hide buttons based on number of images
    if (currentImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    }
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
    
    // Initialize WebSocket connection
    if (typeof io !== 'undefined') {
        initializeSocket();
    } else {
        console.warn('Socket.io not available, using polling fallback');
    }
    
    // Setup lazy loading observer
    setupLazyLoadObserver();
    
    // Load past generations on page load
    loadGenerations();
    
    // Setup event listeners
    setupModalListeners();
    
    // Check for generation parameter in URL
    checkGenerationParameter();
}

function setupLazyLoadObserver() {
    // Create Intersection Observer for lazy loading images
    const options = {
        root: null, // viewport
        rootMargin: '100px', // Load images 100px before they enter viewport
        threshold: 0.01
    };
    
    AppState.lazyLoadObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                
                if (src && !img.src) {
                    // Load the image
                    img.src = src;
                    img.onload = () => {
                        img.classList.add('loaded');
                        img.removeAttribute('data-src');
                        
                        // Remove loading state from parent card
                        const card = img.closest('.image-card');
                        if (card) {
                            card.classList.remove('loading');
                            card.classList.add('fade-in');
                        }
                    };
                    img.onerror = () => {
                        console.error('Failed to load image:', src);
                        const card = img.closest('.image-card');
                        if (card) {
                            card.classList.remove('loading');
                        }
                    };
                    
                    // Stop observing this image
                    observer.unobserve(img);
                }
            }
        });
    }, options);
}

function checkGenerationParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const generationId = urlParams.get('generation');
    // Accept both 'img' and legacy 'index' params
    const imgIndexParam = urlParams.get('img') ?? urlParams.get('index');
    const imgIndex = imgIndexParam != null ? parseInt(imgIndexParam, 10) : null;
    
    if (generationId) {
        // Start trying to scroll to the generation with retry logic
        scrollToGenerationWithRetry(generationId, 0, 20, imgIndex);
    }
}

function scrollToGenerationWithRetry(messageId, attempt = 0, maxAttempts = 20, imgIndex = null) {
    const gallerySection = document.getElementById('gallerySection');
    if (!gallerySection) {
        // If gallery section doesn't exist yet, retry
        if (attempt < maxAttempts) {
            setTimeout(() => {
                scrollToGenerationWithRetry(messageId, attempt + 1, maxAttempts, imgIndex);
            }, 500);
        }
        return;
    }
    
    // Find the generation item that contains this message_id
    const generationItems = gallerySection.querySelectorAll('.generation-item');
    let found = false;
    
    for (const item of generationItems) {
        if (item.dataset.messageId === messageId) {
            found = true;
            let targetElement = item;

            // If a specific image index is provided, try to target that card
            if (imgIndex != null) {
                const cards = item.querySelectorAll('.images-grid .image-card');
                if (cards && cards.length > 0) {
                    const clamped = Math.max(0, Math.min(cards.length - 1, imgIndex));
                    targetElement = cards[clamped];
                }
            }

            // Cross-browser centering in viewport
            if (typeof targetElement.scrollIntoView === 'function') {
                try {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                } catch (_) {
                    // Fallback behavior
                    targetElement.scrollIntoView(true);
                }
            }

            // Re-center shortly after to account for late layout/lazy image load
            setTimeout(() => {
                try { targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (_) {}
            }, 120);

            // If the card contains an img that loads later, center again on load
            const imgEl = targetElement.querySelector('img');
            if (imgEl && !imgEl.complete) {
                const onImgLoad = () => {
                    try { targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (_) {}
                    imgEl.removeEventListener('load', onImgLoad);
                };
                imgEl.addEventListener('load', onImgLoad);
            }

            // Apply temporary highlight to the target element
            targetElement.classList.add('target-highlight');
            setTimeout(() => targetElement.classList.remove('target-highlight'), 1800);
            
            // Clear the URL parameter
            window.history.replaceState({}, document.title, '/');
            break;
        }
    }
    
    // If not found and haven't exceeded max attempts, retry
    if (!found && attempt < maxAttempts) {
        setTimeout(() => {
            scrollToGenerationWithRetry(messageId, attempt + 1, maxAttempts, imgIndex);
        }, 500);
    }
}

function scrollToGeneration(messageId) {
    // Legacy function - now uses retry version
    scrollToGenerationWithRetry(messageId);
}

function setupModalListeners() {
    // Close modal on Escape key, navigate with arrow keys
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('imageModal');
        if (!modal || !modal.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            navigateModal(-1);
        } else if (e.key === 'ArrowRight') {
            navigateModal(1);
        }
    });
}
