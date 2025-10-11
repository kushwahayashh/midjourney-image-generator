# Vibe - AI Image Generator

A modern, clean web application for generating images using the ImaginePro AI API.

## Features

- 🎨 Generate images from text prompts
- 📱 Responsive design with modern UI
- 💾 Automatic image saving and gallery
- ⚡ Real-time generation status updates
- 🖼️ Modal image preview
- 📜 Generation history with timestamps

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

1. Enter a descriptive prompt in the input field at the bottom
2. Press Enter or click the send button
3. Wait for the generation to complete
4. View your generated images in the gallery
5. Click any image to view it in full size

## Project Structure

```
vibe/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── output/               # Generated images (auto-created)
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   ├── style.css     # Main styles
    │   └── skeleton.css  # Loading animations
    └── js/
        ├── app.js        # Main application logic
        └── skeleton.js   # Loading utilities
```

## Security Notes

- **Never commit your `.env` file** - It contains your API key
- The `.gitignore` file is configured to exclude `.env` files
- API keys are loaded from environment variables, not hardcoded

## Technologies Used

- **Backend:** Flask (Python)
- **Frontend:** Vanilla JavaScript
- **Styling:** CSS3 with custom design
- **Icons:** Lucide Icons
- **Fonts:** Space Mono (Google Fonts)
- **API:** ImaginePro AI

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
