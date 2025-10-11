let currentMessageId = null;
let currentPrompt = '';
let pollInterval = null;

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');
    setTimeout(() => {
        errorDiv.classList.remove('active');
    }, 5000);
}

async function loadGenerations() {
    try {
        const response = await fetch('/api/generations');
        const data = await response.json();
        
        const gallerySection = document.getElementById('gallerySection');
        gallerySection.innerHTML = '';
        
        if (!data.generations || data.generations.length === 0) {
            gallerySection.innerHTML = '<div class="gallery-empty">No generations yet. Create your first image!</div>';
            return;
        }
        
        data.generations.forEach(gen => {
            const genItem = document.createElement('div');
            genItem.className = 'generation-item';
            
            // Format timestamp
            const timestamp = new Date(gen.timestamp.replace(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
            const timeStr = timestamp.toLocaleString();
            
            // Create prompt section
            const promptDiv = document.createElement('div');
            promptDiv.className = 'generation-prompt';
            promptDiv.textContent = gen.prompt;
            
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'generation-timestamp';
            timestampDiv.textContent = timeStr;
            
            // Create images grid
            const imagesGrid = document.createElement('div');
            imagesGrid.className = 'images-grid';
            
            gen.images.forEach((imageUrl, index) => {
                const card = document.createElement('div');
                card.className = 'image-card';
                card.onclick = () => openModal(imageUrl);
                
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = `Generated image ${index + 1}`;
                
                card.appendChild(img);
                imagesGrid.appendChild(card);
            });
            
            genItem.appendChild(timestampDiv);
            genItem.appendChild(promptDiv);
            genItem.appendChild(imagesGrid);
            gallerySection.appendChild(genItem);
        });
    } catch (error) {
        console.error('Error loading generations:', error);
    }
}

function hideStatus() {
    document.getElementById('statusSection').classList.remove('active');
}

function showStatus() {
    document.getElementById('statusSection').classList.add('active');
    document.getElementById('spinner').style.display = 'block';
}

function hideImages() {
    document.getElementById('imagesSection').classList.remove('active');
}

function showImages() {
    document.getElementById('imagesSection').classList.add('active');
}

async function generateImage() {
    const prompt = document.getElementById('promptInput').value.trim();
    
    if (!prompt) {
        showError('Please enter a prompt!');
        return;
    }

    // Disable button and show status
    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" width="20" height="20" class="spin-icon"></i>';
    lucide.createIcons();
    
    hideImages();
    showStatus();
    document.getElementById('statusText').textContent = 'Submitting request...';
    document.getElementById('progressText').textContent = '';
    
    // Clear textarea after submission
    document.getElementById('promptInput').value = '';
    document.getElementById('promptInput').style.height = 'auto';

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

        currentMessageId = data.message_id;
        currentPrompt = data.prompt;
        document.getElementById('statusText').textContent = 'Processing...';
        
        // Start polling for status
        pollStatus();

    } catch (error) {
        showError(error.message);
        hideStatus();
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" width="20" height="20"></i>';
        lucide.createIcons();
    }
}

async function pollStatus() {
    if (!currentMessageId) return;

    try {
        const response = await fetch(`/status/${currentMessageId}?prompt=${encodeURIComponent(currentPrompt)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch status');
        }

        // Update status display
        document.getElementById('statusText').textContent = `Status: ${data.status}`;
        document.getElementById('progressText').textContent = `Progress: ${data.progress}`;

        // Check if done
        if (data.status === 'DONE') {
            document.getElementById('spinner').style.display = 'none';
            hideStatus();
            displayImages(data.images, data.raw_data);
            
            // Reload gallery to show new generation
            loadGenerations();
            
            // Re-enable button
            const btn = document.getElementById('generateBtn');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" width="20" height="20"></i>';
            lucide.createIcons();
            
            currentMessageId = null;
        } else if (data.status === 'FAILED' || data.status === 'ERROR') {
            showError(`Generation failed: ${data.progress}`);
            hideStatus();
            
            // Re-enable button
            const btn = document.getElementById('generateBtn');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" width="20" height="20"></i>';
            lucide.createIcons();
            
            currentMessageId = null;
        } else {
            // Continue polling
            setTimeout(pollStatus, 3000);
        }

    } catch (error) {
        showError(error.message);
        hideStatus();
        
        // Re-enable button
        const btn = document.getElementById('generateBtn');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" width="20" height="20"></i>';
        lucide.createIcons();
        
        currentMessageId = null;
    }
}

function displayImages(images, rawData) {
    const grid = document.getElementById('imagesGrid');
    grid.innerHTML = '';

    // If no images in the expected format, try to extract from raw data
    if (!images || images.length === 0) {
        console.log('Raw data:', rawData);
        
        // Try to find image URLs in various possible locations
        const possibleUrls = [];
        
        if (rawData.data) {
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
        
        if (rawData.images) {
            possibleUrls.push(...rawData.images);
        }
        if (rawData.url) {
            possibleUrls.push(rawData.url);
        }
        if (rawData.imageUrl) {
            possibleUrls.push(rawData.imageUrl);
        }

        images = possibleUrls;
    }

    if (!images || images.length === 0) {
        grid.innerHTML = '<p style="color: #666;">No images found in response. Check console for raw data.</p>';
        showImages();
        return;
    }

    images.forEach((imageUrl, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.onclick = () => openModal(imageUrl);
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Generated image ${index + 1}`;
        
        card.appendChild(img);
        grid.appendChild(card);
    });

    showImages();
}

// Modal functions
function openModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    modal.classList.add('active');
    modalImg.src = imageUrl;
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Load past generations on page load
    loadGenerations();
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Auto-expand textarea
    const textarea = document.getElementById('promptInput');
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
});
