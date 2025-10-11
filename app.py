from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import json
import time
import sys
import os
from datetime import datetime
from pathlib import Path

app = Flask(__name__)

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzU3NjksImVtYWlsIjoia29tZWZvMTM4NEBjYXBpZW5hLmNvbSIsInVzZXJuYW1lIjoia29tZWZvMTM4NEBjYXBpZW5hLmNvbSIsImlhdCI6MTc2MDE2NTgzN30.9RzOPfwmaYp8-0XjIsjd9d-WDV4f_sbpsHbWS-xYMFM"
BASE_URL = "https://api.imaginepro.ai/api/v1"
OUTPUT_DIR = "output"

# Create output directory if it doesn't exist
Path(OUTPUT_DIR).mkdir(exist_ok=True)

def generate_image(prompt):
    url = f"{BASE_URL}/nova/imagine"
    headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
    payload = {"prompt": prompt, "timeout": 900}

    resp = requests.post(url, headers=headers, json=payload)
    if resp.ok:
        data = resp.json()
        return data.get("messageId") or data.get("id") or data.get("data", {}).get("messageId")
    else:
        print(f"Error: {resp.status_code}\n{resp.text}")
        return None

def get_status(message_id):
    url = f"{BASE_URL}/message/fetch/{message_id}"
    headers = {'Authorization': f'Bearer {API_KEY}'}
    resp = requests.get(url, headers=headers)
    return resp.json() if resp.ok else None

def save_images(message_id, image_urls, prompt, raw_data):
    """Download images and save metadata"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    task_folder = os.path.join(OUTPUT_DIR, f"{timestamp}_{message_id}")
    Path(task_folder).mkdir(exist_ok=True)
    
    local_image_paths = []
    
    # Download each image
    for idx, img_url in enumerate(image_urls):
        try:
            response = requests.get(img_url, timeout=30)
            if response.ok:
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
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    return local_image_paths

@app.route('/output/<path:filename>')
def serve_output(filename):
    return send_from_directory(OUTPUT_DIR, filename)

@app.route('/api/generations')
def get_generations():
    """Get all past generations from output folder"""
    generations = []
    
    if not os.path.exists(OUTPUT_DIR):
        return jsonify({'generations': []})
    
    # Get all subdirectories in output folder
    for folder_name in sorted(os.listdir(OUTPUT_DIR), reverse=True):
        folder_path = os.path.join(OUTPUT_DIR, folder_name)
        metadata_path = os.path.join(folder_path, 'metadata.json')
        
        if os.path.isdir(folder_path) and os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    generations.append(metadata)
            except Exception as e:
                print(f"Error reading metadata from {folder_name}: {e}")
    
    return jsonify({'generations': generations})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt', '').strip()
    
    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400
    
    message_id = generate_image(prompt)
    if not message_id:
        return jsonify({'error': 'Failed to generate image'}), 500
    
    return jsonify({'message_id': message_id, 'prompt': prompt})

@app.route('/status/<message_id>', methods=['GET'])
def status(message_id):
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

def wait_for_completion(message_id, interval=5):
    spinner = ["|", "/", "-", "\\"]
    i = 0
    while True:
        data = get_status(message_id)
        if not data:
            sys.stdout.write("\r❌ Failed to fetch status.")
            sys.stdout.flush()
            break

        status = (data.get("status") or data.get("data", {}).get("status") or "").upper()
        progress = data.get("progress") or data.get("data", {}).get("progress") or "..."
        sys.stdout.write(f"\r{spinner[i % len(spinner)]} Status: {status} | Progress: {progress}")
        sys.stdout.flush()
        i += 1

        if status == "DONE" or status == "FAILED" or status == "ERROR":
            print()  # move to next line
            return data

        time.sleep(interval)

def main():
    prompt = input("Enter your image prompt: ").strip()
    if not prompt:
        print("❌ No prompt entered. Exiting.")
        return

    print("🚀 Submitting request...")
    message_id = generate_image(prompt)
    if not message_id:
        print("❌ Failed to generate image.")
        return

    print(f"🆔 Message ID: {message_id}")
    print("⏳ Waiting for completion...")

    result = wait_for_completion(message_id)
    if result:
        print("\n✅ Done!\n")
        print(json.dumps(result, indent=2))
        with open("image_response.json", "w") as f:
            json.dump(result, f, indent=2)
        print("\n💾 Response saved to image_response.json")

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
