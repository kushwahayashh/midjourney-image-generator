// Toast Notification System
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create toast container
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.id = 'toastContainer';
        document.body.appendChild(this.container);
    }

    show(message, options = {}) {
        const {
            type = 'info', // success, error, info, warning
            description = '',
            duration = 3000,
            closable = true
        } = options;

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Get icon based on type
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <i data-lucide="${icon}" class="toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                ${description ? `<div class="toast-description">${description}</div>` : ''}
            </div>
            ${closable ? `
                <button class="toast-close" aria-label="Close">
                    <i data-lucide="x" width="16" height="16"></i>
                </button>
            ` : ''}
            ${duration > 0 ? `
                <div class="toast-progress">
                    <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
                </div>
            ` : ''}
        `;

        // Initialize Lucide icons
        this.container.appendChild(toast);
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Add close button listener
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                this.hide(toast);
            });
        }

        // Show toast with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }

        this.toasts.push(toast);
        return toast;
    }

    hide(toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info',
            warning: 'alert-triangle'
        };
        return icons[type] || 'info';
    }

    // Convenience methods
    success(message, description = '', duration = 3000) {
        return this.show(message, { type: 'success', description, duration });
    }

    error(message, description = '', duration = 4000) {
        return this.show(message, { type: 'error', description, duration });
    }

    info(message, description = '', duration = 3000) {
        return this.show(message, { type: 'info', description, duration });
    }

    warning(message, description = '', duration = 3000) {
        return this.show(message, { type: 'warning', description, duration });
    }

    clearAll() {
        this.toasts.forEach(toast => this.hide(toast));
    }
}

// Initialize toast manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.toast = new ToastManager();
});

// Global helper function for backward compatibility
function showToast(message, type = 'info', duration = 3000) {
    if (window.toast) {
        window.toast.show(message, { type, duration });
    }
}
