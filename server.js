const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuration
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.IMAGINEPRO_API_KEY || '';
const BASE_URL = 'https://api.imaginepro.ai/api/v1';
const OUTPUT_DIR = 'output';
const MAX_PROMPT_LENGTH = 1000;
const POLL_INTERVAL = 2000; // 2 seconds for server-side polling

// Track active jobs globally
const activeJobs = new Map(); // messageId -> { messageId, prompt, skeletonId, progress, status, timestamp }

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static('static'));
app.use('/output', express.static(OUTPUT_DIR));

// API Headers helper
function getHeaders(jsonBody = false) {
    const headers = { 'Authorization': `Bearer ${API_KEY}` };
    if (jsonBody) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

// List all generations metadata
function listGenerationsMetadata() {
    const generations = [];
    if (!fs.existsSync(OUTPUT_DIR)) {
        return generations;
    }
    
    const folders = fs.readdirSync(OUTPUT_DIR)
        .filter(name => {
            const folderPath = path.join(OUTPUT_DIR, name);
            return fs.statSync(folderPath).isDirectory();
        })
        .sort()
        .reverse();
    
    for (const folderName of folders) {
        const metadataPath = path.join(OUTPUT_DIR, folderName, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                generations.push(data);
            } catch (e) {
                console.error(`Error reading metadata from ${folderName}:`, e);
            }
        }
    }
    
    return generations;
}

// Download and save images
async function saveImages(messageId, imageUrls, prompt, rawData) {
    try {
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
        const taskFolder = path.join(OUTPUT_DIR, `${timestamp}_${messageId}`);
        
        if (!fs.existsSync(taskFolder)) {
            fs.mkdirSync(taskFolder, { recursive: true });
        }
        
        const localImagePaths = [];
        
        for (let idx = 0; idx < imageUrls.length; idx++) {
            try {
                const response = await axios.get(imageUrls[idx], { responseType: 'arraybuffer', timeout: 30000 });
                
                // Determine file extension
                const urlFilename = imageUrls[idx].split('/').pop().split('?')[0];
                const ext = path.extname(urlFilename) || '.png';
                
                const filename = `image_${idx + 1}${ext}`;
                const filepath = path.join(taskFolder, filename);
                
                fs.writeFileSync(filepath, response.data);
                localImagePaths.push(`/output/${timestamp}_${messageId}/${filename}`);
            } catch (e) {
                console.error(`Error downloading image ${idx + 1}:`, e.message);
            }
        }
        
        // Save metadata
        const metadata = {
            message_id: messageId,
            timestamp: timestamp,
            prompt: prompt,
            image_count: localImagePaths.length,
            images: localImagePaths,
            original_urls: imageUrls,
            buttons: rawData.buttons || [],
            raw_response: rawData
        };
        
        fs.writeFileSync(path.join(taskFolder, 'metadata.json'), JSON.stringify(metadata, null, 2));
        
        return localImagePaths;
    } catch (e) {
        console.error('Error saving images:', e);
        return [];
    }
}

// Get status from API
async function getStatus(messageId) {
    const url = `${BASE_URL}/message/fetch/${messageId}`;
    const response = await axios.get(url, { headers: getHeaders(), timeout: 30000 });
    return response.data;
}

// Extract images from response data
function extractImages(data) {
    // Try different possible response structures
    if (data.images && data.images.length > 0) return data.images;
    if (data.data?.images && data.data.images.length > 0) return data.data.images;
    if (data.uri) return [data.uri];
    if (data.data?.uri) return [data.data.uri];
    if (data.url) return [data.url];
    if (data.data?.url) return [data.data.url];
    return [];
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gallery.html'));
});

app.get('/api/generations', (req, res) => {
    try {
        const generations = listGenerationsMetadata();
        res.json({ generations });
    } catch (e) {
        console.error('Error getting generations:', e);
        res.status(500).json({ generations: [], error: e.message });
    }
});

app.get('/api/gallery/images', (req, res) => {
    try {
        const images = [];
        for (const metadata of listGenerationsMetadata()) {
            for (const imgUrl of metadata.images || []) {
                images.push({
                    url: imgUrl,
                    timestamp: metadata.timestamp || '',
                    prompt: metadata.prompt || '',
                    message_id: metadata.message_id || ''
                });
            }
        }
        res.json({ images });
    } catch (e) {
        console.error('Error getting gallery images:', e);
        res.status(500).json({ images: [], error: e.message });
    }
});

