// Context Menu Manager
class ContextMenu {
    constructor() {
        this.menu = null;
        this.currentTarget = null;
        this.init();
    }

    init() {
        // Create context menu element
        this.menu = document.createElement('div');
        this.menu.className = 'context-menu';
        this.menu.id = 'contextMenu';
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

        // Attach context menu to generation items
        this.attachToGenerationItems();
    }

    attachToGenerationItems() {
        // Use event delegation on the gallery section
        const gallerySection = document.getElementById('gallerySection');
        if (!gallerySection) return;

        gallerySection.addEventListener('contextmenu', (e) => {
            // Only trigger if right-click is on the prompt section
            const promptSection = e.target.closest('.generation-prompt');
            if (promptSection) {
                const generationItem = promptSection.closest('.generation-item');
                if (generationItem) {
                    e.preventDefault();
                    this.show(e, generationItem);
                }
            }
        });
    }

    show(event, targetElement) {
        this.currentTarget = targetElement;
        
        // Build menu items
        const menuItems = this.getMenuItems(targetElement);
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
                        item.action(targetElement);
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

    getMenuItems(targetElement) {
        // Extract metadata from the generation item
        const prompt = targetElement.querySelector('.generation-prompt')?.textContent || '';
        const timestamp = targetElement.querySelector('.generation-timestamp')?.textContent || '';
        const images = targetElement.querySelectorAll('.image-card img');
        const hasImages = images.length > 0;

        return [
            {
                icon: 'copy',
                label: 'Copy Prompt',
                action: (el) => this.copyPrompt(el)
            },
            {
                icon: 'edit-3',
                label: 'Edit Prompt',
                action: (el) => this.editPrompt(el)
            },
            {
                icon: 'repeat',
                label: 'Regenerate',
                action: (el) => this.regenerate(el)
            },
            { divider: true },
            {
                icon: 'download',
                label: 'Download All Images',
                action: (el) => this.downloadAll(el),
                disabled: !hasImages,
                className: !hasImages ? 'disabled' : ''
            },
            {
                icon: 'share-2',
                label: 'Share Generation',
                action: (el) => this.share(el),
                disabled: !hasImages,
                className: !hasImages ? 'disabled' : ''
            },
            { divider: true },
            {
                icon: 'star',
                label: 'Add to Favorites',
                action: (el) => this.addToFavorites(el)
            },
            {
                icon: 'folder-plus',
                label: 'Add to Collection',
                action: (el) => this.addToCollection(el)
            },
            { divider: true },
            {
                icon: 'trash-2',
                label: 'Delete Generation',
                action: (el) => this.deleteGeneration(el),
                className: 'danger'
            }
        ];
    }

    // Action handlers (mock implementations)
    copyPrompt(element) {
        const promptText = element.querySelector('.generation-prompt')?.textContent || '';
        navigator.clipboard.writeText(promptText).then(() => {
            showError('Prompt copied to clipboard!');
            setTimeout(() => {
                const errorDiv = document.getElementById('errorMessage');
                if (errorDiv) errorDiv.classList.remove('active');
            }, 2000);
        }).catch(err => {
            showError('Failed to copy prompt');
        });
    }

    editPrompt(element) {
        const promptText = element.querySelector('.generation-prompt')?.textContent || '';
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.value = promptText;
            promptInput.focus();
            
            // Expand input section
            const inputSection = document.querySelector('.input-section');
            if (inputSection) {
                inputSection.classList.add('expanded');
            }
            
            // Auto-resize textarea
            promptInput.style.height = 'auto';
            promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
        }
    }

    regenerate(element) {
        const promptText = element.querySelector('.generation-prompt')?.textContent || '';
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.value = promptText;
            // Trigger generation
            if (typeof generateImage === 'function') {
                generateImage();
            }
        }
    }

    downloadAll(element) {
        const images = element.querySelectorAll('.image-card img');
        if (images.length === 0) return;

        showError(`Downloading ${images.length} images...`);
        
        images.forEach((img, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = img.src;
                link.download = `image_${index + 1}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 200); // Stagger downloads
        });
    }

    share(element) {
        const promptText = element.querySelector('.generation-prompt')?.textContent || '';
        const shareText = `Check out this AI-generated image!\n\nPrompt: ${promptText}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'AI Generated Image',
                text: shareText
            }).catch(err => console.log('Share cancelled'));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                showError('Share text copied to clipboard!');
            });
        }
    }

    addToFavorites(element) {
        showError('Added to favorites! (Feature coming soon)');
        // TODO: Implement favorites functionality
    }

    addToCollection(element) {
        showError('Add to collection feature coming soon!');
        // TODO: Implement collections functionality
    }

    async deleteGeneration(element) {
        if (!confirm('Are you sure you want to delete this generation? This action cannot be undone.')) {
            return;
        }

        // Extract message_id from the generation element
        const timestamp = element.querySelector('.generation-timestamp')?.textContent || '';
        const images = element.querySelectorAll('.image-card img');
        
        // Try to extract message_id from image URLs
        let messageId = null;
        if (images.length > 0) {
            const imgSrc = images[0].src;
            // URL format: /output/20251011_124505_74ea11dc-85e1-49d9-b491-dfef149dfd35/image_1.png
            const match = imgSrc.match(/\/output\/\d+_\d+_([a-f0-9-]+)\//);
            if (match) {
                messageId = match[1];
            }
        }

        if (!messageId) {
            showError('Could not identify generation to delete');
            return;
        }

        try {
            // Animate removal
            element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            element.style.opacity = '0';
            element.style.transform = 'scale(0.95)';

            // Call backend API to delete
            const response = await fetch(`/api/generations/${messageId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                setTimeout(() => {
                    element.remove();
                    showError('Generation deleted successfully!');
                    setTimeout(() => {
                        const errorDiv = document.getElementById('errorMessage');
                        if (errorDiv) errorDiv.classList.remove('active');
                    }, 2000);
                }, 300);
            } else {
                // Restore element if deletion failed
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
                showError(data.error || 'Failed to delete generation');
            }
        } catch (error) {
            // Restore element on error
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
            showError('Error deleting generation: ' + error.message);
        }
    }
}

// Initialize context menu when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.contextMenuManager = new ContextMenu();
});

// Re-attach context menu when gallery is updated
const originalLoadGenerations = window.loadGenerations;
if (originalLoadGenerations) {
    window.loadGenerations = function() {
        originalLoadGenerations.apply(this, arguments);
        // Context menu uses event delegation, so no need to re-attach
    };
}
