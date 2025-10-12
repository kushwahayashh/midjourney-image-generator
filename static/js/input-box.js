// Input Box Functionality

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

// Initialize input box listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupTextareaListeners();
});