app.post('/generate', async (req, res) => {
    try {
        const prompt = (req.body.prompt || '').trim();
        
        if (!prompt) {
            return res.status(400).json({ error: 'No prompt provided' });
        }
        
        if (prompt.length > MAX_PROMPT_LENGTH) {
            return res.status(400).json({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` });
        }
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured. Please set IMAGINEPRO_API_KEY environment variable.' });
        }
        
        const url = `${BASE_URL}/nova/imagine`;
        const response = await axios.post(url, { prompt, timeout: 900 }, { 
            headers: getHeaders(true), 
            timeout: 30000 
        });
        
        const messageId = response.data.messageId || response.data.id || response.data.data?.messageId;
        
        if (!messageId) {
            return res.status(500).json({ error: 'Failed to get message ID from API' });
        }
        
        res.json({ message_id: messageId, prompt });
    } catch (e) {
        console.error('Error in generate endpoint:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/button', async (req, res) => {
    try {
        const messageId = (req.body.messageId || '').trim();
        const button = (req.body.button || '').trim();
        const originalPrompt = req.body.prompt || '';
        
        if (!messageId || !button) {
            return res.status(400).json({ error: 'Missing messageId or button' });
        }
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        const url = `${BASE_URL}/nova/button`;
        const response = await axios.post(url, { messageId, button }, {
            headers: getHeaders(true),
            timeout: 30000
        });
        
        const newMessageId = response.data.messageId || response.data.id || response.data.data?.messageId;
        
        if (!newMessageId) {
            return res.status(500).json({ error: 'Failed to get new message ID from API response' });
        }
        
        const actionType = button.startsWith('U') ? 'Upscale' : 'Variation';
        const newPrompt = `${actionType} (${button}) of: ${originalPrompt}`;
        
        res.json({
            message_id: newMessageId,
            prompt: newPrompt,
            button,
            original_message_id: messageId
        });
    } catch (e) {
        console.error('Error in button endpoint:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/generations/:messageId', (req, res) => {
    try {
        const { messageId } = req.params;
        
        if (!messageId) {
            return res.status(400).json({ error: 'No message ID provided' });
        }
        
        // Validate UUID format
        const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        if (!uuidPattern.test(messageId)) {
            return res.status(400).json({ error: 'Invalid message ID format' });
        }
        
        let deleted = false;
        if (fs.existsSync(OUTPUT_DIR)) {
            const folders = fs.readdirSync(OUTPUT_DIR);
            for (const folderName of folders) {
                if (folderName.endsWith(`_${messageId}`)) {
                    const folderPath = path.join(OUTPUT_DIR, folderName);
                    if (fs.statSync(folderPath).isDirectory()) {
                        fs.rmSync(folderPath, { recursive: true, force: true });
                        deleted = true;
                        console.log(`Deleted generation folder: ${folderName}`);
                        break;
                    }
                }
            }
        }
        
        if (deleted) {
            res.json({ success: true, message: 'Generation deleted successfully' });
        } else {
            res.status(404).json({ error: 'Generation not found' });
        }
    } catch (e) {
        console.error('Error deleting generation:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/credits', async (req, res) => {
    try {
        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured', creditsExtra: 0 });
        }
        
        const url = 'https://api.imaginepro.ai/api/v1/subscription/account-info';
        const response = await axios.get(url, { headers: getHeaders(true), timeout: 10000 });
        
        res.json({
            success: true,
            creditsExtra: response.data.creditsExtra || 0,
            credits: response.data.credits || 0,
            creditsQuota: response.data.creditsQuota || 0,
            type: response.data.type || 'UNKNOWN',
            email: response.data.email || '',
            expiredAt: response.data.expiredAt || ''
        });
    } catch (e) {
        console.error('Error fetching credits:', e.message);
        res.status(500).json({ success: false, error: e.message, creditsExtra: 0 });
    }
});

// Legacy status endpoint (for backward compatibility, but WebSocket is preferred)
app.get('/status/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const prompt = req.query.prompt || '';
        
        if (!messageId) {
            return res.status(400).json({ error: 'No message ID provided' });
        }
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        const data = await getStatus(messageId);
        
        const statusVal = (data.status || data.data?.status || '').toUpperCase();
        let progress = data.progress;
        if (progress === undefined || progress === null) {
            progress = data.data?.progress;
        }
        if (progress === undefined || progress === null) {
            progress = '...';
        }
        
        let images = [];
        let localImages = [];
        
        if (statusVal === 'DONE') {
            images = extractImages(data);
            if (images.length > 0) {
                localImages = await saveImages(messageId, images, prompt, data);
            }
        }
        
        res.json({
            status: statusVal,
            progress,
            images: localImages.length > 0 ? localImages : images,
            raw_data: data
        });
    } catch (e) {
        console.error('Error in status endpoint:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// WebSocket handling for real-time progress updates
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current active jobs to the new client
    socket.emit('active_jobs', Array.from(activeJobs.values()));
    
    // Handle generation request via WebSocket
    socket.on('generate', async (data) => {
        const { prompt, skeletonId } = data;
        
        if (!prompt || !prompt.trim()) {
            socket.emit('error', { skeletonId, message: 'No prompt provided' });
            return;
        }
        
        if (!API_KEY) {
            socket.emit('error', { skeletonId, message: 'API key not configured' });
            return;
        }
        
        try {
            // Start generation
            const url = `${BASE_URL}/nova/imagine`;
            const response = await axios.post(url, { prompt: prompt.trim(), timeout: 900 }, {
                headers: getHeaders(true),
                timeout: 30000
            });
            
            const messageId = response.data.messageId || response.data.id || response.data.data?.messageId;
            
            if (!messageId) {
                socket.emit('error', { skeletonId, message: 'Failed to start generation' });
                return;
            }
            
            // Send initial confirmation
            const jobData = {
                messageId,
                skeletonId,
                prompt: prompt.trim(),
                progress: 0,
                status: 'STARTING',
                timestamp: Date.now()
            };
            
            activeJobs.set(messageId, jobData);
            
            // Broadcast to all clients
            io.emit('generation_started', jobData);
            
            // Start polling and broadcast progress
            pollAndBroadcast(messageId, prompt.trim(), skeletonId);
            
        } catch (e) {
            console.error('Generation error:', e.message);
            socket.emit('error', { skeletonId, message: e.message });
        }
    });
    
    // Handle button action (upscale/variation) via WebSocket
    socket.on('button_action', async (data) => {
        const { messageId, button, originalPrompt, skeletonId } = data;
        
        if (!messageId || !button) {
            socket.emit('error', { skeletonId, message: 'Missing messageId or button' });
            return;
        }
        
        try {
            const url = `${BASE_URL}/nova/button`;
            const response = await axios.post(url, { messageId, button }, {
                headers: getHeaders(true),
                timeout: 30000
            });
            
            const newMessageId = response.data.messageId || response.data.id || response.data.data?.messageId;
            
            if (!newMessageId) {
                socket.emit('error', { skeletonId, message: 'Failed to process button action' });
                return;
            }
            
            const actionType = button.startsWith('U') ? 'Upscale' : 'Variation';
            const newPrompt = `${actionType} (${button}) of: ${originalPrompt}`;
            
            const jobData = {
                messageId: newMessageId,
                skeletonId,
                prompt: newPrompt,
                progress: 0,
                status: 'STARTING',
                timestamp: Date.now()
            };
            
            activeJobs.set(newMessageId, jobData);
            
            io.emit('generation_started', jobData);
            
            // Start polling
            pollAndBroadcast(newMessageId, newPrompt, skeletonId);
            
        } catch (e) {
            console.error('Button action error:', e.message);
            socket.emit('error', { skeletonId, message: e.message });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Poll API and broadcast progress via WebSocket
async function pollAndBroadcast(messageId, prompt, skeletonId) {
    try {
        const data = await getStatus(messageId);
        
        const statusVal = (data.status || data.data?.status || '').toUpperCase();
        let progress = data.progress;
        if (progress === undefined || progress === null) {
            progress = data.data?.progress;
        }
        if (progress === undefined || progress === null) {
            progress = '...';
        }
        
        // Update global state
        const job = activeJobs.get(messageId);
        if (job) {
            job.progress = progress;
            job.status = statusVal;
        }
        
        // Broadcast progress update to all clients
        io.emit('progress', { messageId, skeletonId, progress, status: statusVal });
        
        if (statusVal === 'DONE') {
            // Extract and save images
            const images = extractImages(data);
            let localImages = [];
            
            if (images.length > 0) {
                localImages = await saveImages(messageId, images, prompt, data);
            }
            
            // Broadcast completion
            io.emit('generation_complete', {
                messageId,
                skeletonId,
                images: localImages.length > 0 ? localImages : images,
                raw_data: data
            });
            
            // Remove from active jobs
            activeJobs.delete(messageId);
            
        } else if (statusVal === 'FAILED' || statusVal === 'ERROR') {
            io.emit('generation_failed', { messageId, skeletonId, progress, status: statusVal });
            activeJobs.delete(messageId);
        } else {
            // Continue polling
            setTimeout(() => pollAndBroadcast(messageId, prompt, skeletonId), POLL_INTERVAL);
        }
    } catch (e) {
        console.error('Polling error:', e.message);
        io.emit('error', { skeletonId, message: e.message });
        activeJobs.delete(messageId);
    }
}

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!API_KEY) {
        console.warn('WARNING: IMAGINEPRO_API_KEY environment variable not set!');
    }
});