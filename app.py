from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import json
import os
from datetime import datetime
from pathlib import Path

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, will use system environment variables

app = Flask(__name__)

# Load API key from environment variable for security
API_KEY = os.environ.get('IMAGINEPRO_API_KEY', '')
if not API_KEY:
    print("WARNING: IMAGINEPRO_API_KEY environment variable not set!")
    print("Please create a .env file with your API key or set the environment variable.")

BASE_URL = "https://api.imaginepro.ai/api/v1"
OUTPUT_DIR = "output"
MAX_PROMPT_LENGTH = 1000

# Create output directory if it doesn't exist
Path(OUTPUT_DIR).mkdir(exist_ok=True)

def generate_image(prompt):
    """Generate an image from a text prompt."""
    if not API_KEY:
        raise ValueError("API key not configured")
    
    url = f"{BASE_URL}/nova/imagine"
    headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
    payload = {"prompt": prompt, "timeout": 900}

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("messageId") or data.get("id") or data.get("data", {}).get("messageId")
    except requests.exceptions.RequestException as e:
        print(f"Error generating image: {e}")
        raise

def get_status(message_id):
    """Get the status of an image generation request."""
    if not API_KEY:
        raise ValueError("API key not configured")
    
    url = f"{BASE_URL}/message/fetch/{message_id}"
    headers = {'Authorization': f'Bearer {API_KEY}'}
    
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching status: {e}")
        raise

def save_images(message_id, image_urls, prompt, raw_data):
    """Download images and save metadata."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        task_folder = os.path.join(OUTPUT_DIR, f"{timestamp}_{message_id}")
        Path(task_folder).mkdir(parents=True, exist_ok=True)
        
        local_image_paths = []
        
        # Download each image
        for idx, img_url in enumerate(image_urls):
            try:
                response = requests.get(img_url, timeout=30)
                response.raise_for_status()
                
                # Determine file extension from URL or default to png
                ext = 'png'
                if '.' in img_url.split('/')[-1]:
                    ext = img_url.split('.')[-1].split('?')[0] or 'png'
                
                filename = f"image_{idx + 1}.{ext}"
                filepath = os.path.join(task_folder, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                # Store relative path for serving
                local_image_paths.append(f"/output/{timestamp}_{message_id}/{filename}")
            except Exception as e:
                print(f"Error downloading image {idx + 1}: {e}")
        
        # Save metadata
        metadata = {
            "message_id": message_id,
            "timestamp": timestamp,
            "prompt": prompt,
            "image_count": len(local_image_paths),
            "images": local_image_paths,
            "original_urls": image_urls,
            "raw_response": raw_data
        }
        
        metadata_path = os.path.join(task_folder, "metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        return local_image_paths
    except Exception as e:
        print(f"Error saving images: {e}")
        return []

@app.route('/output/<path:filename>')
def serve_output(filename):
    return send_from_directory(OUTPUT_DIR, filename)

@app.route('/api/generations')
def get_generations():
    """Get all past generations from output folder."""
    try:
        generations = []
        
        if not os.path.exists(OUTPUT_DIR):
            return jsonify({'generations': []})
        
        # Get all subdirectories in output folder
        for folder_name in sorted(os.listdir(OUTPUT_DIR), reverse=True):
            folder_path = os.path.join(OUTPUT_DIR, folder_name)
            metadata_path = os.path.join(folder_path, 'metadata.json')
            
            if os.path.isdir(folder_path) and os.path.exists(metadata_path):
                try:
                    with open(metadata_path, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                        generations.append(metadata)
                except Exception as e:
                    print(f"Error reading metadata from {folder_name}: {e}")
        
        return jsonify({'generations': generations})
    except Exception as e:
        print(f"Error getting generations: {e}")
        return jsonify({'generations': [], 'error': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    """Start a new image generation request."""
    try:
        if not request.json:
            return jsonify({'error': 'Invalid request format'}), 400
        
        prompt = request.json.get('prompt', '').strip()
        
        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400
        
        if len(prompt) > MAX_PROMPT_LENGTH:
            return jsonify({'error': f'Prompt too long (max {MAX_PROMPT_LENGTH} characters)'}), 400
        
        if not API_KEY:
            return jsonify({'error': 'API key not configured. Please set IMAGINEPRO_API_KEY environment variable.'}), 500
        
        message_id = generate_image(prompt)
        if not message_id:
            return jsonify({'error': 'Failed to generate image'}), 500
        
        return jsonify({'message_id': message_id, 'prompt': prompt})
    except Exception as e:
        print(f"Error in generate endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/status/<message_id>', methods=['GET'])
def status(message_id):
    """Check the status of an image generation request."""
    try:
        if not message_id:
            return jsonify({'error': 'No message ID provided'}), 400
        
        if not API_KEY:
            return jsonify({'error': 'API key not configured'}), 500
        
        prompt = request.args.get('prompt', '')
        data = get_status(message_id)
        
        if not data:
            return jsonify({'error': 'Failed to fetch status'}), 500
        
        status_val = (data.get("status") or data.get("data", {}).get("status") or "").upper()
        progress = data.get("progress") or data.get("data", {}).get("progress") or "..."
        
        # Extract image URLs if done
        images = []
        local_images = []
        if status_val == "DONE":
            # Try different possible response structures
            if "data" in data and "images" in data["data"]:
                images = data["data"]["images"]
            elif "images" in data:
                images = data["images"]
            elif "data" in data and "url" in data["data"]:
                images = [data["data"]["url"]]
            elif "url" in data:
                images = [data["url"]]
            
            # Download and save images
            if images:
                local_images = save_images(message_id, images, prompt, data)
        
        return jsonify({
            'status': status_val,
            'progress': progress,
            'images': local_images if local_images else images,
            'raw_data': data
        })
    except Exception as e:
        print(f"Error in status endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generations/<message_id>', methods=['DELETE'])
def delete_generation(message_id):
    """Delete a generation and its associated files."""
    try:
        if not message_id:
            return jsonify({'error': 'No message ID provided'}), 400
        
        # Find the folder containing this message_id
        deleted = False
        if os.path.exists(OUTPUT_DIR):
            for folder_name in os.listdir(OUTPUT_DIR):
                if message_id in folder_name:
                    folder_path = os.path.join(OUTPUT_DIR, folder_name)
                    if os.path.isdir(folder_path):
                        # Delete the entire folder
                        import shutil
                        shutil.rmtree(folder_path)
                        deleted = True
                        print(f"Deleted generation folder: {folder_name}")
                        break
        
        if deleted:
            return jsonify({'success': True, 'message': 'Generation deleted successfully'})
        else:
            return jsonify({'error': 'Generation not found'}), 404
            
    except Exception as e:
        print(f"Error deleting generation: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
