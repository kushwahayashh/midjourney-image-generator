// Image Context Menu Manager
class ImageContextMenu {
    constructor() {
        this.menu = null;
        this.currentTarget = null;
        this.currentImageUrl = null;
        this.init();
    }

    init() {
        // Create context menu element
        this.menu = document.createElement('div');
        this.menu.className = 'image-context-menu';
        this.menu.id = 'imageContextMenu';
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

        // Attach context menu to image cards
        this.attachToImageCards();
    }

    attachToImageCards() {
        // Use event delegation on the gallery section
        const gallerySection = document.getElementById('gallerySection');
        if (!gallerySection) return;

        gallerySection.addEventListener('contextmenu', (e) => {
            // Only trigger if right-click is on an image card (but not on the prompt)
            const imageCard = e.target.closest('.image-card');
            const promptSection = e.target.closest('.generation-prompt');
            
            if (imageCard && !promptSection) {
                e.preventDefault();
                e.stopPropagation(); // Prevent generation context menu from showing
                
                // Get the image URL
                const img = imageCard.querySelector('img');
                if (img && img.src) {
                    this.show(e, imageCard, img.src);
                }
            }
        });
    }

    show(event, targetElement, imageUrl) {
        this.currentTarget = targetElement;
        this.currentImageUrl = imageUrl;
        
        // Build menu items
        const menuItems = this.getMenuItems(imageUrl);
        this.menu.innerHTML = '';
        
        menuItems.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.className = 'image-context-menu-divider';
                this.menu.appendChild(divider);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = `image-context-menu-item ${item.className || ''}`;
                
                menuItem.innerHTML = `
                    <i data-lucide="${item.icon}" width="16" height="16"></i>
                    <span>${item.label}</span>
                `;
                
                if (!item.disabled) {
                    menuItem.addEventListener('click', () => {
                        item.action(imageUrl, targetElement);
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
        this.currentImageUrl = null;
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

    getMenuItems(imageUrl) {
        return [
            {
                icon: 'maximize-2',
                label: 'Upscale Image',
                action: (url, element) => this.upscaleImage(url, element)
            },
            {
                icon: 'copy',
                label: 'Create Variation',
                action: (url, element) => this.createVariation(url, element)
            },
            { divider: true },
            {
                icon: 'download',
                label: 'Download Image',
                action: (url) => this.downloadImage(url)
            },
            {
                icon: 'link',
                label: 'Copy Image URL',
                action: (url) => this.copyImageUrl(url)
            }
        ];
    }

    // Action handlers
    async upscaleImage(imageUrl, element) {
        await this.handleButtonAction(imageUrl, element, 'U');
    }

    async createVariation(imageUrl, element) {
        await this.handleButtonAction(imageUrl, element, 'V');
    }

    async handleButtonAction(imageUrl, element, actionType) {
        try {
            // Extract message ID and determine image index
            const info = this.extractImageInfo(imageUrl, element);
            
            if (!info) {
                if (window.toast) {
                    window.toast.error('Cannot process', 'Could not identify image information');
                }
                return;
            }
            
            const { messageId, imageIndex, prompt } = info;
            const button = `${actionType}${imageIndex}`;
            
            // Call the button action handler
            if (window.handleButtonAction) {
                await window.handleButtonAction(messageId, button, imageIndex, prompt);
            } else {
                throw new Error('Button action handler not loaded');
            }
            
        } catch (error) {
            console.error('Error handling button action:', error);
            if (window.toast) {
                window.toast.error('Action failed', error.message);
            }
        }
    }

    extractImageInfo(imageUrl, element) {
        try {
            // Extract message_id from image URL
            // URL format: /output/20251011_124505_74ea11dc-85e1-49d9-b491-dfef149dfd35/image_1.png
            const match = imageUrl.match(/\/output\/\d+_\d+_([a-f0-9-]+)\/image_(\d+)\./);
            
            if (!match) {
                console.error('Could not parse image URL:', imageUrl);
                return null;
            }
            
            const messageId = match[1];
            const fileImageIndex = parseInt(match[2]); // This is the index from filename (1-4)
            
            // Map from file index to API button index
            // API provider returns images in VERTICAL order (column-first): [1, 3, 2, 4]
            // Which represents this 2x2 grid layout:
            //   1 2
            //   3 4
            // So: image_1.png=U1, image_2.png=U3, image_3.png=U2, image_4.png=U4
            const indexMap = {
                1: 1,  // image_1.png -> Button U1 (top-left)
                2: 3,  // image_2.png -> Button U3 (bottom-left) 
                3: 2,  // image_3.png -> Button U2 (top-right)
                4: 4   // image_4.png -> Button U4 (bottom-right)
            };
            
            const imageIndex = indexMap[fileImageIndex] || fileImageIndex;
            
            // Get the generation item to extract prompt
            const generationItem = element.closest('.generation-item');
            if (!generationItem) {
                console.error('Could not find generation item');
                return null;
            }
            
            const promptElement = generationItem.querySelector('.generation-prompt');
            const prompt = promptElement ? promptElement.textContent.trim() : '';
            
            return {
                messageId,
                imageIndex,
                prompt
            };
            
        } catch (error) {
            console.error('Error extracting image info:', error);
            return null;
        }
    }

    downloadImage(imageUrl) {
        if (window.toast) {
            window.toast.info('Downloading...', 'Image download started');
        }
        
        const link = document.createElement('a');
        link.href = imageUrl;
        
        // Extract filename from URL
        const urlParts = imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1] || 'image.png';
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            if (window.toast) {
                window.toast.success('Downloaded!', 'Image saved to your downloads folder');
            }
        }, 500);
    }

    copyImageUrl(imageUrl) {
        // Convert relative URL to absolute if needed
        const absoluteUrl = new URL(imageUrl, window.location.origin).href;
        
        navigator.clipboard.writeText(absoluteUrl).then(() => {
            if (window.toast) {
                window.toast.success('URL copied!', 'Image URL copied to clipboard');
            }
        }).catch(err => {
            if (window.toast) {
                window.toast.error('Failed to copy', 'Could not access clipboard');
            }
        });
    }
}

// Initialize image context menu when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.imageContextMenuManager = new ImageContextMenu();
});
