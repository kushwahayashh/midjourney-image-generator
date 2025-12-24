# Vibe - Midjourney Image Generator

A modern, feature-rich web application for generating AI images using the ImaginePro API (Midjourney-style). Now with **Node.js + Socket.io** for real-time WebSocket updates, eliminating the need for polling.

## 📸 Screenshots

### Main Page
![Main Page - Generation Interface](readme%20images/main.png)

### Gallery View
![Gallery View - Image Management](readme%20images/gallery.png)

## ✨ Features

### Core Functionality
- 🎨 **AI Image Generation** - Create stunning images from text prompts using ImaginePro API
- 🔍 **Image Upscaling** - Upscale any of the 4 generated images to higher resolution
- 🎲 **Variations** - Create variations of any generated image
- 📱 **Responsive Design** - Modern, dark-themed UI optimized for all screen sizes
- 💾 **Automatic Saving** - All generations saved locally with complete metadata

### User Experience
- ⚡ **Real-time WebSocket Updates** - Live progress via Socket.io (no more polling!)
- 🖼️ **Modal Image Viewer** - Full-screen preview with keyboard navigation
- ⬅️➡️ **Batch Navigation** - Browse through image sets with arrow keys or buttons
- 📜 **Generation History** - Complete gallery with timestamps and prompts
- 🔔 **Toast Notifications** - Clean, non-intrusive feedback for all actions
- 🎯 **Context Menus** - Right-click on images or generations for quick actions
- 🖼️ **Dedicated Gallery Page** - Separate view for browsing all generated images
- 🔍 **Lazy Loading** - Optimized image loading for better performance
- 🔎 **Zoom Controls** - Adjust gallery grid size with +/- buttons (2-8 columns)
- 💾 **Persistent Preferences** - Gallery zoom level saved in browser

### Advanced Features
- 🔢 **Smart Image Indexing** - Correctly maps UI positions to API button indices
- 🚫 **Intelligent Menu Filtering** - Hides upscale/variation options on already-upscaled images
- 🗑️ **Generation Management** - Delete unwanted generations with confirmation
- 📥 **Image Download** - Download individual images directly from context menu
- 🔗 **URL Copying** - Copy image URLs to clipboard
- ⚙️ **Modular Architecture** - Clean, maintainable codebase with separated concerns

## Setup

### Prerequisites

