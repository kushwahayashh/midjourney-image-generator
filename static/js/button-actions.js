// Button Actions - Upscale & Variation Handler with WebSocket support

async function handleButtonAction(messageId, button, imageIndex, originalPrompt) {
    /**
     * Handle upscale or variation button action
     * @param {string} messageId - Original message ID
     * @param {string} button - Button name (U1-U4 or V1-V4)
     * @param {number} imageIndex - Image index (1-4)
     * @param {string} originalPrompt - Original prompt text
     */
    
    // Generate unique skeleton ID for this action
    const skeletonId = `button-skeleton-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        // Determine action type
        const isUpscale = button.startsWith('U');
        const actionType = isUpscale ? 'Upscale' : 'Variation';
        const actionVerb = isUpscale ? 'Upscaling' : 'Creating variation of';
        
        // Upscale returns 1 image, Variation returns 4 images
        const imageCount = isUpscale ? 1 : 4;
        
        // Show initial toast
        if (window.toast) {
            window.toast.info(`${actionType} started`, `${actionVerb} image ${imageIndex}...`);
        }
        
        // Show skeleton with appropriate count
        const displayPrompt = `${actionType} (${button}) of: ${originalPrompt}`;
        if (typeof showSkeletonInGallery === 'function') {
            showSkeletonInGallery(displayPrompt, imageCount, skeletonId);
        }
        
        // Use WebSocket if connected, otherwise fall back to REST API
        if (typeof AppState !== 'undefined' && AppState.socket && AppState.socket.connected) {
            // Emit button action via WebSocket
            AppState.socket.emit('button_action', {
                messageId: messageId,
                button: button,
                originalPrompt: originalPrompt,
                skeletonId: skeletonId
            });
        } else {
            // Fallback to REST API + polling
            const response = await fetch('/button', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messageId: messageId,
                    button: button,
                    prompt: originalPrompt
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to process button action');
            }
            
            const newMessageId = data.message_id;
            const newPrompt = data.prompt;
            
            // Track this generation in app state
            if (typeof AppState !== 'undefined') {
                AppState.activeGenerations.set(newMessageId, {
                    prompt: newPrompt,
                    skeletonId: skeletonId
                });
            }
            
            // Start polling for the new generation (fallback mode)
            if (typeof pollStatus === 'function') {
                pollStatus(newMessageId);
            }
            
            if (window.toast) {
                window.toast.success('Request sent', `${actionType} in progress`);
            }
        }
        
    } catch (error) {
        console.error('Button action error:', error);
        
        if (window.toast) {
            window.toast.error('Action failed', error.message);
        }
        
        // Remove skeleton on error
        if (typeof removeSkeletonFromGallery === 'function') {
            removeSkeletonFromGallery(skeletonId);
        }
    }
}

// Helper function to get metadata for a generation
async function getGenerationMetadata(messageId) {
    /**
     * Fetch metadata for a generation to get buttons array
     * This is called when we need to know which buttons are available
     */
    try {
        const response = await fetch('/api/generations');
        const data = await response.json();
        
        if (data.generations) {
            const generation = data.generations.find(g => g.message_id === messageId);
            return generation || null;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return null;
    }
}

// Export functions for use in other modules
window.handleButtonAction = handleButtonAction;
window.getGenerationMetadata = getGenerationMetadata;
