# Vibe - AI Image Generator

A modern, clean web application for generating images using the ImaginePro AI API with a beautiful, modular architecture.

![Vibe AI Image Generator](readme%20images/image.png)

## Features

- 🎨 **Generate images from text prompts** - Powered by ImaginePro AI
- 📱 **Responsive design** - Modern, dark-themed UI with smooth animations
- 💾 **Automatic image saving** - All generations saved locally with metadata
- ⚡ **Real-time status updates** - Live progress tracking with skeleton loaders
- 🖼️ **Interactive modal viewer** - Full-screen image preview with navigation
- ⬅️➡️ **Batch navigation** - Browse through images in the same batch with arrow keys
- 📜 **Generation history** - Complete gallery with timestamps and prompts
- 🗑️ **Context menu** - Right-click to delete generations
- 🔔 **Toast notifications** - Clean feedback for all actions
- ⚙️ **Modular architecture** - Separated components for easy maintenance

## Setup

### Prerequisites

- Python 3.8 or higher
- ImaginePro API key ([Get one here](https://imaginepro.ai))

### Installation

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
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
   
   **Option A - Using the launcher (Windows):**
   ```bash
   run.bat
   ```
   
   **Option B - Manual:**
   ```bash
   python app.py
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5000`

## Usage

### Generating Images
1. Enter a descriptive prompt in the input field at the bottom
2. Press **Enter** or click the sparkle button to generate
3. Watch the real-time progress as your images are created
4. Images automatically appear in the gallery when complete

### Viewing Images
- **Click** any image to open full-screen modal viewer
- Use **arrow keys** (← →) or click the navigation arrows to browse through batch images
- Press **Escape** or click outside to close the modal

### Managing Generations
- **Right-click** on any generation to open the context menu
- Select **Delete** to remove a generation and its images
- All generations are saved in the `output/` folder with metadata

## Project Structure

```
vibe/
├── app.py                    # Flask backend server
├── requirements.txt          # Python dependencies
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── output/                  # Generated images (auto-created)
│   └── [timestamp_id]/      # Each generation in separate folder
│       ├── image_1.png      # Generated images
│       ├── image_2.png
│       └── metadata.json    # Generation metadata
├── templates/
│   └── index.html           # Main HTML template
└── static/
    ├── css/
    │   ├── style.css        # Core app styles
    │   ├── skeleton.css     # Loading animations
    │   ├── context-menu.css # Right-click menu styles
    │   ├── toast.css        # Notification styles
    │   └── input-box.css    # Input component styles
    └── js/
        ├── app.js           # Main application logic
        ├── skeleton.js      # Loading utilities
        ├── context-menu.js  # Context menu functionality
        ├── toast.js         # Toast notifications
        └── input-box.js     # Input component logic
```

## Security Notes

- **Never commit your `.env` file** - It contains your API key
- The `.gitignore` file is configured to exclude `.env` files
- API keys are loaded from environment variables, not hardcoded

## Technologies Used

- **Backend:** Flask (Python) - Lightweight web server
- **Frontend:** Vanilla JavaScript - No frameworks, pure JS
- **Styling:** CSS3 - Custom modular design system
- **Icons:** Lucide Icons - Beautiful, consistent iconography
- **Fonts:** Space Mono (Google Fonts) - Monospace aesthetic
- **API:** ImaginePro AI - Image generation service
- **Architecture:** Component-based modular structure

## Code Architecture

This project follows a **modular component-based architecture**:

### Component Separation
- Each feature (input box, modal, toast, context menu) is isolated in its own CSS/JS files
- Components are self-contained and reusable
- Clear separation of concerns for maintainability

### Benefits
- ✅ **Easy to maintain** - Find and fix issues quickly
- ✅ **Reusable** - Components can be used in other projects
- ✅ **Scalable** - Add new features without touching existing code
- ✅ **Debuggable** - Browser dev tools show exact file locations
- ✅ **Collaborative** - Multiple developers can work simultaneously

## Troubleshooting

### API Key Not Found
If you see "API key not configured" error:
1. Make sure you created a `.env` file (not `.env.example`)
2. Verify the API key is set correctly in the `.env` file
3. Restart the Flask server after changing the `.env` file

### Port Already in Use
If port 5000 is already in use, edit `app.py` and change:
```python
app.run(debug=True, host='0.0.0.0', port=5000)
```
to use a different port, e.g., `port=5001`

## License

This project is provided as-is for educational and personal use.