- **Node.js 18+**
- ImaginePro API key ([Get one here](https://imaginepro.ai))

### Installation

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API key:**
   
   Copy the example environment file:
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` and add your ImaginePro API key:
   ```
   IMAGINEPRO_API_KEY=your_actual_api_key_here
   ```

4. **Run the application:**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5000`

## 🚀 Usage

### Generating Images
1. Enter a descriptive prompt in the input field at the bottom
2. Press **Enter** or click the sparkle button to generate
3. Watch the real-time progress as your images are created (4 images per generation)
4. Images automatically appear in the gallery when complete

### Gallery View
- Click the **Gallery** icon in the header to access the dedicated gallery page
- **Zoom Controls**: Use **+** to zoom in (fewer, larger images) or **-** to zoom out (more, smaller images)
- **Range**: Adjust from 2 to 8 columns per row
- **Context Menu**: Right-click any image to access quick actions:
  - **Download Image** - Save to your downloads folder
  - **Copy URL** - Copy image URL to clipboard
  - **Open in App** - Navigate to the image in the main page with smart retry logic
- Your zoom preference is automatically saved

### Upscaling & Variations
**Right-click on any image** (on main page) to access:
- **Upscale Image** - Generate a higher resolution version (U1-U4)
- **Create Variation** - Generate 4 new variations of the selected image (V1-V4)
- **Download Image** - Save the image to your downloads folder
- **Copy Image URL** - Copy the image URL to clipboard

> **Note:** Upscale and variation options are automatically hidden for already-upscaled images.

### Viewing Images
- **Click** any image to open full-screen modal viewer
- Use **arrow keys** (← →) or click the navigation arrows to browse through batch images
- Press **Escape** or click outside to close the modal

### Managing Generations
- **Right-click** on the prompt/timestamp area to open generation context menu
- Select **Delete** to remove a generation and all its images
- All generations are saved in the `output/` folder with metadata
- Each generation is stored in a timestamped folder with metadata.json

## 📁 Project Structure

```
vibe/
├── server.js                      # Node.js/Express/Socket.io server
├── package.json                   # Node.js dependencies
├── .env.example                   # Environment variables template
├── .env                          # Your API key (not in git)
├── .gitignore                    # Git ignore rules
├── output/                       # Generated images (auto-created)
│   └── [timestamp_messageId]/   # Each generation in separate folder
│       ├── image_1.png          # Generated images
│       ├── image_2.png
│       ├── image_3.png
│       ├── image_4.png
│       └── metadata.json        # Generation metadata & API response
├── views/                        # HTML templates
│   ├── index.html               # Main page template
│   └── gallery.html             # Gallery page template
└── static/
    ├── css/
    │   ├── style.css            # Core app styles
    │   ├── skeleton.css         # Loading animations
    │   ├── gallery.css          # Gallery page styles with grid controls
    │   ├── context-menu.css     # Context menu styles (shared)
    │   ├── image-context-menu.css # Image context menu styles
    │   ├── credits.css          # Credits display styles
    │   ├── toast.css            # Notification styles
    │   └── input-box.css        # Input component styles
    └── js/
        ├── app.js               # Main page logic with WebSocket support
        ├── gallery.js           # Gallery page logic with lazy loading
        ├── button-actions.js    # Upscale/variation handlers
        ├── skeleton.js          # Loading skeleton utilities
        ├── context-menu.js      # Generation context menu
        ├── image-context-menu.js # Image right-click menu (with indexing fix)
        ├── credits.js           # Credits management
        ├── toast.js             # Toast notification system
        └── input-box.js         # Input component logic
```

## Security Notes

- **Never commit your `.env` file** - It contains your API key
- The `.gitignore` file is configured to exclude `.env` files
- API keys are loaded from environment variables, not hardcoded

## Technologies Used

- **Backend:** Node.js + Express + Socket.io
- **Real-time:** Socket.io WebSockets
- **Frontend:** Vanilla JavaScript - No frameworks, pure JS
- **Styling:** CSS3 - Custom modular design system
- **Icons:** Lucide Icons - Beautiful, consistent iconography
- **Fonts:** Space Mono (Google Fonts) - Monospace aesthetic
- **API:** ImaginePro AI - Image generation service
- **Architecture:** Component-based modular structure

## 🏗️ Code Architecture

This project follows a **modular component-based architecture** with clear separation of concerns:

### Backend Structure
- **`server.js`** - Express routes + Socket.io WebSocket handlers
- Real-time progress updates pushed to clients
- No polling required - server pushes updates automatically

### Frontend Structure
- **Component-based JS** - Each feature in its own module
- **WebSocket-first** - Falls back to polling if WebSocket unavailable
- **Modular CSS** - Separate stylesheets for each component
- **Event-driven** - Uses event delegation for dynamic content
- **State management** - Centralized AppState in `app.js`

### Key Design Patterns
- **Separation of Concerns** - Backend logic separated from frontend
- **DRY Principle** - Reusable functions for common operations
- **Error Handling** - Comprehensive try-catch blocks with user feedback
- **Progressive Enhancement** - Falls back gracefully if WebSocket unavailable

### Benefits
- ✅ **Real-time updates** - No more polling delays
- ✅ **Easy to maintain** - Find and fix issues quickly
- ✅ **Reusable** - Components can be used in other projects
- ✅ **Scalable** - Add new features without touching existing code
- ✅ **Debuggable** - Browser dev tools show exact file locations
- ✅ **Collaborative** - Multiple developers can work simultaneously
- ✅ **Well-documented** - Comprehensive docstrings and comments

## 🔧 Technical Details

### WebSocket Events (Node.js)

**Client → Server:**
- `generate` - Start new image generation
- `button_action` - Request upscale/variation

**Server → Client:**
- `generation_started` - Confirms generation started
- `progress` - Real-time progress updates
- `generation_complete` - Images ready
- `generation_failed` - Generation failed
- `error` - Error occurred

### Image Indexing Fix
The API provider returns images in a 2x2 grid with vertical ordering (column-first), but we display them horizontally. The `image-context-menu.js` includes a mapping system to correctly translate UI positions to API button indices:

```javascript
// Mapping: UI position → API button
1 → U1 (top-left)
2 → U3 (bottom-left)  
3 → U2 (top-right)
4 → U4 (bottom-right)
```

See `image indexing fix.md` for detailed documentation.

### API Endpoints

**Frontend Routes:**
- `GET /` - Main application page
- `GET /gallery` - Gallery page
- `GET /output/<path>` - Serve generated images

**API Routes:**
- `POST /generate` - Start new image generation
- `GET /status/<message_id>` - Check generation status (fallback)
- `POST /button` - Handle upscale/variation actions
- `GET /api/generations` - Get all past generations
- `GET /api/gallery/images` - Get all images for gallery view
- `DELETE /api/generations/<message_id>` - Delete a generation
- `GET /api/credits` - Get current credit balance

### State Management
The application uses a centralized `AppState` object to track:
- Active generations (supports multiple concurrent generations)
- Modal state (current images and index)
- WebSocket connection state

## 🐛 Troubleshooting

### API Key Not Found
If you see "API key not configured" error:
1. Make sure you created a `.env` file (not `.env.example`)
2. Verify the API key is set correctly: `IMAGINEPRO_API_KEY=your_key_here`
3. Restart the server after changing the `.env` file

### Port Already in Use
If port 5000 is already in use, set the PORT environment variable:
```bash
PORT=5001 npm start
```

Or edit the `.env` file:
```
PORT=5001
```

### Images Not Loading
1. Check browser console for errors
2. Verify the `output/` folder exists and has proper permissions
3. Check that images are being saved in `output/[timestamp_messageId]/`
4. Try clearing browser cache

### WebSocket Not Connecting
1. Check browser console for WebSocket errors
2. The app will fall back to HTTP polling automatically
3. Ensure no firewall is blocking WebSocket connections

### Upscale/Variation Not Working
1. Ensure you're right-clicking on the image itself (not the prompt area)
2. Check browser console for any JavaScript errors
3. Verify the image URL matches the expected format
4. See `image indexing fix.md` for technical details

## 📝 Recent Updates

### Latest Changes (v3.0)
- ✅ **Node.js + Socket.io** - Real-time WebSocket updates (no more polling!)
- ✅ **Automatic fallback** - Falls back to HTTP polling if WebSocket unavailable
- ✅ **Server-side progress** - Progress polling done server-side, pushed to clients
- ✅ **Improved performance** - Reduced client-side overhead

### Previous Updates (v2.0)
- ✅ **Dedicated Gallery Page** - New separate gallery view for browsing all images
- ✅ **Lazy Loading** - Optimized image loading on both main and gallery pages
- ✅ **Zoom Controls** - Adjustable grid layout (2-8 columns) with persistent preferences
- ✅ **Smart Navigation** - "Open in App" with retry logic for slow connections
- ✅ **Gallery Context Menu** - Download and copy URL directly from gallery
- ✅ **Improved Image Loading** - Fixed skeleton loader issue with newly generated images
- ✅ **Credits System** - Real-time credit balance display

### Previous Updates (v1.0)
- ✅ Fixed image indexing for upscale/variation operations
- ✅ Refactored upscale/variation code into `imageactions.py`
- ✅ Added intelligent menu filtering (hides options for upscaled images)
- ✅ Improved error handling with specific exception types
- ✅ Enhanced documentation with technical details
- ✅ Added comprehensive docstrings to all functions

## 🤝 Contributing

This project is designed to be easily extensible. To add new features:

1. **Backend:** Add new routes/WebSocket events in `server.js`
2. **Frontend:** Create new JS/CSS files in `static/` and include them in the HTML templates
3. **Follow the pattern:** Keep components modular and self-contained
4. **Document:** Add docstrings and comments for complex logic

## 📄 License

This project is provided as-is for educational and personal use.

## 🙏 Acknowledgments

- **ImaginePro API** - For providing the AI image generation service
- **Lucide Icons** - For the beautiful icon set
- **Socket.io** - For seamless real-time communication
- **Express** - For the robust Node.js web framework
