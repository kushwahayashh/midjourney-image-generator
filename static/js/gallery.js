// Gallery Page JavaScript with Lazy Loading

// Gallery state
const GalleryState = {
    images: [],
    loadedCount: 0,
    observer: null,
    columns: 5, // Default number of columns
    minColumns: 2,
    maxColumns: 8
};

// Gallery Context Menu Manager
class GalleryContextMenu {
    constructor() {
        this.menu = null;
        this.currentTarget = null;
        this.currentImageData = null;
        this.init();
    }

    init() {
        // Create context menu element
        this.menu = document.createElement('div');
        this.menu.className = 'context-menu';
        this.menu.id = 'galleryContextMenu';
        document.body.appendChild(this.menu);

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target)) {
                this.hide();
            }
        });

        // Close menu on scroll
        document.addEventListener('scroll', () => {
            this.hide();
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });

        // Attach context menu to gallery items
        this.attachToGalleryItems();
    }

    attachToGalleryItems() {
        // Use event delegation on the gallery grid
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        galleryGrid.addEventListener('contextmenu', (e) => {
            // Only trigger if right-click is on a gallery item
            const galleryItem = e.target.closest('.gallery-item');
            
            if (galleryItem) {
                e.preventDefault();
                
                // Get the image data from dataset
                const imageData = {
                    url: galleryItem.dataset.src,
                    message_id: galleryItem.dataset.messageId,
                    timestamp: galleryItem.dataset.timestamp
                };
                
                this.show(e, galleryItem, imageData);
            }
        });
    }

    show(event, targetElement, imageData) {
        // If menu is already active, hide it first and wait for animation
        if (this.menu.classList.contains('active')) {
            this.hide();
            // Wait for hide animation to complete before showing new menu
            setTimeout(() => {
                this.showMenu(event, targetElement, imageData);
            }, 150); // Match the CSS transition duration
        } else {
            this.showMenu(event, targetElement, imageData);
        }
    }

    showMenu(event, targetElement, imageData) {
        this.currentTarget = targetElement;
        this.currentImageData = imageData;
        
        // Build menu items
        const menuItems = this.getMenuItems(imageData);
        this.menu.innerHTML = '';
        
        menuItems.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.className = 'context-menu-divider';
                this.menu.appendChild(divider);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = `context-menu-item ${item.className || ''}`;
                
                menuItem.innerHTML = `
                    <i data-lucide="${item.icon}" width="16" height="16"></i>
                    <span>${item.label}</span>
                `;
                
                if (!item.disabled) {
                    menuItem.addEventListener('click', () => {
                        item.action(imageData);
                        this.hide();
                    });
                }
                
                this.menu.appendChild(menuItem);
            }
        });

        // Initialize Lucide icons in the menu
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Position the menu
        this.position(event.clientX, event.clientY);
        
        // Show menu
        this.menu.classList.add('active');
    }

    hide() {
        this.menu.classList.remove('active');
        this.currentTarget = null;
        this.currentImageData = null;
    }

    position(x, y) {
        // Show menu off-screen first to measure it
        this.menu.style.left = '-9999px';
        this.menu.style.top = '-9999px';
        this.menu.classList.add('active');

        const menuWidth = this.menu.offsetWidth;
        const menuHeight = this.menu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Calculate position (prevent overflow)
        let left = x;
        let top = y;

        if (x + menuWidth > windowWidth) {
            left = windowWidth - menuWidth - 10;
        }

        if (y + menuHeight > windowHeight) {
            top = windowHeight - menuHeight - 10;
        }

        this.menu.style.left = `${left}px`;
        this.menu.style.top = `${top}px`;
    }

    getMenuItems(imageData) {
        return [
            {
                icon: 'download',
                label: 'Download Image',
                action: (data) => this.downloadImage(data)
            },
            {
                icon: 'link',
                label: 'Copy URL',
                action: (data) => this.copyUrl(data)
            },
            {
                divider: true
            },
            {
                icon: 'external-link',
                label: 'Open in App',
                action: (data) => this.openInApp(data)
            }
        ];
    }

    async downloadImage(imageData) {
        if (!imageData.url) {
            console.error('No URL found for image');
            return;
        }
        
        try {
            // Fetch the image as a blob
            const response = await fetch(imageData.url);
            const blob = await response.blob();
            
            // Create a temporary URL for the blob
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Create a temporary anchor element and trigger download
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `image-${imageData.timestamp || Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(blobUrl);
            
            // Show success toast if available
            if (window.toast) {
                window.toast.success('Download started');
            }
        } catch (error) {
            console.error('Failed to download image:', error);
            if (window.toast) {
                window.toast.error('Download failed', error.message);
            }
        }
    }

    async copyUrl(imageData) {
        if (!imageData.url) {
            console.error('No URL found for image');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(imageData.url);
            
            // Show success toast if available
            if (window.toast) {
                window.toast.success('URL copied to clipboard');
            }
        } catch (error) {
            console.error('Failed to copy URL:', error);
            if (window.toast) {
                window.toast.error('Copy failed', 'Unable to copy URL to clipboard');
            }
        }
    }

    openInApp(imageData) {
        if (!imageData.message_id) {
            console.error('No message_id found for image');
            return;
        }
        
        // Navigate to home page with generation parameter
        window.location.href = `/?generation=${imageData.message_id}`;
    }
}

// Initialize gallery on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeGallery();
    // Initialize gallery context menu
    window.galleryContextMenuManager = new GalleryContextMenu();
    // Initialize grid controls
    initializeGridControls();
});

async function initializeGallery() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Setup Intersection Observer for lazy loading
    setupLazyLoading();
    
    // Load gallery images
    await loadGalleryImages();
}

function setupLazyLoading() {
    // Create Intersection Observer for lazy loading images
    const options = {
        root: null, // viewport
        rootMargin: '50px', // Load images 50px before they enter viewport
        threshold: 0.01
    };
    
    GalleryState.observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const item = entry.target;
                const img = item.querySelector('img');
                const src = item.dataset.src;
                
                if (src && img && !img.src) {
                    // Load the image
                    img.src = src;
                    img.onload = () => {
                        img.classList.add('loaded', 'fade-in');
                        item.classList.remove('loading');
                        GalleryState.loadedCount++;
                    };
                    img.onerror = () => {
                        console.error('Failed to load image:', src);
                        item.classList.remove('loading');
                    };
                    
                    // Stop observing this item
                    observer.unobserve(item);
                }
            }
        });
    }, options);
}

async function loadGalleryImages() {
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryEmpty = document.getElementById('galleryEmpty');
    
    if (!galleryGrid || !galleryEmpty) return;
    
    try {
        const response = await fetch('/api/gallery/images');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        GalleryState.images = data.images || [];
        
        if (GalleryState.images.length === 0) {
            galleryEmpty.style.display = 'block';
            galleryGrid.style.display = 'none';
            return;
        }
        
        // Hide empty state and show grid
        galleryEmpty.style.display = 'none';
        galleryGrid.style.display = 'grid';
        
        // Create gallery items
        GalleryState.images.forEach((imageData, index) => {
            const item = createGalleryItem(imageData, index);
            galleryGrid.appendChild(item);
            
            // Observe this item for lazy loading
            if (GalleryState.observer) {
                GalleryState.observer.observe(item);
            }
        });
        
    } catch (error) {
        console.error('Error loading gallery images:', error);
        galleryEmpty.textContent = 'Failed to load gallery. Please refresh the page.';
        galleryEmpty.style.display = 'block';
        galleryGrid.style.display = 'none';
    }
}

function createGalleryItem(imageData, index) {
    const item = document.createElement('div');
    item.className = 'gallery-item loading';
    item.dataset.src = imageData.url;
    item.dataset.index = index;
    item.dataset.messageId = imageData.message_id;
    item.dataset.timestamp = imageData.timestamp;
    
    // Create img element (will be loaded lazily)
    const img = document.createElement('img');
    img.alt = `Gallery image ${index + 1}`;
    img.loading = 'lazy'; // Native lazy loading as fallback
    
    item.appendChild(img);
    
    return item;
}

// Cleanup observer when page is unloaded
window.addEventListener('beforeunload', () => {
    if (GalleryState.observer) {
        GalleryState.observer.disconnect();
    }
});

// Grid control functions
function initializeGridControls() {
    const increaseBtn = document.getElementById('increaseColumns');
    const decreaseBtn = document.getElementById('decreaseColumns');
    const galleryGrid = document.getElementById('galleryGrid');
    
    if (!increaseBtn || !decreaseBtn || !galleryGrid) return;
    
    // Load saved column preference from localStorage
    const savedColumns = localStorage.getItem('galleryColumns');
    if (savedColumns) {
        GalleryState.columns = parseInt(savedColumns, 10);
    }
    
    // Apply initial column setting
    updateGridColumns();
    
    // Add event listeners
    // + button zooms in (fewer columns, larger images)
    increaseBtn.addEventListener('click', () => {
        if (GalleryState.columns > GalleryState.minColumns) {
            GalleryState.columns--;
            updateGridColumns();
            saveColumnPreference();
        }
    });
    
    // - button zooms out (more columns, smaller images)
    decreaseBtn.addEventListener('click', () => {
        if (GalleryState.columns < GalleryState.maxColumns) {
            GalleryState.columns++;
            updateGridColumns();
            saveColumnPreference();
        }
    });
}

function updateGridColumns() {
    const galleryGrid = document.getElementById('galleryGrid');
    const increaseBtn = document.getElementById('increaseColumns');
    const decreaseBtn = document.getElementById('decreaseColumns');
    
    if (!galleryGrid) return;
    
    // Update grid columns
    galleryGrid.setAttribute('data-columns', GalleryState.columns);
    
    // Update button states
    // + button disabled when at minimum columns (max zoom)
    if (increaseBtn) {
        increaseBtn.disabled = GalleryState.columns <= GalleryState.minColumns;
    }
    // - button disabled when at maximum columns (min zoom)
    if (decreaseBtn) {
        decreaseBtn.disabled = GalleryState.columns >= GalleryState.maxColumns;
    }
}

function saveColumnPreference() {
    localStorage.setItem('galleryColumns', GalleryState.columns.toString());
}
